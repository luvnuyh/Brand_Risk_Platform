import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Search, Sparkles } from "lucide-react";

const T = {
  bg:         "#f0f4ff",
  bgCard:     "rgba(255,255,255,0.85)",
  border:     "rgba(15,23,42,0.07)",
  borderBlue: "rgba(37,99,235,0.15)",
  blue:       "#2563eb",
  blueLight:  "rgba(37,99,235,0.07)",
  blueMid:    "rgba(37,99,235,0.18)",
  purple:     "#7c3aed",
  text:       "#0f172a",
  textSub:    "#64748b",
  textMuted:  "#94a3b8",
};

const SUGGESTIONS = ["스타벅스", "삼성전자", "카카오", "현대자동차", "쿠팡"];

export default function DemoInput() {
  const [brand, setBrand] = useState("");
  const navigate = useNavigate();

  const handleStart = (value) => {
    const target = (value ?? brand).trim();
    if (!target) return;
    navigate("/demo-loading", { state: { brand: target } });
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "linear-gradient(160deg,#f0f4ff 0%,#fafbff 55%,#f5f0ff 100%)",
        position: "relative",
        overflow: "hidden",
        fontFamily: "'Plus Jakarta Sans', sans-serif",
      }}
    >
      {/* 격자 패턴 */}
      <div
        style={{
          position: "fixed", inset: 0, pointerEvents: "none", opacity: 0.3, zIndex: 0,
          backgroundImage:
            "linear-gradient(rgba(37,99,235,.06) 1px,transparent 1px),linear-gradient(90deg,rgba(37,99,235,.06) 1px,transparent 1px)",
          backgroundSize: "40px 40px",
        }}
      />

      {/* 상단 글로우 */}
      <div
        style={{
          position: "fixed", top: 0, left: "50%", transform: "translateX(-50%)",
          width: 700, height: 350, borderRadius: "50%",
          background: "radial-gradient(ellipse at top,rgba(37,99,235,0.12) 0%,transparent 70%)",
          pointerEvents: "none", zIndex: 0,
        }}
      />

      <div
        style={{
          minHeight: "100vh", display: "flex", alignItems: "center",
          justifyContent: "center", padding: "24px", position: "relative", zIndex: 1,
        }}
      >
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          style={{ width: "100%", maxWidth: 520 }}
        >
          {/* 로고 뱃지 */}
          <div style={{ textAlign: "center", marginBottom: 32 }}>
            <div
              style={{
                display: "inline-flex", alignItems: "center", gap: 8,
                padding: "6px 14px", borderRadius: 999,
                background: T.blueLight, border: `1px solid ${T.blueMid}`,
                marginBottom: 20,
              }}
            >
              <div
                style={{
                  width: 20, height: 20, borderRadius: 6,
                  background: `linear-gradient(135deg,${T.blue},${T.purple})`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}
              >
                <span style={{ color: "#fff", fontSize: 10, fontWeight: 800 }}>R</span>
              </div>
              <span style={{ color: T.blue, fontSize: 11, fontWeight: 800, letterSpacing: "0.12em", textTransform: "uppercase" }}>
                RISKLENS Demo
              </span>
            </div>

            <h1
              style={{
                color: T.text, fontSize: 34, fontWeight: 900,
                letterSpacing: "-0.05em", lineHeight: 1.1, margin: 0,
              }}
            >
              브랜드 리스크를
              <br />
              <span
                style={{
                  background: `linear-gradient(135deg,${T.blue},${T.purple})`,
                  WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
                }}
              >
                AI로 감지
              </span>
              하다
            </h1>
            <p style={{ color: T.textSub, fontSize: 14, marginTop: 12, lineHeight: 1.65 }}>
              데모 체험 페이지 입니다.
            </p>
          </div>

          {/* 카드 */}
          <div
            style={{
              borderRadius: 24, border: `1px solid ${T.border}`,
              background: T.bgCard, backdropFilter: "blur(24px)",
              boxShadow: "0 20px 60px rgba(37,99,235,0.10), 0 1px 0 rgba(255,255,255,0.9) inset",
              overflow: "hidden",
            }}
          >
            {/* 상단 컬러 스트라이프 */}
            <div
              style={{
                height: 3,
                background: `linear-gradient(90deg,${T.blue},${T.purple},${T.blue})`,
              }}
            />

            <div style={{ padding: "28px 28px 24px" }}>
              <label
                style={{
                  display: "block", fontSize: 10, fontWeight: 800,
                  letterSpacing: "0.14em", textTransform: "uppercase",
                  color: T.textMuted, marginBottom: 8,
                }}
              >
                브랜드명 입력
              </label>

              {/* 인풋 */}
              <div style={{ position: "relative", marginBottom: 12 }}>
                <Search
                  size={15}
                  color={T.textMuted}
                  style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }}
                />
                <input
                  value={brand}
                  onChange={(e) => setBrand(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleStart()}
                  placeholder="예: 스타벅스, 삼성전자 …"
                  style={{
                    width: "100%", padding: "13px 14px 13px 38px",
                    borderRadius: 14, outline: "none",
                    background: "rgba(255,255,255,0.9)",
                    border: `1.5px solid ${T.borderBlue}`,
                    color: T.text, fontSize: 14, fontFamily: "inherit",
                    boxSizing: "border-box",
                    boxShadow: "inset 0 1px 0 rgba(255,255,255,0.8)",
                    transition: "border-color 0.2s",
                  }}
                  onFocus={(e) => (e.target.style.borderColor = T.blue)}
                  onBlur={(e) => (e.target.style.borderColor = T.borderBlue)}
                />
              </div>

              {/* 추천 태그 */}
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 20 }}>
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    onClick={() => handleStart(s)}
                    style={{
                      padding: "5px 12px", borderRadius: 999, fontSize: 11, fontWeight: 600,
                      background: T.blueLight, border: `1px solid ${T.blueMid}`,
                      color: T.blue, cursor: "pointer", fontFamily: "inherit",
                      transition: "all 0.15s",
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = T.blueMid; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = T.blueLight; }}
                  >
                    {s}
                  </button>
                ))}
              </div>

              {/* 분석 시작 버튼 */}
              <button
                onClick={() => handleStart()}
                disabled={!brand.trim()}
                style={{
                  width: "100%", padding: "13px 0", borderRadius: 14,
                  border: "none", cursor: brand.trim() ? "pointer" : "not-allowed",
                  background: brand.trim()
                    ? `linear-gradient(135deg,${T.blue} 0%,${T.purple} 100%)`
                    : "rgba(15,23,42,0.08)",
                  color: brand.trim() ? "#fff" : T.textMuted,
                  fontSize: 13, fontWeight: 700, fontFamily: "inherit",
                  boxShadow: brand.trim() ? "0 8px 24px rgba(37,99,235,0.28)" : "none",
                  transition: "all 0.2s",
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 7,
                }}
              >
                <Sparkles size={14} />
                분석 시작
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}