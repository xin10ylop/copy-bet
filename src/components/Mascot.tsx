"use client";
import { motion } from "motion/react";

/**
 * The CopyBet Twins: the big one is the pro, the small one is you, copying the pro.
 * Also the logo mark. Blue only (lime stays in the UI).
 * `variant="white"` is for blue backgrounds. `animate`: the pro hops, the small twin copies a beat later, both blink.
 */
export function Mascot({ size = 48, animate = false, variant = "color", className }: { size?: number; animate?: boolean; variant?: "color" | "white"; className?: string }) {
  const white = variant === "white";
  const pro = white ? "#FFFFFF" : "#1652F0";
  const proEye = white ? "#1652F0" : "#FFFFFF";
  const you = white ? "#A9C0FF" : "#8DADFF";
  const ring = white ? "#1652F0" : "var(--bg, #F4F6FF)";
  const pupil = "#0B1233";

  const hop = (delay: number) =>
    animate ? { animate: { y: [0, -9, 0, 0] }, transition: { duration: 2.4, times: [0, 0.12, 0.26, 1], repeat: Infinity, ease: "easeOut" as const, delay } } : {};
  const blink = animate ? { animate: { scaleY: [1, 1, 0.12, 1, 1] }, transition: { duration: 4.6, times: [0, 0.86, 0.89, 0.92, 1], repeat: Infinity } } : {};

  return (
    <svg width={size} height={size} viewBox="0 0 120 120" className={className} aria-hidden>
      {/* the pro */}
      <motion.g {...hop(0)}>
        <rect x="38" y="12" width="70" height="70" rx="24" fill={pro} />
        <motion.g {...blink} style={{ transformOrigin: "78px 43px", transformBox: "view-box" }}>
          <ellipse cx="66" cy="42" rx="7" ry="9" fill={proEye} />
          <ellipse cx="88" cy="42" rx="7" ry="9" fill={proEye} />
          <circle cx="68.5" cy="44" r="4" fill={pupil} />
          <circle cx="90.5" cy="44" r="4" fill={pupil} />
        </motion.g>
      </motion.g>
      {/* you, copying a beat later */}
      <motion.g {...hop(0.22)}>
        <rect x="10" y="50" width="58" height="58" rx="20" fill={you} stroke={ring} strokeWidth="5" />
        <motion.g {...blink} style={{ transformOrigin: "42px 75px", transformBox: "view-box" }}>
          <ellipse cx="33" cy="76" rx="6" ry="7.5" fill="#fff" />
          <ellipse cx="51" cy="76" rx="6" ry="7.5" fill="#fff" />
          <circle cx="35.5" cy="73.5" r="3.4" fill={pupil} />
          <circle cx="53.5" cy="73.5" r="3.4" fill={pupil} />
        </motion.g>
      </motion.g>
    </svg>
  );
}

/**
 * The Twins sized to sit inside a line of big headline text. They pop into the gap when the
 * phrase scrolls into view (leaving a little dot where they landed), then keep hopping.
 */
export function InlineMascot({ variant = "color" }: { variant?: "color" | "white" }) {
  return (
    <span className="relative mx-[0.1em] inline-block h-[0.95em] w-[0.95em] translate-y-[0.12em] align-baseline">
      <motion.span
        aria-hidden
        className={`absolute bottom-[0.1em] left-[-0.12em] h-[0.09em] w-[0.09em] rounded-full ${variant === "white" ? "bg-white/70" : "bg-[#8DADFF]"}`}
        initial={{ scale: 0 }}
        whileInView={{ scale: [0, 1.4, 1] }}
        viewport={{ once: true, margin: "-25% 0px" }}
        transition={{ duration: 0.5, delay: 0.1 }}
      />
      <motion.span
        className="absolute inset-0 block [&_svg]:h-full [&_svg]:w-full"
        initial={{ y: "0.5em", scale: 0.15, rotate: -20, opacity: 0 }}
        whileInView={{ y: "0em", scale: 1, rotate: 0, opacity: 1 }}
        viewport={{ once: true, margin: "-25% 0px" }}
        transition={{ type: "spring", stiffness: 380, damping: 13, delay: 0.25 }}
      >
        <Mascot animate variant={variant} />
      </motion.span>
    </span>
  );
}
