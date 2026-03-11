import { motion } from "framer-motion";

export default function DemoPreview() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      className="w-[420px] max-w-full rounded-[32px] bg-white/30 border border-white/40 backdrop-blur-2xl shadow-2xl p-6"
    >
      <div className="flex justify-between items-center">
        <div>
          <p className="text-xs text-slate-600">Risk Score</p>
          <h2 className="text-5xl font-bold text-slate-900 mt-1">78</h2>
        </div>

        <div className="text-right">
          <p className="text-xs text-slate-600">Trend</p>
          <p className="text-sm font-semibold text-red-600 mt-1">
            +12% ↑
          </p>
        </div>
      </div>

      {/* Progress bar */}
      <div className="mt-6">
        <div className="h-2 rounded-full bg-white/40 overflow-hidden">
          <div className="h-full w-[78%] bg-gradient-to-r from-blue-700 to-slate-900" />
        </div>

        <div className="mt-3 flex justify-between text-xs text-slate-600">
          <span>Positive 42%</span>
          <span>Negative 58%</span>
        </div>
      </div>

      {/* Keywords */}
      <div className="mt-6 flex flex-wrap gap-2">
        {["배송", "환불", "품질", "가격"].map((k) => (
          <span
            key={k}
            className="px-3 py-1 rounded-full bg-white/40 border border-white/40 text-xs text-slate-700"
          >
            {k}
          </span>
        ))}
      </div>

      <p className="mt-6 text-sm text-slate-600">
        최근 6시간 내 부정 언급이 증가했습니다.
      </p>
    </motion.div>
  );
}