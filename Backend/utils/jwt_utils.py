from datetime import datetime, timedelta
from jose import JWTError, jwt
import os

SECRET_KEY  = os.getenv("SECRET_KEY", "secret")
ALGORITHM   = "HS256"

def create_invite_token(brand_id: int, email: str) -> str:
    expire = datetime.utcnow() + timedelta(hours=48)
    payload = {
        "brand_id": brand_id,
        "email":    email,
        "type":     "invite",
        "exp":      expire
    }
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)

def verify_invite_token(token: str) -> dict:
    """
    반환: {"brand_id": int, "email": str}
    실패: ValueError 발생
    """
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        if payload.get("type") != "invite":
            raise ValueError("유효하지 않은 토큰입니다")
        return payload
    except JWTError:
        raise ValueError("초대 링크가 만료되었거나 유효하지 않습니다")