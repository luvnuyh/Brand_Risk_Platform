export default function ProcessCard({ title, desc, detail = [] }) {
  return (
    <div
      className="
        relative
        h-[180px]   // ⭐ 높이 고정 (핵심)
        rounded-3xl bg-white/30 border border-white/40
        backdrop-blur-xl shadow-xl p-6
        transition-transform duration-300 ease-out
        hover:-translate-y-2 hover:shadow-2xl
        group
      "
    >
      {/* 기본 내용 */}
      <div>
        <h4 className="text-lg font-bold">{title}</h4>
        <p className="mt-2 text-sm text-slate-600">
          {desc}
        </p>
      </div>

      {/* hover 설명 (overlay) */}
      <div
        className="
          absolute left-6 right-6 bottom-6
          opacity-0 translate-y-2
          transition-all duration-300
          group-hover:opacity-100 group-hover:translate-y-0
        "
      >
        <ul className="text-sm text-slate-500 space-y-1">
          {detail.map((d, i) => (
            <li key={i}>• {d}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}