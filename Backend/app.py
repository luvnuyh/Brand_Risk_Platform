from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel

from database import get_db
from youtube_service import collect_brand_comments
from analysis_service import analyze_comments_bulk, extract_top_keywords
from risk_service import RiskAnalyzer
from models import User, Company, Brand, BrandRiskAnalysis

from auth_utils import hash_password, verify_password, create_access_token
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt

SECRET_KEY = "secret"
ALGORITHM = "HS256"
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="login")

router = APIRouter()

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


class AnalyzeRequest(BaseModel):
    brand_name: str

class SignupRequest(BaseModel):
    email: str
    password: str
    name: str
    company_name: str
    brand_name: str

class LoginRequest(BaseModel):
    email: str
    password: str


@router.post("/login")
def login(req: LoginRequest, db: Session = Depends(get_db)):

    user = db.query(User).filter(User.email == req.email).first()

    if not user:
        raise HTTPException(status_code=400, detail="사용자 없음")

    if not verify_password(req.password, user.password):
        raise HTTPException(status_code=400, detail="비밀번호 오류")

    token = create_access_token({
        "user_id": user.id,
        "brand_id": user.brand_id
    })

    return {
        "access_token": token,
        "user_id": user.id,
        "brand_id": user.brand_id
    }

@router.post("/signup")
def signup(req: SignupRequest, db: Session = Depends(get_db)):

    # 이메일 중복 확인
    if db.query(User).filter(User.email == req.email).first():
        raise HTTPException(status_code=400, detail="이미 존재하는 이메일")

    # 회사 확인 or 생성
    company = db.query(Company).filter(
        Company.name == req.company_name
    ).first()

    if not company:
        company = Company(name=req.company_name)
        db.add(company)
        db.commit()
        db.refresh(company)

    # 브랜드 확인 or 생성
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

    # 사용자 생성
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

    print("password:", req.password)
    print("type:", type(req.password))
    print("length:", len(req.password))

    return {"message": "회원가입 성공"}

@router.post("/analyze")
def analyze_brand(
    request: AnalyzeRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)   # ⭐ 추가
):
    brand_name = current_user.brand.name

    # 1️⃣ 영상 + 댓글 수집
    comments_data = collect_brand_comments(
        brand_name=brand_name,
        max_videos=5,
        max_comments_per_video=100
    )

    total_videos = comments_data["total_videos"]
    all_comments = comments_data["comments"]

    if not all_comments:
        return {
            "brand": brand_name,
            "message": "댓글이 없습니다."
        }

    # 2️⃣ 감정 분석 (1차 모델 + 조건부 GPT)
    sentiments = analyze_comments_bulk(all_comments)

    # 3️⃣ 리스크 분석
    analyzer = RiskAnalyzer()
    risk_result = analyzer.calculate_ratios(sentiments)

    positive_ratio = risk_result["positive_ratio"]
    negative_ratio = risk_result["negative_ratio"]
    neutral_ratio = risk_result["neutral_ratio"]
    risk_score = risk_result["risk_score"]

    total_comments = len(all_comments)

# 4️⃣ 키워드 추출 (전체 댓글 기준 상위 10%)
    top_keywords = extract_top_keywords(all_comments, top_percent=0.1, max_keywords=10)

    # 4️⃣ DB 저장
    db_record = BrandRiskAnalysis(
        brand_name=brand_name,
        total_videos=total_videos,
        total_comments=total_comments,
        positive_ratio=positive_ratio,
        negative_ratio=negative_ratio,
        neutral_ratio=neutral_ratio,
        top_keywords=str(top_keywords),
        risk_score=risk_score
    )

    db.add(db_record)
    db.commit()

    return {
        "brand": brand_name,
        "videos_analyzed": total_videos,
        "total_comments": total_comments,
        "risk_score": risk_score,
        "positive_ratio": positive_ratio,
        "negative_ratio": negative_ratio,
        "neutral_ratio": neutral_ratio,
        "top_keywords": top_keywords
    }