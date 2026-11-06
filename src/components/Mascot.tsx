"use client";
import { motion } from "motion/react";
import { useId } from "react";

const BODY = "M60 14c20 0 34 14 34 34 0 18-8 30-16 40-8 12-20 20-32 20-10 0-18-4-22-10l-12 14c-2-12 2-22 8-28-4-10-4-22 0-32 4-22 20-38 40-38Z";

/**
 * Polly, the CopyBet parrot. Parrots copy what they see — which is exactly what CopyBet helps you do.
 * Brand-blue macaw with a lime belly. `variant="white"` is for blue backgrounds.
 * `animate` adds a gentle bob and a blink.
 */
export function Mascot({ size = 48, animate = false, variant = "color", className }: { size?: number; animate?: boolean; variant?: "color" | "white"; className?: string }) {
  const id = useId().replace(/:/g, "");
  const white = variant === "white";
  const c = {
    crest: white ? "rgba(255,255,255,.8)" : "#4F7BFF",
    body: white ? "#FFFFFF" : "#1652F0",
    belly: "#D4FF4F",
    wing: white ? "#DBE4FF" : "#0F3FCC",
    face: white ? "#DBE4FF" : "#FFFFFF",
    beak: "#10173A",
  };
  const eye = (
    <>
      <circle cx="73" cy="41" r="6" fill="#10173A" />
      <circle cx="75.5" cy="38.5" r="2" fill="#fff" />
    </>
  );
  const parts = (
    <>
      <path d="M47 21C38 15 36 5 43 1c5 5 9 11 11 17ZM56 17c-3-9 1-17 10-17 0 7-2 13-5 18Z" fill={c.crest} />
      <path d={BODY} fill={c.body} />
      <g clipPath={`url(#${id})`}>
        <path d="M45 70c12-6 28 0 30 14 2 14-10 22-24 20-10-2-14-12-12-20 1-6 2-11 6-14Z" fill={c.belly} />
        <path d="M22 56c14-6 26 4 24 20-2 14-14 20-24 18 6-10 6-26 0-38Z" fill={c.wing} />
      </g>
      <path d="M80 38c16-4 30 4 28 20-1 8-7 12-12 10 2-8-2-14-12-14Z" fill={c.beak} />
      <path d="M84 54c7 0 11 4 10 9-5 0-9-3-10-5Z" fill={c.beak} opacity=".75" />
      <ellipse cx="70" cy="42" rx="15" ry="14" fill={c.face} />
      {animate ? (
        <motion.g animate={{ scaleY: [1, 1, 0.1, 1, 1] }} transition={{ duration: 4.2, repeat: Infinity, times: [0, 0.88, 0.91, 0.94, 1] }} style={{ transformOrigin: "73px 41px", transformBox: "view-box" }}>
          {eye}
        </motion.g>
      ) : (
        eye
      )}
    </>
  );
  return (
    <svg width={size} height={size} viewBox="0 0 120 120" className={className} aria-hidden>
      <defs>
        <clipPath id={id}>
          <path d={BODY} />
        </clipPath>
      </defs>
      {animate ? (
        <motion.g animate={{ y: [0, -4, 0], rotate: [0, -4, 0] }} transition={{ duration: 2.8, repeat: Infinity, ease: "easeInOut" }} style={{ transformOrigin: "60px 108px", transformBox: "view-box" }}>
          {parts}
        </motion.g>
      ) : (
        parts
      )}
    </svg>
  );
}

/**
 * The mascot sized to sit inside a line of big headline text. It pops into the gap when the
 * phrase scrolls into view (leaving a little dot where it took off), then hops now and then.
 */
export function InlineMascot({ variant = "color" }: { variant?: "color" | "white" }) {
  return (
    <span className="relative mx-[0.1em] inline-block h-[0.95em] w-[0.95em] translate-y-[0.12em] align-baseline">
      <motion.span
        aria-hidden
        className={`absolute bottom-[0.1em] left-[-0.12em] h-[0.09em] w-[0.09em] rounded-full ${variant === "white" ? "bg-white/70" : "bg-[#4F7BFF]"}`}
        initial={{ scale: 0 }}
        whileInView={{ scale: [0, 1.4, 1] }}
        viewport={{ once: true, margin: "-25% 0px" }}
        transition={{ duration: 0.5, delay: 0.1 }}
      />
      <motion.span
        className="absolute inset-0 block [&_svg]:h-full [&_svg]:w-full"
        initial={{ y: "0.5em", scale: 0.15, rotate: -30, opacity: 0 }}
        whileInView={{ y: "0em", scale: 1, rotate: 0, opacity: 1 }}
        viewport={{ once: true, margin: "-25% 0px" }}
        transition={{ type: "spring", stiffness: 380, damping: 13, delay: 0.25 }}
      >
        <motion.span className="block h-full w-full" animate={{ y: ["0em", "-0.28em", "0em"], rotate: [0, -8, 0] }} transition={{ duration: 0.55, repeat: Infinity, repeatDelay: 3.4, ease: "easeOut", delay: 2 }}>
          <Mascot animate variant={variant} />
        </motion.span>
      </motion.span>
    </span>
  );
}
