import React, { useEffect, useMemo, useState, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { generateAiReport } from "../api/analyze";
import {
  Sparkles, Eye, BarChart3, MessageCircle,
  Brain, TrendingDown, Users, AlertTriangle,
  ShieldAlert, Activity, Zap, RefreshCw,
} from "lucide-react";
import {
  ResponsiveContainer, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip,
  PieChart, Pie, Cell,
} from "recharts";
import { analyzeBrand, getPersons, mapApiToDashboard } from "../api/analyze";
import Navbar from "../components/Navbar.jsx";
import {
  CommentStreamWidget, RiskGaugeWidget, StrategyWidget, ReportWidget,
} from "../pages/Features";

// ─── 캐시 유틸 ────────────────────────────────────────────────
const CACHE_TTL = 30 * 60 * 1000;
const getCacheKey = (brand) => `brandRiskCache_${brand || "unknown"}`;
function saveCache(data, brand) {
  localStorage.setItem(getCacheKey(brand), JSON.stringify({ data, timestamp: Date.now() }));
}
function loadAnyCachedBrand() {
  try {
    for (const key of Object.keys(localStorage)) {
      if (!key.startsWith("brandRiskCache_")) continue;
      const raw = localStorage.getItem(key);
      if (!raw) continue;
      const { data, timestamp } = JSON.parse(raw);
      if (Date.now() - timestamp > CACHE_TTL) { localStorage.removeItem(key); continue; }
      return { data, timestamp };
    }
  } catch {}
  return null;
}
function getMinutesAgo(ts) {
  const d = Math.floor((Date.now() - ts) / 60000);
  return d < 1 ? "방금 전" : `${d}분 전`;
}

// ─── 디자인 토큰 ──────────────────────────────────────────────
const T = {
  bg:         "#f0f4ff",
  bgCard:     "rgba(255,255,255,0.85)",
  border:     "rgba(15,23,42,0.07)",
  borderBlue: "rgba(37,99,235,0.15)",
  blue:       "#2563eb",
  blueLight:  "rgba(37,99,235,0.07)",
  blueMid:    "rgba(37,99,235,0.18)",
  text:       "#0f172a",
  textSub:    "#64748b",
  textMuted:  "#94a3b8",
};

// ─── 리스크 메타 ──────────────────────────────────────────────
const RISK_META = {
  low:      { label: "안정",   color: "#10b981", bg: "rgba(16,185,129,0.08)",  border: "rgba(16,185,129,0.22)",  glow: "rgba(16,185,129,0.18)"  },
  moderate: { label: "주의",   color: "#f59e0b", bg: "rgba(245,158,11,0.08)",  border: "rgba(245,158,11,0.22)",  glow: "rgba(245,158,11,0.18)"  },
  high:     { label: "경고",   color: "#f97316", bg: "rgba(249,115,22,0.08)",  border: "rgba(249,115,22,0.22)",  glow: "rgba(249,115,22,0.18)"  },
  critical: { label: "위기",   color: "#ef4444", bg: "rgba(239,68,68,0.08)",   border: "rgba(239,68,68,0.22)",   glow: "rgba(239,68,68,0.18)"   },
};

// ─── 애니메이션 프리셋 ───────────────────────────────────────
const fadeUp  = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] } } };
const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.08 } } };

