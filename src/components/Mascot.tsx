"use client";
import { motion, useMotionValue, useSpring } from "motion/react";
import { useEffect, useRef } from "react";

/**
 * Echo — the CopyBet mark and mascot. The front character is the pro; the shape behind it is
 * the copy (you). Blue only in the logo; lime stays in the UI.
 *
 * - `copy`: "wash" (pale filled copy) or "outline" (the original J).
 * - `animate`: the eyes look around and blink; the pro hops and the copy follows a beat later.
 * - `follow`: the pupils follow the pointer (used for the logo).
 * - `variant="white"`: for blue backgrounds.
 */
export const ECHO = {
  copy: "wash" as "wash" | "outline",
  washColor: "#ECFFB3", // pale lime
  outlineColor: "#8DADFF",
};

const P = "#0B1233";
// Where the pupils look, in px of the 120 viewBox: [x, y]. Default is up-right (toward winning).
const LOOK: [number, number][] = [
  [2.6, -2.6],
  [3.2, 0],
  [2.6, -2.6],
  [-3, 0.4],
  [-2.2, -2.6],
  [0, 0],
  [2.6, -2.6],
];

export function Mascot({
  size = 48,
  animate = false,
  follow = false,
  variant = "color",
  copy = ECHO.copy,
  copyColor,
  className,
}: {
  size?: number;
  animate?: boolean;
  follow?: boolean;
  variant?: "color" | "white";
  copy?: "wash" | "outline";
  /** Override the copy's colour (e.g. white on lime backgrounds). */
  copyColor?: string;
  className?: string;
}) {
  const white = variant === "white";
  const body = white ? "#FFFFFF" : "#1652F0";
  const eyeWhite = white ? "#1652F0" : "#FFFFFF";
  // Pale lime nearly disappears on our light background at small sizes (nav logo, icons),
  // so small marks use a slightly stronger tint of the same lime.
  const wash = size <= 44 && !white ? "#DCFA80" : ECHO.washColor;
  const copyFill = copy === "wash" ? (copyColor ?? wash) : "none";
  const copyStroke = copy === "outline" ? (copyColor ?? (white ? "#A9C0FF" : ECHO.outlineColor)) : "none";

  // Pointer-following pupils (logo).
  const ref = useRef<SVGSVGElement>(null);
  const px = useMotionValue(2.6);
  const py = useMotionValue(-2.6);
  const sx = useSpring(px, { stiffness: 220, damping: 20 });
  const sy = useSpring(py, { stiffness: 220, damping: 20 });
  useEffect(() => {
    if (!follow) return;
    const onMove = (e: PointerEvent) => {
      const r = ref.current?.getBoundingClientRect();
      if (!r) return;
      const dx = e.clientX - (r.left + r.width / 2);
      const dy = e.clientY - (r.top + r.height / 2);
      const d = Math.hypot(dx, dy) || 1;
      const k = Math.min(1, d / 160) * 3.4;
      px.set((dx / d) * k);
      py.set((dy / d) * k);
    };
    window.addEventListener("pointermove", onMove);
    return () => window.removeEventListener("pointermove", onMove);
  }, [follow, px, py]);

  const pupils = (
    <>
      <circle cx="44" cy="62" r="4" fill={P} />
      <circle cx="66" cy="62" r="4" fill={P} />
    </>
  );

  let pupilGroup: React.ReactNode;
  if (follow) {
    pupilGroup = <motion.g style={{ x: sx, y: sy }}>{pupils}</motion.g>;
  } else if (animate) {
    pupilGroup = (
      <motion.g
        animate={{ x: LOOK.map((l) => l[0]), y: LOOK.map((l) => l[1]) }}
        transition={{ duration: 7, times: [0, 0.14, 0.3, 0.46, 0.62, 0.78, 1], repeat: Infinity, ease: "easeInOut" }}
      >
        {pupils}
      </motion.g>
    );
  } else {
    pupilGroup = <g transform="translate(2.6 -2.6)">{pupils}</g>;
  }

  const blink = animate || follow ? { animate: { scaleY: [1, 1, 0.1, 1, 1] }, transition: { duration: 4.8, times: [0, 0.86, 0.89, 0.92, 1], repeat: Infinity } } : {};
  const hop = (delay: number) => (animate ? { animate: { y: [0, -8, 0, 0] }, transition: { duration: 3.5, times: [0, 0.08, 0.18, 1], repeat: Infinity, ease: "easeOut" as const, delay } } : {});

  return (
    <svg ref={ref} width={size} height={size} viewBox="0 0 120 120" className={className} aria-hidden>
      {/* the copy (you), following a beat later */}
      <motion.g {...hop(0.16)}>
        <rect x="34" y="18" width="70" height="70" rx="24" fill={copyFill} stroke={copyStroke} strokeWidth={copy === "outline" ? 6 : 0} />
      </motion.g>
      {/* the pro */}
      <motion.g {...hop(0)}>
        <rect x="18" y="32" width="70" height="70" rx="24" fill={body} />
        <motion.g {...blink} style={{ transformOrigin: "55px 62px", transformBox: "view-box" }}>
          <ellipse cx="44" cy="62" rx="7" ry="9" fill={eyeWhite} />
          <ellipse cx="66" cy="62" rx="7" ry="9" fill={eyeWhite} />
          {pupilGroup}
        </motion.g>
      </motion.g>
    </svg>
  );
}

/**
 * Echo sized to sit inside a line of big headline text. It pops into the gap when the phrase
 * scrolls into view (leaving a little dot where it landed), then looks around and hops.
 */
export function InlineMascot({ variant = "color", copyColor }: { variant?: "color" | "white"; copyColor?: string }) {
  return (
    <span className="relative mx-[0.1em] inline-block h-[0.95em] w-[0.95em] translate-y-[0.12em] align-baseline">
      <motion.span
        aria-hidden
        className="absolute bottom-[0.1em] left-[-0.12em] h-[0.09em] w-[0.09em] rounded-full"
        style={{ background: copyColor ?? ECHO.washColor }}
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
        <Mascot animate variant={variant} copyColor={copyColor} />
      </motion.span>
    </span>
  );
}
