"use client";
import { motion } from "motion/react";

// Slow-moving ribbons behind the hero headline, in CopyBet colours.
const RIBBONS = [
  { d: "M-200 520 C 200 300, 520 760, 900 420 S 1500 160, 1800 380", c: "#3A5BFF", w: 120, dur: 16 },
  { d: "M-200 200 C 260 420, 640 60, 1000 300 S 1500 620, 1800 300", c: "#D4FF4F", w: 70, dur: 19 },
  { d: "M-200 700 C 300 520, 700 900, 1100 640 S 1500 420, 1800 720", c: "#FF7A59", w: 90, dur: 22 },
  { d: "M-200 380 C 240 260, 560 560, 960 520 S 1440 260, 1800 560", c: "#8FA4FF", w: 60, dur: 18 },
  { d: "M-200 90 C 300 160, 700 -40, 1100 140 S 1500 260, 1800 80", c: "#2FD38B", w: 56, dur: 24 },
];

/** `faint` = softer ribbons for a light background. */
export function Ribbons({ faint = false }: { faint?: boolean }) {
  const o = faint ? 0.5 : 0.85;
  return (
    <svg className="absolute inset-0 h-full w-full" viewBox="0 0 1600 800" preserveAspectRatio="xMidYMid slice" aria-hidden>
      {RIBBONS.map((r, i) => (
        <motion.path
          key={i}
          d={r.d}
          fill="none"
          stroke={r.c}
          strokeWidth={r.w}
          strokeLinecap="round"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: o, x: [0, i % 2 ? 60 : -60, 0], y: [0, i % 2 ? -30 : 30, 0] }}
          transition={{ pathLength: { duration: 2.2, delay: 0.15 * i, ease: [0.22, 1, 0.36, 1] }, opacity: { duration: 1 }, x: { duration: r.dur, repeat: Infinity, ease: "easeInOut" }, y: { duration: r.dur * 1.3, repeat: Infinity, ease: "easeInOut" } }}
        />
      ))}
    </svg>
  );
}
