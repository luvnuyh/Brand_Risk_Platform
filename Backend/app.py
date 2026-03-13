from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional, List

from database import get_db
from youtube_service import collect_brand_comments
from naver_service import collect_brand_news, get_shopping_trend, analyze_person_risks
from analysis_service import analyze_comments_bulk
from risk_service import RiskAnalyzer
from models import User, Company, Brand, BrandPerson, BrandRiskAnalysis, PersonRiskAnalysis

from auth_utils import hash_password, verify_password, create_access_token
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt

SECRET_KEY    = "secret"
ALGORITHM     = "HS256"
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="login")

router = APIRouter()


# ────────────────────────────────────────────
# 인증
# ────────────────────────────────────────────

def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = payload.get("user_id")
    except JWTError:
        raise HTTPException(status_code=401, detail="토큰 오류")

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=401, detail="사용자 없음")
    return user


# ────────────────────────────────────────────
# Request 스키마
# ────────────────────────────────────────────

class PersonInput(BaseModel):
    name: str
    role: Optional[str] = None

class SignupRequest(BaseModel):
    email:        str
    password:     str
    name:         str
    company_name: str
    brand_name:   str
    persons:      Optional[List[PersonInput]] = []   # 연관 인물 (선택)

class LoginRequest(BaseModel):
    email:    str
    password: str

class AddPersonRequest(BaseModel):
    name: str
    role: Optional[str] = None   # 앰배서더, 광고모델, 임원 등 (선택)


# ────────────────────────────────────────────
# 인증 API
# ────────────────────────────────────────────

@router.post("/login")
def login(req: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == req.email).first()
    if not user:
        raise HTTPException(status_code=400, detail="사용자 없음")
    if not verify_password(req.password, user.password):
        raise HTTPException(status_code=400, detail="비밀번호 오류")

    token = create_access_token({"user_id": user.id, "brand_id": user.brand_id})
    return {"access_token": token, "user_id": user.id, "brand_id": user.brand_id}


