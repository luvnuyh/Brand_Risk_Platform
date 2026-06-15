import smtplib, os
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

SMTP_HOST    = os.getenv("SMTP_HOST", "smtp.gmail.com")
SMTP_PORT    = int(os.getenv("SMTP_PORT", 587))
SMTP_USER    = os.getenv("SMTP_USER")       # Gmail 주소
SMTP_PASS    = os.getenv("SMTP_PASS")       # Gmail 앱 비밀번호
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:3000")


def send_invite_email(to_email: str, brand_name: str, inviter_name: str, token: str):
    # 미가입자 → /register?token=xxx  /  가입자 → /accept-invite?token=xxx
    # 프론트에서 /register 진입 시 token 파라미터 있으면 가입 후 자동 합류 처리
    accept_url   = f"{FRONTEND_URL}/accept-invite?token={token}"
    register_url = f"{FRONTEND_URL}/register?invite_token={token}"

    html = f"""
    <div style="font-family:'Apple SD Gothic Neo',Arial,sans-serif;max-width:560px;margin:0 auto;background:#f8fafc;border-radius:16px;overflow:hidden;">
      <div style="background:linear-gradient(135deg,#2563eb,#7c3aed);padding:28px 32px;">
        <h1 style="color:#fff;font-size:20px;margin:0;font-weight:800;">🔔 RiskRens 팀 초대</h1>
      </div>
      <div style="padding:28px 32px;background:#fff;">
        <p style="color:#1e293b;font-size:15px;line-height:1.6;">
          <strong>{inviter_name}</strong>님이 <strong style="color:#2563eb;">{brand_name}</strong> 브랜드 팀에 초대했습니다.
        </p>
        <p style="color:#64748b;font-size:13px;">이 링크는 <strong>48시간</strong> 동안 유효합니다.</p>

        <!-- 기존 회원 -->
        <a href="{accept_url}"
           style="display:block;text-align:center;padding:14px;background:#2563eb;
                  color:#fff;text-decoration:none;border-radius:10px;font-weight:700;
                  font-size:14px;margin:20px 0 10px;">
          ✅ 초대 수락하기 (기존 회원)
        </a>

        <!-- 신규 회원 -->
        <a href="{register_url}"
           style="display:block;text-align:center;padding:14px;background:#f1f5f9;
                  color:#2563eb;text-decoration:none;border-radius:10px;font-weight:700;
                  font-size:14px;border:1px solid #e2e8f0;">
          🆕 회원가입 후 팀 합류하기
        </a>

        <p style="color:#94a3b8;font-size:11px;margin-top:20px;text-align:center;">
          버튼이 안 눌리면 아래 링크를 복사하세요<br/>
          <span style="color:#2563eb;">{accept_url}</span>
        </p>
      </div>
    </div>
    """

    msg = MIMEMultipart("alternative")
    msg["Subject"] = f"[RiskRens] {brand_name} 팀 초대장이 도착했습니다"
    msg["From"]    = f"RiskRens <{SMTP_USER}>"
    msg["To"]      = to_email
    msg.attach(MIMEText(html, "html", "utf-8"))

    with smtplib.SMTP(SMTP_HOST, SMTP_PORT) as s:
        s.starttls()
        s.login(SMTP_USER, SMTP_PASS)
        s.sendmail(SMTP_USER, to_email, msg.as_string())