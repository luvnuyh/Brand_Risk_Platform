import { useLocation } from "react-router-dom";

export default function DemoResult() {
  const { state } = useLocation();
  const brand = state?.brand || "Sample Brand";

  return (
    <div className="min-h-screen flex items-center justify-center pt-24 px-4">

      <div className="w-full max-w-3xl rounded-3xl bg-white/40 backdrop-blur-xl border border-white/40 shadow-xl p-10">

        <h2 className="text-2xl font-bold mb-4">
          {brand} 분석 결과
        </h2>

        <div className="mb-6">
          <div className="text-sm text-slate-600 mb-2">
            Risk Score
          </div>
          <div className="text-5xl font-extrabold text-green-600">
            82
          </div>
        </div>

        <div className="grid grid-cols-2 gap-6">

          <div>
            <div className="text-sm text-slate-500">긍정</div>
            <div className="text-2xl font-bold">68%</div>
          </div>

          <div>
            <div className="text-sm text-slate-500">부정</div>
            <div className="text-2xl font-bold">32%</div>
          </div>

        </div>

        <p className="mt-6 text-sm text-slate-500">
          데모 데이터 기반 결과입니다.
        </p>

      </div>

    </div>
  );
}