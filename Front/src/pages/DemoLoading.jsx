import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";

const T = {
  bg:        "#f0f4ff",
  blue:      "#2563eb",
  blueLight: "rgba(37,99,235,0.07)",
  blueMid:   "rgba(37,99,235,0.18)",
  purple:    "#7c3aed",
  green:     "#10b981",
  text:      "#0f172a",
  textSub:   "#64748b",
  textMuted: "#94a3b8",
  border:    "rgba(15,23,42,0.07)",
};

const STEPS = [
  { icon: "🔍", label: "온라인 데이터 수집 중",    sub: "YouTube · 네이버 뉴스 · Instagram",  duration: 1800 },
  { icon: "🧠", label: "AI 감성 분석 중",       sub: "긍부정 / 핵심 이슈 / 반응 패턴 ",             duration: 1800 },
  { icon: "📊", label: "리스크 점수 계산 중",        sub: "채널별 위험도 종합",                  duration: 1400 },
  { icon: "✨", label: "AI 브랜드 리포트 생성 중",  sub: "대응 전략 및 인사이트 도출",          duration: 1600 },
];

export default function DemoLoading() {
  const { state } = useLocation();
  const navigate  = useNavigate();
  const brand     = state?.brand ?? "브랜드";

  const [currentStep, setCurrentStep] = useState(0);
  const [progress,    setProgress]    = useState(0);
  const [done,        setDone]        = useState(false);

  // 단계별 진행
  useEffect(() => {
    let stepIndex = 0;
    let elapsed   = 0;
    const total   = STEPS.reduce((s, step) => s + step.duration, 0);

    const tick = () => {
      if (stepIndex >= STEPS.length) {
        setDone(true);
        setProgress(100);
        return;
      }
      setCurrentStep(stepIndex);

      let stepElapsed = 0;
      const interval = setInterval(() => {
        stepElapsed += 80;
        elapsed     += 80;
        setProgress(Math.min(Math.round((elapsed / total) * 100), 99));

        if (stepElapsed >= STEPS[stepIndex].duration) {
          clearInterval(interval);
          stepIndex++;
          tick();
        }
      }, 80);
    };
    tick();
  }, []);

  // 완료 후 이동
  useEffect(() => {
    if (!done) return;
    const t = setTimeout(() => navigate("/demo-result", { state: { brand } }), 600);
    return () => clearTimeout(t);
  }, [done, brand, navigate]);

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "linear-gradient(160deg,#f0f4ff 0%,#fafbff 55%,#f5f0ff 100%)",
        position: "relative", overflow: "hidden",
        fontFamily: "'Plus Jakarta Sans', sans-serif",
        display: "flex", alignItems: "center", justifyContent: "center", padding: 24,
      }}
    >
      {/* 격자 */}
      <div
        style={{
          position: "fixed", inset: 0, pointerEvents: "none", opacity: 0.3, zIndex: 0,
          backgroundImage:
            "linear-gradient(rgba(37,99,235,.06) 1px,transparent 1px),linear-gradient(90deg,rgba(37,99,235,.06) 1px,transparent 1px)",
          backgroundSize: "40px 40px",
        }}
      />

      {/* 중앙 글로우 */}
      <div
        style={{
          position: "fixed", top: "30%", left: "50%", transform: "translateX(-50%)",
          width: 600, height: 400, borderRadius: "50%",
          background: "radial-gradient(ellipse,rgba(37,99,235,0.1) 0%,transparent 70%)",
          pointerEvents: "none", zIndex: 0, filter: "blur(40px)",
        }}
      />

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        style={{ width: "100%", maxWidth: 460, position: "relative", zIndex: 1 }}
      >
        {/* 로고 */}
        <div style={{ textAlign: "center", marginBottom: 36 }}>
          <motion.div
            animate={{ scale: [1, 1.06, 1] }}
            transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
            style={{
              display: "inline-flex", alignItems: "center", justifyContent: "center",
              width: 56, height: 56, borderRadius: 16,
              background: `linear-gradient(135deg,${T.blue},${T.purple})`,
              boxShadow: "0 8px 28px rgba(37,99,235,0.35)",
              marginBottom: 16,
            }}
          >
            <span style={{ color: "#fff", fontSize: 22, fontWeight: 900 }}>R</span>
          </motion.div>

          <div style={{ color: T.text, fontSize: 18, fontWeight: 800, letterSpacing: "-0.03em" }}>
            <span
              style={{
                background: `linear-gradient(135deg,${T.blue},${T.purple})`,
                WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
              }}
            >
              {brand}
            </span>{" "}
            분석 중
          </div>
          <p style={{ color: T.textMuted, fontSize: 12, marginTop: 6 }}>
            잠시만 기다려주세요
          </p>
        </div>

        {/* 카드 */}
        <div
          style={{
            borderRadius: 24, border: `1px solid ${T.border}`,
            background: "rgba(255,255,255,0.85)", backdropFilter: "blur(24px)",
            boxShadow: "0 20px 60px rgba(37,99,235,0.10)",
            overflow: "hidden",
          }}
        >
          {/* 스트라이프 */}
          <div style={{ height: 3, background: `linear-gradient(90deg,${T.blue},${T.purple})` }} />

          <div style={{ padding: "24px 24px 28px" }}>

            {/* 전체 진행 바 */}
            <div style={{ marginBottom: 24 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <span style={{ color: T.textMuted, fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase" }}>
                  진행률
                </span>
                <span style={{ color: T.blue, fontSize: 13, fontWeight: 800 }}>{progress}%</span>
              </div>
              <div style={{ height: 6, background: "rgba(0,0,0,0.06)", borderRadius: 999, overflow: "hidden" }}>
                <motion.div
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 0.3 }}
                  style={{
                    height: "100%", borderRadius: 999,
                    background: `linear-gradient(90deg,${T.blue},${T.purple})`,
                    boxShadow: `0 0 12px rgba(37,99,235,0.4)`,
                  }}
                />
              </div>
            </div>

            {/* 단계 리스트 */}
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {STEPS.map((step, i) => {
                const isActive = i === currentStep && !done;
                const isDone   = i < currentStep || done;

                return (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: i <= currentStep || done ? 1 : 0.35, x: 0 }}
                    transition={{ duration: 0.3, delay: i * 0.05 }}
                    style={{
                      display: "flex", alignItems: "center", gap: 12,
                      padding: "10px 14px", borderRadius: 14,
                      background: isActive
                        ? "rgba(37,99,235,0.06)"
                        : isDone ? "rgba(16,185,129,0.04)" : "transparent",
                      border: isActive
                        ? `1px solid ${T.blueMid}`
                        : isDone ? "1px solid rgba(16,185,129,0.15)" : "1px solid transparent",
                      transition: "all 0.3s",
                    }}
                  >
                    {/* 아이콘 / 체크 */}
                    <div
                      style={{
                        width: 32, height: 32, borderRadius: 10, flexShrink: 0,
                        display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14,
                        background: isDone
                          ? "rgba(16,185,129,0.1)"
                          : isActive ? T.blueLight : "rgba(0,0,0,0.04)",
                        border: isDone
                          ? "1px solid rgba(16,185,129,0.2)"
                          : isActive ? `1px solid ${T.blueMid}` : "1px solid transparent",
                      }}
                    >
                      {isDone ? "✓" : step.icon}
                    </div>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          fontSize: 12, fontWeight: 700,
                          color: isDone ? T.green : isActive ? T.text : T.textMuted,
                        }}
                      >
                        {step.label}
                      </div>
                      <div style={{ fontSize: 10, color: T.textMuted, marginTop: 1 }}>{step.sub}</div>
                    </div>

                    {/* 활성 스피너 */}
                    {isActive && (
                      <div style={{ display: "flex", gap: 3, flexShrink: 0 }}>
                        {[0, 1, 2].map((j) => (
                          <motion.div
                            key={j}
                            animate={{ opacity: [0.3, 1, 0.3] }}
                            transition={{ repeat: Infinity, duration: 1.0, delay: j * 0.2 }}
                            style={{ width: 4, height: 4, borderRadius: "50%", background: T.blue }}
                          />
                        ))}
                      </div>
                    )}
                    {isDone && (
                      <span style={{ color: T.green, fontSize: 10, fontWeight: 700, flexShrink: 0 }}>완료</span>
                    )}
                  </motion.div>
                );
              })}
            </div>
          </div>
        </div>

        <p style={{ textAlign: "center", color: T.textMuted, fontSize: 11, marginTop: 16 }}>
          분석 완료 후 자동으로 이동합니다
        </p>
      </motion.div>
    </div>
  );
}