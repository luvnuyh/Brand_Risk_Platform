import json
import asyncio
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional, List
from concurrent.futures import ThreadPoolExecutor

from services.gpt_service import generate_risk_report
from services.instagram_service import fetch_instagram_data

from database import get_db

from services.youtube_service import (
    collect_brand_and_person_comments
)

from services.naver_service import (
    collect_brand_all,
    analyze_person_risks
)

from services.analysis_service import (
    analyze_comments_bulk_with_score
)

from services.risk_service import RiskAnalyzer

from models import (
    User,
    Company,
    Brand,
    BrandPerson,
    BrandRiskAnalysis,
    PersonRiskAnalysis
)

from dependencies import get_current_user

from utils.auth_utils import (
    hash_password,
    verify_password,
    create_access_token
)

SECRET_KEY = "secret"
ALGORITHM = "HS256"

router = APIRouter()

# =====================================================
# 🔹 유틸
# =====================================================
def extract_texts(data):

    if not data:
        return []

    if isinstance(data[0], dict):
        return [d.get("text", "") for d in data]

    return data

# =====================================================
# 🔹 Taxonomy Aggregation
# =====================================================
def aggregate_taxonomy(results):

    issue_counter = {}
    action_counter = {}
    emotion_counter = {}
    target_counter = {}
    virality_counter = {
        "low": 0,
        "medium": 0,
        "high": 0
    }

    for r in results:

        taxonomy = r.get("taxonomy", {})

        emotion = taxonomy.get("emotion_strength")

        if emotion:
            emotion_counter[emotion] = emotion_counter.get(emotion, 0) + 1

        for issue in taxonomy.get("issue_types", []):
            issue_counter[issue] = issue_counter.get(issue, 0) + 1

        for action in taxonomy.get("action_intent", []):
            action_counter[action] = action_counter.get(action, 0) + 1

        for target in taxonomy.get("target", []):
            target_counter[target] = target_counter.get(target, 0) + 1

        virality = taxonomy.get("virality")

        if virality:
            virality_counter[virality] += 1

    return {
        "issue_types": issue_counter,
        "action_intent": action_counter,
        "emotion_strength": emotion_counter,
        "targets": target_counter,
        "virality": virality_counter
    }

# =====================================================
# 🔹 Crisis Feed 생성
# =====================================================
def build_crisis_feed(taxonomy_summary):

    feed = []

    issue_types = taxonomy_summary.get("issue_types", {})
    action_intent = taxonomy_summary.get("action_intent", {})
    emotions = taxonomy_summary.get("emotion_strength", {})

    if issue_types.get("service_issue", 0) >= 2:
        feed.append(
            "⚠️ 서비스 불만 관련 부정 반응 증가"
        )

    if issue_types.get("quality_issue", 0) >= 2:
        feed.append(
            "⚠️ 품질 이슈 언급량 증가"
        )

    if action_intent.get("boycott", 0) >= 1:
        feed.append(
            "🚨 불매 의도 댓글 감지"
        )

    if action_intent.get("refund_request", 0) >= 1:
        feed.append(
            "⚠️ 환불 요구 반응 증가"
        )

    if emotions.get("rage", 0) >= 1:
        feed.append(
            "🔥 격분 수준의 반응 증가"
        )

    return feed

# =====================================================
# 🔹 Request Schema
# =====================================================
class PersonInput(BaseModel):
    name: str
    role: Optional[str] = None

class SignupRequest(BaseModel):
    email: str
    password: str
    name: str
    company_name: str
    brand_name: str
    persons: Optional[List[PersonInput]] = []

class LoginRequest(BaseModel):
    email: str
    password: str

class AddPersonRequest(BaseModel):
    name: str
    role: Optional[str] = None

# =====================================================
# 🔹 Login
# =====================================================
@router.post("/login")
def login(
    req: LoginRequest,
    db: Session = Depends(get_db)
):

    db.expire_all()

    user = db.query(User).filter(
        User.email == req.email
    ).first()

    if not user:
        raise HTTPException(
            status_code=400,
            detail="사용자 없음"
        )

    if not verify_password(req.password, user.password):
        raise HTTPException(
            status_code=400,
            detail="비밀번호 오류"
        )

    token = create_access_token({
        "user_id": user.id,
        "brand_id": user.brand_id
    })

    return {
        "token": token,
        "user_id": user.id,
        "brand_id": user.brand_id
    }

