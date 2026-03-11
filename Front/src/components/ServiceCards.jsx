import { motion } from "framer-motion";

const cards = [
  {
    title: "실시간 감정 분석",
    desc: "댓글 긍/부정 비율 자동 계산",
  },
  {
    title: "경쟁사 비교",
    desc: "시장 내 브랜드 위험도 비교",
  },
  {
    title: "AI 리포트 생성",
    desc: "분석 결과 기반 전략 제공",
  },
];

export default function ServiceCards() {
  return (
    <div className="grid md:grid-cols-3 gap-6">
      {cards.map((c) => (
        <motion.div
          key={c.title}
          whileHover={{ scale: 1.05 }}
          className="rounded-3xl bg-white/30 border border-white/40 backdrop-blur-xl shadow-xl p-6"
        >
          <h3 className="text-lg font-bold">{c.title}</h3>
          <p className="text-sm text-slate-600 mt-2">{c.desc}</p>
        </motion.div>
      ))}
    </div>
  );
}