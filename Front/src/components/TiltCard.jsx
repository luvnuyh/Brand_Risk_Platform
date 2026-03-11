import { useRef } from "react";

export default function TiltCard({ children }) {
  const ref = useRef();

  const handleMove = (e) => {
    const card = ref.current;
    const rect = card.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const rotateX = -(y - rect.height / 2) / 15;
    const rotateY = (x - rect.width / 2) / 15;

    card.style.transform = `rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
  };

  const reset = () => {
    ref.current.style.transform = `rotateX(0deg) rotateY(0deg)`;
  };

  return (
    <div
      ref={ref}
      onMouseMove={handleMove}
      onMouseLeave={reset}
      className="transition-transform duration-200 backdrop-blur-xl bg-white/20 dark:bg-white/10 border border-white/30 rounded-3xl p-8 shadow-2xl"
      style={{ transformStyle: "preserve-3d" }}
    >
      {children}
    </div>
  );
}