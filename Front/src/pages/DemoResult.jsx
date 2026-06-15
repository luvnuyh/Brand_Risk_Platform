import { useLocation, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  MessageCircle, AlertTriangle, TrendingDown,
  Sparkles, ShieldAlert, ArrowRight,
} from "lucide-react";
import {
  ResponsiveContainer, PieChart, Pie, Cell,
} from "recharts";

const T = {
  bg:         "#f0f4ff",
  bgCard:     "rgba(255,255,255,0.85)",
  border:     "rgba(15,23,42,0.07)",
  borderBlue: "rgba(37,99,235,0.15)",
  blue:       "#2563eb",
  blueLight:  "rgba(37,99,235,0.07)",
  blueMid:    "rgba(37,99,235,0.18)",
  purple:     "#7c3aed",
  green:      "#10b981",
  orange:     "#f97316",
  red:        "#ef4444",
  text:       "#0f172a",
  textSub:    "#64748b",
  textMuted:  "#94a3b8",
};

const RISK_META = {
  low:      { label: "안정", color: "#10b981", bg: "rgba(16,185,129,0.08)",  border: "rgba(16,185,129,0.22)",  glow: "rgba(16,185,129,0.18)"  },
  moderate: { label: "주의", color: "#f59e0b", bg: "rgba(245,158,11,0.08)",  border: "rgba(245,158,11,0.22)",  glow: "rgba(245,158,11,0.18)"  },
  high:     { label: "경고", color: "#f97316", bg: "rgba(249,115,22,0.08)",  border: "rgba(249,115,22,0.22)",  glow: "rgba(249,115,22,0.18)"  },
  critical: { label: "위기", color: "#ef4444", bg: "rgba(239,68,68,0.08)",   border: "rgba(239,68,68,0.22)",   glow: "rgba(239,68,68,0.18)"   },
};

const fadeUp  = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] } } };
const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.09 } } };

// ─── 공통 카드 ─────────────────────────────────────────────────
function Card({ children, style = {} }) {
  return (
    <div
      style={{
        borderRadius: 20, border: `1px solid ${T.border}`,
        background: T.bgCard, backdropFilter: "blur(20px)",
        boxShadow: "0 4px 24px rgba(37,99,235,0.07)",
        padding: "20px 22px",
        ...style,
      }}
    >
      {children}
    </div>
  );
}