# =====================================================
# 🔹 Signup
# =====================================================
@router.post("/signup")
def signup(
    req: SignupRequest,
    db: Session = Depends(get_db)
):

    if db.query(User).filter(
        User.email == req.email
    ).first():

        raise HTTPException(
            status_code=400,
            detail="이미 존재하는 이메일"
        )

    company = db.query(Company).filter(
        Company.name == req.company_name
    ).first()

    if not company:

        company = Company(name=req.company_name)

        db.add(company)
        db.commit()
        db.refresh(company)

    brand = db.query(Brand).filter(
        Brand.name == req.brand_name,
        Brand.company_id == company.id
    ).first()

    if not brand:

        brand = Brand(
            name=req.brand_name,
            company_id=company.id
        )

        db.add(brand)
        db.commit()
        db.refresh(brand)

    user = User(
        email=req.email,
        password=hash_password(req.password),
        name=req.name,
        company_id=company.id,
        brand_id=brand.id,
        plan="pro"
    )

    db.add(user)
    db.commit()
    db.refresh(user)

    if req.persons:

        for p in req.persons:

            exists = db.query(BrandPerson).filter(
                BrandPerson.brand_id == brand.id,
                BrandPerson.name == p.name
            ).first()

            if not exists:

                db.add(
                    BrandPerson(
                        brand_id=brand.id,
                        name=p.name,
                        role=p.role
                    )
                )

        db.commit()

    return {
        "message": "회원가입 성공",
        "persons_registered": len(req.persons)
    }

# =====================================================
# 🔹 Person API
# =====================================================
@router.get("/persons")
def get_persons(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):

    persons = db.query(BrandPerson).filter(
        BrandPerson.brand_id == current_user.brand_id
    ).all()

    return {
        "brand": current_user.brand.name,
        "persons": [
            {
                "id": p.id,
                "name": p.name,
                "role": p.role
            }
            for p in persons
        ]
    }

@router.post("/persons")
def add_person(
    req: AddPersonRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):

    existing = db.query(BrandPerson).filter(
        BrandPerson.brand_id == current_user.brand_id,
        BrandPerson.name == req.name
    ).first()

    if existing:

        raise HTTPException(
            status_code=400,
            detail="이미 등록된 인물입니다."
        )

    person = BrandPerson(
        brand_id=current_user.brand_id,
        name=req.name,
        role=req.role
    )

    db.add(person)
    db.commit()
    db.refresh(person)

    return {
        "message": f"'{req.name}' 등록 완료",
        "id": person.id
    }

@router.delete("/persons/{person_id}")
def delete_person(
    person_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):

    person = db.query(BrandPerson).filter(
        BrandPerson.id == person_id,
        BrandPerson.brand_id == current_user.brand_id
    ).first()

    if not person:

        raise HTTPException(
            status_code=404,
            detail="인물을 찾을 수 없습니다."
        )

    db.delete(person)
    db.commit()

    return {
        "message": f"'{person.name}' 삭제 완료"
    }

# =====================================================
# 🔹 AI 리포트
# =====================================================
@router.post("/api/risk-report")
def risk_report(
    request: dict,
    current_user: User = Depends(get_current_user)
):

    brand_name = current_user.brand.name

    summary = request.get("summary", {})

    report = generate_risk_report(
        brand_name,
        summary
    )

    return {
        "report": report
    }

