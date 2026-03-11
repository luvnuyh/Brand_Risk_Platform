import { useEffect, useState } from "react";
import Router from "./router/Router";
import FloatingOrbs from "./components/FloatingOrbs";


function App() {
  const [dark, setDark] = useState(false);

  // 마우스 빛 효과
  useEffect(() => {
    const move = (e) => {
      document.documentElement.style.setProperty(
        "--mouse-x",
        e.clientX + "px"
      );
      document.documentElement.style.setProperty(
        "--mouse-y",
        e.clientY + "px"
      );
    };
    window.addEventListener("mousemove", move);
    return () => window.removeEventListener("mousemove", move);
  }, []);

  // 스크롤 색 전환
  useEffect(() => {
    const onScroll = () => {
      const scrollY = window.scrollY;
      document.body.style.background =
        scrollY > 500
          ? "linear-gradient(135deg, #0f172a, #1e293b)"
          : "linear-gradient(135deg, #ffffff, #e2e8f0)";
    };
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div className={dark ? "dark relative min-h-screen" : "relative min-h-screen"}>
      <FloatingOrbs />

      {/* 마우스 라이트 */}
      <div className="pointer-events-none fixed inset-0 z-0"
        style={{
          background:
            "radial-gradient(circle 300px at var(--mouse-x) var(--mouse-y), rgba(59,130,246,0.2), transparent 80%)",
        }}
      />

      <div className="relative z-10">
        <Router />
      </div>
      <div className="light-wave" />
    </div>
  );
}

export default App;