import { useState } from "react";
import { signup } from "../api/auth";
import { useNavigate } from "react-router-dom";
import brands from "../data/brands.json";
import { useEffect, useMemo } from "react";

export default function Signup() {

  const navigate = useNavigate();

  const [form, setForm] = useState({
    email: "",
    password: "",
    name: "",
    company_name: "",
    brand_name: ""
  });

  const [openBrandBox, setOpenBrandBox] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState(null);

  const handleChange = (e) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value
    });
  };

  const selectBrand = (brand) => {
    setForm({
      ...form,
      brand_name: brand
    });
    setOpenBrandBox(false);
  };

  const handleSubmit = async () => {
    try {
      await signup(form);
      alert("회원가입 성공");
      navigate("/login");
    } catch (err) {
      alert("회원가입 실패");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-6 pt-24 bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100">

      <div className="
        w-full max-w-lg
        p-10
        rounded-3xl
        bg-white/40
        backdrop-blur-2xl
        border border-white/50
        shadow-2xl
      ">

        <h2 className="
          text-3xl font-extrabold text-center
          text-transparent bg-clip-text
          bg-gradient-to-r from-slate-900 to-slate-600
        ">
          SIGN UP
        </h2>

        <p className="text-slate-600 text-center mt-2">
          Brand Risk Platform 계정을 생성하세요.
        </p>

        <div className="mt-8 space-y-5">

          <Input name="email" placeholder="Email" onChange={handleChange} />
          <Input name="password" type="password" placeholder="Password" onChange={handleChange} />
          <Input name="name" placeholder="Name" onChange={handleChange} />
          <Input name="company_name" placeholder="Company" onChange={handleChange} />

          
          <div className="mb-6">
          {/* ⭐ 브랜드 선택 */}
          <BrandSelector
              value={form.brand_name}
              onSelect={(brand) =>
                setForm({ ...form, brand_name: brand })
              }
            />
            </div>

          </div>

          <button
            onClick={handleSubmit}
            className="
              w-full
              py-3
              rounded-xl
              bg-slate-900
              text-white
              font-semibold
              hover:bg-blue-900
              transition
              shadow-lg
              btn-glow
            "
          >
            회원가입
          </button>

        </div>

      </div>
  );
}

function Input({ name, placeholder, type = "text", onChange }) {
  return (
    <input
      name={name}
      type={type}
      placeholder={placeholder}
      onChange={onChange}
      className="
        w-full
        px-4 py-3
        rounded-xl
        border border-slate-200
        focus:outline-none
        focus:ring-2
        focus:ring-blue-400
        bg-white/70
      "
    />
  );
}

function BrandSelector({ value, onSelect }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const categories = Object.keys(brands);
  const [category, setCategory] = useState(categories[0] || "");

  const allBrands = useMemo(() => {
    return Object.entries(brands).flatMap(([cat, arr]) =>
      (arr || []).map((b) => ({ ...b, _cat: cat }))
    );
  }, []);

  const list = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (q) {
      return allBrands.filter((b) =>
        (b.name || "").toLowerCase().includes(q)
      );
    }
    return (brands[category] || []).map((b) => ({ ...b, _cat: category }));
  }, [search, category, allBrands]);

  const close = () => {
    setOpen(false);
    setSearch("");
  };

  const pick = (b) => {
    onSelect(b.name);
    close();
  };

  // ✅ ESC로 닫기 + 열렸을 때 스크롤 잠금
  useEffect(() => {
    if (!open) return;

    const onKeyDown = (e) => {
      if (e.key === "Escape") close();
    };

    window.addEventListener("keydown", onKeyDown);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      window.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = prevOverflow;
    };
  }, [open]);

  return (
    <div className="relative">
      {/* Trigger */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="
          w-full px-4 py-3 rounded-xl
          border border-slate-200 bg-white/70
          text-left flex items-center justify-between
          hover:bg-white/80 transition
          focus:outline-none focus:ring-2 focus:ring-blue-400
        "
      >
        <span className={value ? "text-slate-900" : "text-slate-400"}>
          {value || "브랜드 선택"}
        </span>
        <span className="text-slate-500">▾</span>
      </button>

      {/* ✅ Center Modal */}
      {open && (
        <div className="fixed inset-0 z-[9999]">
          {/* overlay: 바깥 클릭하면 닫힘 */}
          <button
            type="button"
            onClick={close}
            className="absolute inset-0 bg-slate-900/30"
            aria-label="close overlay"
          />

          {/* modal panel */}
          <div className="absolute left-1/2 top-1/2 w-[92vw] max-w-xl -translate-x-1/2 -translate-y-1/2">
            <div
              className="
                rounded-3xl bg-white/90 backdrop-blur-2xl
                border border-white/60 shadow-2xl
                overflow-hidden
              "
              // 패널 클릭은 overlay 닫힘 방지
              onClick={(e) => e.stopPropagation()}
            >
              {/* header */}
              <div className="px-6 pt-6 pb-4 border-b border-slate-100">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="text-lg font-extrabold text-slate-900">
                      브랜드 선택
                    </h3>
                    <p className="text-sm text-slate-500 mt-1">
                      검색하거나 카테고리에서 골라주세요.
                    </p>
                  </div>
                </div>

                {/* search */}
                <input
                  autoFocus
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="브랜드 검색 (예: 나이키)"
                  className="
                    mt-4 w-full px-4 py-3 rounded-xl
                    border border-slate-200 bg-white
                    focus:outline-none focus:ring-2 focus:ring-blue-400
                  "
                />

                {/* categories */}
                <div className="mt-4 flex gap-2 flex-wrap">
                  {categories.map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => {
                        setCategory(cat);
                        setSearch("");
                      }}
                      className={
                        "px-3 py-1 rounded-full text-sm border transition " +
                        (cat === category && !search
                          ? "bg-slate-900 text-white border-slate-900"
                          : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100")
                      }
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              {/* list */}
              <div className="px-4 py-4 max-h-[45vh] overflow-y-auto">
                {list.length === 0 ? (
                  <div className="py-10 text-center text-slate-500 text-sm">
                    검색 결과가 없어요.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {list.map((b) => (
                      <button
                        key={`${b._cat}-${b.name}`}
                        type="button"
                        onClick={() => pick(b)}
                        className="
                          px-3 py-3 rounded-2xl
                          border border-slate-100
                          hover:bg-slate-50 hover:border-slate-200
                          transition
                          flex items-center gap-3 text-left
                        "
                      >
                        <div className="w-10 h-10 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center overflow-hidden">
                          {b.logo ? (
                            <img
                            src={`https://logo.clearbit.com/${b.domain}`}
                            alt=""
                            className="w-7 h-7 object-contain"
                            onError={(e) => {
                              e.target.src = "https://via.placeholder.com/40?text=B";
                            }}
                          />
                          ) : (
                            <span className="text-[10px] text-slate-400">
                              LOGO
                            </span>
                          )}
                        </div>

                        <div className="leading-tight">
                          <div className="text-slate-900 font-semibold">
                            {b.name}
                          </div>
                          <div className="text-xs text-slate-500 mt-1">
                            {b._cat}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* footer */}
              <div className="px-6 py-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={close}
                  className="w-full py-3 rounded-2xl bg-slate-900 text-white font-semibold hover:bg-blue-900 transition"
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