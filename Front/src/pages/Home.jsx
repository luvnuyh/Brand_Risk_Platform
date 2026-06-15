import { useNavigate, Link } from "react-router-dom";
import { useRef, useState, useEffect } from "react";
import logo from "../assets/logo.png";
import Navbar from "../components/Navbar.jsx";

/* ─────────────────────────────────────────
   NAVBAR
───────────────────────────────────────── */
function HomeNavbar() {
  const nav = useNavigate();
  const token = localStorage.getItem("token");

  const handleLogout = () => {
    localStorage.removeItem("token");
    nav("/");
    window.location.reload();
  };

  return (
    <header style={{
      position: "fixed", top: 0, left: 0, width: "100%", zIndex: 9999,
      backdropFilter: "blur(20px)",
      background: "rgba(248,250,255,0.85)",
      borderBottom: "1px solid rgba(0,0,0,0.07)",
    }}>
      <div style={{
        maxWidth: 1280, margin: "0 auto", padding: "0 48px",
        height: 64, display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <Link to="/" style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none" }}>
          <img src={logo} alt="RiskLens" style={{ width: 32, height: 32, objectFit: "contain" }} />
          <span className="f-display" style={{ fontSize: 20, color: "#0f172a", letterSpacing: ".04em" }}>
            Risk<span style={{ color: "#2563eb" }}>LENS</span>
          </span>
        </Link>

        <nav style={{ display: "flex", alignItems: "center", gap: 24 }}>
          {/* 기능 버튼 제거 */}
          {token ? (
            <>
              <Link to="/dashboard" className="f-body" style={{
                color: "#64748b", fontSize: 14, fontWeight: 500, textDecoration: "none",
              }}>Dashboard</Link>
              <button onClick={handleLogout} className="f-body" style={{
                padding: "8px 18px", borderRadius: 10, fontSize: 14, fontWeight: 500,
                background: "rgba(239,68,68,.08)", border: "1px solid rgba(239,68,68,.2)",
                color: "#ef4444", cursor: "pointer",
              }}>Logout</button>
            </>
          ) : (
            <>
              <Link to="/login" className="f-body" style={{
                color: "#64748b", fontSize: 14, fontWeight: 500, textDecoration: "none",
              }}>로그인</Link>
              <Link to="/signup" className="f-body" style={{
                padding: "8px 20px", borderRadius: 10, fontSize: 14, fontWeight: 600,
                background: "#2563eb", color: "#fff", textDecoration: "none",
              }}>시작하기</Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}

/* ─────────────────────────────────────────
   RADAR (lighter tones)
───────────────────────────────────────── */
function Radar() {
  const dots = [
    { top: "26%", left: "60%", c: "#ef4444", d: "0s" },
    { top: "52%", left: "74%", c: "#f59e0b", d: ".9s" },
    { top: "40%", left: "36%", c: "#ef4444", d: "1.6s" },
    { top: "68%", left: "48%", c: "#22c55e", d: "2.2s" },
    { top: "18%", left: "50%", c: "#f59e0b", d: "2.9s" },
  ];
  return (
    <div style={{ position: "relative", width: "100%", height: "100%",
      display: "flex", alignItems: "center", justifyContent: "center" }}>
      {[1,2,3,4].map(r => (
        <div key={r} style={{
          position: "absolute", borderRadius: "50%",
          border: "1px solid rgba(37,99,235,.15)",
          width: `${r*22}%`, height: `${r*22}%`,
          animation: `pulse-ring 3.5s ease-out ${r*.55}s infinite`,
        }} />
      ))}
      <div style={{
        position: "absolute", width: 100, height: 100, borderRadius: "50%",
        background: "radial-gradient(circle, rgba(37,99,235,.2) 0%, transparent 70%)",
        animation: "card-float 2.8s ease-in-out infinite",
      }} />
      <div style={{
        position: "absolute", top: "27%", left: "50%",
        width: "46%", height: "46%", transformOrigin: "0% 100%",
        animation: "spin 5s linear infinite",
      }}>
        <div style={{
          width: "100%", height: 2, transformOrigin: "0% 50%",
          transform: "rotate(-90deg)",
          background: "linear-gradient(90deg, rgba(37,99,235,.6), transparent)",
        }} />
      </div>
      {dots.map((d, i) => (
        <div key={i} style={{
          position: "absolute", top: d.top, left: d.left,
          width: 8, height: 8, borderRadius: "50%",
          background: d.c, boxShadow: `0 0 10px ${d.c}80`,
          animation: `signal-dot 3s ease-in-out ${d.d} infinite`,
        }} />
      ))}
    </div>
  );
}

/* ─────────────────────────────────────────
   FLOATING SIGNAL CARD
───────────────────────────────────────── */
function SignalCard({ style, color, label, title, sub, delay = "0s" }) {
  return (
    <div style={{
      position: "absolute", ...style,
      background: "rgba(255,255,255,0.92)",
      border: `1px solid ${color}30`,
      borderRadius: 14, padding: "12px 16px",
      backdropFilter: "blur(12px)",
      boxShadow: "0 4px 24px rgba(0,0,0,0.08)",
      animation: `card-float 4s ease-in-out ${delay} infinite`,
      minWidth: 190, zIndex: 10,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
        <div style={{
          width: 6, height: 6, borderRadius: "50%", background: color,
          boxShadow: `0 0 6px ${color}`, animation: "signal-dot 2s ease-in-out infinite",
        }} />
        <span className="eyebrow" style={{ color, fontSize: 10 }}>{label}</span>
      </div>
      <p className="f-body" style={{ color: "#0f172a", fontSize: 13, fontWeight: 600 }}>{title}</p>
      <p className="f-body" style={{ color: "#94a3b8", fontSize: 11, marginTop: 2 }}>{sub}</p>
    </div>
  );
}

/* ─────────────────────────────────────────
   HOME
───────────────────────────────────────── */
export default function Home() {
  const nav = useNavigate();

  return (
    <>
      <Navbar />

      <div className="snap-root" style={{ background: "#f8faff" }}>

        {/* ══ S1 · HERO ══ */}
        <section className="snap-sec" style={{
          background: "linear-gradient(160deg, #f0f6ff 0%, #fafbff 50%, #f5f0ff 100%)",
        }}>
          {/* subtle grid */}
          <div style={{
            position: "absolute", inset: 0, pointerEvents: "none", opacity: 0.4,
            backgroundImage: "linear-gradient(rgba(37,99,235,.06) 1px, transparent 1px), linear-gradient(90deg, rgba(37,99,235,.06) 1px, transparent 1px)",
            backgroundSize: "40px 40px",
          }} />
          <div style={{
            position: "absolute", inset: 0, pointerEvents: "none",
            background: "radial-gradient(ellipse 70% 60% at 65% 50%, rgba(37,99,235,.07) 0%, transparent 70%)",
          }} />

          <div style={{
            position: "relative", zIndex: 10, width: "100%",
            maxWidth: 1280, margin: "0 auto", padding: "0 48px",
            display: "grid", gridTemplateColumns: "1fr 1fr", gap: 48, alignItems: "center",
          }}>
            {/* LEFT */}
            <div>
              <div className="au1" style={{
                display: "inline-flex", alignItems: "center", gap: 8,
                padding: "5px 14px", borderRadius: 999, marginBottom: 28,
                background: "rgba(37,99,235,.08)", border: "1px solid rgba(37,99,235,.18)",
              }}>
                <div style={{
                  width: 6, height: 6, borderRadius: "50%", background: "#2563eb",
                  animation: "signal-dot 2s ease-in-out infinite",
                }} />
                <span className="eyebrow" style={{ color: "#2563eb" }}>
                  Brand Risk Intelligence
                </span>
              </div>

              <h1 className="au2 f-display"
                style={{ fontSize: "clamp(44px,5.5vw,72px)", lineHeight: 1.05, color: "#0f172a" }}>
                브랜드 리스크를<br />
                <span style={{
                  background: "linear-gradient(135deg, #2563eb 0%, #7c3aed 100%)",
                  WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
                }}>AI로 감지</span>하다
              </h1>

              <p className="au3 f-body" style={{
                fontSize: 16, lineHeight: 1.8, color: "#64748b",
                maxWidth: 420, margin: "24px 0 32px",
              }}>
                온라인 채널의 반응 데이터를 분석해
                브랜드 리스크 신호를 탐지하고 대응 인사이트를 제공합니다.
              </p>

              <div className="au4" style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                <button
                  style={{
                    padding: "13px 28px", borderRadius: 12, fontSize: 15, fontWeight: 600,
                    background: "#2563eb", color: "#fff", border: "none", cursor: "pointer",
                    boxShadow: "0 4px 20px rgba(37,99,235,.35)",
                    transition: "transform .15s, box-shadow .15s",
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.transform = "translateY(-1px)";
                    e.currentTarget.style.boxShadow = "0 6px 28px rgba(37,99,235,.45)";
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.transform = "translateY(0)";
                    e.currentTarget.style.boxShadow = "0 4px 20px rgba(37,99,235,.35)";
                  }}
                  onClick={() => nav("/demo")}
                >
                  무료 체험하기 →
                </button>
                <button
                  style={{
                    padding: "13px 28px", borderRadius: 12, fontSize: 15, fontWeight: 500,
                    background: "rgba(255,255,255,0.8)", color: "#374151",
                    border: "1px solid rgba(0,0,0,.1)", cursor: "pointer",
                    backdropFilter: "blur(8px)",
                    transition: "background .15s",
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = "#fff"}
                  onMouseLeave={e => e.currentTarget.style.background = "rgba(255,255,255,0.8)"}
                  onClick={() => nav("/features")}
                >
                  기능 살펴보기
                </button>
              </div>
            </div>

            {/* RIGHT — radar */}
            <div style={{ position: "relative", height: 500 }}>
              <Radar />
              <SignalCard style={{ top: "10%", right: "2%" }} color="#ef4444"
                label="위험 감지" title="부정 감성 급증" sub="네이버 블로그 · 2시간 전" delay="0s" />
              <SignalCard style={{ bottom: "18%", left: "0%" }} color="#2563eb"
                label="AI 분석" title="대응 전략 생성 완료" sub="위험 신호 탐지" delay="2s" />
              <SignalCard style={{ top: "50%", right: "-2%" }} color="#22c55e"
                label="리스크 해소" title="위험 스코어 정상화" sub="15분 전 대응 완료" delay="4s" />
            </div>
          </div>
        </section>

        {/* ══ S2 · HOW IT WORKS ══ */}
        <section className="snap-sec" style={{ background: "#fff" }}>
          <div style={{
            position: "relative", zIndex: 10, width: "100%",
            maxWidth: 1280, margin: "0 auto", padding: "0 48px",
          }}>
            <div style={{ textAlign: "center", marginBottom: 56 }}>
              <p className="eyebrow" style={{ color: "#2563eb", marginBottom: 12 }}>How it works</p>
              <h2 className="f-display"
                style={{ fontSize: "clamp(32px,4vw,52px)", color: "#0f172a", lineHeight: 1.1 }}>
                세 단계로 위기를 관리하다
              </h2>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 28 }}>
              {[
                {
                  icon: "📡", accent: "#2563eb", step: "01", title: "데이터 수집",
                  desc: "SNS에서 브랜드 반응을 수집합니다.",
                  tags: ["Instagram", "Naver", "YouTube"],
                },
                {
                  icon: "🧠", accent: "#7c3aed", step: "02", title: "AI 감성 분석",
                  desc: "AI가 댓글·리뷰의 감성과 주요 이슈 키워드를 분석합니다.",
                  tags: ["감성 분류", "위험도 0-100", "핵심 이슈"],
                },
                {
                  icon: "⚡", accent: "#0891b2", step: "03", title: "대응 전략 제안",
                  desc: "AI가 상황에 맞는 대응 전략 초안을 제공합니다.",
                  tags: ["기회 전략", "즉각 대응","장기 전략"],
                },
              ].map((c, i) => (
                <div key={i} style={{
                  position: "relative",
                  background: "#f8faff",
                  border: "1px solid rgba(37,99,235,.1)",
                  borderRadius: 20, padding: "32px 28px",
                  transition: "box-shadow .2s, transform .2s",
                }}
                  onMouseEnter={e => {
                    e.currentTarget.style.boxShadow = "0 8px 40px rgba(37,99,235,.12)";
                    e.currentTarget.style.transform = "translateY(-3px)";
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.boxShadow = "none";
                    e.currentTarget.style.transform = "translateY(0)";
                  }}
                >
                  <span className="f-display" style={{
                    position: "absolute", top: 20, right: 24,
                    fontSize: 48, color: c.accent, opacity: .08,
                  }}>{c.step}</span>

                  <div style={{
                    width: 48, height: 48, borderRadius: 14, marginBottom: 20,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 22, background: `${c.accent}12`, border: `1px solid ${c.accent}20`,
                  }}>{c.icon}</div>

                  <p className="f-body" style={{ color: c.accent, fontWeight: 700, fontSize: 13, marginBottom: 8, letterSpacing: ".04em" }}>
                    {c.title}
                  </p>
                  <p className="f-body" style={{
                    color: "#64748b", fontSize: 14, lineHeight: 1.75, marginBottom: 20,
                  }}>{c.desc}</p>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                    {c.tags.map(t => (
                      <span key={t} className="f-body" style={{
                        padding: "3px 10px", borderRadius: 999, fontSize: 11, fontWeight: 500,
                        background: `${c.accent}10`, border: `1px solid ${c.accent}20`, color: c.accent,
                      }}>{t}</span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ══ S3 · PRICING ══ */}
        <section className="snap-sec" style={{
          background: "linear-gradient(160deg, #f8faff 0%, #f3f4f6 100%)",
        }}>
          <div style={{
            position: "relative", zIndex: 10, width: "100%",
            maxWidth: 860, margin: "0 auto", padding: "0 48px",
            textAlign: "center",
          }}>
            <p className="eyebrow" style={{ color: "#2563eb", marginBottom: 12 }}>Pricing</p>
            <h2 className="f-display"
              style={{ fontSize: "clamp(32px,4vw,52px)", color: "#0f172a", lineHeight: 1.1, marginBottom: 14 }}>
              투명한 가격
            </h2>
            <p className="f-body" style={{ color: "#64748b", fontSize: 15, marginBottom: 44 }}>
              규모에 맞게 선택하세요.
            </p>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 16 }}>
            {[
  {
    name: "Starter",
    price: "₩49,000",
    per: "/월",
    desc: "소규모 브랜드 · 1인 크리에이터",
    features: [
      "AI 리포트 주 1회 자동 생성",
      "이메일 알림",
      "리포트 PDF 다운로드 (월 3회)",
      "기본 대시보드"
    ],
    accent: "#64748b",
    popular: true,
    buttonText: "시작하기",
  },
  {
    name: "Pro",
    price: "₩99,000",
    per: "/월",
    desc: "성장하는 팀을 위한 플랜",
    features: [
      "AI 리포트 매일 1회 자동 생성",
      "키워드 이상 감지 알림",
      "PDF + CSV 다운로드 (월 5회)",
      "팀원 초대"
    ],
    accent: "#2563eb",
    popular: false,
    buttonText: "가장 인기",
  },
  {
    name: "Enterprise",
    price: "문의",
    per: "",
    desc: "대기업 · 에이전시 맞춤형",
    features: [
      "AI 리포트 무제한 생성",
      "위기 감지 및 실시간 알림",
      "Slack 알림 연동",
      "데이터 내보내기 무제한"
    ],
    accent: "#7c3aed",
    popular: false,
    buttonText: "문의하기",
  },
              ].map((p, i) => (
                <div key={i} style={{
                  position: "relative",
                  background: p.popular ? "#2563eb" : "#fff",
                  borderRadius: 20,
                  padding: "28px 24px",
                  border: p.popular ? "none" : "1px solid rgba(0,0,0,.08)",
                  boxShadow: p.popular ? "0 12px 48px rgba(37,99,235,.3)" : "0 2px 12px rgba(0,0,0,.04)",
                  textAlign: "left",
                }}>
                  {p.popular && (
                    <span className="eyebrow" style={{
                      position: "absolute", top: -1, right: 16,
                      background: "#fff", color: "#2563eb",
                      padding: "4px 12px", borderRadius: "0 0 10px 10px", fontSize: 10, fontWeight: 700,
                    }}>POPULAR</span>
                  )}
                  <p className="f-body" style={{
                    color: p.popular ? "rgba(255,255,255,.85)" : p.accent,
                    fontWeight: 600, fontSize: 13, marginBottom: 4,
                  }}>{p.name}</p>
                  <p className="f-body" style={{
                    color: p.popular ? "rgba(255,255,255,.55)" : "#94a3b8",
                    fontSize: 11, marginBottom: 16,
                  }}>{p.desc}</p>
                  <div style={{ marginBottom: 20 }}>
                    <span className="f-display" style={{
                      fontSize: 30, color: p.popular ? "#fff" : "#0f172a",
                    }}>{p.price}</span>
                    <span className="f-body" style={{
                      color: p.popular ? "rgba(255,255,255,.5)" : "#94a3b8", fontSize: 12,
                    }}>{p.per}</span>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
                    {p.features.map(f => (
                      <div key={f} style={{ display: "flex", alignItems: "center", gap: 7 }}>
                        <span style={{
                          color: p.popular ? "rgba(255,255,255,.7)" : "#22c55e", fontSize: 13,
                        }}>✓</span>
                        <span className="f-body" style={{
                          fontSize: 13, color: p.popular ? "rgba(255,255,255,.8)" : "#374151",
                        }}>{f}</span>
                      </div>
                    ))}
                  </div>
                  <button
                    style={{
                      marginTop: 24, width: "100%", padding: "10px 0",
                      borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: "pointer",
                      background: p.popular ? "#fff" : "transparent",
                      color: p.popular ? "#2563eb" : "#374151",
                      border: p.popular ? "none" : "1px solid rgba(0,0,0,.12)",
                      transition: "opacity .15s",
                    }}
                    onMouseEnter={e => e.currentTarget.style.opacity = "0.8"}
                    onMouseLeave={e => e.currentTarget.style.opacity = "1"}
                    onClick={() => nav(p.name === "Enterprise" ? "/contact" : "/signup")}
                  >
                    {p.name === "Enterprise" ? "문의하기" : "시작하기"}
                  </button>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ══ S4 · FINAL CTA ══ */}
        <section className="snap-sec" style={{
          background: "linear-gradient(160deg, #eff6ff 0%, #faf5ff 100%)",
          justifyContent: "center",
        }}>
          <div style={{
            position: "absolute", inset: 0, pointerEvents: "none",
            backgroundImage: "linear-gradient(rgba(37,99,235,.05) 1px, transparent 1px), linear-gradient(90deg, rgba(37,99,235,.05) 1px, transparent 1px)",
            backgroundSize: "40px 40px",
          }} />

          <div style={{ position: "relative", zIndex: 10, textAlign: "center", maxWidth: 560, padding: "0 32px" }}>
            <p className="eyebrow" style={{ color: "#2563eb", marginBottom: 20 }}>Get Started</p>

            {/* 글자 크기 줄여서 "라"가 내려오지 않게 수정 */}
            <h2 className="f-display"
              style={{ fontSize: "clamp(36px,5vw,60px)", lineHeight: 1.0, color: "#0f172a", marginBottom: 8 }}>
              브랜드 이미지,
            </h2>
            <h2 className="f-display"
              style={{
                fontSize: "clamp(36px,5vw,60px)", lineHeight: 1.0, marginBottom: 40,
                background: "linear-gradient(135deg, #2563eb 0%, #7c3aed 100%)",
                WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
              }}>
              지금 보호하세요
            </h2>

            {/* 시작하기 버튼만 남김, 데모 체험하기 제거 */}
            <div style={{ display: "flex", justifyContent: "center" }}>
              <button
                style={{
                  padding: "14px 36px", borderRadius: 12, fontSize: 16, fontWeight: 600,
                  background: "#2563eb", color: "#fff", border: "none", cursor: "pointer",
                  boxShadow: "0 4px 20px rgba(37,99,235,.35)",
                  transition: "transform .15s, box-shadow .15s",
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.transform = "translateY(-2px)";
                  e.currentTarget.style.boxShadow = "0 8px 32px rgba(37,99,235,.45)";
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.transform = "translateY(0)";
                  e.currentTarget.style.boxShadow = "0 4px 20px rgba(37,99,235,.35)";
                }}
                onClick={() => nav("/signup")}
              >
                시작하기 →
              </button>
            </div>
          </div>
        </section>

      </div>
    </>
  );
}