// ─── 공통 EmptyState ─────────────────────────────────────────
function EmptyState({ icon, title, desc, action }) {
  return (
    <div style={{ padding: "52px 24px", textAlign: "center" }}>
      <div style={{ width: 56, height: 56, borderRadius: 16, margin: "0 auto 16px", background: T.blueLight, border: `1px solid ${T.blueMid}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24 }}>{icon}</div>
      <div style={{ color: T.text, fontWeight: 700, fontSize: 15 }}>{title}</div>
      {desc && <div style={{ color: T.textSub, fontSize: 13, marginTop: 6, lineHeight: 1.6 }}>{desc}</div>}
      {action}
    </div>
  );
}

// ─── 공통 카드 래퍼 ──────────────────────────────────────────
function Card({ children, style = {}, className = "" }) {
  return (
    <div className={`dash-card ${className}`} style={{ padding: "24px", ...style }}>
      {children}
    </div>
  );
}

// ─── 섹션 레이블 ─────────────────────────────────────────────
function SectionLabel({ children, color = T.blue }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
      <div style={{ width: 3, height: 14, borderRadius: 2, background: color }} />
      <span style={{ color: T.textMuted, fontSize: 10, fontWeight: 800, letterSpacing: "0.14em", textTransform: "uppercase" }}>{children}</span>
    </div>
  );
}

// ─── 구분선 배지 ─────────────────────────────────────────────
function DividerBadge({ icon, label, color = "#7c3aed" }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 18, marginTop: 28 }}>
      <div style={{ flex: 1, height: 1, background: `rgba(37,99,235,0.1)` }} />
      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 18px", borderRadius: 999, background: `${color}0f`, border: `1px solid ${color}22` }}>
        <span style={{ fontSize: 13 }}>{icon}</span>
        <span style={{ color, fontSize: 12, fontWeight: 800, letterSpacing: "0.06em" }}>{label}</span>
      </div>
      <div style={{ flex: 1, height: 1, background: `rgba(37,99,235,0.1)` }} />
    </div>
  );
}

// ─── Segment Control ──────────────────────────────────────────
function SegmentControl({ options, value, onChange, size = "md" }) {
  const pad = size === "sm" ? "5px 12px" : "7px 16px";
  const fs  = size === "sm" ? 11 : 12;
  return (
    <div style={{ display: "inline-flex", background: "rgba(15,23,42,0.05)", borderRadius: 12, padding: 3, gap: 2 }}>
      {options.map((opt) => (
        <button
          key={opt.key}
          onClick={() => onChange(opt.key)}
          style={{
            padding: pad, borderRadius: 9, fontSize: fs, fontWeight: 700,
            cursor: "pointer", border: "none", fontFamily: "inherit",
            transition: "all 0.2s cubic-bezier(0.22,1,0.36,1)",
            background: value === opt.key ? "#fff" : "transparent",
            color:      value === opt.key ? T.text  : T.textSub,
            boxShadow:  value === opt.key ? "0 1px 6px rgba(15,23,42,0.1), 0 0 0 1px rgba(15,23,42,0.05)" : "none",
          }}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}



function BrandAvatar({ riskColor, riskGlow, score }) {
  return (
    <div
      style={{
        position: "relative",
        width: 84,
        height: 84,
        flexShrink: 0,
      }}
    >
      {/* Score Ring */}
      <svg
        width={84}
        height={84}
        viewBox="0 0 84 84"
        style={{
          position: "absolute",
          inset: 0,
          transform: "rotate(-90deg)",
        }}
      >
        <circle
          cx="42"
          cy="42"
          r="38"
          fill="none"
          stroke="rgba(255,255,255,.08)"
          strokeWidth="3"
        />

        <circle
          cx="42"
          cy="42"
          r="38"
          fill="none"
          stroke={riskColor}
          strokeWidth="3"
          strokeLinecap="round"
          strokeDasharray={`${2 * Math.PI * 38 * score / 100}
                           ${2 * Math.PI * 38}`}
          style={{
            transition: "all .8s ease",
            filter: `drop-shadow(0 0 6px ${riskGlow})`,
          }}
        />
      </svg>

      {/* Avatar */}
      <div
        style={{
          position: "absolute",
          inset: 8,
          borderRadius: "50%",
          background: "#fff",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          overflow: "hidden",
          boxShadow: `
            0 10px 30px rgba(0,0,0,.15),
            0 0 0 2px rgba(255,255,255,.9)
          `,
          backdropFilter: "blur(20px)",
        }}
      >
        <img
          src="https://img.icons8.com/color/480/starbucks.png"
          alt="Starbucks"
          style={{
            width: "68%",
            height: "68%",
            objectFit: "contain",
          }}
        />
      </div>

      {/* Risk Badge */}
      <div
        style={{
          position: "absolute",
          right: 2,
          bottom: 2,
          width: 18,
          height: 18,
          borderRadius: "50%",
          background: riskColor,
          border: "3px solid white",
          boxShadow: `0 0 12px ${riskGlow}`,
        }}
      />
    </div>
  );
}

// ─── 히어로 스탯 칩 (컴팩트) ─────────────────────────────────
function HeroStatChip({ icon: Icon, label, value, color, bg, border }) {
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 8,
      padding: "8px 12px", borderRadius: 12,
      background: bg, border: `1px solid ${border}`,
      backdropFilter: "blur(10px)",
    }}>
      <div style={{
        width: 26, height: 26, borderRadius: 8,
        background: `${color}18`,
        display: "flex", alignItems: "center", justifyContent: "center",
        flexShrink: 0,
      }}>
        <Icon size={12} color={color} />
      </div>
      <div>
        <div style={{ color, fontSize: 15, fontWeight: 800, lineHeight: 1, letterSpacing: "-0.03em" }}>{value}</div>
        <div style={{ color: T.textMuted, fontSize: 9, marginTop: 2, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase" }}>{label}</div>
      </div>
    </div>
  );
}


// ═══════════════════════════════════════════════════════════════
//  NEW COMPACT HERO SECTION
// ═══════════════════════════════════════════════════════════════
function CompactHero({ overview, sourceBreakdown, minutesAgo, onRefresh }) {
  const rm = RISK_META[overview.risk_level] ?? RISK_META.moderate;

  const topRiskChannel = Object.entries(sourceBreakdown ?? {})
    .sort((a, b) => (b[1]?.risk_score ?? 0) - (a[1]?.risk_score ?? 0))[0]?.[0] ?? "-";
  const channelLabel = { youtube: "YouTube", naver: "네이버", instagram: "Instagram" }[topRiskChannel] ?? topRiskChannel;

  const sources = [
    { key: "youtube",   icon: "▶",  label: "YouTube"     },
    { key: "naver",     icon: "📰", label: "네이버"       },
    { key: "instagram", icon: "📸", label: "Instagram"   },
  ];

  return (
    <motion.div
      variants={fadeUp}
      style={{
        position: "relative",
        borderRadius: 24,
        overflow: "hidden",
        marginBottom: 14,
        background: "rgba(255,255,255,0.82)",
        border: `1px solid ${rm.border}`,
        backdropFilter: "blur(24px)",
        boxShadow: `0 4px 32px ${rm.glow}, 0 1px 0 rgba(255,255,255,0.9) inset`,
      }}
    >
      {/* 상단 컬러 스트라이프 */}
      <div style={{
        position: "absolute", top: 0, left: 0, right: 0, height: 3,
        background: `linear-gradient(90deg, ${rm.color}, #7c3aed, #2563eb)`,
      }} />

      {/* 배경 글로우 */}
      <div style={{
        position: "absolute", top: -60, right: -40, width: 300, height: 300,
        background: `radial-gradient(circle, ${rm.glow}, transparent 70%)`,
        pointerEvents: "none", filter: "blur(40px)",
      }} />
      <div style={{
        position: "absolute", bottom: -40, left: 80, width: 200, height: 200,
        background: "radial-gradient(circle, rgba(37,99,235,0.06), transparent 70%)",
        pointerEvents: "none", filter: "blur(30px)",
      }} />

      {/* 격자 패턴 오버레이 */}
      <div style={{
        position: "absolute", inset: 0, pointerEvents: "none", opacity: 0.3,
        backgroundImage: "linear-gradient(rgba(37,99,235,.04) 1px,transparent 1px),linear-gradient(90deg,rgba(37,99,235,.04) 1px,transparent 1px)",
        backgroundSize: "24px 24px",
      }} />

      <div style={{ padding: "20px 24px 18px", position: "relative", zIndex: 1 }}>

        {/* ── 메인 행: 아바타 + 브랜드 정보 + 리스크 스코어 */}
        <div style={{ display: "flex", alignItems: "center", gap: 18, marginBottom: 16 }}>

          {/* 브랜드 아바타 */}
          <div style={{ position: "relative", width: 88, height: 88, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <BrandAvatar
              brand={overview.brand}
              riskColor={rm.color}
              riskGlow={rm.glow}
              score={overview.risk_score}
            />
          </div>

          {/* 브랜드 이름 + 태그 */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
              <div style={{
                padding: "3px 10px", borderRadius: 6,
                background: "rgba(37,99,235,0.07)", border: "1px solid rgba(37,99,235,0.12)",
                fontSize: 9, fontWeight: 800, letterSpacing: "0.16em", color: T.blue, textTransform: "uppercase",
              }}>
                Brand Intelligence
              </div>
              {minutesAgo && (
                <div style={{
                  display: "flex", alignItems: "center", gap: 4,
                  padding: "3px 8px", borderRadius: 6,
                  background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.2)",
                  fontSize: 9, fontWeight: 700, color: "#10b981",
                }}>
                  <div style={{ width: 5, height: 5, borderRadius: "50%", background: "#10b981", animation: "livePulse 1.2s infinite" }} />
                  {minutesAgo}
                </div>
              )}
            </div>
            <h1 style={{
              color: T.text, fontSize: 26, fontWeight: 900,
              letterSpacing: "-0.05em", lineHeight: 1.1,
              fontFamily: "'Plus Jakarta Sans', sans-serif", margin: 0,
            }}>{overview.brand}</h1>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 6, flexWrap: "wrap" }}>
    
            </div>
          </div>

          {/* 리스크 스코어 블록 */}
          <div style={{
            display: "flex", flexDirection: "column", alignItems: "center",
            padding: "14px 20px", borderRadius: 18,
            background: rm.bg, border: `1.5px solid ${rm.border}`,
            boxShadow: `0 4px 20px ${rm.glow}`,
            flexShrink: 0,
          }}>
            <div style={{ fontSize: 9, fontWeight: 800, letterSpacing: "0.16em", color: rm.color, textTransform: "uppercase", marginBottom: 2, opacity: 0.7 }}>Risk Score</div>
            <div style={{
              fontSize: 52, fontWeight: 900, color: rm.color,
              letterSpacing: "-0.06em", lineHeight: 1,
              fontFamily: "'Plus Jakarta Sans', sans-serif",
              textShadow: `0 0 32px ${rm.glow}`,
            }}>{overview.risk_score}</div>
            <div style={{
              marginTop: 6, padding: "3px 12px", borderRadius: 999,
              background: rm.color, color: "#fff",
              fontSize: 10, fontWeight: 800, letterSpacing: "0.04em",
            }}>{rm.label}</div>
          </div>
        </div>

        {/* ── 하단 행: KPI 칩 4개 + 소스 인디케이터 + 감성 미니바 */}
        <div style={{
          display: "flex", alignItems: "center", gap: 8,
          paddingTop: 14, borderTop: "1px solid rgba(15,23,42,0.06)",
          flexWrap: "wrap",
        }}>
   
          <HeroStatChip
            icon={MessageCircle} label="수집" value={overview.total_comments?.toLocaleString()}
            color={T.blue} bg="rgba(37,99,235,0.07)" border="rgba(37,99,235,0.15)"
          />
          <HeroStatChip
            icon={AlertTriangle} label="위험채널" value={channelLabel}
            color="#f97316" bg="rgba(249,115,22,0.07)" border="rgba(249,115,22,0.18)"
          />

     

 
        </div>
      </div>
    </motion.div>
  );
}

// ─── KPI 미니 카드 ────────────────────────────────────────────
function KpiPill({ icon: Icon, label, value, color = T.blue }) {
  return (
    <div style={{
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      padding: "14px 16px", borderRadius: 16, textAlign: "center",
      background: `${color}0d`, border: `1px solid ${color}22`, minWidth: 90,
    }}>
      <Icon size={14} color={color} style={{ marginBottom: 6 }} />
      <div style={{ color, fontSize: 18, fontWeight: 900, lineHeight: 1, fontFamily: "'Plus Jakarta Sans', sans-serif", letterSpacing: "-0.04em" }}>{value}</div>
      <div style={{ color: T.textMuted, fontSize: 9, marginTop: 5, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase" }}>{label}</div>
    </div>
  );
}

// ─── 감성 분석 카드 ───────────────────────────────────────────
function SentimentCard({ positive, negative, neutral }) {
  const bars = [
    { label: "긍정", value: positive, color: "#10b981", gradient: "linear-gradient(90deg,#10b981,#34d399)", icon: "↑", bg: "rgba(16,185,129,0.07)", border: "rgba(16,185,129,0.18)" },
    { label: "중립", value: neutral,  color: "#94a3b8", gradient: "linear-gradient(90deg,#94a3b8,#cbd5e1)", icon: "→", bg: "rgba(148,163,184,0.07)", border: "rgba(148,163,184,0.15)" },
    { label: "부정", value: negative, color: "#ef4444", gradient: "linear-gradient(90deg,#ef4444,#f87171)", icon: "↓", bg: "rgba(239,68,68,0.07)",   border: "rgba(239,68,68,0.18)"   },
  ];
  const data = [
    { name: "긍정", value: positive, color: "#10b981" },
    { name: "중립", value: neutral,  color: "#e2e8f0" },
    { name: "부정", value: negative, color: "#ef4444" },
  ];
  return (
    <Card>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
        <div>
          <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: "0.16em", color: T.textMuted, textTransform: "uppercase", marginBottom: 4 }}>Sentiment</div>
          <div style={{ fontSize: 17, fontWeight: 800, color: T.text, letterSpacing: "-0.03em" }}>감성 분석</div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 30, fontWeight: 900, color: "#ef4444", lineHeight: 1, fontFamily: "'Plus Jakarta Sans', sans-serif", letterSpacing: "-0.04em" }}>{negative}%</div>
          <div style={{ fontSize: 9, fontWeight: 700, color: T.textMuted, letterSpacing: "0.06em" }}>부정률</div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "120px 1fr", gap: 18, alignItems: "center" }}>
        <div style={{ position: "relative" }}>
          <ResponsiveContainer width="100%" height={120}>
            <PieChart>
              <Pie data={data} cx="50%" cy="50%" innerRadius={34} outerRadius={52} paddingAngle={3} dataKey="value" strokeWidth={0}>
                {data.map((d, i) => <Cell key={i} fill={d.color} />)}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
          <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", textAlign: "center", pointerEvents: "none" }}>
            <div style={{ color: "#10b981", fontSize: 16, fontWeight: 800, lineHeight: 1 }}>{positive}%</div>
            <div style={{ color: T.textMuted, fontSize: 8, marginTop: 1, fontWeight: 700 }}>긍정</div>
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
          {bars.map(({ label, value, color, gradient, icon, bg, border }) => (
            <div key={label} style={{ background: bg, borderRadius: 11, padding: "9px 11px", border: `1px solid ${border}` }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 5 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                  <span style={{ color, fontSize: 11, fontWeight: 800 }}>{icon}</span>
                  <span style={{ color: T.textSub, fontSize: 10, fontWeight: 600 }}>{label}</span>
                </div>
                <span style={{ color, fontSize: 13, fontWeight: 800 }}>{value}%</span>
              </div>
              <div style={{ height: 4, background: "rgba(0,0,0,0.06)", borderRadius: 999, overflow: "hidden" }}>
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${value}%` }}
                  transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1], delay: 0.2 }}
                  style={{ height: "100%", background: gradient, borderRadius: 999 }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}

// ─── 소스별 분석 카드 ─────────────────────────────────────────
function SourceBreakdownCard({ sourceBreakdown }) {
  const sources = [
    { key: "youtube",   icon: "▶",  name: "YouTube",     sub: "동영상 댓글",   color: "#ef4444" },
    { key: "naver",     icon: "📰", name: "Naver", sub: "언론 기사",     color: "#2563eb" },
    { key: "instagram", icon: "📸", name: "Instagram",   sub: "게시물 & 댓글", color: "#ec4899" },
  ];
  return (
    <Card>
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: "0.16em", color: T.textMuted, textTransform: "uppercase", marginBottom: 4 }}>Sources</div>
        <div style={{ fontSize: 17, fontWeight: 800, color: T.text, letterSpacing: "-0.03em" }}>채널별 위험도</div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {sources.map(({ key, icon, name, sub, color }) => {
          const src = sourceBreakdown?.[key];
          if (!src) return null;
          const m = RISK_META[src.risk_level] ?? RISK_META.moderate;
          return (
            <div key={key} style={{ background: "rgba(248,250,255,0.8)", border: "1px solid rgba(0,0,0,0.055)", borderRadius: 14, padding: "11px 13px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ width: 32, height: 32, borderRadius: 10, background: `${color}12`, border: `1px solid ${color}22`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, flexShrink: 0 }}>{icon}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <span style={{ color: T.text, fontSize: 12, fontWeight: 700 }}>{name}</span>
                    <span style={{ color: m.color, fontSize: 15, fontWeight: 800 }}>{src.risk_score}</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 5 }}>
                    <div style={{ flex: 1, height: 4, background: "#e2e8f0", borderRadius: 999, overflow: "hidden", display: "flex" }}>
                      <div style={{ width: `${src.positive_ratio ?? 0}%`, background: "#10b981", height: "100%" }} />
                      <div style={{ width: `${src.negative_ratio ?? 0}%`, background: "#ef4444", height: "100%" }} />
                    </div>
                    <span style={{ fontSize: 9, fontWeight: 700, color: m.color, background: m.bg, border: `1px solid ${m.border}`, padding: "1px 6px", borderRadius: 5, flexShrink: 0 }}>{m.label}</span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

// ─── 감성 가로 바 ─────────────────────────────────────────────
function SentimentBar({ positive, negative, neutral }) {
  const items = [
    { l: "긍정", v: positive, c: "#10b981", bg: "rgba(16,185,129,0.07)",  border: "rgba(16,185,129,0.15)"  },
    { l: "중립", v: neutral,  c: "#94a3b8", bg: "rgba(148,163,184,0.07)", border: "rgba(148,163,184,0.15)" },
    { l: "부정", v: negative, c: "#ef4444", bg: "rgba(239,68,68,0.07)",   border: "rgba(239,68,68,0.15)"   },
  ];
  return (
    <div>
      <div style={{ display: "flex", height: 6, borderRadius: 999, overflow: "hidden", gap: 2, marginBottom: 12 }}>
        <motion.div initial={{ width: 0 }} animate={{ width: `${positive}%` }} transition={{ duration: 1, ease: [0.22, 1, 0.36, 1], delay: 0.2 }} style={{ background: "#10b981", borderRadius: 999 }} />
        <motion.div initial={{ width: 0 }} animate={{ width: `${neutral}%`  }} transition={{ duration: 1, ease: [0.22, 1, 0.36, 1], delay: 0.3 }} style={{ background: "#e2e8f0",  borderRadius: 999 }} />
        <motion.div initial={{ width: 0 }} animate={{ width: `${negative}%` }} transition={{ duration: 1, ease: [0.22, 1, 0.36, 1], delay: 0.4 }} style={{ background: "#ef4444", borderRadius: 999 }} />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
        {items.map(({ l, v, c, bg, border }) => (
          <div key={l} style={{ background: bg, borderRadius: 12, padding: "10px 8px", textAlign: "center", border: `1px solid ${border}` }}>
            <div style={{ color: c, fontSize: 18, fontWeight: 800, lineHeight: 1 }}>{v}%</div>
            <div style={{ color: T.textMuted, fontSize: 10, marginTop: 3, fontWeight: 600 }}>{l}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Top 콘텐츠 리스트 ────────────────────────────────────────
function TopContentList({ items }) {
  if (!items?.length) return <EmptyState icon="📭" title="데이터가 없습니다" />;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
      {items.map((item, i) => {
        const neg = typeof item.neg_ratio === "number" ? item.neg_ratio : 0;
        const negColor = neg >= 0.75 ? "#ef4444" : neg >= 0.55 ? "#f97316" : "#f59e0b";
        return (
          <motion.a key={i} href={item.url} target="_blank" rel="noreferrer"
            whileHover={{ backgroundColor: "rgba(37,99,235,0.035)", x: 2 }}
            style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "10px 8px", borderRadius: 10, textDecoration: "none" }}
          >
            <div style={{ width: 22, height: 22, borderRadius: 7, background: T.blueLight, border: `1px solid ${T.borderBlue}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 800, color: T.blue, flexShrink: 0, marginTop: 1 }}>{i + 1}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", gap: 6, marginBottom: 4, flexWrap: "wrap", alignItems: "center" }}>
                <span style={{ padding: "1px 7px", borderRadius: 5, fontSize: 10, fontWeight: 700, background: `${negColor}12`, color: negColor, border: `1px solid ${negColor}25` }}>부정 {Math.round(neg * 100)}%</span>
                {item.comment_count != null && <span style={{ color: T.textMuted, fontSize: 10 }}>댓글 {item.comment_count.toLocaleString()}개</span>}
              </div>
              <div className="clamp-text" style={{ color: T.text, fontSize: 12, fontWeight: 500, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", lineHeight: 1.5 }}>{item.title}</div>
              {item.channel  && <div style={{ color: T.textMuted, fontSize: 10, marginTop: 3 }}>{item.channel}</div>}
              {item.pub_date && <div style={{ color: T.textMuted, fontSize: 10, marginTop: 1 }}>{item.pub_date}</div>}
            </div>
            <span style={{ color: T.textMuted, fontSize: 11, flexShrink: 0, marginTop: 2, opacity: 0.45 }}>↗</span>
          </motion.a>
        );
      })}
    </div>
  );
}