@router.post("/signup")
def signup(req: SignupRequest, db: Session = Depends(get_db)):
    if db.query(User).filter(User.email == req.email).first():
        raise HTTPException(status_code=400, detail="이미 존재하는 이메일")

    company = db.query(Company).filter(Company.name == req.company_name).first()
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
        brand = Brand(name=req.brand_name, company_id=company.id)
        db.add(brand)
        db.commit()
        db.refresh(brand)

    user = User(
        email=req.email,
        password=hash_password(req.password),
        name=req.name,
        company_id=company.id,
        brand_id=brand.id
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    # ✅ 연관 인물 등록 (persons가 있을 경우)
    if req.persons:
        for p in req.persons:
            # 동일 브랜드에 같은 이름이 없으면 추가
            exists = db.query(BrandPerson).filter(
                BrandPerson.brand_id == brand.id,
                BrandPerson.name == p.name
            ).first()
            if not exists:
                db.add(BrandPerson(brand_id=brand.id, name=p.name, role=p.role))
        db.commit()

    registered_count = len(req.persons) if req.persons else 0
    return {
        "message": "회원가입 성공",
        "persons_registered": registered_count
    }


# ────────────────────────────────────────────
# 연관 인물 관리 API
# ────────────────────────────────────────────

@router.get("/persons")
def get_persons(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """등록된 연관 인물 목록 조회"""
    persons = db.query(BrandPerson).filter(
        BrandPerson.brand_id == current_user.brand_id
    ).all()

    return {
        "brand": current_user.brand.name,
        "persons": [
            {"id": p.id, "name": p.name, "role": p.role}
            for p in persons
        ]
    }


@router.post("/persons")
def add_person(
    req: AddPersonRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """연관 인물 등록"""
    # 중복 체크
    existing = db.query(BrandPerson).filter(
        BrandPerson.brand_id == current_user.brand_id,
        BrandPerson.name == req.name
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="이미 등록된 인물입니다.")

    person = BrandPerson(
        brand_id=current_user.brand_id,
        name=req.name,
        role=req.role
    )
    db.add(person)
    db.commit()
    db.refresh(person)

    return {"message": f"'{req.name}' 등록 완료", "id": person.id}


@router.delete("/persons/{person_id}")
def delete_person(
    person_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """연관 인물 삭제"""
    person = db.query(BrandPerson).filter(
        BrandPerson.id == person_id,
        BrandPerson.brand_id == current_user.brand_id
    ).first()

    if not person:
        raise HTTPException(status_code=404, detail="인물을 찾을 수 없습니다.")

    db.delete(person)
    db.commit()
    return {"message": f"'{person.name}' 삭제 완료"}


# ────────────────────────────────────────────
# 분석 API
# ────────────────────────────────────────────

@router.post("/analyze")
def analyze_brand(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    brand_name = current_user.brand.name
    analyzer   = RiskAnalyzer()

    # 1️⃣ 데이터 수집 (YouTube + 네이버 뉴스)
    youtube_data = collect_brand_comments(
        brand_name=brand_name, max_videos=5, max_comments_per_video=100
    )
    naver_data = collect_brand_news(brand_name=brand_name, max_articles=100)

    youtube_comments = youtube_data["comments"]
    naver_texts      = naver_data["comments"]
    total_videos     = youtube_data["total_videos"]
    total_articles   = naver_data["total_articles"]

    all_texts      = youtube_comments + naver_texts
    total_comments = len(all_texts)

    if not all_texts:
        return {"brand": brand_name, "message": "수집된 데이터가 없습니다."}

    # 2️⃣ 감성 분석
    all_sentiments     = analyze_comments_bulk(all_texts)
    youtube_sentiments = all_sentiments[:len(youtube_comments)]
    naver_sentiments   = all_sentiments[len(youtube_comments):]

    # 3️⃣ 브랜드 리스크 분석
    combined_result = analyzer.calculate_ratios(all_sentiments)
    youtube_result  = analyzer.calculate_ratios(youtube_sentiments) if youtube_sentiments else None
    naver_result    = analyzer.calculate_ratios(naver_sentiments)   if naver_sentiments   else None

    positive_ratio = combined_result["positive_ratio"]
    negative_ratio = combined_result["negative_ratio"]
    neutral_ratio  = combined_result["neutral_ratio"]
    risk_score     = combined_result["risk_score"]

    # 4️⃣ 데이터랩 쇼핑 트렌드
    trend_result   = get_shopping_trend(brand_name)
    trend_score    = trend_result["trend_score"]
    spike_detected = trend_result["spike_detected"]

    # 5️⃣ 연관 인물 리스크 (DB에 등록된 인물만 분석)
    registered_persons = db.query(BrandPerson).filter(
        BrandPerson.brand_id == current_user.brand_id
    ).all()
    person_names = [p.name for p in registered_persons]

    if person_names:
        print(f"[PersonRisk] 등록된 인물: {person_names}")
        person_results, person_risk_score = analyze_person_risks(
            brand_name=brand_name,
            person_names=person_names,
            analyzer=analyzer,
            sentiment_fn=analyze_comments_bulk
        )
    else:
        print("[PersonRisk] 등록된 인물 없음 → 인물 리스크 스킵")
        person_results    = []
        person_risk_score = 0.0

    # 6️⃣ 최종 리스크 점수
    final_risk_score = min(100.0, risk_score + trend_score + person_risk_score)
    risk_level       = analyzer.get_risk_level(final_risk_score)

    # 7️⃣ DB 저장
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

    return {
        "brand":      brand_name,
        "risk_score": round(final_risk_score, 2),
        "risk_level": risk_level,

        "score_breakdown": {
            "brand_score":  round(risk_score, 2),
            "trend_score":  round(trend_score, 2),
            "person_score": round(person_risk_score, 2),
        },

        "positive_ratio": positive_ratio,
        "negative_ratio": negative_ratio,
        "neutral_ratio":  neutral_ratio,

        "total_comments":    total_comments,
        "videos_analyzed":   total_videos,
        "articles_analyzed": total_articles,

        "source_breakdown": {
            "youtube": {
                "total":          len(youtube_comments),
                "risk_score":     round(youtube_result["risk_score"], 2) if youtube_result else None,
                "risk_level":     youtube_result["risk_level"]           if youtube_result else None,
                "positive_ratio": youtube_result["positive_ratio"]       if youtube_result else None,
                "negative_ratio": youtube_result["negative_ratio"]       if youtube_result else None,
            },
            "naver_news": {
                "total":          len(naver_texts),
                "risk_score":     round(naver_result["risk_score"], 2)   if naver_result else None,
                "risk_level":     naver_result["risk_level"]             if naver_result else None,
                "positive_ratio": naver_result["positive_ratio"]         if naver_result else None,
                "negative_ratio": naver_result["negative_ratio"]         if naver_result else None,
            }
        },

        "shopping_trend": {
            "spike_detected": spike_detected,
            "spike_ratio":    trend_result["spike_ratio"],
            "trend_score":    trend_result["trend_score"],
            "trend_data":     trend_result["trend_data"],
        },

        "person_risk": {
            "detected":     len(person_results) > 0,
            "person_score": person_risk_score,
            "persons":      person_results,
        }
    }