import React, { useMemo } from "react";
import { motion } from "framer-motion";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";

/**
 * data shape:
 * [
 *  { date: "Mon", negative_ratio: 42, positive_ratio: 38, risk_score: 60 },
 *  ...
 * ]
 */
export default function RiskTrendChart({ data = [] }) {
  const safeData = useMemo(() => (Array.isArray(data) ? data : []), [data]);

  const hasData = safeData.length > 0;

  const card =
    "bg-white/45 backdrop-blur-2xl border border-white/55 shadow-[0_20px_60px_-25px_rgba(15,23,42,0.35)] rounded-3xl";

  const headerFade = {
    hidden: { opacity: 0, y: 12 },
    show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: "easeOut" } },
  };

  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload || payload.length === 0) return null;

    const getVal = (key) => {
      const found = payload.find((p) => p.dataKey === key);
      return found?.value ?? "-";
    };

    const neg = getVal("negative_ratio");
    const pos = getVal("positive_ratio");
    const risk = getVal("risk_score");

    return (
      <div className="rounded-2xl border border-white/60 bg-white/70 backdrop-blur-xl px-4 py-3 shadow-[0_20px_60px_-25px_rgba(15,23,42,0.35)]">
        <div className="text-sm font-extrabold text-slate-900">{label}</div>
        <div className="mt-2 space-y-1 text-xs text-slate-700">
          <div className="flex items-center justify-between gap-6">
            <span className="font-semibold">Negative sentiment</span>
            <span className="font-extrabold">{neg}%</span>
          </div>
          <div className="flex items-center justify-between gap-6">
            <span className="font-semibold">Positive sentiment</span>
            <span className="font-extrabold">{pos}%</span>
          </div>
          <div className="flex items-center justify-between gap-6">
            <span className="font-semibold">Risk score</span>
            <span className="font-extrabold">{risk}</span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <motion.div
      variants={headerFade}
      initial="hidden"
      animate="show"
      className={`${card} p-6`}
    >
      <div className="flex items-end justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900">리스크 추이</h2>
          <div className="text-sm text-slate-600 mt-1">
          기간별 감성 분석 및 리스크 점수 변화
          </div>
        </div>
      </div>

      <div className="mt-5 h-[280px]">
        {!hasData ? (
          <div className="h-full rounded-2xl bg-white/35 border border-white/50 flex items-center justify-center text-slate-600">
            표시할 데이터가 없습니다.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={safeData}
              margin={{ top: 10, right: 18, left: -8, bottom: 6 }}
            >
              <CartesianGrid stroke="rgba(15,23,42,0.08)" strokeDasharray="4 4" />
              <XAxis
                dataKey="date"
                tick={{ fill: "#475569", fontSize: 12 }}
                axisLine={{ stroke: "rgba(15,23,42,0.10)" }}
                tickLine={false}
              />
              <YAxis
                tick={{ fill: "#475569", fontSize: 12 }}
                axisLine={{ stroke: "rgba(15,23,42,0.10)" }}
                tickLine={false}
                width={36}
              />

              <Tooltip content={<CustomTooltip />} />
              <Legend
                verticalAlign="top"
                align="right"
                iconType="circle"
                wrapperStyle={{ fontSize: 12, color: "#475569" }}
              />

              {/* ✅ 3라인 그래프 */}
              <Line
                type="monotone"
                dataKey="negative_ratio"
                name="Negative sentiment"
                strokeWidth={3}
                dot={false}
                activeDot={{ r: 5 }}
                stroke="#ef4444"
              />
              <Line
                type="monotone"
                dataKey="positive_ratio"
                name="Positive sentiment"
                strokeWidth={3}
                dot={false}
                activeDot={{ r: 5 }}
                stroke="#22c55e"
              />
              <Line
                type="monotone"
                dataKey="risk_score"
                name="Risk score"
                strokeWidth={3}
                dot={false}
                activeDot={{ r: 5 }}
                stroke="#3b82f6"
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      <div className="mt-4 grid grid-cols-3 gap-3">
        <div className="p-4 rounded-2xl bg-white/45 border border-white/50">
          <div className="text-xs text-slate-600 font-semibold">Interpretation</div>
          <div className="text-sm font-bold text-slate-900 mt-1">
            Track sentiment spikes
          </div>
        </div>
        <div className="p-4 rounded-2xl bg-white/45 border border-white/50">
          <div className="text-xs text-slate-600 font-semibold">Action</div>
          <div className="text-sm font-bold text-slate-900 mt-1">
            Click top contents to verify evidence
          </div>
        </div>
        <div className="p-4 rounded-2xl bg-white/45 border border-white/50">
          <div className="text-xs text-slate-600 font-semibold">Tip</div>
          <div className="text-sm font-bold text-slate-900 mt-1">
            Combine risk score with sentiment
          </div>
        </div>
      </div>
    </motion.div>
  );
}