import { useState, useEffect, useMemo } from "react";
import { signup } from "../api/auth";
import { useNavigate } from "react-router-dom";
import brands from "../data/brands.json";
import logo from "../assets/logo.png";   // ← logo.png import 추가



const T = {
  text: "#0f172a",
  textSub: "#64748b",
  textMuted: "#94a3b8",
  blue: "#2563eb",
  border: "rgba(0,0,0,0.07)",
};

const ROLES = ["앰배서더", "광고모델", "임원", "기타"];

export default function Signup() {
  const navigate = useNavigate();

    // useNavigate 바로 아래에 추가
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get("invite_token");
    if (!token) return;

    fetch(`/invite/verify?token=${token}`)
      .then((r) => r.json())
      .then((data) => {
        setForm((prev) => ({ ...prev, email: data.email }));
        setInviteToken(token);
        alert(`${data.brand_name} 팀 초대를 확인했습니다. 가입 후 자동으로 팀에 합류됩니다.`);
      })
      .catch(() => alert("유효하지 않은 초대 링크입니다"));
  }, []);

  const [form, setForm] = useState({
    email: "",
    password: "",
    name: "",
    company_name: "",
    brand_name: "",
  });

  const [persons, setPersons] = useState([]);
  const [personName, setPersonName] = useState("");
  const [personRole, setPersonRole] = useState(ROLES[0]);
  const [inviteToken, setInviteToken] = useState(null);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const addPerson = () => {
    const trimmed = personName.trim();
    if (!trimmed) return;
    if (persons.find((p) => p.name === trimmed)) return;
    setPersons([...persons, { name: trimmed, role: personRole }]);
    setPersonName("");
    setPersonRole(ROLES[0]);
  };

  const removePerson = (name) => {
    setPersons(persons.filter((p) => p.name !== name));
  };

  const handleSubmit = async () => {
    try {
      const res = await signup({ ...form, persons });
      const { token } = res; // signup API가 토큰 반환한다고 가정
  
      // 초대 토큰 있으면 팀 합류 처리
      if (inviteToken && token) {
        await fetch(`/invite/accept?token=${inviteToken}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
      }
  
      alert("회원가입이 완료되었습니다.");
      navigate("/login");
    } catch (err) {
      console.error(err);
      alert("회원가입에 실패했습니다.");
    }
  };

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
          maxWidth: 460,
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
          회원가입
        </h2>
        <p style={{ color: T.textMuted, fontSize: 13, textAlign: "center", margin: "0 0 32px" }}>
        RISKLENS에 가입하고 리스크를 관리하세요
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <input
          name="email"
          type="email"
          placeholder="이메일"
          value={form.email}
          onChange={handleChange}
          readOnly={!!inviteToken}  // 초대 링크로 왔으면 수정 불가
          style={{
            width: "100%",
            padding: "11px 14px",
            borderRadius: 12,
            border: `1px solid rgba(37,99,235,0.15)`,
            background: inviteToken ? "rgba(0,0,0,0.04)" : "rgba(37,99,235,0.03)",
            color: T.text,
            fontSize: 13,
            outline: "none",
            fontFamily: "inherit",
            boxSizing: "border-box",
            cursor: inviteToken ? "not-allowed" : "text",
          }}
        />
          <Input name="password" type="password" placeholder="비밀번호" onChange={handleChange} />
          <Input name="name" placeholder="이름" onChange={handleChange} />
          <Input name="company_name" placeholder="회사명" onChange={handleChange} />

          {/* BrandSelector */}
          <BrandSelector
            value={form.brand_name}
            onSelect={(brand) => setForm({ ...form, brand_name: brand })}
          />

          {/* 연관 인물 등록 */}
          <div>
            <div style={{ 
              fontSize: 13, 
              fontWeight: 600, 
              color: "#334155", 
              marginBottom: 8 
            }}>
              연관 인물 등록 <span style={{ fontWeight: 400, color: T.textMuted }}>(선택사항)</span>
            </div>

            <div style={{ display: "flex", gap: 8 }}>
              <input
                type="text"
                value={personName}
                onChange={(e) => setPersonName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addPerson()}
                placeholder="이름 (예: 전지현)"
                style={{
                  flex: 1,
                  padding: "11px 14px",
                  borderRadius: 12,
                  border: `1px solid ${T.border}`,
                  background: "rgba(37,99,235,0.03)",
                  fontSize: 13,
                  outline: "none",
                }}
              />
              <select
                value={personRole}
                onChange={(e) => setPersonRole(e.target.value)}
                style={{
                  padding: "11px 14px",
                  borderRadius: 12,
                  border: `1px solid ${T.border}`,
                  background: "rgba(37,99,235,0.03)",
                  fontSize: 13,
                  outline: "none",
                  cursor: "pointer",
                }}
              >
                {ROLES.map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
              <button
                type="button"
                onClick={addPerson}
                disabled={!personName.trim()}
                style={{
                  padding: "0 18px",
                  borderRadius: 12,
                  background: "#0f172a",
                  color: "#fff",
                  fontSize: 13,
                  fontWeight: 600,
                  border: "none",
                  cursor: personName.trim() ? "pointer" : "not-allowed",
                  opacity: personName.trim() ? 1 : 0.6,
                }}
              >
                추가
              </button>
            </div>

            {persons.length > 0 && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 12 }}>
                {persons.map((p) => (
                  <span
                    key={p.name}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 6,
                      padding: "6px 14px",
                      borderRadius: 999,
                      background: "#f8fafc",
                      border: "1px solid #e2e8f0",
                      fontSize: 13,
                    }}
                  >
                    <span style={{ fontWeight: 600 }}>{p.name}</span>
                    <span style={{ color: T.textMuted, fontSize: 12 }}>{p.role}</span>
                    <button
                      onClick={() => removePerson(p.name)}
                      style={{
                        marginLeft: 4,
                        width: 18,
                        height: 18,
                        borderRadius: "50%",
                        background: "#e2e8f0",
                        color: "#64748b",
                        border: "none",
                        fontSize: 10,
                        cursor: "pointer",
                      }}
                    >
                      ✕
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          <button
            onClick={handleSubmit}
            style={{
              width: "100%",
              padding: "13px 0",
              borderRadius: 12,
              background: "#2563eb",
              color: "#fff",
              fontSize: 14,
              fontWeight: 700,
              border: "none",
              cursor: "pointer",
              marginTop: 8,
              boxShadow: "0 4px 14px rgba(37,99,235,0.3)",
              transition: "opacity 0.15s",
            }}
            onMouseOver={(e) => (e.currentTarget.style.opacity = "0.92")}
            onMouseOut={(e) => (e.currentTarget.style.opacity = "1")}
          >
            회원가입하기
          </button>
        </div>

        <p style={{ color: T.textMuted, fontSize: 12, textAlign: "center", marginTop: 24 }}>
          이미 계정이 있으신가요?{" "}
          <span
            style={{ color: T.blue, fontWeight: 600, cursor: "pointer" }}
            onClick={() => navigate("/login")}
          >
            로그인
          </span>
        </p>
      </div>
    </div>
  );
}

// ──────────────────────────────
// Input 컴포넌트
// ──────────────────────────────
function Input({ name, placeholder, type = "text", onChange }) {
  return (
    <input
      name={name}
      type={type}
      placeholder={placeholder}
      onChange={onChange}
      style={{
        width: "100%",
        padding: "11px 14px",
        borderRadius: 12,
        border: `1px solid rgba(37,99,235,0.15)`,
        background: "rgba(37,99,235,0.03)",
        color: T.text,
        fontSize: 13,
        outline: "none",
        fontFamily: "inherit",
        boxSizing: "border-box",
      }}
    />
  );
}

// ──────────────────────────────
// BrandSelector 컴포넌트 (전체 포함)
// ──────────────────────────────
function BrandSelector({ value, onSelect }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [directVal, setDirectVal] = useState("");
  const categories = Object.keys(brands);
  const [category, setCategory] = useState(categories[0] || "");

  const allBrands = useMemo(() => {
    return Object.entries(brands).flatMap(([cat, arr]) =>
      (arr || []).map((b) => ({ ...b, _cat: cat }))
    );
  }, []);

  const list = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (q) return allBrands.filter((b) => (b.name || "").toLowerCase().includes(q));
    return (brands[category] || []).map((b) => ({ ...b, _cat: category }));
  }, [search, category, allBrands]);

  const showDirectInput = search.trim().length > 0 && list.length < 3;

  const close = () => {
    setOpen(false);
    setSearch("");
    setDirectVal("");
  };

  const pick = (b) => {
    onSelect(b.name);
    close();
  };

  const pickDirect = () => {
    const val = directVal.trim() || search.trim();
    if (!val) return;
    onSelect(val);
    close();
  };

  const handleSearchChange = (e) => {
    setSearch(e.target.value);
    setDirectVal(e.target.value);
  };

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e) => { if (e.key === "Escape") close(); };
    window.addEventListener("keydown", onKeyDown);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = prev;
    };
  }, [open]);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen(true)}
        style={{
          width: "100%",
          padding: "11px 14px",
          borderRadius: 12,
          border: `1px solid rgba(37,99,235,0.15)`,
          background: "rgba(37,99,235,0.03)",
          textAlign: "left",
          fontSize: 13,
          color: value ? T.text : T.textMuted,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <span>{value || "브랜드 선택"}</span>
        <span>▾</span>
      </button>

      {open && (
        <div style={{ position: "fixed", inset: 0, zIndex: 9999 }}>
          <button
            type="button"
            onClick={close}
            style={{ position: "absolute", inset: 0, background: "rgba(15,23,42,0.3)" }}
          />
          <div style={{
            position: "absolute",
            left: "50%",
            top: "50%",
            transform: "translate(-50%, -50%)",
            width: "92vw",
            maxWidth: "520px",
          }}>
            <div style={{
              background: "rgba(255,255,255,0.95)",
              backdropFilter: "blur(20px)",
              borderRadius: 20,
              border: "1px solid rgba(0,0,0,0.08)",
              boxShadow: "0 20px 60px rgba(0,0,0,0.15)",
              overflow: "hidden",
            }} onClick={(e) => e.stopPropagation()}>

              {/* 헤더 & 검색 */}
              <div style={{ padding: "24px 24px 16px", borderBottom: "1px solid #f1f5f9" }}>
                <h3 style={{ fontSize: 18, fontWeight: 700, color: T.text }}>브랜드 선택</h3>
                <p style={{ fontSize: 13, color: T.textMuted, marginTop: 4 }}>
                  검색하거나 카테고리에서 선택하세요
                </p>
                <input
                  autoFocus
                  value={search}
                  onChange={handleSearchChange}
                  placeholder="브랜드 검색 또는 직접 입력"
                  style={{
                    marginTop: 16,
                    width: "100%",
                    padding: "12px 16px",
                    borderRadius: 12,
                    border: `1px solid rgba(37,99,235,0.2)`,
                    fontSize: 14,
                    outline: "none",
                  }}
                />
              </div>

              {/* 브랜드 목록 */}
              <div style={{ maxHeight: "320px", overflowY: "auto", padding: "12px" }}>
                {list.length === 0 ? (
                  <div style={{ textAlign: "center", padding: "40px 20px", color: T.textMuted }}>
                    검색 결과가 없습니다.<br />
                    <span style={{ fontSize: 12 }}>아래에서 직접 입력할 수 있어요.</span>
                  </div>
                ) : (
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                    {list.map((b) => (
                      <button
                        key={`${b._cat}-${b.name}`}
                        onClick={() => pick(b)}
                        style={{
                          padding: "12px",
                          borderRadius: 14,
                          border: "1px solid #e2e8f0",
                          background: "#fff",
                          textAlign: "left",
                          transition: "all 0.1s",
                        }}
                        onMouseOver={(e) => {
                          e.currentTarget.style.borderColor = "#2563eb";
                          e.currentTarget.style.background = "#f0f9ff";
                        }}
                        onMouseOut={(e) => {
                          e.currentTarget.style.borderColor = "#e2e8f0";
                          e.currentTarget.style.background = "#fff";
                        }}
                      >
                        <div style={{ fontWeight: 600, color: T.text }}>{b.name}</div>
                        <div style={{ fontSize: 12, color: T.textMuted }}>{b._cat}</div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* 직접 입력 */}
              {showDirectInput && (
                <div style={{ padding: "16px 24px", borderTop: "1px solid #f1f5f9", background: "#f8fafc" }}>
                  <p style={{ fontSize: 12, color: T.textMuted, marginBottom: 8 }}>찾는 브랜드가 없나요?</p>
                  <div style={{ display: "flex", gap: 8 }}>
                    <input
                      value={directVal}
                      onChange={(e) => setDirectVal(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && pickDirect()}
                      placeholder="브랜드명 직접 입력"
                      style={{
                        flex: 1,
                        padding: "11px 14px",
                        borderRadius: 12,
                        border: `1px solid rgba(37,99,235,0.2)`,
                      }}
                    />
                    <button
                      onClick={pickDirect}
                      disabled={!directVal.trim()}
                      style={{
                        padding: "0 20px",
                        borderRadius: 12,
                        background: "#2563eb",
                        color: "#fff",
                        border: "none",
                        fontWeight: 600,
                        cursor: directVal.trim() ? "pointer" : "not-allowed",
                      }}
                    >
                      입력
                    </button>
                  </div>
                </div>
              )}

              {/* 닫기 버튼 */}
              <div style={{ padding: "16px 24px", borderTop: "1px solid #f1f5f9" }}>
                <button
                  onClick={close}
                  style={{
                    width: "100%",
                    padding: "12px",
                    borderRadius: 12,
                    background: "#0f172a",
                    color: "#fff",
                    border: "none",
                    fontWeight: 600,
                  }}
                >
                  닫기
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}