// ─── 댓글 감성 분석 카드 ─────────────────────────────────────
const SENTIMENT_CHIP_META = {
  positive: { color: "#10b981", bg: "rgba(16,185,129,0.08)",  border: "rgba(16,185,129,0.2)", label: "긍정" },
  negative: { color: "#ef4444", bg: "rgba(239,68,68,0.08)",   border: "rgba(239,68,68,0.2)",  label: "부정" },
  neutral:  { color: "#94a3b8", bg: "rgba(148,163,184,0.08)", border: "rgba(148,163,184,0.2)",label: "중립" },
};

function CommentSentimentCard({ analyzedComments }) {
  const [filter, setFilter] = useState("all");

  const counts = useMemo(() => {
    if (!analyzedComments) return { positive: 0, negative: 0, neutral: 0 };
    return analyzedComments.reduce((acc, c) => {
      const s = c.sentiment ?? "neutral";
      acc[s] = (acc[s] ?? 0) + 1;
      return acc;
    }, { positive: 0, negative: 0, neutral: 0 });
  }, [analyzedComments]);

  const total = (counts.positive + counts.negative + counts.neutral) || 1;

  const filtered = useMemo(() => {
    if (!analyzedComments) return [];
    if (filter === "all") return analyzedComments.slice(0, 15);
    return analyzedComments.filter((c) => c.sentiment === filter).slice(0, 15);
  }, [analyzedComments, filter]);

  const filterOptions = [
    { key: "all",      label: `전체 ${analyzedComments?.length ?? 0}` },
    { key: "negative", label: `부정 ${counts.negative}` },
    { key: "positive", label: `긍정 ${counts.positive}` },
    { key: "neutral",  label: `중립 ${counts.neutral}`  },
  ];

  return (
    <Card>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 20 }}>
        <div>
          <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: "0.16em", color: T.textMuted, textTransform: "uppercase", marginBottom: 5 }}>Comment Analysis</div>
          <h3 style={{ color: T.text, fontSize: 17, fontWeight: 800, letterSpacing: "-0.04em", margin: 0 }}>댓글 감성 분석</h3>
          <p style={{ color: T.textMuted, fontSize: 11, marginTop: 5, lineHeight: 1.5 }}>수집된 댓글의 감성 분류 결과</p>
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          {[
            { key: "positive", label: "긍정", color: "#10b981" },
            { key: "negative", label: "부정", color: "#ef4444" },
            { key: "neutral",  label: "중립", color: "#94a3b8" },
          ].map(({ key, label, color }) => (
            <div key={key} style={{ textAlign: "center", padding: "8px 11px", borderRadius: 12, background: `${color}0d`, border: `1px solid ${color}22` }}>
              <div style={{ color, fontSize: 15, fontWeight: 800, lineHeight: 1 }}>{Math.round((counts[key] / total) * 100)}%</div>
              <div style={{ color: T.textMuted, fontSize: 9, marginTop: 3, fontWeight: 600 }}>{label}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ height: 7, borderRadius: 999, overflow: "hidden", display: "flex", gap: 2, marginBottom: 18, background: "rgba(0,0,0,0.04)" }}>
        {[{ key:"positive", color:"#10b981" }, { key:"neutral", color:"#cbd5e1" }, { key:"negative", color:"#ef4444" }].map(({ key, color }) => (
          <motion.div key={key} initial={{ width: 0 }} animate={{ width: `${(counts[key] / total) * 100}%` }} transition={{ duration: 1, ease: [0.22, 1, 0.36, 1], delay: 0.1 }} style={{ height: "100%", background: color, borderRadius: 999 }} />
        ))}
      </div>

      <div style={{ marginBottom: 16 }}>
        <SegmentControl options={filterOptions} value={filter} onChange={setFilter} size="sm" />
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 8, maxHeight: 420, overflowY: "auto", paddingRight: 2 }}>
        <AnimatePresence mode="popLayout">
          {filtered.map((c, idx) => {
            const sm = SENTIMENT_CHIP_META[c.sentiment ?? "neutral"] ?? SENTIMENT_CHIP_META.neutral;
            return (
              <motion.div key={idx}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.97 }}
                transition={{ duration: 0.18, delay: idx * 0.02 }}
                style={{ border: `1px solid ${sm.border}`, borderLeft: `3px solid ${sm.color}`, borderRadius: 14, padding: "13px 15px", background: sm.bg }}
              >
                <div style={{ fontSize: 13, color: T.text, marginBottom: 9, lineHeight: 1.6, fontWeight: 500 }}>{c.text}</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 5, alignItems: "center" }}>
                  <span style={{ padding: "3px 9px", borderRadius: 999, fontSize: 10, fontWeight: 700, background: sm.bg, color: sm.color, border: `1px solid ${sm.border}` }}>{sm.label}</span>
                  {c.taxonomy?.emotion_strength && <span className="tag-chip">{c.taxonomy.emotion_strength}</span>}
                  {c.taxonomy?.issue_types?.map((v) => <span key={v} className="tag-chip">{v}</span>)}
                  {c.taxonomy?.action_intent?.map((v) => <span key={v} className="tag-chip">{v}</span>)}
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
        {filtered.length === 0 && <EmptyState icon="💬" title="해당 분류의 댓글이 없습니다" />}
      </div>
    </Card>
  );
}

