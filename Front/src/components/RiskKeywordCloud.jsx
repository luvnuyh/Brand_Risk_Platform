import React, { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";

/**
 * keywords shape:
 * [{ text: "품질", value: 120 }, ...]
 *
 * 요구사항:
 * - value 기반 크기
 * - 랜덤 위치
 * - absolute positioning
 * - bubble 느낌
 * - floating 애니메이션
 */

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

function mulberry32(seed) {
  let t = seed + 0x6d2b79f5;
  return function () {
    t |= 0;
    t = (t + 0x6d2b79f5) | 0;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

export default function RiskKeywordCloud({ keywords = [] }) {
  const containerRef = useRef(null);
  const [box, setBox] = useState({ w: 0, h: 0 });

  const safeKeywords = useMemo(
    () => (Array.isArray(keywords) ? keywords : []),
    [keywords]
  );

  const values = safeKeywords.map((k) => k.value);
  const minV = values.length ? Math.min(...values) : 0;
  const maxV = values.length ? Math.max(...values) : 1;

  // container size 측정
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const ro = new ResizeObserver((entries) => {
      const cr = entries[0]?.contentRect;
      if (!cr) return;
      setBox({ w: cr.width, h: cr.height });
    });

    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const placed = useMemo(() => {
    // 안정적인 랜덤(리렌더마다 튀지 않게)
    const seed = safeKeywords
      .map((k) => `${k.text}:${k.value}`)
      .join("|")
      .split("")
      .reduce((acc, ch) => acc + ch.charCodeAt(0), 0);

    const rand = mulberry32(seed);

    // 배치 영역(패딩 고려)
    const W = box.w || 900;
    const H = box.h || 320;
    const pad = 22;

    return safeKeywords.map((k, idx) => {
      // value -> scale(크기)
      const t = (k.value - minV) / (maxV - minV || 1);
      const size = clamp(0.85 + t * 0.9, 0.85, 1.75);

      // 랜덤 위치
      const x = pad + rand() * (W - pad * 2);
      const y = pad + rand() * (H - pad * 2);

      // floating 파라미터(각 bubble 다르게)
      const floatX = (rand() - 0.5) * 18;
      const floatY = (rand() - 0.5) * 22;
      const dur = 3.6 + rand() * 2.4;

      return {
        ...k,
        _idx: idx,
        _x: x,
        _y: y,
        _scale: size,
        _floatX: floatX,
        _floatY: floatY,
        _dur: dur,
      };
    });
  }, [safeKeywords, minV, maxV, box.w, box.h]);

  const card =
    "bg-white/45 backdrop-blur-2xl border border-white/55 shadow-[0_20px_60px_-25px_rgba(15,23,42,0.35)] rounded-3xl";

  return (
    <div className={`${card} p-6`}>
      <div className="flex items-end justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900">Risk Keywords</h2>
          <div className="text-sm text-slate-600 mt-1">
            Keywords frequently associated with negative discussions
          </div>
        </div>
        <div className="text-xs text-slate-600">Bubbles scale by frequency</div>
      </div>

      <div
        ref={containerRef}
        className="mt-5 relative h-[320px] overflow-hidden rounded-3xl bg-gradient-to-br from-white/40 to-slate-50/40 border border-white/60"
      >
        {/* subtle depth */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute -top-24 -right-24 w-64 h-64 rounded-full bg-blue-200/25 blur-3xl" />
          <div className="absolute -bottom-24 -left-24 w-64 h-64 rounded-full bg-slate-200/35 blur-3xl" />
        </div>

        {placed.map((k) => (
          <motion.button
            key={`${k.text}-${k._idx}`}
            className={[
              "absolute select-none",
              "rounded-full border border-white/70",
              "bg-white/70 backdrop-blur-xl",
              "shadow-[0_18px_50px_-30px_rgba(15,23,42,0.55)]",
              "px-4 py-2",
              "text-slate-900 font-extrabold",
              "hover:bg-white/85 hover:shadow-[0_30px_80px_-35px_rgba(15,23,42,0.55)]",
              "transition",
            ].join(" ")}
            style={{
              left: k._x,
              top: k._y,
              transform: `translate(-50%, -50%) scale(${k._scale})`,
            }}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{
              opacity: 1,
              y: [0, k._floatY, 0],
              x: [0, k._floatX, 0],
            }}
            transition={{
              opacity: { duration: 0.35, ease: "easeOut" },
              x: { duration: k._dur, repeat: Infinity, ease: "easeInOut" },
              y: { duration: k._dur + 0.6, repeat: Infinity, ease: "easeInOut" },
            }}
            whileHover={{ scale: k._scale + 0.12, y: -2 }}
            whileTap={{ scale: k._scale + 0.06 }}
            title={`${k.text} (${k.value})`}
            onClick={() => {
              // 나중에: 클릭 시 키워드 기반 필터/검색 연결 가능
              // 지금은 UX용으로만 비워둠
            }}
          >
            <span className="text-sm md:text-base">{k.text}</span>
            <span className="ml-2 text-xs font-bold text-slate-600">
              {k.value}
            </span>
          </motion.button>
        ))}

        {placed.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center text-slate-600">
            No keywords
          </div>
        )}
      </div>

      <div className="mt-4 text-xs text-slate-600">
        Tip: Later you can connect bubble click → filter Top Risk Contents / Evidence comments.
      </div>
    </div>
  );
}