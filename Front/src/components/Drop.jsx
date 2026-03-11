import { motion } from "framer-motion";

export default function Drop({ label }) {
  return (
    <motion.div
      whileHover={{
        scale: 1.16,
        rotateX: 12,
        rotateY: -12,
        boxShadow: "0px 40px 90px rgba(0,0,0,0.25)",
      }}
      transition={{ type: "spring", stiffness: 220, damping: 16 }}
      className="w-44 h-44 rounded-[45%] bg-white/30 border border-white/40 backdrop-blur-2xl shadow-xl flex items-center justify-center cursor-pointer"
      style={{ transformStyle: "preserve-3d" }}
    >
      <span className="font-semibold text-slate-900 text-lg">{label}</span>
    </motion.div>
  );
}