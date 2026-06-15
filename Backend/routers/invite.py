from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from sqlalchemy.orm import Session
from pydantic import BaseModel, EmailStr
from datetime import datetime, timedelta

from database import get_db
from models import User, Brand, Invitation
from utils.jwt_utils import create_invite_token, verify_invite_token
from services.email_service import send_invite_email
from dependencies import get_current_user   # 기존 인증 의존성

router = APIRouter(tags=["invite"])


# ── 스키마 ──────────────────────────────────────────────────
class InviteRequest(BaseModel):
    email: EmailStr

class InviteResponse(BaseModel):
    message: str
    email: str

class AcceptResponse(BaseModel):
    message: str
    brand_id: int
    redirect: str   # 프론트에서 이동할 경로


# ── 1. 초대 발송 ─────────────────────────────────────────────
@router.post("", response_model=InviteResponse)
async def send_invite(
    body: InviteRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    me:  User   = Depends(get_current_user)
):
    # 플랜 체크
    if me.plan != "pro":
        raise HTTPException(status_code=403, detail="팀원 초대는 프로 플랜 이상 사용 가능합니다")

    # 브랜드 확인
    if not me.brand_id:
        raise HTTPException(status_code=400, detail="소속 브랜드가 없습니다")

    brand = db.query(Brand).filter(Brand.id == me.brand_id).first()
    if not brand:
        raise HTTPException(status_code=404, detail="브랜드를 찾을 수 없습니다")

    # 본인 초대 방지
    if me.email == body.email:
        raise HTTPException(status_code=400, detail="본인에게 초대장을 보낼 수 없습니다")

    # 이미 팀원인지 확인
    already_member = db.query(User).filter(
        User.email    == body.email,
        User.brand_id == me.brand_id
    ).first()
    if already_member:
        raise HTTPException(status_code=409, detail="이미 팀에 소속된 멤버입니다")

    # 중복 pending 초대 확인
    dup = db.query(Invitation).filter(
        Invitation.brand_id == me.brand_id,
        Invitation.email    == body.email,
        Invitation.status   == "pending",
        Invitation.expires_at > datetime.utcnow()
    ).first()
    if dup:
        raise HTTPException(status_code=409, detail="이미 초대장을 발송한 이메일입니다")

    # 토큰 & DB 저장
    token      = create_invite_token(me.brand_id, body.email)
    expires_at = datetime.utcnow() + timedelta(hours=48)

    invitation = Invitation(
        brand_id   = me.brand_id,
        inviter_id = me.id,
        email      = body.email,
        token      = token,
        expires_at = expires_at
    )
    db.add(invitation)
    db.commit()

    # 이메일은 백그라운드로 (API 응답 빠르게)
    background_tasks.add_task(
        send_invite_email,
        to_email     = body.email,
        brand_name   = brand.name,
        inviter_name = me.name,
        token        = token
    )

    return InviteResponse(message="초대장을 발송했습니다", email=body.email)


# ── 2. 초대 수락 (기존 회원) ──────────────────────────────────
@router.get("/accept")
async def accept_invite(
    token: str,
    db:   Session = Depends(get_db),
    me:   User    = Depends(get_current_user)
):
    try:
        payload = verify_invite_token(token)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    brand_id     = payload["brand_id"]
    invited_email = payload["email"]

    # 토큰의 이메일 == 현재 로그인 유저 확인
    if me.email != invited_email:
        raise HTTPException(status_code=403, detail="초대받은 이메일과 로그인 계정이 다릅니다")

    invitation = db.query(Invitation).filter(
        Invitation.token      == token,
        Invitation.status     == "pending",
        Invitation.expires_at >  datetime.utcnow()
    ).first()

    if not invitation:
        raise HTTPException(status_code=404, detail="유효하지 않거나 만료된 초대입니다")

    # 팀 합류: user의 brand_id 업데이트
    me.brand_id          = brand_id
    invitation.status    = "accepted"
    db.commit()

    brand = db.query(Brand).filter(Brand.id == brand_id).first()
    return AcceptResponse(
        message  = f"{brand.name} 팀에 합류했습니다!",
        brand_id = brand_id,
        redirect = f"/dashboard"
    )


# ── 3. 토큰 유효성 사전 확인 (회원가입 전 프론트에서 호출) ────────
@router.get("/verify")
async def verify_invite(token: str, db: Session = Depends(get_db)):
    """
    /register?invite_token=xxx 진입 시 프론트가 먼저 호출.
    가입 완료 후 자동 brand 합류에 필요한 정보 반환.
    """
    try:
        payload = verify_invite_token(token)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    brand = db.query(Brand).filter(Brand.id == payload["brand_id"]).first()
    if not brand:
        raise HTTPException(status_code=404, detail="브랜드를 찾을 수 없습니다")

    # DB pending 확인
    inv = db.query(Invitation).filter(
        Invitation.token      == token,
        Invitation.status     == "pending",
        Invitation.expires_at >  datetime.utcnow()
    ).first()
    if not inv:
        raise HTTPException(status_code=404, detail="이미 사용됐거나 만료된 초대입니다")

    return {
        "email":      payload["email"],
        "brand_id":   payload["brand_id"],
        "brand_name": brand.name
    }