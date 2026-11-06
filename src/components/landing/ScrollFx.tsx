"use client";
// Scroll effects for the landing page:
// - RollingNumber: slot-machine digits that roll into place.
// - StatStory: a pinned stat line; a second line rises to join it, then a closing line appears.
// - WordReveal: a statement that lights up word by word as you scroll.
// - Marquee: an endless strip of chips.
// - RisingMascot: a giant parrot silhouette that rises behind a section.
import { motion, useInView, useScroll, useTransform, type MotionValue } from "motion/react";
import { useRef } from "react";
import clsx from "clsx";
import { Mascot } from "../Mascot";
import { SportIcon } from "../SportIcon";

const DIGITS = "0123456789";

/** Each digit is a vertical strip of 0–9 that slides to its value, left to right. */
export function RollingNumber({ value, className }: { value: string; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-20% 0px" });
  let d = 0;
  return (
    <span ref={ref} className={clsx("inline-flex overflow-hidden align-bottom leading-[1.05]", className)} aria-label={value}>
      {value.split("").map((ch, i) => {
        if (!DIGITS.includes(ch)) return <span key={i} aria-hidden>{ch}</span>;
        const idx = d++;
        return (
          <span key={i} aria-hidden className="relative inline-block h-[1.05em] overflow-hidden">
            <span className="invisible">0</span>
            <motion.span className="absolute inset-x-0 top-0 flex flex-col" initial={{ y: "0em" }} animate={inView ? { y: `${-1.05 * Number(ch)}em` } : {}} transition={{ type: "spring", stiffness: 70, damping: 16, delay: 0.1 + idx * 0.09 }}>
              {DIGITS.split("").map((n) => (
                <span key={n} className="block h-[1.05em]">
                  {n}
                </span>
              ))}
            </motion.span>
          </span>
        );
      })}
    </span>
  );
}

/** Pinned stat story: line one rolls in, line two rises to join it, then a closing line. */
export function StatStory({ first, second, close }: { first: React.ReactNode; second: React.ReactNode; close: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress: p } = useScroll({ target: ref, offset: ["start start", "end end"] });
  const secondY = useTransform(p, [0.15, 0.45], [160, 0]);
  const secondO = useTransform(p, [0.15, 0.4], [0, 1]);
  const closeO = useTransform(p, [0.55, 0.75], [0, 1]);
  const closeY = useTransform(p, [0.55, 0.75], [24, 0]);
  return (
    <div ref={ref} className="relative h-[220vh]">
      <div className="sticky top-0 flex h-[100svh] flex-col items-center justify-center px-4 text-center">
        <div className="display text-[44px] sm:text-[84px]">{first}</div>
        <motion.div style={{ y: secondY, opacity: secondO }} className="display text-[44px] sm:text-[84px]">
          {second}
        </motion.div>
        <motion.div style={{ y: closeY, opacity: closeO }} className="mt-8 text-[20px] font-medium text-ink-2 sm:text-[24px]">
          {close}
        </motion.div>
      </div>
    </div>
  );
}

function Word({ children, progress, range, highlight }: { children: string; progress: MotionValue<number>; range: [number, number]; highlight?: boolean }) {
  const opacity = useTransform(progress, range, [0.16, 1]);
  return (
    <motion.span style={{ opacity }} className={clsx("inline-block whitespace-pre", highlight && "text-brand")}>
      {children}{" "}
    </motion.span>
  );
}

/** A big statement that lights up word by word as it scrolls through the screen. Wrap words to highlight in *stars*. */
export function WordReveal({ text, className }: { text: string; className?: string }) {
  const ref = useRef<HTMLParagraphElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start 0.85", "end 0.45"] });
  const words = text.split(" ");
  return (
    <p ref={ref} className={clsx("display", className)}>
      {words.map((w, i) => {
        const hl = w.startsWith("*");
        const clean = w.replace(/\*/g, "");
        return (
          <Word key={i} progress={scrollYProgress} range={[i / words.length, (i + 1) / words.length]} highlight={hl}>
            {clean}
          </Word>
        );
      })}
    </p>
  );
}

const LEAGUES: [string, string][] = [
  ["NFL", "football"],
  ["NBA", "basketball"],
  ["Premier League", "soccer"],
  ["Champions League", "soccer"],
  ["UFC", "combat"],
  ["MLB", "baseball"],
  ["NHL", "hockey"],
  ["ATP & WTA", "tennis"],
  ["La Liga", "soccer"],
  ["NCAA", "basketball"],
  ["F1", "racing"],
  ["CS2 & LoL", "esports"],
  ["IPL", "cricket"],
  ["PGA", "golf"],
];

/** Endless strip of leagues. */
export function LeagueMarquee() {
  const row = [...LEAGUES, ...LEAGUES];
  return (
    <div className="relative overflow-hidden py-2 [mask-image:linear-gradient(90deg,transparent,#000_8%,#000_92%,transparent)]">
      <motion.div className="flex w-max gap-3" animate={{ x: ["0%", "-50%"] }} transition={{ duration: 40, repeat: Infinity, ease: "linear" }}>
        {row.map(([name, sport], i) => (
          <span key={i} className="flex items-center gap-2.5 rounded-full bg-white px-5 py-3 text-[17px] font-semibold whitespace-nowrap shadow-[0_2px_12px_rgba(16,23,58,.05)]">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-soft text-brand">
              <SportIcon sport={sport} size={18} />
            </span>
            {name}
          </span>
        ))}
      </motion.div>
    </div>
  );
}

/** A giant parrot silhouette rising behind a section as it scrolls in. */
export function RisingMascot({ className }: { className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end end"] });
  const y = useTransform(scrollYProgress, [0, 1], ["45%", "8%"]);
  const scale = useTransform(scrollYProgress, [0, 1], [0.8, 1]);
  return (
    <div ref={ref} aria-hidden className={clsx("pointer-events-none absolute inset-0 overflow-hidden", className)}>
      <motion.div style={{ y, scale }} className="absolute bottom-[-30%] left-1/2 w-[min(900px,130vw)] -translate-x-1/2 opacity-[0.16]">
        <Mascot size={900} className="h-auto w-full" />
      </motion.div>
    </div>
  );
}
