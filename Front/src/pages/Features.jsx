import { useNavigate } from "react-router-dom";
import { useState } from "react";

/* ─────────────────────────────────────────
   MOCK DATA FOR LIVE DEMO WIDGETS
───────────────────────────────────────── */
const mockComments = [
  { id: 1, platform: "instagram", text: "이 제품 완전 별로예요. 환불 요청했습니다.", sentiment: "negative", score: 82, time: "2분 전" },
  { id: 2, platform: "naver", text: "배송이 너무 느려요. 다음엔 다른 곳 이용할 것 같아요.", sentiment: "negative", score: 67, time: "8분 전" },
  { id: 3, platform: "youtube", text: "품질은 좋은데 가격이 좀 비싼 편이네요.", sentiment: "neutral", score: 41, time: "15분 전" },
  { id: 4, platform: "instagram", text: "진짜 너무 만족스러워요! 재구매 확정입니다 ❤️", sentiment: "positive", score: 12, time: "22분 전" },
  { id: 5, platform: "naver", text: "고객센터 응답이 너무 늦어요. 개선 좀 해주세요.", sentiment: "negative", score: 74, time: "31분 전" },
];

const platformColors = { instagram: "#e1306c", naver: "#03c75a", youtube: "#ff0000" };
const platformIcons = { instagram: "📸", naver: "🔍", youtube: "▶" };
const sentimentConfig = {
  negative: { color: "#ef4444", bg: "rgba(239,68,68,.1)", label: "부정" },
  neutral:  { color: "#f59e0b", bg: "rgba(245,158,11,.1)", label: "중립" },
  positive: { color: "#22c55e", bg: "rgba(34,197,94,.1)", label: "긍정" },
};

