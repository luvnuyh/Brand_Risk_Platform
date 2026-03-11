import { useLocation } from "react-router-dom";

export default function Result() {
  const location = useLocation();
  const brand = location.state?.brand || "Unknown";

  const mockData = {
    risk_score: 72,
    positive_ratio: 0.42,
    negative_ratio: 0.58,
  };

  return (
    <div className="backdrop-blur-xl bg-white/30 border border-white/30 shadow-2xl rounded-3xl p-12 w-full max-w-xl transition hover:scale-105 duration-300">
      <h2 className="text-2xl font-bold mb-4">{brand} 분석 결과</h2>

      <div className="space-y-4">
        <p>Risk Score: {mockData.risk_score}</p>
        <p>Positive Ratio: {mockData.positive_ratio}</p>
        <p>Negative Ratio: {mockData.negative_ratio}</p>
      </div>

      <div className="mt-6 h-4 bg-white/40 rounded-full overflow-hidden">
        <div
          className="h-full bg-blue-600 transition-all duration-1000"
          style={{ width: `${mockData.risk_score}%` }}
        ></div>
      </div>
    </div>
  );
}