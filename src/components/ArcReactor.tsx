import React from "react";
import { motion } from "motion/react";

interface ArcReactorProps {
  status: "idle" | "listening" | "processing" | "speaking";
  audioLevel?: number;
  onClick?: () => void;
  size?: "sm" | "md" | "lg";
}

const palettes = {
  idle: { core: "#22d3ee", accent: "#0ea5e9", speed: 24, label: "JARVIS ONLINE" },
  listening: { core: "#34d399", accent: "#06b6d4", speed: 8, label: "LISTENING" },
  processing: { core: "#fbbf24", accent: "#f97316", speed: 4, label: "ANALYZING" },
  speaking: { core: "#67e8f9", accent: "#3b82f6", speed: 6, label: "JARVIS SPEAKING" },
};

export const ArcReactor: React.FC<ArcReactorProps> = ({ status, audioLevel = 0, onClick, size = "md" }) => {
  const palette = palettes[status];
  const sizeClass = { sm: "w-28 h-28", md: "w-52 h-52", lg: "w-[min(70vw,30rem)] h-[min(70vw,30rem)]" }[size];
  const pulse = 1 + Math.min(audioLevel, 1) * 0.18;
  const particleCount = size === "lg" ? 18 : 10;

  return (
    <div className="flex flex-col items-center justify-center select-none">
      <div onClick={onClick} className={`relative ${sizeClass} cursor-pointer [perspective:900px]`}>
        <motion.div
          className="absolute -inset-8 rounded-full blur-3xl opacity-30"
          style={{ background: `radial-gradient(circle, ${palette.core}, transparent 68%)` }}
          animate={{ scale: [0.9, 1.12 * pulse, 0.9], opacity: [0.18, 0.46, 0.18] }}
          transition={{ duration: palette.speed / 3, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute inset-0 rounded-full border border-cyan-300/30 [transform-style:preserve-3d]"
          style={{ boxShadow: `0 0 32px ${palette.core}55, inset 0 0 28px ${palette.accent}33` }}
          animate={{ rotateX: [8, -8, 8], rotateY: [0, 360] }}
          transition={{ rotateX: { duration: 7, repeat: Infinity, ease: "easeInOut" }, rotateY: { duration: palette.speed, repeat: Infinity, ease: "linear" } }}
        >
          <div className="absolute inset-[7%] rounded-full border border-cyan-100/25 [transform:rotateX(62deg)]" />
          <div className="absolute inset-[7%] rounded-full border border-cyan-100/20 [transform:rotateX(-62deg)]" />
          <div className="absolute inset-[18%] rounded-full border border-cyan-100/20 [transform:rotateY(64deg)]" />
          <div className="absolute inset-[18%] rounded-full border border-cyan-100/20 [transform:rotateY(-64deg)]" />
        </motion.div>
        {[0, 1, 2].map((orbit) => (
          <motion.div
            key={orbit}
            className="absolute rounded-full border border-cyan-200/35 [transform-style:preserve-3d]"
            style={{
              inset: `${10 + orbit * 7}%`,
              transform: `rotateX(${58 + orbit * 13}deg) rotateY(${orbit * 34 - 18}deg)`,
              boxShadow: `0 0 12px ${palette.accent}55`,
            }}
            animate={{ rotateZ: 360, opacity: [0.25, 0.85, 0.25] }}
            transition={{ duration: palette.speed / (1.2 + orbit * 0.35), repeat: Infinity, ease: "linear", delay: orbit * 0.25 }}
          />
        ))}
        <motion.div
          className="absolute left-1/2 top-1/2 w-[72%] h-[2px] -translate-x-1/2 -translate-y-1/2 origin-left bg-gradient-to-r from-transparent via-cyan-100 to-transparent blur-[1px]"
          style={{ transform: "translate(-50%, -50%) rotate(-24deg)" }}
          animate={{ scaleX: [0.2, 1, 0.2], opacity: [0, 0.9, 0] }}
          transition={{ duration: palette.speed / 2, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute inset-[12%] rounded-full overflow-hidden border border-cyan-300/40"
          style={{
            background: `radial-gradient(circle at 35% 28%, ${palette.core}cc 0 3%, transparent 20%), radial-gradient(circle at 60% 68%, ${palette.accent}99, #020617 62%)`,
            boxShadow: `inset -18px -18px 35px #020617, inset 12px 12px 25px ${palette.core}66`,
          }}
          animate={{ scale: [1, pulse, 1], rotate: [0, 360] }}
          transition={{ scale: { duration: 0.35 }, rotate: { duration: palette.speed * 1.7, repeat: Infinity, ease: "linear" } }}
        >
          <div className="absolute inset-0 opacity-60 bg-[linear-gradient(115deg,transparent_35%,rgba(125,211,252,.5)_48%,transparent_58%)] bg-[length:220%_100%] animate-[shimmer_3s_linear_infinite]" />
          {Array.from({ length: particleCount }).map((_, index) => (
            <motion.i
              key={index}
              className="absolute w-1 h-1 rounded-full bg-cyan-100 shadow-[0_0_8px_currentColor]"
              style={{ left: `${12 + ((index * 37) % 76)}%`, top: `${10 + ((index * 61) % 80)}%`, color: palette.core }}
              animate={{ opacity: [0.1, 1, 0.1], scale: [0.5, 1.8, 0.5], y: [8, -10, 8] }}
              transition={{ duration: 1.5 + (index % 5) * 0.35, delay: index * 0.08, repeat: Infinity, ease: "easeInOut" }}
            />
          ))}
        </motion.div>
        <motion.div
          className="absolute inset-[34%] rounded-full border-2 border-white/70"
          style={{ background: `radial-gradient(circle, ${palette.core}, ${palette.accent} 42%, transparent 72%)`, boxShadow: `0 0 28px ${palette.core}` }}
          animate={{ scale: [0.84, pulse, 0.84], opacity: [0.65, 1, 0.65] }}
          transition={{ duration: status === "speaking" ? 0.28 : 1.6, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute -inset-[6%] rounded-full border border-dashed border-cyan-300/45"
          animate={{ rotate: -360 }}
          transition={{ duration: palette.speed * 1.5, repeat: Infinity, ease: "linear" }}
        />
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded border border-cyan-400/50 bg-slate-950/90 text-[9px] font-mono tracking-widest text-cyan-300">
          NEURAL CORE
        </div>
      </div>
      <div className="mt-6 flex items-center gap-2 px-3 py-1 rounded-full bg-slate-950/80 border border-cyan-400/30 backdrop-blur-sm shadow-[0_0_18px_rgba(34,211,238,.15)]">
        <motion.span
          className="w-2 h-2 rounded-full"
          style={{ backgroundColor: palette.core, boxShadow: `0 0 10px ${palette.core}` }}
          animate={{ scale: [0.7, 1.4, 0.7] }}
          transition={{ duration: status === "speaking" ? 0.35 : 1.2, repeat: Infinity }}
        />
        <span className="text-xs font-mono tracking-wider font-semibold" style={{ color: palette.core }}>{palette.label}</span>
      </div>
    </div>
  );
};
