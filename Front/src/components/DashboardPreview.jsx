import { motion } from "framer-motion";

export default function DashboardPreview() {
  return (
    <motion.div
      initial={{ opacity: 0, x: 40 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.7 }}
      className="rounded-[32px] bg-white/30 border border-white/40 backdrop-blur-2xl shadow-2xl p-6 w-[420px] max-w-full"
    >
      <h3 className="text-lg font-bold text-slate-900">Brand Risk Dashboard</h3>

      <div className="mt-6 grid grid-cols-2 gap-4">
        <MiniCard title="Risk Score" value="78" />
        <MiniCard title="Negative" value="58%" />
        <MiniCard title="Mentions" value="1,284" />
        <MiniCard title="Alert" value="+12%" accent />
      </div>

      <div className="mt-6">
        <div className="h-2 rounded-full bg-white/40 overflow-hidden">
          <div className="h-full w-[78%] bg-gradient-to-r from-blue-700 to-slate-900" />
        </div>
        <div className="mt-2 flex justify-between text-xs text-slate-600">
          <span>Positive 42%</span>
          <span>Negative 58%</span>
        </div>
      </div>

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
    </motion.div>
  );
}

function MiniCard({ title, value, accent = false }) {
  return (
    <div className="rounded-2xl bg-white/40 border border-white/30 p-4">
      <div className="text-xs text-slate-600">{title}</div>
      <div className={`text-xl font-extrabold mt-1 ${accent ? "text-red-600" : "text-slate-900"}`}>
        {value}
      </div>
    </div>
  );
}