/* ─────────────────────────────────────────
   FEATURE SECTION WRAPPER
───────────────────────────────────────── */
function FeatureSection({ number, tag, title, desc, accent, children, reverse }) {
  return (
    <section style={{
      padding: "96px 48px",
      maxWidth: 1160, margin: "0 auto",
      display: "grid",
      gridTemplateColumns: "1fr 1fr",
      gap: 72, alignItems: "center",
      direction: reverse ? "rtl" : "ltr",
    }}>
      <div style={{ direction: "ltr" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
          <span style={{
            fontFamily: "DM Sans", fontSize: 11, fontWeight: 700,
            color: accent, opacity: 0.6, letterSpacing: "0.1em",
          }}>{number}</span>
          <div style={{ width: 24, height: 1, background: accent, opacity: 0.4 }} />
          <span style={{
            fontSize: 11, fontWeight: 700, color: accent,
            textTransform: "uppercase", letterSpacing: "0.08em",
          }}>{tag}</span>
        </div>
        <h2 style={{
          fontFamily: "'DM Sans', sans-serif",
          fontSize: "clamp(28px, 3vw, 40px)",
          color: "#0f172a", lineHeight: 1.2,
          marginBottom: 16, fontWeight: 600,
        }}>{title}</h2>
        <p style={{ fontSize: 15, color: "#64748b", lineHeight: 1.85, maxWidth: 400 }}>{desc}</p>
      </div>
      <div style={{ direction: "ltr" }}>{children}</div>
    </section>
  );
}

/* ─────────────────────────────────────────
   WIDGET 1: 실시간 댓글 스트림
───────────────────────────────────────── */
function CommentStreamWidget({ comments = mockComments }) {
  const [hovered, setHovered] = useState(null);

  return (
    <div style={{
      background: "#0f172a", borderRadius: 20,
      padding: "24px", overflow: "hidden",
      boxShadow: "0 20px 60px rgba(15,23,42,.25)",
      border: "1px solid rgba(255,255,255,.06)",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 20 }}>
        <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#22c55e",
          boxShadow: "0 0 8px #22c55e", animation: "pulse 2s infinite" }} />
        <span style={{ fontSize: 12, color: "#64748b", fontWeight: 500, letterSpacing: "0.05em" }}>
          LIVE · 실시간 댓글 모니터링
        </span>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {comments.map((c, i) => {
          const sc = sentimentConfig[c.sentiment];
          return (
            <div
              key={c.id}
              onMouseEnter={() => setHovered(c.id)}
              onMouseLeave={() => setHovered(null)}
              style={{
                padding: "12px 14px", borderRadius: 12,
                background: hovered === c.id ? "rgba(255,255,255,.06)" : "rgba(255,255,255,.03)",
                border: `1px solid ${hovered === c.id ? "rgba(255,255,255,.1)" : "rgba(255,255,255,.04)"}`,
                transition: "all .15s",
                cursor: "default",
                animation: `fadeSlideIn .4s ease both`,
                animationDelay: `${i * 0.08}s`,
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 5 }}>
                    <span style={{ fontSize: 11 }}>{platformIcons[c.platform]}</span>
                    <span style={{
                      fontSize: 10, color: platformColors[c.platform],
                      fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em",
                    }}>{c.platform}</span>
                    <span style={{ fontSize: 10, color: "#475569" }}>· {c.time}</span>
                  </div>
                  <p style={{ fontSize: 12.5, color: "#cbd5e1", lineHeight: 1.6, margin: 0 }}>{c.text}</p>
                </div>
                <div style={{
                  flexShrink: 0, padding: "3px 8px", borderRadius: 6,
                  background: sc.bg, border: `1px solid ${sc.color}30`,
                  display: "flex", flexDirection: "column", alignItems: "center", gap: 1,
                }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: sc.color }}>{c.score}</span>
                  <span style={{ fontSize: 9, color: sc.color, opacity: 0.8 }}>위험</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────
   WIDGET 2: 리스크 점수 게이지
───────────────────────────────────────── */
function RiskGaugeWidget() {
  const [score] = useState(67);
  const keywords = ["환불", "배송지연", "불만", "CS대응", "품질저하"];

  const angle = (score / 100) * 180 - 90;
  const color = score > 70 ? "#ef4444" : score > 40 ? "#f59e0b" : "#22c55e";
  const label = score > 70 ? "위험" : score > 40 ? "주의" : "안전";

  return (
    <div style={{
      background: "#fff", borderRadius: 20, padding: "28px",
      border: "1px solid rgba(0,0,0,.07)",
      boxShadow: "0 4px 32px rgba(0,0,0,.06)",
    }}>
      <p style={{ fontSize: 12, fontWeight: 600, color: "#94a3b8", marginBottom: 20,
        textTransform: "uppercase", letterSpacing: "0.08em" }}>브랜드 리스크 점수</p>

      {/* Gauge */}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginBottom: 24 }}>
        <svg width="200" height="110" viewBox="0 0 200 110">
          {/* Background arc */}
          <path d="M 20 100 A 80 80 0 0 1 180 100" fill="none" stroke="#e2e8f0" strokeWidth="16" strokeLinecap="round"/>
          {/* Color arc */}
          <path d="M 20 100 A 80 80 0 0 1 180 100" fill="none"
            stroke="url(#gaugeGrad)" strokeWidth="16" strokeLinecap="round"
            strokeDasharray={`${(score / 100) * 251.3} 251.3`} />
          <defs>
            <linearGradient id="gaugeGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#22c55e"/>
              <stop offset="50%" stopColor="#f59e0b"/>
              <stop offset="100%" stopColor="#ef4444"/>
            </linearGradient>
          </defs>
          {/* Needle */}
          <line
            x1="100" y1="100"
            x2={100 + 60 * Math.cos((angle - 90) * Math.PI / 180)}
            y2={100 + 60 * Math.sin((angle - 90) * Math.PI / 180)}
            stroke={color} strokeWidth="2.5" strokeLinecap="round"
          />
          <circle cx="100" cy="100" r="5" fill={color}/>
          {/* Labels */}
          <text x="15" y="118" fontSize="9" fill="#94a3b8" textAnchor="middle">0</text>
          <text x="100" y="12" fontSize="9" fill="#94a3b8" textAnchor="middle">50</text>
          <text x="185" y="118" fontSize="9" fill="#94a3b8" textAnchor="middle">100</text>
        </svg>
        <div style={{ textAlign: "center", marginTop: -8 }}>
          <p style={{ fontSize: 40, fontWeight: 800, color, lineHeight: 1, fontFamily: "DM Sans" }}>{score}</p>
          <p style={{ fontSize: 13, fontWeight: 600, color, marginTop: 4 }}>{label} 수준</p>
        </div>
      </div>

      {/* Keywords */}
      <div>
        <p style={{ fontSize: 11, color: "#94a3b8", marginBottom: 10, fontWeight: 600, letterSpacing: "0.06em" }}>
          급증 키워드
        </p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          {keywords.map((kw, i) => (
            <span key={kw} style={{
              padding: "4px 10px", borderRadius: 999, fontSize: 12,
              background: i < 2 ? "rgba(239,68,68,.1)" : "rgba(245,158,11,.08)",
              border: `1px solid ${i < 2 ? "rgba(239,68,68,.2)" : "rgba(245,158,11,.15)"}`,
              color: i < 2 ? "#ef4444" : "#d97706", fontWeight: 500,
            }}>{kw} {i === 0 ? "↑48%" : i === 1 ? "↑31%" : ""}</span>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────
   WIDGET 3: AI 대응 전략
───────────────────────────────────────── */
function StrategyWidget({ strategies = [] }) {
  const [selected, setSelected] = useState(0);
  
  // ❗ 이거 추가 (핵심)
  if (!strategies.length) {
    return (
      <div style={{ padding: 20, color: "#94a3b8" }}>
        전략 데이터 없음
      </div>
    );
  }

  const s = strategies[selected];

  return (
    <div style={{
      background: "#0f172a", borderRadius: 20, padding: "24px",
      boxShadow: "0 20px 60px rgba(15,23,42,.25)",
      border: "1px solid rgba(255,255,255,.06)",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 20 }}>
        <span style={{ fontSize: 16 }}>⚡</span>
        <span style={{ fontSize: 12, color: "#60a5fa", fontWeight: 600, letterSpacing: "0.05em" }}>
          AI 대응 전략 생성
        </span>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 20 }}>
        {strategies.map((s, i) => (
          <button
            key={i}
            onClick={() => setSelected(i)}
            style={{
              padding: "10px 14px", borderRadius: 10, cursor: "pointer",
              background: selected === i ? `${s.color}15` : "rgba(255,255,255,.03)",
              border: `1px solid ${selected === i ? `${s.color}40` : "rgba(255,255,255,.06)"}`,
              display: "flex", alignItems: "center", gap: 10, textAlign: "left",
              transition: "all .15s",
            }}
          >
            <div style={{ width: 6, height: 6, borderRadius: "50%", background: s.color, flexShrink: 0 }} />
            <span style={{ fontSize: 13, color: selected === i ? "#e2e8f0" : "#64748b", fontWeight: 500 }}>
              {s.title}
            </span>
            <span style={{
              marginLeft: "auto", fontSize: 10, padding: "2px 7px", borderRadius: 999,
              background: `${s.color}20`, color: s.color, fontWeight: 600,
            }}>{s.tag}</span>
          </button>
        ))}
      </div>

      <div style={{
        padding: "16px", borderRadius: 12,
        background: "rgba(255,255,255,.04)",
        border: "1px solid rgba(255,255,255,.08)",
      }}>
        <p style={{ fontSize: 11, color: "#475569", marginBottom: 8, fontWeight: 600, letterSpacing: "0.06em" }}>
          AI 생성 메시지 템플릿
        </p>
        <p style={{ fontSize: 13, color: "#94a3b8", lineHeight: 1.7, margin: 0 }}>{s.template}</p>
        <button style={{
          marginTop: 12, padding: "7px 14px", borderRadius: 8, fontSize: 12, fontWeight: 600,
          background: s.color, color: "#fff", border: "none", cursor: "pointer", opacity: 0.9,
        }}>복사하기</button>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────
   WIDGET 4: 리포트 미리보기
───────────────────────────────────────── */
function ReportWidget() {
  const bars = [
    { day: "월", neg: 12, pos: 65 },
    { day: "화", neg: 28, pos: 52 },
    { day: "수", neg: 67, pos: 30 },
    { day: "목", neg: 82, pos: 18 },
    { day: "금", neg: 45, pos: 42 },
    { day: "토", neg: 31, pos: 58 },
    { day: "일", neg: 19, pos: 70 },
  ];

  return (
    <div style={{
      background: "#fff", borderRadius: 20, padding: "28px",
      border: "1px solid rgba(0,0,0,.07)",
      boxShadow: "0 4px 32px rgba(0,0,0,.06)",
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24 }}>
        <div>
          <p style={{ fontSize: 13, fontWeight: 700, color: "#0f172a", marginBottom: 2 }}>주간 감성 트렌드</p>
          <p style={{ fontSize: 11, color: "#94a3b8" }}>2025년 4월 2주차</p>
        </div>
        <div style={{
          padding: "4px 10px", borderRadius: 8, fontSize: 11, fontWeight: 600,
          background: "rgba(239,68,68,.08)", color: "#ef4444", border: "1px solid rgba(239,68,68,.15)",
        }}>⚠ 목요일 급등</div>
      </div>

      {/* Bar chart */}
      <div style={{ display: "flex", alignItems: "flex-end", gap: 8, height: 120, marginBottom: 16 }}>
        {bars.map((b, i) => (
          <div key={b.day} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 2, height: "100%" }}>
            <div style={{ flex: 1, width: "100%", display: "flex", flexDirection: "column", justifyContent: "flex-end", gap: 2 }}>
              <div style={{
                width: "100%", borderRadius: "4px 4px 0 0",
                height: `${b.neg}%`,
                background: i === 3 ? "#ef4444" : "rgba(239,68,68,.25)",
                transition: "background .2s",
              }} />
            </div>
            <span style={{ fontSize: 10, color: "#94a3b8" }}>{b.day}</span>
          </div>
        ))}
      </div>

      {/* Summary */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
        {[
          { label: "총 댓글", value: "2,841", icon: "💬" },
          { label: "부정 비율", value: "34%", icon: "📉", alert: true },
          { label: "리스크 피크", value: "목요일", icon: "⚠", alert: true },
        ].map(s => (
          <div key={s.label} style={{
            padding: "10px 12px", borderRadius: 10,
            background: s.alert ? "rgba(239,68,68,.05)" : "#f8faff",
            border: `1px solid ${s.alert ? "rgba(239,68,68,.12)" : "rgba(37,99,235,.08)"}`,
          }}>
            <p style={{ fontSize: 14, marginBottom: 2 }}>{s.icon}</p>
            <p style={{ fontSize: 15, fontWeight: 700, color: s.alert ? "#ef4444" : "#0f172a", margin: 0 }}>{s.value}</p>
            <p style={{ fontSize: 10, color: "#94a3b8", marginTop: 1 }}>{s.label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────
   COMPARISON TABLE (홈과 다른 요소)
───────────────────────────────────────── */
function ComparisonTable() {
  const features = [
    ["실시간 댓글 수집", true, true, true],
    ["AI 감성 분석", true, true, true],
    ["리스크 점수 대시보드", true, true, true],
    ["매일 AI 리포트", false, true, true],
    ["팀원 초대", false, true, true],
    ["Slack 알림 연동", false, false, true],
  ];

  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "separate", borderSpacing: 0 }}>
        <thead>
          <tr>
            <th style={{ textAlign: "left", padding: "12px 20px", fontSize: 13, color: "#64748b", fontWeight: 500, borderBottom: "1px solid #e2e8f0" }}>기능</th>
            {["Starter", "Pro", "Enterprise"].map((p, i) => (
              <th key={p} style={{
                textAlign: "center", padding: "12px 20px", fontSize: 13,
                color: i === 1 ? "#2563eb" : "#0f172a", fontWeight: 700,
                borderBottom: `2px solid ${i === 1 ? "#2563eb" : "#e2e8f0"}`,
              }}>{p}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {features.map(([name, s, p, e], i) => (
            <tr key={name} style={{ background: i % 2 === 0 ? "#f8faff" : "#fff" }}>
              <td style={{ padding: "11px 20px", fontSize: 13.5, color: "#374151", borderBottom: "1px solid #f1f5f9" }}>{name}</td>
              {[s, p, e].map((v, j) => (
                <td key={j} style={{ textAlign: "center", padding: "11px 20px", borderBottom: "1px solid #f1f5f9" }}>
                  <span style={{ fontSize: 16, color: v ? (j === 1 ? "#2563eb" : "#22c55e") : "#cbd5e1" }}>
                    {v ? "✓" : "—"}
                  </span>
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ─────────────────────────────────────────
   MAIN FEATURES PAGE
───────────────────────────────────────── */
export default function Features() {
  const navigate = useNavigate();

  return (
    <div style={{ background: "#f8faff", minHeight: "100vh", paddingTop: 64 }}>

      <style>{`
        @keyframes fadeSlideIn {
          from { opacity: 0; transform: translateY(6px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
      `}</style>

      {/* ── HERO · 간결한 타이틀 ── */}
      <section style={{
        padding: "72px 48px 56px",
        maxWidth: 720, margin: "0 auto", textAlign: "center",
      }}>
        <span style={{
          display: "inline-block", padding: "5px 14px", borderRadius: 999, marginBottom: 24,
          background: "rgba(37,99,235,.08)", border: "1px solid rgba(37,99,235,.15)",
          fontSize: 12, fontWeight: 600, color: "#2563eb", letterSpacing: "0.06em",
          textTransform: "uppercase",
        }}>Product Features</span>

        <h1 style={{
          fontFamily: "'DM Sans', sans-serif",
          fontSize: "clamp(36px, 5vw, 58px)", color: "#0f172a",
          lineHeight: 1.15, fontWeight: 600, marginBottom: 20,
        }}>
          기능 하나하나가<br />
          <span style={{
            background: "linear-gradient(135deg, #2563eb 0%, #7c3aed 100%)",
            WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
          }}>브랜드를 지킵니다</span>
        </h1>

        <p style={{ fontSize: 16, color: "#64748b", lineHeight: 1.85, maxWidth: 520, margin: "0 auto" }}>
          RISKLENS의 핵심 기능을 직접 확인해보세요. <br></br>
          실시간 감지부터 AI 대응 전략까지, 모든 단계를 커버합니다.
        </p>
      </section>

      {/* ── DIVIDER ── */}
      <div style={{ maxWidth: 1160, margin: "0 auto", height: 1, background: "rgba(37,99,235,.08)" }} />

      {/* ── FEATURE 1: 실시간 수집 ── */}
      <FeatureSection
        number="01"
        tag="실시간 수집"
        accent="#2563eb"
        title={<>인스타그램·네이버·유튜브를<br />한 곳에서 모니터링</>}
        desc="각 플랫폼의 댓글과 리뷰를 실시간으로 수집합니다. 플랫폼별 색상 코드로 한눈에 파악하고, AI가 즉시 위험도를 0~100으로 환산합니다."
      >
        <CommentStreamWidget />
      </FeatureSection>

      <div style={{ maxWidth: 1160, margin: "0 auto", height: 1, background: "rgba(37,99,235,.06)" }} />

      {/* ── FEATURE 2: 리스크 점수 ── */}
      <FeatureSection
        number="02"
        tag="리스크 스코어링"
        accent="#ef4444"
        title={<>숫자 하나로<br />위기 수준을 파악</>}
        desc="AI가 모든 댓글을 종합 분석해 0~100 사이의 리스크 점수를 산출합니다. 급증 키워드와 함께 위협이 어디서 오는지 즉시 확인할 수 있습니다."
        reverse
      >
        <RiskGaugeWidget />
      </FeatureSection>

      <div style={{ maxWidth: 1160, margin: "0 auto", height: 1, background: "rgba(37,99,235,.06)" }} />

      {/* ── FEATURE 3: 대응 전략 ── */}
      <FeatureSection
        number="03"
        tag="AI 대응 전략"
        accent="#7c3aed"
        title={<>위기 상황에 맞는<br />대응 메시지를 자동 생성</>}
        desc="리스크 유형에 따라 즉각 대응, 관계 회복, 장기 전략 중 최적의 방향을 AI가 제안합니다. 바로 사용 가능한 메시지 템플릿까지 제공합니다."
      >
        <StrategyWidget
  strategies={[
    {
      title: "공개 사과문 발행",
      tag: "즉각 대응",
      color: "#ef4444",
      template: "안녕하세요,. 4/22 배송 지연으로 불편을 드린 점 진심으로 사과드립니다. 현재 물류 시스템을 긴급 점검 중이며 대상 고객께 보상 진행 중입니다.",
    },
    {
      title: "고객 댓글 개별 대응",
      tag: "관계 회복",
      color: "#2563eb",
      template: "불편을 드려 죄송합니다. 주문 정보 확인 후 즉시 처리 도와드리겠습니다. 추가 보상도 함께 제공드릴 예정입니다.",
    },
    {
      title: "긍정 리뷰 확산 전략",
      tag: "장기 전략",
      color: "#22c55e",
      template: "개선된 서비스와 고객 후기를 기반으로 신뢰 회복 콘텐츠를 제작해 공식 채널에 순차적으로 공개합니다.",
    },
  ]}
/>
      </FeatureSection>

      <div style={{ maxWidth: 1160, margin: "0 auto", height: 1, background: "rgba(37,99,235,.06)" }} />

      {/* ── FEATURE 4: 리포트 ── */}
      <FeatureSection
        number="04"
        tag="AI 리포트"
        accent="#0891b2"
        title={<>어떤 날 위험했는지<br />한눈에 보여드립니다</>}
        desc="자동 생성되는 AI 리포트로 트렌드를 추적하세요. 리스크 피크 시점과 원인을 파악해 선제적으로 대응할 수 있습니다."
        reverse
      >
        <ReportWidget />
      </FeatureSection>

      {/* ── COMPARISON ── */}
      <section style={{
        maxWidth: 860, margin: "0 auto",
        padding: "72px 48px",
      }}>
        <div style={{ textAlign: "center", marginBottom: 40 }}>
          <p style={{ fontSize: 12, fontWeight: 700, color: "#2563eb", textTransform: "uppercase",
            letterSpacing: "0.08em", marginBottom: 12 }}>플랜 비교</p>
          <h2 style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "clamp(26px, 3vw, 38px)", color: "#0f172a", marginBottom: 12 }}>
            필요한 기능만 선택하세요
          </h2>
          <p style={{ fontSize: 14, color: "#64748b" }}>어떤 플랜에 어떤 기능이 포함되는지 한눈에 비교하세요.</p>
        </div>

        <div style={{
          background: "#fff", borderRadius: 20, overflow: "hidden",
          border: "1px solid rgba(37,99,235,.1)",
          boxShadow: "0 4px 32px rgba(37,99,235,.08)",
        }}>
          <ComparisonTable />
        </div>
      </section>

      {/* ── CTA ── */}
      <section style={{
        padding: "72px 48px 96px",
        background: "#0f172a",
        textAlign: "center",
      }}>
        <p style={{ fontSize: 12, fontWeight: 700, color: "#60a5fa", textTransform: "uppercase",
          letterSpacing: "0.1em", marginBottom: 20 }}>Ready to Start?</p>
        <h2 style={{
          fontFamily: "'DM Sans', sans-serif",
          fontSize: "clamp(28px, 4vw, 48px)", color: "#f1f5f9",
          marginBottom: 16, lineHeight: 1.2,
        }}>
          지금 바로 브랜드를 보호하세요
        </h2>
        <div style={{ display: "flex", justifyContent: "center", gap: 12, flexWrap: "wrap" }}>
          <button
            onClick={() => navigate("/signup")}
            style={{
              padding: "14px 36px", borderRadius: 12, fontSize: 15, fontWeight: 600,
              background: "#2563eb", color: "#fff", border: "none", cursor: "pointer",
              boxShadow: "0 4px 20px rgba(37,99,235,.4)",
              transition: "transform .15s, box-shadow .15s",
            }}
            onMouseEnter={e => {
              e.currentTarget.style.transform = "translateY(-2px)";
              e.currentTarget.style.boxShadow = "0 8px 32px rgba(37,99,235,.5)";
            }}
            onMouseLeave={e => {
              e.currentTarget.style.transform = "translateY(0)";
              e.currentTarget.style.boxShadow = "0 4px 20px rgba(37,99,235,.4)";
            }}
          >
           시작하기 →
          </button>
          <button
            onClick={() => navigate("/demo")}
            style={{
              padding: "14px 36px", borderRadius: 12, fontSize: 15, fontWeight: 500,
              background: "rgba(255,255,255,.06)", color: "#94a3b8",
              border: "1px solid rgba(255,255,255,.12)", cursor: "pointer",
              transition: "background .15s",
            }}
            onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,.1)"}
            onMouseLeave={e => e.currentTarget.style.background = "rgba(255,255,255,.06)"}
          >
            데모 체험하기
          </button>
        </div>
      </section>

    </div>
  );
}
export {
  CommentStreamWidget,
  RiskGaugeWidget,
  StrategyWidget,
  ReportWidget
};