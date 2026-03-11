import { useState } from "react";
import { useNavigate } from "react-router-dom";

export default function DemoInput() {
  const [brand, setBrand] = useState("");
  const navigate = useNavigate();

  const handleStart = () => {
    if (!brand) return;
    navigate("/demo-loading", { state: { brand } });
  };

  return (
    <div className="min-h-screen flex items-center justify-center pt-24 px-4">

      <div className="w-full max-w-lg rounded-3xl bg-white/40 backdrop-blur-xl border border-white/40 shadow-xl p-8">

        <h2 className="text-2xl font-bold mb-4">
          브랜드 리스크 분석 체험
        </h2>

        <p className="text-sm text-slate-600 mb-6">
          데모 버전입니다. 입력한 브랜드명은 실제 분석이 아닌
          예시 데이터를 기반으로 결과가 제공됩니다.
        </p>

        <input
          value={brand}
          onChange={(e) => setBrand(e.target.value)}
          placeholder="브랜드명을 입력하세요 (Nike, Adidas...)"
          className="w-full mb-6 px-4 py-3 rounded-xl border border-slate-300"
        />

        <button
          onClick={handleStart}
          className="w-full py-3 rounded-xl bg-slate-900 text-white hover:bg-blue-900 transition"
        >
          분석 시작
        </button>

      </div>

    </div>
  );
}