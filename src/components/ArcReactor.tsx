import React from "react";
import { motion } from "motion/react";

interface ArcReactorProps {
  status: "idle" | "listening" | "processing" | "speaking";
  audioLevel?: number; // 0 to 1
  onClick?: () => void;
  size?: "sm" | "md" | "lg";
}

export const ArcReactor: React.FC<ArcReactorProps> = ({
  status,
  audioLevel = 0,
  onClick,
  size = "md",
}) => {
  const sizeClasses = {
    sm: "w-24 h-24",
    md: "w-44 h-44",
    lg: "w-64 h-64",
  }[size];

  // Dynamic glow color based on status
  const glowColor =
    status === "listening"
      ? "from-emerald-400 to-cyan-500 shadow-emerald-500/40"
      : status === "speaking"
      ? "from-cyan-400 to-blue-500 shadow-cyan-400/50"
      : status === "processing"
      ? "from-amber-400 to-orange-500 shadow-amber-500/40"
      : "from-cyan-500 to-teal-400 shadow-cyan-500/30";

  const statusLabel =
    status === "listening"
      ? "LISTENING"
      : status === "speaking"
      ? "JARVIS SPEAKING"
      : status === "processing"
      ? "ANALYZING"
      : "JARVIS ONLINE";

  const scalePulse = 1 + audioLevel * 0.35;

  return (
    <div className="flex flex-col items-center justify-center select-none">
      <div
        onClick={onClick}
        className={`relative ${sizeClasses} rounded-full flex items-center justify-center cursor-pointer transition-all duration-300 group`}
      >
        {/* Outer ambient glow */}
        <div
          className={`absolute inset-0 rounded-full bg-gradient-to-tr ${glowColor} blur-2xl opacity-40 group-hover:opacity-70 transition-opacity`}
        />

        {/* Outer segmented ring 1 (Clockwise) */}
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: status === "speaking" ? 6 : 20, repeat: Infinity, ease: "linear" }}
          className="absolute inset-0 rounded-full border border-cyan-500/30 border-dashed"
        />

        {/* Outer segmented ring 2 (Counter-Clockwise) */}
        <motion.div
          animate={{ rotate: -360 }}
          transition={{ duration: status === "speaking" ? 10 : 28, repeat: Infinity, ease: "linear" }}
          className="absolute inset-2 rounded-full border border-cyan-400/20 border-t-cyan-400/80 border-b-cyan-400/80"
        />

        {/* Geometric reactor ticks */}
        <div className="absolute inset-3 rounded-full flex items-center justify-center pointer-events-none">
          {[...Array(12)].map((_, i) => (
            <div
              key={i}
              className="absolute w-full h-[1px] bg-cyan-500/15"
              style={{ transform: `rotate(${i * 30}deg)` }}
            />
          ))}
        </div>

        {/* Inner high-speed ring */}
        <motion.div
          animate={{
            rotate: 360,
            scale: status === "speaking" || status === "listening" ? [1, scalePulse, 1] : 1,
          }}
          transition={{
            rotate: { duration: status === "processing" ? 3 : 12, repeat: Infinity, ease: "linear" },
            scale: { duration: 0.2 },
          }}
          className="absolute inset-6 rounded-full border-2 border-cyan-400/40 border-r-transparent border-l-transparent"
        />

        {/* Core glow housing */}
        <div className="absolute inset-9 rounded-full bg-slate-950/80 backdrop-blur-md border border-cyan-500/50 flex items-center justify-center shadow-inner">
          {/* Glowing central core */}
          <motion.div
            animate={{
              scale: status === "speaking" || status === "listening" ? [1, scalePulse, 1] : [1, 1.08, 1],
              opacity: [0.8, 1, 0.8],
            }}
            transition={{
              duration: status === "speaking" ? 0.3 : 2,
              repeat: Infinity,
              ease: "easeInOut",
            }}
            className={`w-12 h-12 rounded-full bg-gradient-to-tr ${glowColor} flex items-center justify-center shadow-lg`}
          >
            {/* Triangular arc core center symbol */}
            <div className="w-5 h-5 rounded-full bg-slate-950/90 border border-cyan-200/80 flex items-center justify-center shadow-inner">
              <div
                className={`w-2 h-2 rounded-full ${
                  status === "listening"
                    ? "bg-emerald-400"
                    : status === "processing"
                    ? "bg-amber-400"
                    : "bg-cyan-300"
                } shadow-[0_0_8px_#38bdf8]`}
              />
            </div>
          </motion.div>
        </div>

        {/* High-tech edge brackets */}
        <div className="absolute -top-1 px-2 py-0.5 bg-slate-900 border border-cyan-500/40 rounded text-[9px] font-mono tracking-widest text-cyan-400">
          MK-85
        </div>
      </div>

      {/* Holographic Status Label */}
      <div className="mt-4 flex items-center gap-2 px-3 py-1 rounded-full bg-slate-900/80 border border-cyan-500/30 backdrop-blur-sm shadow-md">
        <span
          className={`w-2 h-2 rounded-full ${
            status === "listening"
              ? "bg-emerald-400 animate-ping"
              : status === "speaking"
              ? "bg-cyan-400 animate-pulse"
              : status === "processing"
              ? "bg-amber-400 animate-spin"
              : "bg-cyan-500"
          }`}
        />
        <span className="text-xs font-mono tracking-wider font-semibold text-cyan-300">
          {statusLabel}
        </span>
      </div>
    </div>
  );
};
