import ReactFullpage from "@fullpage/react-fullpage";
import DashboardPreview from "../components/DashboardPreview";
import Counter from "../components/Counter";
import { motion } from "framer-motion";
import ProcessCard from "../components/ProcessCard";
import { useNavigate } from "react-router-dom";
import { useState } from "react";
import FloatingOrbs from "../components/FloatingOrbs";


export default function Features() {

  const navigate = useNavigate();
  const [trigger, setTrigger] = useState(0);

  

  return (
<ReactFullpage
 scrollingSpeed={900}
 navigation
 credits={{ enabled: false }}
 autoScrolling={true}
 fitToSection={true}
 keyboardScrolling={true}
 normalScrollElements=".allow-scroll"

  afterLoad={(origin, destination) => {
    // Section index 확인 (0부터 시작)
    if (destination.index === 2) {
      setTrigger(prev => prev + 1);
    }
  }}
        render={() => (
          <ReactFullpage.Wrapper>

           {/* SECTION 1 — HERO */}
    <div className="section">
    <div className="min-h-screen flex items-center px-16 pt-24 relative ">

    <FloatingOrbs />

    {/* Glow */}
    <div className="hero-glow" />

    <div className="grid lg:grid-cols-2 gap-12 items-center w-full max-w-7xl mx-auto relative z-10">

      <div>
        <h1 className="text-5xl font-extrabold leading-tight">
          브랜드 마케팅 리스크를
          <span className="block text-transparent bg-clip-text bg-gradient-to-r from-slate-900 via-blue-900 to-slate-600">
            데이터로 관리하다
          </span>
        </h1>

        <p className="mt-6 text-lg text-slate-600">
          YouTube 댓글 및 뉴스 댓글 데이터를 기반으로
          기업 평판 리스크를 분석하고 대응 전략을 제공합니다.
        </p>

        <button
          onClick={(e) => {
            e.stopPropagation();
            navigate("/demo");
          }}
          className="mt-10 px-8 py-4 rounded-2xl bg-slate-900 text-white btn-glow"
        >
          체험하기
        </button>
      </div>

      <DashboardPreview />

    </div>
  </div>
</div>

            {/* SECTION 2 — 분석 방식 */}
            <div className="section">
              <div className="min-h-screen flex flex-col justify-center px-16 pt-24">

                <h2 className="text-4xl font-extrabold mb-8">
                  데이터 기반 리스크 분석 프로세스
                </h2>

                <p className="text-slate-600 max-w-2xl">
                  YouTube 댓글 및 뉴스 댓글 데이터를 수집하여
                  감성 분석 모델과 AI 파이프라인을 통해
                  브랜드 리스크 점수를 계산합니다.
                </p>

                <div className="mt-12 grid md:grid-cols-3 gap-8">

                <ProcessCard
                  title="데이터 수집"
                  desc="댓글 및 언급 데이터 수집"
                  detail={[
                    "YouTube API 기반 수집",
                    "주기적 업데이트",
                    "키워드 필터링",
                  ]}
                />

                <ProcessCard
                  title="AI 분석"
                  desc="감성 분류 및 위험도 계산"
                  detail={[
                    "감성 분석 모델 적용",
                    "리스크 점수 산출",
                    "핵심 키워드 추출",
                  ]}
                />

                <ProcessCard
                  title="리포트 생성"
                  desc="핵심 이슈 요약 제공"
                  detail={[
                    "AI 요약 리포트",
                    "위험 원인 분석",
                    "대응 인사이트 제공",
                  ]}
                />

                </div>

              </div>
            </div>

            {/* SECTION 3 — MONITORING */}
<div className="section">
  <div className="relative min-h-screen bg-gradient-to-br from-slate-900 to-blue-950 text-white flex items-center px-16 pt-24 ">

    {/* Glow Background */}
    <div className="absolute w-[500px] h-[500px] bg-blue-500/20 rounded-full blur-[120px] top-[-100px] left-[-100px]" />
    <div className="absolute w-[400px] h-[400px] bg-purple-500/20 rounded-full blur-[120px] bottom-[-120px] right-[-80px]" />

    <div className="max-w-6xl mx-auto relative z-10">

      <h2 className="text-4xl font-extrabold">
        Near Real-time Risk Monitoring
      </h2>

      <p className="mt-4 text-slate-300 max-w-xl">
        주기적인 데이터 수집과 분석을 통해
        실시간에 가까운 리스크 모니터링을 제공합니다.
      </p>

      {/* 숫자 영역 */}
      <div className="mt-12 grid grid-cols-3 gap-10">

        <Stat key={trigger + "-1"} value={87} label="Detection Accuracy" suffix="%" />
        <Stat key={trigger + "-2"} value={240} label="Brands Analyzed" suffix="+" />
        <Stat key={trigger + "-3"} value={120} label="Avg Processing Time" suffix="s" />

      </div>

      {/* LIVE MONITOR */}
      <div className="mt-16 space-y-4 text-slate-300">

        <LiveItem text="Sentiment analysis running" />
        <LiveItem text="Risk score updating" />
        <LiveItem text="Collecting comments stream" />

      </div>

    </div>
  </div>
</div>

            {/* SECTION 4 — AI PERFORMANCE */}
<div className="section">
  <div className="min-h-screen flex items-center justify-center px-16 pt-24">

    <motion.div
      whileHover={{
        y: -10,
        boxShadow: "0px 30px 80px rgba(59,130,246,0.25)",
      }}
      transition={{ type: "spring", stiffness: 200 }}
      className="
        motion-div
        relative
        rounded-3xl
        bg-white/30
        border border-white/40
        backdrop-blur-2xl
        shadow-2xl
        p-12
        w-[520px]
        
      "
    >
      {/* Glow overlay */}
      <div className="absolute inset-0 pointer-events-none glass-glow" />

      <h3 className="text-2xl font-bold">
        AI Model Pipeline Performance
      </h3>

      <p className="mt-4 text-slate-600">
        감성 분석 모델과 GPT 기반 후처리 파이프라인을 통해
        분석 정확도를 향상시켰습니다.
      </p>

      <div className="mt-8 space-y-6">

        <Bar label="Accuracy" value={82} />
        <Bar label="Precision" value={79} />
        <Bar label="Recall" value={85} />

      </div>

      <button
        onClick={() => navigate("/login")}
        className="mt-10 px-8 py-4 rounded-xl bg-slate-900 text-white btn-glow"
      >
        시작하기
      </button>

    </motion.div>

  </div>
</div>

          </ReactFullpage.Wrapper>
        )}
      />
  );
}


function ProcessBox({ title, desc }) {
  return (
    <div className="rounded-3xl bg-white/30 border border-white/40 backdrop-blur-xl shadow-xl p-6">
      <h4 className="text-lg font-bold">{title}</h4>
      <p className="mt-2 text-sm text-slate-600">{desc}</p>
    </div>
  );
}


function Stat({ value, label, suffix = "" }) {
  return (
    <div>
      <div className="text-5xl font-extrabold">
        <Counter end={value} />{suffix}
      </div>
      <div className="mt-2 text-slate-300">
        {label}
      </div>
    </div>
  );
}

function LiveItem({ text }) {
  return (
    <div className="flex items-center gap-3 text-lg">

      <span className="live-dot" />

      <span>{text}</span>

    </div>
  );
}

function Bar({ label, value }) {
  return (
    <div>
      <div className="flex justify-between text-sm mb-2">
        <span>{label}</span>
        <span>{value}%</span>
      </div>

      <div className="h-3 bg-slate-200 rounded-full ">
        <div
          className="h-full bg-gradient-to-r from-blue-600 to-cyan-400 bar-fill"
          style={{ width: value + "%" }}
        />
      </div>
    </div>
  );
}