// ─── KPI 칩 ────────────────────────────────────────────────────
function KpiChip({ icon: Icon, label, value, color }) {
  return (
    <div
      style={{
        display: "flex", flexDirection: "column", alignItems: "center",
        padding: "14px 10px", borderRadius: 16, textAlign: "center",
        background: `${color}0d`, border: `1px solid ${color}22`, flex: 1,
      }}
    >
      <Icon size={13} color={color} style={{ marginBottom: 6 }} />
      <div style={{ color, fontSize: 17, fontWeight: 900, lineHeight: 1, letterSpacing: "-0.04em" }}>{value}</div>
      <div style={{ color: T.textMuted, fontSize: 9, marginTop: 4, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase" }}>{label}</div>
    </div>
  );
}

export default function DemoResult() {
  const { state } = useLocation();
  const navigate  = useNavigate();
  const brand     = state?.brand ?? "Sample Brand";

  // 데모 고정값
  const riskScore    = 47;
  const riskLevel    = "moderate";
  const rm           = RISK_META[riskLevel];
  const sentiment    = { positive: 11, neutral: 49, negative: 40 };
  const totalComment = 1257;
  const topChannel   = "YouTube";

  const pieData = [
    { name: "긍정", value: sentiment.positive, color: T.green },
    { name: "중립", value: sentiment.neutral,  color: "#e2e8f0" },
    { name: "부정", value: sentiment.negative, color: T.red },
  ];

  const sources = [
    { name: "YouTube",   icon: "▶", score: 58, level: "high",     positive: 10, negative: 55 },
    { name: "Naver",     icon: "📰", score: 19, level: "moderate", positive: 22, negative: 30 },
    { name: "Instagram", icon: "📸", score: 0,  level: "low",      positive: 80, negative: 5  },
  ];

  const issues = [
    { label: "윤리 논란",  pct: 50, color: T.red,    icon: "⚖️", desc: "기업 윤리·사회적 책임 이슈" },
    { label: "허위 광고",  pct: 50, color: T.orange, icon: "📢", desc: "광고와 실제 경험 간 괴리" },
  ];

  const actions = [
    { label: "구매 비추천", pct: 38, color: T.red,    icon: "🚫", desc: "타 소비자에게 비구매 권고" },
    { label: "불매 운동",   pct: 25, color: "#dc2626", icon: "✊", desc: "불매 의사 표명 증가" },
    { label: "SNS 조롱",    pct: 25, color: T.orange, icon: "😂", desc: "밈·조롱성 콘텐츠 확산" },
  ];

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "linear-gradient(160deg,#f0f4ff 0%,#fafbff 55%,#f5f0ff 100%)",
        position: "relative", overflow: "hidden",
        fontFamily: "'Plus Jakarta Sans', sans-serif",
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
      {/* 글로우 */}
      <div
        style={{
          position: "fixed", top: 60, left: "50%", transform: "translateX(-50%)",
          width: 700, height: 300, borderRadius: "50%",
          background: `radial-gradient(ellipse at top,${rm.glow} 0%,transparent 70%)`,
          pointerEvents: "none", zIndex: 0, transition: "background 1s",
        }}
      />

      <div style={{ maxWidth: 960, margin: "0 auto", padding: "72px 24px 60px", position: "relative", zIndex: 1 }}>
        <motion.div variants={stagger} initial="hidden" animate="show">

          {/* ── 히어로 카드 ── */}
          <motion.div
            variants={fadeUp}
            style={{
              position: "relative", borderRadius: 24, overflow: "hidden",
              marginBottom: 14,
              background: "rgba(255,255,255,0.82)",
              border: `1px solid ${rm.border}`,
              backdropFilter: "blur(24px)",
              boxShadow: `0 4px 32px ${rm.glow}, 0 1px 0 rgba(255,255,255,0.9) inset`,
            }}
          >
            {/* 스트라이프 */}
            <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: `linear-gradient(90deg,${rm.color},#7c3aed,#2563eb)` }} />
            {/* 배경 글로우 */}
            <div style={{ position: "absolute", top: -60, right: -40, width: 300, height: 300, background: `radial-gradient(circle,${rm.glow},transparent 70%)`, pointerEvents: "none", filter: "blur(40px)" }} />

            <div style={{ padding: "20px 24px 18px", position: "relative", zIndex: 1 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 16 }}>

                {/* 브랜드 정보 */}
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                    <div style={{
                      padding: "3px 10px", borderRadius: 6,
                      background: T.blueLight, border: `1px solid ${T.blueMid}`,
                      fontSize: 9, fontWeight: 800, letterSpacing: "0.16em", color: T.blue, textTransform: "uppercase",
                    }}>
                      Brand Intelligence
                    </div>
                    <div style={{
                      display: "flex", alignItems: "center", gap: 4,
                      padding: "3px 8px", borderRadius: 6,
                      background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.2)",
                      fontSize: 9, fontWeight: 700, color: T.green,
                    }}>
                      <div style={{ width: 5, height: 5, borderRadius: "50%", background: T.green }} />
                      Demo
                    </div>
                  </div>
                  <h1 style={{ color: T.text, fontSize: 26, fontWeight: 900, letterSpacing: "-0.05em", lineHeight: 1.1, margin: 0 }}>
                    {brand}
                  </h1>
                </div>

                {/* 리스크 스코어 */}
                <div style={{
                  display: "flex", flexDirection: "column", alignItems: "center",
                  padding: "14px 20px", borderRadius: 18,
                  background: rm.bg, border: `1.5px solid ${rm.border}`,
                  boxShadow: `0 4px 20px ${rm.glow}`, flexShrink: 0,
                }}>
                  <div style={{ fontSize: 9, fontWeight: 800, letterSpacing: "0.16em", color: rm.color, textTransform: "uppercase", marginBottom: 2, opacity: 0.7 }}>Risk Score</div>
                  <div style={{ fontSize: 50, fontWeight: 900, color: rm.color, letterSpacing: "-0.06em", lineHeight: 1, textShadow: `0 0 32px ${rm.glow}` }}>
                    {riskScore}
                  </div>
                  <div style={{ marginTop: 6, padding: "3px 12px", borderRadius: 999, background: rm.color, color: "#fff", fontSize: 10, fontWeight: 800 }}>
                    {rm.label}
                  </div>
                </div>
              </div>

              {/* KPI 칩 */}
              <div style={{
                display: "flex", alignItems: "center", gap: 8,
                paddingTop: 14, borderTop: "1px solid rgba(15,23,42,0.06)", flexWrap: "wrap",
              }}>
                <KpiChip icon={MessageCircle} label="수집" value={totalComment.toLocaleString()} color={T.blue} />
                <KpiChip icon={AlertTriangle} label="위험채널" value={topChannel} color={T.orange} />
                <KpiChip icon={TrendingDown}  label="부정률" value={`${sentiment.negative}%`} color={T.red} />
                <KpiChip icon={ShieldAlert}   label="리스크" value={rm.label} color={rm.color} />
              </div>
            </div>
          </motion.div>

          {/* ── ROW 1: 감성분석 + 채널별 위험도 ── */}
          <motion.div variants={fadeUp} style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>

            {/* 감성 분석 */}
            <Card>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}>
                <div>
                  <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: "0.16em", color: T.textMuted, textTransform: "uppercase", marginBottom: 4 }}>Sentiment</div>
                  <div style={{ fontSize: 16, fontWeight: 800, color: T.text, letterSpacing: "-0.03em" }}>감성 분석</div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: 28, fontWeight: 900, color: T.red, lineHeight: 1, letterSpacing: "-0.04em" }}>{sentiment.negative}%</div>
                  <div style={{ fontSize: 9, fontWeight: 700, color: T.textMuted, letterSpacing: "0.06em" }}>부정률</div>
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "110px 1fr", gap: 14, alignItems: "center" }}>
                <div style={{ position: "relative" }}>
                  <ResponsiveContainer width="100%" height={110}>
                    <PieChart>
                      <Pie data={pieData} cx="50%" cy="50%" innerRadius={32} outerRadius={50} paddingAngle={3} dataKey="value" strokeWidth={0}>
                        {pieData.map((d, i) => <Cell key={i} fill={d.color} />)}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                  <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", textAlign: "center", pointerEvents: "none" }}>
                    <div style={{ color: T.green, fontSize: 14, fontWeight: 800, lineHeight: 1 }}>{sentiment.positive}%</div>
                    <div style={{ color: T.textMuted, fontSize: 8, marginTop: 1, fontWeight: 700 }}>긍정</div>
                  </div>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
                  {[
                    { label: "긍정", value: sentiment.positive, color: T.green,    gradient: "linear-gradient(90deg,#10b981,#34d399)", icon: "↑" },
                    { label: "중립", value: sentiment.neutral,  color: "#94a3b8",  gradient: "linear-gradient(90deg,#94a3b8,#cbd5e1)", icon: "→" },
                    { label: "부정", value: sentiment.negative, color: T.red,      gradient: "linear-gradient(90deg,#ef4444,#f87171)", icon: "↓" },
                  ].map(({ label, value, color, gradient, icon }) => (
                    <div key={label} style={{ background: `${color}0d`, borderRadius: 10, padding: "8px 10px", border: `1px solid ${color}22` }}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                        <span style={{ color: T.textSub, fontSize: 10, fontWeight: 600 }}>{icon} {label}</span>
                        <span style={{ color, fontSize: 12, fontWeight: 800 }}>{value}%</span>
                      </div>
                      <div style={{ height: 3, background: "rgba(0,0,0,0.06)", borderRadius: 999, overflow: "hidden" }}>
                        <motion.div
                          initial={{ width: 0 }} animate={{ width: `${value}%` }}
                          transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1], delay: 0.2 }}
                          style={{ height: "100%", background: gradient, borderRadius: 999 }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </Card>

            {/* 채널별 위험도 */}
            <Card>
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: "0.16em", color: T.textMuted, textTransform: "uppercase", marginBottom: 4 }}>Sources</div>
                <div style={{ fontSize: 16, fontWeight: 800, color: T.text, letterSpacing: "-0.03em" }}>채널별 위험도</div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {sources.map(({ name, icon, score, level, positive, negative }) => {
                  const sm = RISK_META[level] ?? RISK_META.moderate;
                  return (
                    <div key={name} style={{ background: "rgba(248,250,255,0.8)", border: "1px solid rgba(0,0,0,0.055)", borderRadius: 14, padding: "10px 12px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
                        <div style={{ width: 30, height: 30, borderRadius: 9, background: "rgba(37,99,235,0.08)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, flexShrink: 0 }}>{icon}</div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                            <span style={{ color: T.text, fontSize: 12, fontWeight: 700 }}>{name}</span>
                            <span style={{ color: sm.color, fontSize: 14, fontWeight: 800 }}>{score}</span>
                          </div>
                          <div style={{ display: "flex", alignItems: "center", gap: 5, marginTop: 4 }}>
                            <div style={{ flex: 1, height: 4, background: "#e2e8f0", borderRadius: 999, overflow: "hidden", display: "flex" }}>
                              <div style={{ width: `${positive}%`, background: T.green, height: "100%" }} />
                              <div style={{ width: `${negative}%`, background: T.red, height: "100%" }} />
                            </div>
                            <span style={{ fontSize: 9, fontWeight: 700, color: sm.color, background: sm.bg, border: `1px solid ${sm.border}`, padding: "1px 6px", borderRadius: 5, flexShrink: 0 }}>{sm.label}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
          </motion.div>

          {/* ── 여론 상황 분석 ── */}
          <motion.div
            variants={fadeUp}
            style={{
              borderRadius: 20, overflow: "hidden",
              background: "rgba(255,255,255,0.82)",
              border: `1px solid ${T.border}`,
              backdropFilter: "blur(20px)",
              boxShadow: "0 4px 24px rgba(37,99,235,0.07)",
              marginBottom: 14,
            }}
          >
            <div style={{ padding: "20px 22px 0" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
                <div>
                  <div style={{ fontSize: 9, fontWeight: 800, letterSpacing: "0.16em", color: T.textMuted, textTransform: "uppercase", marginBottom: 4 }}>
                    AI Situation Brief
                  </div>
                  <div style={{ fontSize: 16, fontWeight: 800, color: T.text }}>현재 여론 상황 분석</div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 5, padding: "4px 10px", borderRadius: 6, background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.2)" }}>
                  <div style={{ width: 5, height: 5, borderRadius: "50%", background: T.green }} />
                  <span style={{ fontSize: 9, fontWeight: 800, color: T.green, letterSpacing: "0.08em" }}>LIVE</span>
                </div>
              </div>

              {/* 요약 문장 */}
              <div style={{ background: "rgba(239,68,68,0.04)", border: "1px solid rgba(239,68,68,0.12)", borderRadius: 12, padding: "12px 16px", marginBottom: 16 }}>
                <p style={{ color: T.text, fontSize: 12, fontWeight: 600, lineHeight: 1.7, margin: 0 }}>
                  부정적 감정 반응이 증가하고 있습니다. 기업 윤리 관련 논란이 언급되고 있습니다. 구매를 만류하는 반응이 증가하고 있습니다.{" "}
                  현재 브랜드는 <span style={{ color: rm.color, fontWeight: 800 }}>{rm.label} 단계</span>로 판단됩니다.
                </p>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 0, borderTop: `1px solid ${T.border}` }}>
              {/* 소비자 감정 */}
              <div style={{ padding: "16px 20px", borderRight: `1px solid ${T.border}` }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: T.textSub, marginBottom: 12 }}>😤 소비자 감정</div>
                {[
                  { label: "부정적", pct: 50, color: T.red },
                  { label: "걱정·우려", pct: 30, color: "#f59e0b" },
                  { label: "강한 분노", pct: 20, color: "#dc2626" },
                ].map(({ label, pct, color }) => (
                  <div key={label} style={{ marginBottom: 8 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
                      <span style={{ color: T.textSub, fontSize: 10 }}>{label}</span>
                      <span style={{ color, fontSize: 10, fontWeight: 700 }}>{pct}%</span>
                    </div>
                    <div style={{ height: 4, background: "rgba(0,0,0,0.06)", borderRadius: 999, overflow: "hidden" }}>
                      <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }} style={{ height: "100%", background: color, borderRadius: 999 }} />
                    </div>
                  </div>
                ))}
              </div>

              {/* 핵심 이슈 */}
              <div style={{ padding: "16px 20px", borderRight: `1px solid ${T.border}` }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: T.textSub, marginBottom: 12 }}>🔍 핵심 이슈</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {issues.map(({ label, pct, color, icon, desc }) => (
                    <div key={label} style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 10px", borderRadius: 10, background: `${color}0a`, border: `1px solid ${color}1f` }}>
                      <span style={{ fontSize: 13 }}>{icon}</span>
                      <div style={{ flex: 1 }}>
                        <div style={{ color: T.text, fontSize: 11, fontWeight: 700 }}>{label}</div>
                        <div style={{ color: T.textMuted, fontSize: 9 }}>{desc}</div>
                      </div>
                      <span style={{ color, fontSize: 11, fontWeight: 800 }}>{pct}%</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* 소비자 행동 */}
              <div style={{ padding: "16px 20px" }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: T.textSub, marginBottom: 12 }}>📢 소비자 행동</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {actions.map(({ label, pct, color, icon, desc }) => (
                    <div key={label} style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 10px", borderRadius: 10, background: `${color}0a`, border: `1px solid ${color}1f` }}>
                      <span style={{ fontSize: 13 }}>{icon}</span>
                      <div style={{ flex: 1 }}>
                        <div style={{ color: T.text, fontSize: 11, fontWeight: 700 }}>{label}</div>
                        <div style={{ color: T.textMuted, fontSize: 9 }}>{desc}</div>
                      </div>
                      <span style={{ color, fontSize: 11, fontWeight: 800 }}>{pct}%</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>

          {/* ── CTA ── */}
          <motion.div variants={fadeUp} style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            <Card style={{ background: `linear-gradient(135deg,rgba(37,99,235,0.06),rgba(124,58,237,0.04))`, border: `1px solid ${T.blueMid}` }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                <div style={{ width: 32, height: 32, borderRadius: 10, background: `linear-gradient(135deg,${T.blue},${T.purple})`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Sparkles size={14} color="#fff" />
                </div>
                <span style={{ color: T.text, fontSize: 14, fontWeight: 700 }}>AI 브랜드 리포트</span>
              </div>
              <p style={{ color: T.textSub, fontSize: 12, lineHeight: 1.65, marginBottom: 14 }}>
                대시보드 정식 버전에서 즉각 대응부터 장기 전략까지 기간별 액션 플랜을 확인하세요.
              </p>
              <button
                onClick={() => navigate("/login")}
                style={{
                  display: "flex", alignItems: "center", gap: 6,
                  padding: "9px 16px", borderRadius: 12, border: "none", cursor: "pointer",
                  background: `linear-gradient(135deg,${T.blue},${T.purple})`,
                  color: "#fff", fontSize: 12, fontWeight: 700, fontFamily: "inherit",
                  boxShadow: "0 4px 14px rgba(37,99,235,0.3)",
                }}
              >
                정식 버전 시작하기 <ArrowRight size={13} />
              </button>
            </Card>

            <Card>
              <div style={{ fontSize: 14, fontWeight: 700, color: T.text, marginBottom: 12 }}>다시 분석하기</div>
              <p style={{ color: T.textSub, fontSize: 12, lineHeight: 1.65, marginBottom: 14 }}>
                다른 브랜드의 리스크를 분석해보세요.
              </p>
              <button
                onClick={() => navigate("/demo-input")}
                style={{
                  display: "flex", alignItems: "center", gap: 6,
                  padding: "9px 16px", borderRadius: 12, cursor: "pointer",
                  background: "rgba(0,0,0,0.04)", border: `1px solid ${T.border}`,
                  color: T.textSub, fontSize: 12, fontWeight: 700, fontFamily: "inherit",
                }}
              >
                새 브랜드 입력 <ArrowRight size={13} />
              </button>
            </Card>
          </motion.div>

        </motion.div>
      </div>
    </div>
  );
}