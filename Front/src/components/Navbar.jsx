import { Link, useNavigate } from "react-router-dom";
import logo from "../assets/logo.png";

const BTN = {
  base: {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    padding: "8px 16px",
    borderRadius: 10,
    fontSize: 12,
    fontWeight: 600,
    cursor: "pointer",
    fontFamily: "'DM Sans', 'Pretendard', 'Apple SD Gothic Neo', sans-serif",
    textDecoration: "none",
    lineHeight: 1,
    whiteSpace: "nowrap",
    border: "none",
    transition: "opacity 0.15s",
  },
  blue: {
    background: "rgba(37,99,235,0.08)",
    color: "#2563eb",
    border: "1px solid rgba(37,99,235,0.18)",
  },
  gray: {
    background: "rgba(0,0,0,0.04)",
    color: "#64748b",
    border: "1px solid rgba(0,0,0,0.07)",
  },
  red: {
    background: "rgba(239,68,68,0.07)",
    color: "#ef4444",
    border: "1px solid rgba(239,68,68,0.18)",
  },
  primary: {
    background: "#2563eb",
    color: "#fff",
    boxShadow: "0 3px 12px rgba(37,99,235,0.3)",
  },
  ghost: {
    background: "rgba(0,0,0,0.04)",
    color: "#64748b",
    border: "1px solid rgba(0,0,0,0.07)",
  },
};

function clearAllBrandCache() {
  Object.keys(localStorage).forEach((key) => {
    if (key.startsWith("brandRiskCache_") || key.startsWith("brandRiskAiReport_")) {
      localStorage.removeItem(key);
    }
  });
}

/**
 * props (대시보드에서 확장 사용 시):
 *   brand       — 모니터링 중 뱃지 텍스트
 *   onRefresh   — 재분석 버튼 핸들러
 *   onInvite    — 초대 버튼 핸들러
 *   onExportPdf — PDF 버튼 핸들러
 *   pdfLoading  — PDF 저장 중 여부
 */
export default function Navbar({
  brand,
  onRefresh,
  onInvite,
  onExportPdf,
  pdfLoading,
}) {
  const navigate = useNavigate();
  const token = localStorage.getItem("token");

  const handleLogout = () => {
    clearAllBrandCache();
    localStorage.removeItem("token");
    localStorage.removeItem("currentBrand");
    navigate("/");
    window.location.reload();
  };

  return (
    <header
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100%",
        zIndex: 9999,
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        background: "rgba(248,250,255,0.88)",
        borderBottom: "1px solid rgba(0,0,0,0.07)",
        fontFamily: "'DM Sans', 'Pretendard', 'Apple SD Gothic Neo', sans-serif",
      }}
    >
      <div
        style={{
          maxWidth: 1280,
          margin: "0 auto",
          padding: "0 32px",
          height: 64,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
      <Link to="/" style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none" }}>
        <img 
          src={logo} 
          alt="RISKLENS" 
          style={{ width: 32, height: 32, objectFit: "contain" }} 
        />
        <span style={{ fontSize: 18, fontWeight: 800, color: "#0f172a", letterSpacing: ".03em", lineHeight: 1 }}>
          RISK<span style={{ color: "#2563eb" }}>LENS</span>
        </span>
      </Link>

        {/* 중앙 — 모니터링 뱃지 (대시보드에서만 표시) */}
        {brand && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "5px 14px",
              borderRadius: 999,
              background: "rgba(37,99,235,0.07)",
              border: "1px solid rgba(37,99,235,0.15)",
            }}
          >
            <div
              style={{
                width: 6,
                height: 6,
                borderRadius: "50%",
                background: "#2563eb",
                animation: "navBlink 2s infinite",
              }}
            />
            <span style={{ fontSize: 12, fontWeight: 600, color: "#2563eb" }}>
              {brand} 모니터링 중
            </span>
          </div>
        )}

        {/* 우측 버튼 영역 */}
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {token ? (
            /* 로그인 상태 */
            <>
              {/* 대시보드 전용 액션 버튼들 */}
              {onExportPdf && (
                <button
                  onClick={onExportPdf}
                  disabled={pdfLoading}
                  style={{ ...BTN.base, ...BTN.red, opacity: pdfLoading ? 0.5 : 1 }}
                >
                  📄 {pdfLoading ? "저장 중..." : "PDF"}
                </button>
              )}
              {onInvite && (
                <button onClick={onInvite} style={{ ...BTN.base, ...BTN.blue }}>
                  👥 초대
                </button>
              )}
              {onRefresh && (
                <button onClick={onRefresh} style={{ ...BTN.base, ...BTN.ghost }}>
                  🔄 재분석
                </button>
              )}

              {/* 항상 표시 */}
              {!onRefresh && (
                <Link to="/dashboard" style={{ ...BTN.base, ...BTN.blue }}>
                  대시보드
                </Link>
              )}
              <button onClick={handleLogout} style={{ ...BTN.base, ...BTN.red }}>
                로그아웃
              </button>
            </>
          ) : (
            /* 비로그인 상태 */
            <>
              <Link to="/login" style={{ ...BTN.base, ...BTN.gray }}>
                로그인
              </Link>
              <Link to="/signup" style={{ ...BTN.base, ...BTN.primary }}>
                시작하기
              </Link>
            </>
          )}
        </div>
      </div>

      {/* blink 애니메이션 (모니터링 뱃지용) */}
      <style>{`@keyframes navBlink { 0%,100%{opacity:1} 50%{opacity:0.3} }`}</style>
    </header>
  );
}