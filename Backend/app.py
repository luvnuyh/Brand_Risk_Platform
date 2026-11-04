import uuid
import json
import asyncio
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional, List
from concurrent.futures import ThreadPoolExecutor

from services.gpt_service import generate_risk_report
from services.instagram_service import fetch_instagram_data

from database import get_db, SessionLocal

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
            virality_counter[virality] = virality_counter.get(virality, 0) + 1

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

    # summary로 감싸 보내는 형식과 결과 객체를 직접 보내는 형식 모두 지원
    summary = request.get("summary", request)

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
# =====================================================
# 백그라운드 분석 작업 관리
# =====================================================
analysis_tasks = {}


def run_analysis_task(task_id: str, user_id: int):
    db = SessionLocal()

    try:
        analysis_tasks[task_id]["status"] = "running"

        user = db.query(User).filter(User.id == user_id).first()

        if not user:
            raise Exception("사용자를 찾을 수 없습니다.")

        result = analyze_brand_sync(db, user)

        analysis_tasks[task_id].update({
            "status": "completed",
            "result": result
        })

    except Exception as e:
        db.rollback()
        print("[Background Analysis Error]", repr(e))

        analysis_tasks[task_id].update({
            "status": "failed",
            "error": str(e)
        })

    finally:
        db.close()


@router.post("/analyze")
def analyze_brand(
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user)
):
    task_id = str(uuid.uuid4())

    analysis_tasks[task_id] = {
        "status": "queued",
        "user_id": current_user.id
    }

    background_tasks.add_task(
        run_analysis_task,
        task_id,
        current_user.id
    )

    return {
        "task_id": task_id,
        "status": "queued"
    }


@router.get("/analyze/status/{task_id}")
def get_analysis_status(
    task_id: str,
    current_user: User = Depends(get_current_user)
):
    task = analysis_tasks.get(task_id)

    if not task or task["user_id"] != current_user.id:
        raise HTTPException(status_code=404, detail="작업을 찾을 수 없습니다.")

    return {
        key: value
        for key, value in task.items()
        if key != "user_id"
    }


def analyze_brand_sync(
    db: Session,
    current_user: User
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

    # 채널별 텍스트 형식을 통일해 분석 결과와 정확히 매칭
    news_texts = extract_texts(naver_data.get("news_texts", []))
    blog_texts = extract_texts(naver_data.get("blog_texts", []))
    cafe_texts = extract_texts(naver_data.get("cafe_texts", []))
    instagram_texts = extract_texts(instagram_texts)

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

    # 전체 댓글을 이미 한 번 분석했으므로, 같은 모델을 채널별로
    # 다시 실행하지 않고 전체 분석 결과를 채널별로 나눠 재사용한다.
    youtube_count = len(youtube_comments)
    naver_count = len(news_texts) + len(blog_texts) + len(cafe_texts)
    instagram_count = len(instagram_texts)

    youtube_results = analyzed_results[:youtube_count]
    naver_results = analyzed_results[
        youtube_count:youtube_count + naver_count
    ]
    instagram_results = analyzed_results[
        youtube_count + naver_count:
        youtube_count + naver_count + instagram_count
    ]

    # GPT 리포트에서 원문과 플랫폼을 구분할 수 있도록 메타데이터 추가
    for index, result in enumerate(analyzed_results):
        if not isinstance(result, dict):
            continue

        if not result.get("text") and index < len(all_texts):
            result["text"] = all_texts[index]

        if index < youtube_count:
            result["platform"] = "youtube"
        elif index < youtube_count + naver_count:
            result["platform"] = "naver"
        else:
            result["platform"] = "instagram"


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

        # 위에서 분석한 네이버 결과를 재사용 (중복 추론 방지)
        scored_naver = naver_results

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

        # 전체 분석 결과를 전달해 AI 리포트가 일부 샘플에만 의존하지 않도록 함
        "analyzed_comments": analyzed_results,
        "analyzed_comments_count": len(analyzed_results),

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