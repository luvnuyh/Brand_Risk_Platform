import { useLocation } from "react-router-dom";
import Router from "./router/Router";

function App() {
  const { pathname } = useLocation();
  const isHome = pathname === "/";

  /* Home은 snap-root가 직접 뷰포트를 차지해야 하므로
     배경 오브·그라디언트 래퍼를 완전히 제거합니다. */
  if (isHome) {
    return <Router />;
  }

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-gradient-to-br from-slate-50 via-indigo-50 to-slate-100">

      {/* Background effects */}
      <div className="pointer-events-none fixed inset-0 -z-10">

        {/* Glow orb 1 */}
        <div className="absolute top-[-250px] left-[5%] h-[600px] w-[600px] rounded-full bg-indigo-400 opacity-30 blur-[160px] animate-pulse" />

        {/* Glow orb 2 */}
        <div className="absolute bottom-[-300px] right-[5%] h-[600px] w-[600px] rounded-full bg-blue-400 opacity-30 blur-[160px] animate-pulse" />

        {/* Glow orb 3 */}
        <div className="absolute top-[35%] left-[50%] h-[450px] w-[450px] rounded-full bg-purple-400 opacity-20 blur-[140px] animate-pulse" />

        {/* Subtle grid overlay */}
        <div
          className="absolute inset-0 opacity-[0.05]"
          style={{
            backgroundImage:
              "linear-gradient(to right, #000 1px, transparent 1px), linear-gradient(to bottom, #000 1px, transparent 1px)",
            backgroundSize: "80px 80px",
          }}
        />

        {/* Gradient noise layer */}
        <div className="absolute inset-0 bg-gradient-to-b from-white/30 to-transparent" />

      </div>

      {/* Main App */}
      <div className="relative z-10">
        <Router />
      </div>

    </div>
  );
}

export default App;