# =====================================================
# 🔥 메인 분석 API
# =====================================================
@router.post("/analyze")
def analyze_brand(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):

    brand_name = current_user.brand.name

    analyzer = RiskAnalyzer()

    # =====================================================
    # 1. 데이터 수집
    # =====================================================
    with ThreadPoolExecutor(max_workers=3) as executor:

        f_youtube = executor.submit(
            collect_brand_and_person_comments,
            brand_name,
            person_names=None,
            max_videos=5,
            max_comments_per_video=100
        )

        f_naver = executor.submit(
            collect_brand_all,
            brand_name,
            300
        )

        f_insta = executor.submit(
            fetch_instagram_data,
            brand_name
        )

        youtube_data = f_youtube.result()
        naver_data = f_naver.result()

        try:
            instagram_texts = f_insta.result(timeout=20)
        except:
            instagram_texts = []

    youtube_comments = extract_texts(
        youtube_data.get("comments", [])
    )
    print("youtube comments =", len(youtube_comments))
    print("youtube videos =", len(youtube_data.get("videos", [])))

    youtube_videos = youtube_data.get("videos", [])

    news_texts = naver_data["news_texts"]
    blog_texts = naver_data["blog_texts"]
    cafe_texts = naver_data["cafe_texts"]

    # instagram_texts = extract_texts(instagram_texts)

    naver_articles = (
        naver_data.get("news", []) +
        naver_data.get("blogs", []) +
        naver_data.get("cafes", [])
    )

    total_videos = youtube_data["total_videos"]
    total_articles = naver_data["total_articles"]

    all_texts = (
        youtube_comments +
        news_texts +
        blog_texts +
        cafe_texts +
        instagram_texts
    )

    print("naver =", len(news_texts + blog_texts + cafe_texts))
    print("insta =", len(instagram_texts))

    all_texts = extract_texts(all_texts)

    total_comments = len(all_texts)

    if not all_texts:

        return {
            "brand": brand_name,
            "message": "수집된 데이터가 없습니다."
        }

    # =====================================================
    # 2. Taxonomy 분석
    # =====================================================
    analyzed_results = analyze_comments_bulk_with_score(all_texts)

    sentiments = [
        r["sentiment"]
        for r in analyzed_results
    ]

    taxonomy_summary = aggregate_taxonomy(analyzed_results)

    crisis_feed = build_crisis_feed(
        taxonomy_summary
    )

    # =====================================================
    # 3. 리스크 계산
    # =====================================================
    combined_result = analyzer.calculate_risk(analyzed_results)

    positive_ratio = combined_result["positive_ratio"]
    negative_ratio = combined_result["negative_ratio"]
    neutral_ratio = combined_result["neutral_ratio"]
    risk_score = combined_result["risk_score"]

    # =====================================================
    # 🔹 채널별 리스크 계산
    # =====================================================

    youtube_results = analyze_comments_bulk_with_score(
        youtube_comments
    ) if youtube_comments else []

    naver_results = analyze_comments_bulk_with_score(
        news_texts + blog_texts + cafe_texts
    ) if (news_texts + blog_texts + cafe_texts) else []

    instagram_results = analyze_comments_bulk_with_score(
        instagram_texts
    ) if instagram_texts else []


    youtube_sentiments = [
        r["sentiment"]
        for r in youtube_results
    ]

    naver_sentiments = [
        r["sentiment"]
        for r in naver_results
    ]

    instagram_sentiments = [
        r["sentiment"]
        for r in instagram_results
    ]


    youtube_risk = (
        analyzer.calculate_ratios(youtube_sentiments)
        if youtube_sentiments
        else {
            "risk_score": 0,
            "positive_ratio": 0,
            "negative_ratio": 0,
            "neutral_ratio": 0,
        }
    )

    naver_risk = (
        analyzer.calculate_ratios(naver_sentiments)
        if naver_sentiments
        else {
            "risk_score": 0,
            "positive_ratio": 0,
            "negative_ratio": 0,
            "neutral_ratio": 0,
        }
    )

    instagram_risk = (
        analyzer.calculate_ratios(instagram_sentiments)
        if instagram_sentiments
        else {
            "risk_score": 0,
            "positive_ratio": 0,
            "negative_ratio": 0,
            "neutral_ratio": 0,
        }
    )

    # =====================================================
    # 4. 연관 인물 리스크
    # =====================================================
    registered_persons = db.query(BrandPerson).filter(
        BrandPerson.brand_id == current_user.brand_id
    ).all()

    person_names = [
        p.name for p in registered_persons
    ]

    if person_names:

        person_results = analyze_person_risks(
            brand_name=brand_name,
            person_names=person_names,
            analyzer=analyzer,
            sentiment_score_fn=analyze_comments_bulk_with_score,
        )
        person_risk_score = analyzer.calculate_person_score(
            person_results
        )


    else:

        person_results = []
        person_risk_score = 0.0

    # =====================================================
    # 5. 최종 점수
    # =====================================================

    final_risk_score = analyzer.calculate_final_score(
        risk_score,
        person_risk_score
    )

    risk_level = analyzer.get_risk_level(
        final_risk_score
    )

    # =====================================================
    # 6. Top YouTube
    # =====================================================
    top_youtube = []

    if youtube_videos:

        offset = 0
        video_scored = []

        for v in youtube_videos:

            cnt = len(v["comments"])

            sents = sentiments[offset: offset + cnt]

            offset += cnt

            neg_count = sum(
                1 for s in sents
                if s == "negative"
            )

            neg_ratio = round(
                neg_count / len(sents),
                4
            ) if sents else 0.0

            video_scored.append({
                "title": v["title"],
                "channel": v["channel"],
                "url": v["url"],
                "neg_ratio": neg_ratio,
                "comment_count": len(v["comments"]),
            })

        video_scored.sort(
            key=lambda x: x["neg_ratio"],
            reverse=True
        )

        top_youtube = video_scored[:5]

    # =====================================================
    # 7. Top 네이버
    # =====================================================
    top_naver = []

    if naver_articles:

        naver_text_list = extract_texts(
            naver_articles
        )

        scored_naver = analyze_comments_bulk_with_score(
            naver_text_list
        )

        paired = [
            {
                "title": a["title"],
                "url": a["url"],
                "pub_date": a["pub_date"],
                "neg_ratio": round(
                    s["neg_prob"],
                    4
                ),
                "taxonomy": s.get("taxonomy", {})
            }
            for a, s in zip(naver_articles, scored_naver)
        ]

        paired.sort(
            key=lambda x: x["neg_ratio"],
            reverse=True
        )

        top_naver = paired[:5]

    # =====================================================
    # 8. DB 저장
    # =====================================================
    db_record = BrandRiskAnalysis(
        brand_name=brand_name,

        total_videos=total_videos,
        total_comments=total_comments,

        positive_ratio=positive_ratio,
        negative_ratio=negative_ratio,
        neutral_ratio=neutral_ratio,

        top_keywords=None,

        risk_score=risk_score,
        risk_level=risk_level,

        final_risk_score=final_risk_score,
        person_risk_score=person_risk_score,

        taxonomy_summary=json.dumps(taxonomy_summary),
        crisis_feed=json.dumps(crisis_feed),
    )

    db.add(db_record)
    db.commit()
    db.refresh(db_record)

    for p in person_results:

        db.add(PersonRiskAnalysis(
            brand_analysis_id=db_record.id,
            person_name=p["name"],
            articles_analyzed=p["articles_analyzed"],
            positive_ratio=p["positive_ratio"],
            negative_ratio=p["negative_ratio"],
            neutral_ratio=p["neutral_ratio"],
            risk_score=p["risk_score"],
            risk_level=p["risk_level"],
            impact_message=p["impact_message"],
        ))

    db.commit()
    
    
    # =====================================================
    # 9. 최종 응답
    # =====================================================
    return {
        "brand": brand_name,

        "risk_score": final_risk_score,
        "risk_level": risk_level,

        "positive_ratio": positive_ratio,
        "negative_ratio": negative_ratio,
        "neutral_ratio": neutral_ratio,

        "total_comments": total_comments,

        "videos_analyzed": total_videos,
        "articles_analyzed": total_articles,

        "score_breakdown": {
            "brand_score": risk_score,
            "person_score": person_risk_score
        },

        "taxonomy_summary": taxonomy_summary,

        "crisis_feed": crisis_feed,

        "analyzed_comments": analyzed_results[:50],

        "person_risk": {
            "person_score": person_risk_score,
            "persons": person_results
        },
        "source_breakdown": {
    "youtube": {
        "risk_score": round(
            youtube_risk["risk_score"]
        ),
        "positive_ratio": round(
            youtube_risk["positive_ratio"] * 100
        ),
        "negative_ratio": round(
            youtube_risk["negative_ratio"] * 100
        ),
        "neutral_ratio": round(
            youtube_risk["neutral_ratio"] * 100
        ),
        "risk_level": analyzer.get_risk_level(
            youtube_risk["risk_score"]
        )
    },

    "naver": {
        "risk_score": round(
            naver_risk["risk_score"]
        ),
        "positive_ratio": round(
            naver_risk["positive_ratio"] * 100
        ),
        "negative_ratio": round(
            naver_risk["negative_ratio"] * 100
        ),
        "neutral_ratio": round(
            naver_risk["neutral_ratio"] * 100
        ),
        "risk_level": analyzer.get_risk_level(
            naver_risk["risk_score"]
        )
    },

    "instagram": {
        "risk_score": round(
            instagram_risk["risk_score"]
        ),
        "positive_ratio": round(
            instagram_risk["positive_ratio"] * 100
        ),
        "negative_ratio": round(
            instagram_risk["negative_ratio"] * 100
        ),
        "neutral_ratio": round(
            instagram_risk["neutral_ratio"] * 100
        ),
        "risk_level": analyzer.get_risk_level(
            instagram_risk["risk_score"]
        )
    }
},
        "top_content": {
            "youtube": top_youtube,
            "naver": top_naver
        }

    }