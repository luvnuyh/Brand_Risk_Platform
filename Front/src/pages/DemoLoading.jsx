import { useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";

export default function DemoLoading() {
  const navigate = useNavigate();
  const { state } = useLocation();

  useEffect(() => {
    setTimeout(() => {
      navigate("/demo-result", { state });
    }, 2000);
  }, []);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center pt-24">

      <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-slate-900 mb-6" />

      <p className="text-lg font-semibold">
        AI가 데이터를 분석 중입니다...
      </p>

    </div>
  );
}