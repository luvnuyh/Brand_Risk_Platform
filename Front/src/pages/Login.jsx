import { useState } from "react";
import { login } from "../api/auth";
import { useNavigate, Link } from "react-router-dom";
import logo from "../assets/logo.png";   // ← logo.png import 추가

const T = {
  text: "#0f172a",
  textSub: "#64748b",
  textMuted: "#94a3b8",
  blue: "#2563eb",
  border: "rgba(0,0,0,0.07)",
};

export default function Login() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: "", password: "" });
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const data = await login(form);
      localStorage.setItem("token", data.token);
      navigate("/dashboard");
    } catch {
      alert("로그인 실패");
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => { if (e.key === "Enter") handleSubmit(); };

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "88px 24px 40px",
        background: "linear-gradient(160deg, #f0f6ff 0%, #fafbff 50%, #f5f0ff 100%)",
        fontFamily: "'DM Sans', 'Pretendard', 'Apple SD Gothic Neo', sans-serif",
      }}
    >
      {/* 그리드 배경 */}
      <div
        style={{
          position: "fixed",
          inset: 0,
          pointerEvents: "none",
          opacity: 0.4,
          backgroundImage:
            "linear-gradient(rgba(37,99,235,.06) 1px, transparent 1px), linear-gradient(90deg, rgba(37,99,235,.06) 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }}
      />

      <div
        style={{
          position: "relative",
          width: "100%",
          maxWidth: 420,
          background: "rgba(255,255,255,0.82)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          border: "1px solid rgba(0,0,0,0.07)",
          borderRadius: 24,
          padding: "40px 36px",
          boxShadow: "0 8px 40px rgba(37,99,235,0.08), 0 2px 8px rgba(0,0,0,0.04)",
        }}
      >
        {/* 상단 컬러 라인 */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: 3,
            background: "linear-gradient(90deg, #2563eb, #7c3aed)",
            borderRadius: "24px 24px 0 0",
          }}
        />

        {/* 로고 — logo.png로 변경 */}
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 32 }}>
          <img 
            src={logo} 
            alt="RiskLENS" 
            style={{ 
              width: 48, 
              height: 48, 
              objectFit: "contain" 
            }} 
          />
        </div>

        <h2
          style={{
            color: T.text,
            fontSize: 22,
            fontWeight: 800,
            textAlign: "center",
            letterSpacing: "-0.02em",
            margin: "0 0 6px",
          }}
        >
          로그인
        </h2>
        <p style={{ color: T.textMuted, fontSize: 13, textAlign: "center", margin: "0 0 28px" }}>
          RISKLENS에 오신 걸 환영합니다
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <input
            name="email"
            type="email"
            placeholder="이메일"
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            style={{
              width: "100%",
              padding: "11px 14px",
              borderRadius: 12,
              border: "1px solid rgba(37,99,235,0.15)",
              background: "rgba(37,99,235,0.03)",
              color: T.text,
              fontSize: 13,
              outline: "none",
              fontFamily: "inherit",
              boxSizing: "border-box",
            }}
          />
          <input
            name="password"
            type="password"
            placeholder="비밀번호"
            autoComplete="current-password"
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            style={{
              width: "100%",
              padding: "11px 14px",
              borderRadius: 12,
              border: "1px solid rgba(37,99,235,0.15)",
              background: "rgba(37,99,235,0.03)",
              color: T.text,
              fontSize: 13,
              outline: "none",
              fontFamily: "inherit",
              boxSizing: "border-box",
            }}
          />

          <button
            onClick={handleSubmit}
            disabled={loading}
            style={{
              width: "100%",
              padding: "12px 0",
              borderRadius: 12,
              background: loading ? "rgba(37,99,235,0.5)" : "#2563eb",
              border: "none",
              cursor: loading ? "not-allowed" : "pointer",
              color: "#fff",
              fontSize: 13,
              fontWeight: 700,
              fontFamily: "inherit",
              boxShadow: "0 4px 14px rgba(37,99,235,0.3)",
              transition: "opacity 0.15s",
              marginTop: 4,
            }}
          >
            {loading ? "로그인 중..." : "로그인"}
          </button>
        </div>

        <p style={{ color: T.textMuted, fontSize: 12, textAlign: "center", marginTop: 20 }}>
          계정이 없으신가요?{" "}
          <Link
            to="/signup"
            style={{ color: T.blue, fontWeight: 600, textDecoration: "none" }}
          >
            회원가입
          </Link>
        </p>
      </div>
    </div>
  );
}