// ─── AI 리포트 카드 ───────────────────────────────────────────
const REPORT_TABS = [
  { key: "summary",     label: "요약"     },
  { key: "risk",        label: "리스크"   },
  { key: "opportunity", label: "기회"     },
  { key: "action",      label: "대응 전략" },
  { key: "content",     label: "콘텐츠"   },
];

function AiReportCard({ report, loading }) {
  const [tab, setTab] = useState("summary");

  if (loading) {
    return (
      <div style={{ background: "rgba(255,255,255,0.86)", border: "1px solid rgba(124,58,237,0.14)", borderRadius: 24, padding: "24px", backdropFilter: "blur(20px)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 18 }}>
          <div style={{ width: 30, height: 30, borderRadius: 9, background: "linear-gradient(135deg,#7c3aed,#2563eb)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Sparkles size={14} color="#fff" />
          </div>
          <span style={{ color: T.text, fontSize: 14, fontWeight: 700 }}>AI 브랜드 리포트</span>
          <div style={{ marginLeft: "auto", display: "flex", gap: 5 }}>
            {[0,1,2].map(i => <div key={i} style={{ width: 5, height: 5, borderRadius: "50%", background: "#7c3aed", opacity: 0.5, animation: `blink 1.2s ease-in-out ${i*0.2}s infinite` }} />)}
          </div>
        </div>
        {[80,60,72,50].map((w,i) => <div key={i} className="skeleton" style={{ height: 9, width: `${w}%`, marginBottom: 10 }} />)}
      </div>
    );
  }
  if (!report || typeof report !== "object") {
    return <Card><SectionLabel color="#7c3aed">AI 브랜드 리포트</SectionLabel><EmptyState icon="🤖" title="AI 리포트를 생성하지 못했습니다" /></Card>;
  }

  const tabOptions = REPORT_TABS.map(t => ({ key: t.key, label: t.label }));
  const contentMap = {
    summary: report.summary, risk: report.risk_analysis,
    opportunity: report.opportunity, action: report.actions, content: report.content_strategy,
  };
  const content = contentMap[tab];

  return (
    <motion.div variants={fadeUp} initial="hidden" animate="show"
      style={{ background: "rgba(255,255,255,0.86)", border: "1px solid rgba(124,58,237,0.14)", borderRadius: 24, overflow: "hidden", backdropFilter: "blur(20px)", boxShadow: "0 4px 28px rgba(124,58,237,0.07)" }}
    >
      <div style={{ padding: "20px 24px 0", background: "linear-gradient(135deg,rgba(124,58,237,0.04) 0%,rgba(37,99,235,0.03) 100%)" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 30, height: 30, borderRadius: 9, background: "linear-gradient(135deg,#7c3aed,#2563eb)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Sparkles size={14} color="#fff" />
            </div>
            <span style={{ color: T.text, fontSize: 14, fontWeight: 700 }}>AI 브랜드 리포트</span>
          </div>
          <span style={{ color: T.textMuted, fontSize: 10 }}>{report.generated_at}</span>
        </div>
        <div style={{ paddingBottom: 16 }}>
          <SegmentControl options={tabOptions} value={tab} onChange={setTab} />
        </div>
      </div>

      <AnimatePresence mode="wait">
        <motion.div key={tab} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.18 }} style={{ padding: "20px 24px 24px" }}>
          {tab === "summary" ? (
            <div>
              <div style={{ background: "linear-gradient(135deg,rgba(37,99,235,0.04),rgba(124,58,237,0.04))", border: "1px solid rgba(37,99,235,0.1)", borderRadius: 14, padding: "14px 18px", marginBottom: 16 }}>
                <p style={{ color: T.text, fontSize: 13, fontWeight: 600, lineHeight: 1.7, margin: 0 }}>{content?.headline}</p>
              </div>
              <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 9 }}>
                {content?.points?.map((pt, i) => (
                  <li key={i} style={{ display: "flex", alignItems: "flex-start", gap: 9 }}>
                    <span style={{ width: 5, height: 5, borderRadius: "50%", background: "#7c3aed", flexShrink: 0, marginTop: 8, opacity: 0.55 }} />
                    <span style={{ color: T.textSub, fontSize: 12, lineHeight: 1.75 }}>{pt}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {content?.map((item, i) => (
                <div key={i} style={{ display: "flex", gap: 10, padding: "12px 14px", background: "rgba(37,99,235,0.03)", borderRadius: 12, border: "1px solid rgba(37,99,235,0.07)" }}>
                  <div style={{ width: 24, height: 24, borderRadius: 7, background: T.blueLight, border: `1px solid ${T.borderBlue}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 800, color: T.blue, flexShrink: 0, marginTop: 1 }}>{i + 1}</div>
                  <div>
                    <div style={{ color: T.text, fontSize: 12, fontWeight: 700 }}>{item.title}</div>
                    <div style={{ color: T.textSub, fontSize: 11, marginTop: 4, lineHeight: 1.65 }}>{item.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </motion.div>
  );
}

// ─── Situation Brief ──────────────────────────────────────────
const EMOTION_META = {
  concerned:    { label:"걱정·우려",  color:"#f59e0b", bg:"rgba(245,158,11,0.08)",  icon:"😟", sentence:"현재 소비자 반응은 걱정과 불신 중심으로 형성되고 있습니다." },
  dissatisfied: { label:"불만족",     color:"#f97316", bg:"rgba(249,115,22,0.08)",  icon:"😤", sentence:"기대 대비 만족도가 낮다는 반응이 증가하고 있습니다." },
  sarcastic:    { label:"냉소·조롱",  color:"#ef4444", bg:"rgba(239,68,68,0.08)",   icon:"😒", sentence:"브랜드에 대한 냉소적 반응이 확산되고 있습니다." },
  rage:         { label:"강한 분노",  color:"#dc2626", bg:"rgba(220,38,38,0.08)",   icon:"😡", sentence:"격한 분노 반응이 빠르게 증가하고 있습니다." },
  satisfied:    { label:"만족",       color:"#10b981", bg:"rgba(16,185,129,0.08)",  icon:"😊", sentence:"브랜드 만족도가 긍정적으로 유지되고 있습니다." },
  supportive:   { label:"브랜드 지지",color:"#22c55e", bg:"rgba(34,197,94,0.08)",   icon:"💚", sentence:"브랜드를 옹호하는 반응이 확인됩니다." },
  excited:      { label:"기대감",     color:"#06b6d4", bg:"rgba(6,182,212,0.08)",   icon:"✨", sentence:"신제품 및 향후 행보에 대한 기대감이 형성되고 있습니다." },
  anticipating: { label:"관심 집중",  color:"#3b82f6", bg:"rgba(59,130,246,0.08)",  icon:"👀", sentence:"브랜드 관련 이슈에 관심이 집중되고 있습니다." },
  positive:     { label:"긍정적",     color:"#10b981", bg:"rgba(16,185,129,0.08)",  icon:"👍", sentence:"전반적으로 긍정적 반응이 유지되고 있습니다." },
  negative:     { label:"부정적",     color:"#ef4444", bg:"rgba(239,68,68,0.08)",   icon:"👎", sentence:"부정적 감정 반응이 증가하고 있습니다." },
};

const ISSUE_META = {
  quality_issue:    { label:"품질 문제",        icon:"📦", color:"#ef4444", desc:"제품·서비스 품질 관련 불만",       sentence:"제품 품질에 대한 부정 반응이 증가하고 있습니다." },
  pricing_issue:    { label:"가격 문제",        icon:"💰", color:"#f97316", desc:"가격 대비 가치에 대한 이슈",       sentence:"가격 정책에 대한 소비자 불만이 감지됩니다." },
  service_issue:    { label:"서비스 문제",      icon:"🎧", color:"#f59e0b", desc:"고객 응대 관련 불만",             sentence:"고객 경험과 서비스 만족도가 하락하고 있습니다." },
  trust_issue:      { label:"신뢰도 하락",      icon:"🔒", color:"#7c3aed", desc:"브랜드 신뢰성 저하",             sentence:"브랜드 신뢰도에 대한 우려가 커지고 있습니다." },
  ethical_issue:    { label:"윤리 논란",        icon:"⚖️", color:"#dc2626", desc:"기업 윤리·사회적 책임 이슈",     sentence:"기업 윤리 관련 논란이 언급되고 있습니다." },
  false_advertising:{ label:"허위 광고",        icon:"📢", color:"#ec4899", desc:"광고와 실제 경험 간 괴리",       sentence:"광고 신뢰성에 대한 의문이 제기되고 있습니다." },
  creator_issue:    { label:"모델·인플루언서",  icon:"🎭", color:"#8b5cf6", desc:"연관 인물 리스크",               sentence:"연관 인물 관련 부정 여론이 감지됩니다." },
};

const ACTION_META = {
  warning_others: { label:"구매 비추천", icon:"🚫", color:"#ef4444", desc:"타 소비자에게 비구매 권고",   sentence:"구매를 만류하는 반응이 증가하고 있습니다." },
  boycott:        { label:"불매 운동",   icon:"✊", color:"#dc2626", desc:"불매 의사 표명 증가",         sentence:"불매 움직임이 일부 커뮤니티에서 감지됩니다." },
  complaint:      { label:"공식 항의",   icon:"📣", color:"#f97316", desc:"고객센터·공식채널 문의 증가", sentence:"공식 항의 및 문의가 증가하고 있습니다." },
  refund_request: { label:"환불 요구",   icon:"💸", color:"#ef4444", desc:"환불 및 보상 요구 증가",     sentence:"환불을 요구하는 소비자 반응이 감지됩니다." },
  brand_switch:   { label:"경쟁사 이동", icon:"🔄", color:"#f59e0b", desc:"대체 브랜드 언급 증가",     sentence:"경쟁 브랜드로 이동하려는 움직임이 나타납니다." },
  mocking:        { label:"SNS 조롱",    icon:"😂", color:"#f59e0b", desc:"밈·조롱성 콘텐츠 확산",     sentence:"SNS를 중심으로 조롱성 반응이 확산되고 있습니다." },
  purchase_intent:{ label:"구매 의향",   icon:"🛒", color:"#10b981", desc:"구매 계획 언급",             sentence:"구매 의향을 나타내는 긍정 반응이 증가하고 있습니다." },
  recommendation: { label:"추천 의향",   icon:"💬", color:"#10b981", desc:"타인 추천 의사",             sentence:"주변 지인에게 추천하려는 반응이 나타납니다." },
  fandom:         { label:"팬덤 지지",   icon:"💖", color:"#22c55e", desc:"브랜드 옹호 및 지지",       sentence:"충성 고객층의 지지가 유지되고 있습니다." },
  creator_support:{ label:"모델 옹호",   icon:"🤝", color:"#06b6d4", desc:"연관 인물 지지",             sentence:"연관 인물을 옹호하는 반응이 나타나고 있습니다." },
};

function SituationBrief({ taxonomy, overview }) {
  if (!taxonomy) return null;

  const emotion = taxonomy.emotion_strength || {};
  const issues  = taxonomy.issue_types      || {};
  const actions = taxonomy.action_intent    || {};

  const topEmotion = Object.entries(emotion).sort((a, b) => b[1] - a[1])[0];
  const topIssue   = Object.entries(issues).sort((a, b)  => b[1] - a[1])[0];
  const topAction  = Object.entries(actions).sort((a, b) => b[1] - a[1])[0];
  const rm = RISK_META[overview?.risk_level] ?? RISK_META.moderate;

  const emotionCards = Object.entries(emotion).sort((a, b) => b[1] - a[1]).slice(0, 4).map(([key, count]) => {
    const total = Object.values(emotion).reduce((s, v) => s + v, 0) || 1;
    const meta  = EMOTION_META[key] ?? { label: key, color: "#64748b", bg: "rgba(100,116,139,0.08)", icon: "💬" };
    return { key, count, pct: Math.round((count / total) * 100), ...meta };
  });

  const issueCards = Object.entries(issues).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([key, count]) => {
    const total = Object.values(issues).reduce((s, v) => s + v, 0) || 1;
    const meta  = ISSUE_META[key] ?? { label: key, color: "#f97316", icon: "⚠️" };
    return { key, count, pct: Math.round((count / total) * 100), ...meta };
  });

  const actionCards = Object.entries(actions).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([key, count]) => {
    const total = Object.values(actions).reduce((s, v) => s + v, 0) || 1;
    const meta  = ACTION_META[key] ?? { label: key, color: "#64748b", icon: "→" };
    return { key, count, pct: Math.round((count / total) * 100), ...meta };
  });

  const emotionSentence = topEmotion ? (EMOTION_META[topEmotion[0]]?.sentence ?? `"${topEmotion[0]}" 감정 반응이 가장 두드러집니다.`) : "소비자 감정 반응이 다양하게 나타나고 있습니다.";
  const issueSentence   = topIssue   ? (ISSUE_META[topIssue[0]]?.sentence   ?? `"${topIssue[0]}" 관련 이슈가 주요 원인입니다.`) : "주요 이슈 원인을 분석 중입니다.";
  const actionSentence  = topAction  ? (ACTION_META[topAction[0]]?.sentence  ?? `"${topAction[0]}" 행동이 감지됩니다.`) : "소비자 행동 패턴을 추적 중입니다.";

  return (
    <motion.div variants={fadeUp} className="situation-brief-wrap">
      <div className="sb-header">
        <div>
          <div className="sb-eyebrow"><Brain size={12} />AI SITUATION BRIEF</div>
          <h2 className="sb-title">현재 여론 상황 분석</h2>
        </div>
        <div className="sb-live-pill">
          <div className="sb-live-dot" />
          LIVE
        </div>
      </div>

      <div className="sb-summary-box">
        <p className="sb-summary-text">
          {emotionSentence} {issueSentence} {actionSentence}{" "}
          현재 브랜드는 <span style={{ color: rm.color, fontWeight: 800 }}>{rm.label} 단계</span>로 판단됩니다.
        </p>
      </div>

      <div className="sb-grid">
        <div className="sb-section-card">
          <div className="sb-section-title"><span>😤</span> 소비자 감정</div>
          <div className="sb-emotion-list">
            {emotionCards.map(({ key, label, pct, color, icon }) => (
              <div key={key} className="sb-emotion-row">
                <div className="sb-emotion-label">
                  <span className="sb-emotion-icon">{icon}</span>
                  <span className="sb-emotion-name">{label}</span>
                </div>
                <div className="sb-emotion-bar-wrap">
                  <motion.div className="sb-emotion-bar" initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }} style={{ background: color }} />
                </div>
                <span className="sb-emotion-count" style={{ color }}>{pct}%</span>
              </div>
            ))}
          </div>
        </div>

        <div className="sb-section-card">
          <div className="sb-section-title"><span>🔍</span> 핵심 이슈</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {issueCards.map(({ key, label, pct, color, icon, desc }) => (
              <div key={key} className="sb-issue-row" style={{ borderColor: `${color}22` }}>
                <div className="sb-issue-icon" style={{ background: `${color}14`, color }}>{icon}</div>
                <div style={{ flex: 1 }}>
                  <div className="sb-issue-label">{label}</div>
                  {desc && <div className="sb-issue-desc">{desc}</div>}
                </div>
                <div className="sb-issue-count" style={{ background: `${color}10`, color }}>{pct}%</div>
              </div>
            ))}
          </div>
        </div>

        <div className="sb-section-card">
          <div className="sb-section-title"><span>📢</span> 소비자 행동</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {actionCards.map(({ key, label, pct, color, icon, desc }) => (
              <div key={key} className="sb-issue-row" style={{ borderColor: `${color}22` }}>
                <div className="sb-issue-icon" style={{ background: `${color}14`, color }}>{icon}</div>
                <div style={{ flex: 1 }}>
                  <div className="sb-issue-label">{label}</div>
                  {desc && <div className="sb-issue-desc">{desc}</div>}
                </div>
                <div className="sb-issue-count" style={{ background: `${color}10`, color }}>{pct}%</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// ─── 인물 카드 ────────────────────────────────────────────────
function PersonCard({ person, isActive, onClick }) {
  const m = RISK_META[person.risk_level] ?? RISK_META.moderate;
  return (
    <motion.button onClick={onClick} whileHover={{ scale: 1.01 }}
      style={{
        width: "100%", textAlign: "left", padding: "14px 16px", borderRadius: 16, cursor: "pointer",
        background: isActive ? "rgba(255,255,255,0.95)" : "rgba(255,255,255,0.6)",
        border: isActive ? `1.5px solid ${m.color}40` : `1px solid ${T.border}`,
        boxShadow: isActive ? `0 4px 20px ${m.glow}` : "none",
        backdropFilter: "blur(12px)", transition: "all 0.2s",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{ width: 36, height: 36, borderRadius: 10, background: m.bg, border: `1px solid ${m.border}`, color: m.color, fontSize: 11, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{person.name.slice(0, 2)}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ color: T.text, fontSize: 13, fontWeight: 700 }}>{person.name}</div>
          <div style={{ color: T.textMuted, fontSize: 10, marginTop: 1 }}>{person.role}</div>
        </div>
        <div style={{ textAlign: "right", flexShrink: 0 }}>
          <div style={{ padding: "2px 7px", borderRadius: 5, fontSize: 10, fontWeight: 700, background: m.bg, color: m.color, border: `1px solid ${m.border}`, marginBottom: 4, display: "inline-block" }}>{m.label}</div>
          <div style={{ color: m.color, fontSize: 18, fontWeight: 800, lineHeight: 1 }}>{person.risk_score}</div>
        </div>
      </div>
      <div style={{ color: T.textSub, fontSize: 11, marginTop: 8, lineHeight: 1.55 }}>{person.impact}</div>
    </motion.button>
  );
}

function PersonArticles({ person }) {
  if (!person?.top_content?.length) return <EmptyState icon="📰" title="분석된 콘텐츠가 없습니다" />;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
      {person.top_content.map((a, i) => {
        const neg = a.neg_ratio ?? 0;
        const negColor = neg >= 0.75 ? "#ef4444" : neg >= 0.55 ? "#f97316" : "#f59e0b";
        return (
          <motion.a key={i} href={a.url} target="_blank" rel="noreferrer"
            whileHover={{ backgroundColor: "rgba(37,99,235,0.04)", x: 2 }}
            style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "10px 8px", borderRadius: 9, textDecoration: "none" }}
          >
            <div style={{ width: 20, height: 20, borderRadius: 6, background: T.blueLight, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 800, color: T.blue, flexShrink: 0, marginTop: 1 }}>{i + 1}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <span style={{ padding: "1px 7px", borderRadius: 5, fontSize: 10, fontWeight: 700, background: `${negColor}12`, color: negColor, border: `1px solid ${negColor}25`, marginBottom: 4, display: "inline-block" }}>부정 {Math.round(neg * 100)}%</span>
              <div style={{ color: T.text, fontSize: 12, fontWeight: 500, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", lineHeight: 1.5, marginTop: 3 }}>{a.title}</div>
              <div style={{ color: T.textMuted, fontSize: 10, marginTop: 3 }}>{a.pub_date}</div>
            </div>
            <span style={{ color: T.textMuted, fontSize: 11, flexShrink: 0, marginTop: 2, opacity: 0.45 }}>↗</span>
          </motion.a>
        );
      })}
    </div>
  );
}

// ─── Invite Modal ─────────────────────────────────────────────
function InviteModal({ onClose }) {
  const [email, setEmail]     = useState("");
  const [sent, setSent]       = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState("");

  const handleInvite = async () => {
    if (!email.trim()) return;
    setLoading(true); setError("");
    try {
      const res  = await fetch("http://localhost:8000/invite", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${localStorage.getItem("token")}` }, body: JSON.stringify({ email }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "오류가 발생했습니다");
      setSent(true);
      setTimeout(onClose, 2000);
    } catch (e) { setError(e.message); } finally { setLoading(false); }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      style={{ position: "fixed", inset: 0, zIndex: 9000, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}
      onClick={onClose}
    >
      <div style={{ position: "absolute", inset: 0, background: "rgba(15,23,42,0.4)", backdropFilter: "blur(8px)" }} />
      <motion.div initial={{ scale: 0.96, opacity: 0, y: 8 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.96, opacity: 0 }} transition={{ duration: 0.18 }}
        onClick={(e) => e.stopPropagation()}
        style={{ position: "relative", width: "100%", maxWidth: 360, background: "rgba(255,255,255,0.96)", backdropFilter: "blur(20px)", border: "1px solid rgba(37,99,235,0.15)", borderRadius: 22, padding: 24, boxShadow: "0 24px 60px rgba(37,99,235,0.15)" }}
      >
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: "linear-gradient(90deg,#2563eb,#7c3aed)", borderRadius: "22px 22px 0 0" }} />
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
          <div>
            <h3 style={{ color: T.text, fontSize: 15, fontWeight: 700, margin: 0 }}>팀원 초대</h3>
            <p style={{ color: T.textMuted, fontSize: 11, margin: "4px 0 0" }}>이메일로 초대 링크를 전송합니다</p>
          </div>
          <button onClick={onClose} style={{ width: 28, height: 28, borderRadius: 8, background: "rgba(0,0,0,0.06)", border: "none", cursor: "pointer", fontSize: 12 }}>✕</button>
        </div>
        {sent ? (
          <div style={{ padding: "16px 0", textAlign: "center" }}>
            <div style={{ fontSize: 28, marginBottom: 10 }}>✉️</div>
            <div style={{ color: T.text, fontSize: 13, fontWeight: 600 }}>초대 링크를 전송했습니다!</div>
            <div style={{ color: T.textSub, fontSize: 11, marginTop: 4 }}>{email}</div>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleInvite()} placeholder="팀원 이메일 입력"
              style={{ width: "100%", padding: "10px 14px", borderRadius: 12, background: "rgba(37,99,235,0.04)", border: "1px solid rgba(37,99,235,0.15)", fontSize: 13, outline: "none", fontFamily: "inherit", boxSizing: "border-box" }} />
            {error && <div style={{ color: "#ef4444", fontSize: 11, padding: "6px 10px", background: "#fef2f2", borderRadius: 8 }}>⚠️ {error}</div>}
            <button onClick={handleInvite} disabled={loading || !email.trim()}
              style={{ width: "100%", padding: "10px 0", borderRadius: 12, background: loading ? "#93c5fd" : T.blue, border: "none", cursor: loading ? "not-allowed" : "pointer", color: "#fff", fontSize: 13, fontWeight: 700, fontFamily: "inherit", boxShadow: "0 4px 14px rgba(37,99,235,0.3)" }}>
              {loading ? "전송 중..." : "초대 링크 전송"}
            </button>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}

// ═══════════════════════════════════════════════════════════════
//  메인 Dashboard
// ═══════════════════════════════════════════════════════════════
export default function Dashboard() {
  const navigate     = useNavigate();
  const dashboardRef = useRef(null);

  const [loading,        setLoading]        = useState(() => !loadAnyCachedBrand());
  const [dashData,       setDashData]       = useState(null);
  const [cacheTs,        setCacheTs]        = useState(null);
  const [error,          setError]          = useState(null);
  const [activePersonId, setActivePersonId] = useState(null);
  const [showInvite,     setShowInvite]     = useState(false);
  const [pdfLoading,     setPdfLoading]     = useState(false);
  const [topTab,         setTopTab]         = useState("youtube");
  const [minutesAgo,     setMinutesAgo]     = useState("");
  const [aiReport,       setAiReport]       = useState(null);
  const [aiLoading,      setAiLoading]      = useState(false);

  const dashDataRef        = useRef(null);
  const aiReportFetchedRef = useRef(false);

  const setDashDataSync = (data) => { dashDataRef.current = data; setDashData(data); };

  const runAnalysis = useCallback(async ({ forceRefresh = false } = {}) => {
    if (forceRefresh) { setAiReport(null); aiReportFetchedRef.current = false; }
    if (!forceRefresh) {
      if (dashDataRef.current) return;
      const anyCache = loadAnyCachedBrand();
      if (anyCache) {
        setDashDataSync(anyCache.data); setCacheTs(anyCache.timestamp);
        if (anyCache.data.personRisk.persons.length > 0) setActivePersonId(anyCache.data.personRisk.persons[0].id);
        return;
      }
    }
    setError(null); setLoading(true);
    try {
      const [apiResult, personsResult] = await Promise.all([
        analyzeBrand(),
        getPersons()
      ]);
      const mapped = mapApiToDashboard(apiResult, personsResult);
      saveCache(mapped, mapped.overview.brand);
      setDashDataSync(mapped);
      setCacheTs(Date.now());
      if (mapped.personRisk.persons.length > 0)
        setActivePersonId(mapped.personRisk.persons[0].id);
    } catch (e) {
      console.error(e);
      setError("분석 실패");
    }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { runAnalysis(); }, [runAnalysis]);

  useEffect(() => {
    if (!cacheTs) return;
    const update = () => setMinutesAgo(getMinutesAgo(cacheTs));
    update();
    const id = setInterval(update, 60000);
    return () => clearInterval(id);
  }, [cacheTs]);

  useEffect(() => {
    if (!dashData || aiReport || aiReportFetchedRef.current) return;
    aiReportFetchedRef.current = true;
    const fetchReport = async () => {
      setAiLoading(true);
      try { const res = await generateAiReport(dashData); setAiReport(res); }
      catch (e) { console.error("[AI Report 실패]", e); aiReportFetchedRef.current = false; }
      finally { setAiLoading(false); }
    };
    fetchReport();
  }, [dashData]);

  const handleExportPdf = useCallback(async () => {
    setPdfLoading(true);
    try {
      const [html2canvas, { jsPDF }] = await Promise.all([import("html2canvas").then((m) => m.default), import("jspdf")]);
      const el = dashboardRef.current;
      const prevStyle = el.style.cssText;
      document.body.classList.add("pdf-mode");
      el.style.width = "1180px"; el.style.maxWidth = "1180px"; el.style.padding = "40px 24px 60px";
      const canvas = await html2canvas(el, { scale: 2, useCORS: true, backgroundColor: T.bg, logging: false, width: 1180, windowWidth: 1180 });
      document.body.classList.remove("pdf-mode"); el.style.cssText = prevStyle;
      const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      const pw = pdf.internal.pageSize.getWidth(); const ph = pdf.internal.pageSize.getHeight();
      const iw = pw; const ih = (canvas.height * iw) / canvas.width;
      let hl = ih; let pos = 0;
      pdf.addImage(canvas.toDataURL("image/png"), "PNG", 0, pos, iw, ih); hl -= ph;
      while (hl > 0) { pos -= ph; pdf.addPage(); pdf.addImage(canvas.toDataURL("image/png"), "PNG", 0, pos, iw, ih); hl -= ph; }
      pdf.save(`브랜드리스크_${dashData?.overview?.brand ?? "report"}_${new Date().toLocaleDateString("ko-KR")}.pdf`);
    } catch (e) { document.body.classList.remove("pdf-mode"); alert("PDF 내보내기 실패: " + e.message); }
    finally { setPdfLoading(false); }
  }, [dashData]);

  const handleLogout = useCallback(() => {
    Object.keys(localStorage).forEach((key) => {
      if (key.startsWith("brandRiskCache_") || key.startsWith("brandRiskAiReport_")) localStorage.removeItem(key);
    });
    localStorage.removeItem("token"); navigate("/"); window.location.reload();
  }, [navigate]);

  const activePerson = useMemo(
    () => dashData?.personRisk.persons.find((p) => p.id === activePersonId) ?? null,
    [dashData, activePersonId]
  );

  // ── keyframes (한 번만 주입)
  useEffect(() => {
    const id = "dashboard-keyframes";
    if (document.getElementById(id)) return;
    const style = document.createElement("style");
    style.id = id;
    style.textContent = `
      @keyframes avatarPulse {
        0%, 100% { transform: scale(1); opacity: 0.25; }
        50%       { transform: scale(1.08); opacity: 0.45; }
      }
      @keyframes livePulse {
        0%, 100% { opacity: 1; transform: scale(1); }
        50%       { opacity: 0.4; transform: scale(0.8); }
      }
      @keyframes blink {
        0%, 100% { opacity: 0.5; transform: scale(1); }
        50%       { opacity: 1;   transform: scale(1.3); }
      }
      @keyframes float {
        0%, 100% { transform: translateY(0);    }
        50%       { transform: translateY(-6px); }
      }
    `;
    document.head.appendChild(style);
  }, []);

  // ── 로딩 화면
  if (loading) return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: "linear-gradient(160deg,#f0f6ff 0%,#fafbff 50%,#f5f0ff 100%)", gap: 18, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      <div style={{ position: "fixed", inset: 0, pointerEvents: "none", opacity: 0.4, backgroundImage: "linear-gradient(rgba(37,99,235,.06) 1px,transparent 1px),linear-gradient(90deg,rgba(37,99,235,.06) 1px,transparent 1px)", backgroundSize: "40px 40px" }} />
      <div style={{ width: 56, height: 56, borderRadius: 16, background: "linear-gradient(135deg,#2563eb,#7c3aed)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 8px 28px rgba(37,99,235,0.3)", animation: "float 2s ease-in-out infinite" }}>
        <span style={{ color: "#fff", fontSize: 24, fontWeight: 800 }}>R</span>
      </div>
      <div style={{ textAlign: "center" }}>
        <div style={{ color: T.text, fontSize: 16, fontWeight: 700 }}>브랜드 리스크 분석 중</div>
        <div style={{ color: T.textSub, fontSize: 13, marginTop: 5 }}>YouTube · 네이버 뉴스 · Instagram</div>
      </div>
      <div style={{ display: "flex", gap: 6, marginTop: 4 }}>
        {[0,1,2].map(i => <div key={i} style={{ width: 6, height: 6, borderRadius: "50%", background: T.blue, animation: `blink 1.2s ease-in-out ${i*0.2}s infinite` }} />)}
      </div>
    </div>
  );

  // ── 에러 화면
  if (error) return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: "linear-gradient(160deg,#f0f6ff 0%,#fafbff 100%)", gap: 12, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      <EmptyState icon="⚠️" title="분석 실패" desc={error} action={
        <button onClick={() => runAnalysis({ forceRefresh: true })} style={{ marginTop: 16, padding: "10px 24px", borderRadius: 12, background: T.blue, border: "none", cursor: "pointer", color: "#fff", fontSize: 13, fontWeight: 600, fontFamily: "inherit", boxShadow: "0 4px 14px rgba(37,99,235,0.3)" }}>다시 시도</button>
      } />
    </div>
  );

  if (!dashData) return null;

  const { overview, sourceBreakdown, personRisk, topContent, taxonomySummary, analyzedComments } = dashData;
  const rm = RISK_META[overview.risk_level] ?? RISK_META.moderate;

  return (
    <>
      <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
        <Navbar
          brand={overview.brand}
          onRefresh={() => runAnalysis({ forceRefresh: true })}
          onInvite={() => setShowInvite(true)}
          onExportPdf={handleExportPdf}
          pdfLoading={pdfLoading}
          onLogout={handleLogout}
        />
      </div>

      <AnimatePresence>{showInvite && <InviteModal onClose={() => setShowInvite(false)} />}</AnimatePresence>

      {/* 페이지 배경 */}
      <div style={{ minHeight: "100vh", background: "linear-gradient(160deg,#f0f4ff 0%,#fafbff 55%,#f5f0ff 100%)", position: "relative" }}>
        <div style={{ position: "fixed", inset: 0, pointerEvents: "none", opacity: 0.3, zIndex: 0, backgroundImage: "linear-gradient(rgba(37,99,235,.06) 1px,transparent 1px),linear-gradient(90deg,rgba(37,99,235,.06) 1px,transparent 1px)", backgroundSize: "40px 40px" }} />
        <div style={{ position: "fixed", top: 60, left: "50%", transform: "translateX(-50%)", width: 700, height: 300, borderRadius: "50%", background: `radial-gradient(ellipse at top,${rm.glow} 0%,transparent 70%)`, pointerEvents: "none", zIndex: 0, transition: "background 1s" }} />

        <div ref={dashboardRef} style={{ maxWidth: 1180, margin: "0 auto", padding: "88px 24px 60px", position: "relative", zIndex: 1 }}>
          <motion.div variants={stagger} initial="hidden" animate="show">

            {/* ══════════════════════════════════════
                COMPACT HERO (새 디자인)
            ══════════════════════════════════════ */}
            <CompactHero
              overview={overview}
              sourceBreakdown={sourceBreakdown}
              minutesAgo={minutesAgo}
              onRefresh={() => runAnalysis({ forceRefresh: true })}
            />

            {/* ══════════════════════════════════════
                ROW 1 — 감성분석 + 채널별위험도
            ══════════════════════════════════════ */}
            <motion.div variants={fadeUp} style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>
              <SentimentCard
                positive={overview.positive_ratio}
                negative={overview.negative_ratio}
                neutral={overview.neutral_ratio}
              />
              <SourceBreakdownCard sourceBreakdown={sourceBreakdown} />
            </motion.div>

            {/* ══════════════════════════════════════
                AI SITUATION BRIEF
            ══════════════════════════════════════ */}
            <SituationBrief taxonomy={taxonomySummary} overview={overview} />

            {/* ══════════════════════════════════════
                AI 리포트
            ══════════════════════════════════════ */}
            <motion.div variants={fadeUp} style={{ marginTop: 14 }}>
              <AiReportCard report={aiReport} loading={aiLoading} />
            </motion.div>

            {/* ══════════════════════════════════════
                ROW — 부정 콘텐츠 TOP5 | 댓글 감성
            ══════════════════════════════════════ */}
            <motion.div variants={fadeUp} style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginTop: 14 }}>
              <Card>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
                  <SectionLabel>부정 콘텐츠 TOP 5</SectionLabel>
                </div>
                <TopContentList items={topContent} />
              </Card>
              <CommentSentimentCard analyzedComments={analyzedComments} />
            </motion.div>

            {/* ══════════════════════════════════════
                연관 인물 분석
            ══════════════════════════════════════ */}
            <DividerBadge icon="👤" label="연관 인물 분석" color="#7c3aed" />

            {!personRisk.detected ? (
              <Card>
                <EmptyState
                  icon="👤"
                  title="등록된 연관 인물이 없습니다"
                  desc="설정에서 연관 인물을 등록해주세요."
                  action={
                    <button onClick={() => navigate("/settings")} style={{ marginTop: 16, padding: "10px 24px", borderRadius: 12, background: T.blue, border: "none", cursor: "pointer", color: "#fff", fontSize: 13, fontWeight: 600, fontFamily: "inherit", boxShadow: "0 4px 14px rgba(37,99,235,0.28)" }}>
                      설정으로 이동
                    </button>
                  }
                />
              </Card>
            ) : (
              <motion.div variants={fadeUp} style={{ display: "grid", gridTemplateColumns: "290px 1fr", gap: 14 }}>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  <Card style={{ padding: "16px 18px" }}>
                    <SectionLabel>연관 인물</SectionLabel>
                    <div style={{ color: T.textSub, fontSize: 13 }}>
                      총 <span style={{ color: "#7c3aed", fontWeight: 800 }}>{personRisk.persons.length}명</span> 분석 완료
                    </div>
                  </Card>
                  {personRisk.persons.map((p) => (
                    <PersonCard key={p.id} person={p} isActive={activePersonId === p.id} onClick={() => setActivePersonId(p.id)} />
                  ))}
                </div>

                <div>
                  {activePerson ? (
                    <motion.div key={activePerson.id} initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.22 }} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                      <Card>
                        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 16 }}>
                          <div>
                            <div style={{ color: T.text, fontSize: 20, fontWeight: 800 }}>{activePerson.name}</div>
                            <div style={{ color: T.textMuted, fontSize: 11, marginTop: 2 }}>{activePerson.role} · 기사 {activePerson.articles}개 분석</div>
                          </div>
                          {(() => {
                            const m2 = RISK_META[activePerson.risk_level] ?? RISK_META.moderate;
                            return (
                              <div style={{ textAlign: "right" }}>
                                <div style={{ padding: "3px 9px", borderRadius: 6, fontSize: 11, fontWeight: 700, background: m2.bg, color: m2.color, border: `1px solid ${m2.border}`, marginBottom: 6, display: "inline-block" }}>{m2.label}</div>
                                <div style={{ color: m2.color, fontSize: 32, fontWeight: 800, lineHeight: 1 }}>{activePerson.risk_score}</div>
                              </div>
                            );
                          })()}
                        </div>
                        <div style={{ background: "rgba(37,99,235,0.04)", border: "1px solid rgba(37,99,235,0.1)", borderRadius: 12, padding: "12px 16px", marginBottom: 16, color: T.textSub, fontSize: 12, lineHeight: 1.7 }}>{activePerson.impact}</div>
                        <SentimentBar positive={activePerson.positive_ratio} negative={activePerson.negative_ratio} neutral={activePerson.neutral_ratio} />
                      </Card>
                      <Card>
                        <SectionLabel>인물 관련 콘텐츠 TOP 5</SectionLabel>
                        <PersonArticles person={activePerson} />
                      </Card>
                    </motion.div>
                  ) : (
                    <Card><EmptyState icon="👤" title="인물을 선택해주세요" /></Card>
                  )}
                </div>
              </motion.div>
            )}

          </motion.div>
        </div>
      </div>
    </>
  );
}