export default function RiskGauge({ score = 78 }) {
    return (
      <div className="w-40 h-40 rounded-full flex items-center justify-center bg-gradient-to-br from-slate-900 to-blue-900 text-white text-3xl font-bold">
        {score}
      </div>
    );
  }