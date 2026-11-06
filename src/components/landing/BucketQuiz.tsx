"use client";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import clsx from "clsx";
import { ButtonLink } from "../ui/Button";

// Rule 4–5: ask, don't tell. A "which one is you?" bucket question lets visitors
// name their own reason to buy — in their words, not ours.
const OPTIONS = [
  {
    key: "gut",
    title: "I bet on gut feeling",
    sub: "and lose more than I win.",
    answer: "That's how most people bet. The bettors at the top don't guess: they bet with a plan, and they've got hundreds of bets to prove it. Now you can see every one of them.",
    cta: "Show me who actually wins",
  },
  {
    key: "streaky",
    title: "I win some weeks",
    sub: "then give it all back.",
    answer: "Consistency is the whole game. Follow bettors with a long, real record, not a lucky weekend, and see their bets the second they place them.",
    cta: "Show me consistent winners",
  },
  {
    key: "sharp",
    title: "I'm already good",
    sub: "but I want a sharper edge.",
    answer: "Then use the best as a second opinion. Filter by sport, ROI and timing, and get alerted only on the bets that match how you play.",
    cta: "Build my filter",
  },
];

export function BucketQuiz() {
  const [pick, setPick] = useState<string | null>(null);
  const chosen = OPTIONS.find((o) => o.key === pick);
  const choose = (k: string) => {
    setPick(k);
    try {
      localStorage.setItem("cb_goal", k);
    } catch {}
  };
  return (
    <div>
      <div className="grid gap-3 sm:grid-cols-3">
        {OPTIONS.map((o, i) => (
          <motion.button
            key={o.key}
            onClick={() => choose(o.key)}
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.08, duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
            whileTap={{ scale: 0.98 }}
            className={clsx(
              "group relative rounded-[28px] p-6 text-left transition-all duration-500 ease-brand",
              pick === o.key ? "bg-ink text-white" : pick ? "bg-white/60 text-ink-3" : "bg-white text-ink hover:-translate-y-1 hover:shadow-[0_20px_40px_-20px_rgba(16,23,58,.3)]",
            )}
          >
            <span className={clsx("mb-5 flex h-9 w-9 sm:mb-8 items-center justify-center rounded-full border-2 transition-colors", pick === o.key ? "border-lime bg-lime" : "border-surface-3")}>
              {pick === o.key && (
                <motion.svg initial={{ scale: 0 }} animate={{ scale: 1 }} width="16" height="16" viewBox="0 0 16 16" aria-hidden>
                  <path d="M3.5 8.5l3 3 6-7" stroke="#10173a" strokeWidth="2.2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                </motion.svg>
              )}
            </span>
            <div className="title text-[24px] leading-tight">{o.title}</div>
            <div className={clsx("mt-1 text-[17px]", pick === o.key ? "text-white/70" : "text-ink-2")}>{o.sub}</div>
          </motion.button>
        ))}
      </div>
      <AnimatePresence mode="wait">
        {chosen && (
          <motion.div key={chosen.key} initial={{ opacity: 0, y: 16, height: 0 }} animate={{ opacity: 1, y: 0, height: "auto" }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }} className="overflow-hidden">
            <div className="mt-3 flex flex-col items-start gap-5 rounded-[28px] bg-brand p-6 text-white sm:flex-row sm:items-center sm:justify-between sm:p-8">
              <p className="max-w-[640px] text-[19px] leading-relaxed sm:text-[21px]">{chosen.answer}</p>
              <ButtonLink href={`/app?goal=${chosen.key}`} variant="lime" size="md">
                {chosen.cta}
              </ButtonLink>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
