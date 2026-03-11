import { useNavigate } from "react-router-dom";
import DemoPreview from "../components/DemoPreview";
import ServiceCards from "../components/ServiceCards";

export default function Home() {
  const navigate = useNavigate();

  return (
    <div className="relative z-10">

      {/* Main Banner */}
      <section className="min-h-screen flex items-center px-14">
        <div className="w-full max-w-6xl mx-auto grid lg:grid-cols-2 gap-12 items-center">

          <div>
            <h1 className="text-6xl font-extrabold leading-tight">
              브랜드 리스크를
              <span className="block text-transparent bg-clip-text bg-gradient-to-r from-slate-900 via-blue-900 to-slate-600">
                데이터로 통제하다
              </span>
            </h1>

            <p className="mt-6 text-lg text-slate-600 max-w-xl">
              댓글 기반 감성 분석으로 위험 신호를 조기에 감지하고
              대응 전략을 제공합니다.
            </p>

            <div className="mt-10 flex gap-3">
              <button
                onClick={() => navigate("/login")}
                className="px-7 py-4 rounded-2xl bg-slate-900 text-white hover:bg-blue-900 transition shadow-lg"
              >
                시작하기
              </button>

              <button
                onClick={() => navigate("/features")}
                className="px-7 py-4 rounded-2xl bg-white/40 border border-white/40 hover:bg-white/60 transition"
              >
                기능 보기
              </button>
            </div>
          </div>

          {/* 사용자 입장에서 한 눈에 보이는 UI */}
          <DemoPreview />
        </div>
      </section>

      {/* 서비스 소개 */}
      <section className="min-h-screen px-14 py-28">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-extrabold">서비스 소개</h2>
          <p className="mt-2 text-slate-600">
            Hover 하면 인터랙션 확인 가능
          </p>

          <div className="mt-10">
            <ServiceCards />
          </div>
        </div>
      </section>

    </div>
  );
}