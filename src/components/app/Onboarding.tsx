"use client";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";
import clsx from "clsx";
import { Sheet } from "../ui/Sheet";
import { SportIcon } from "../SportIcon";
import { SPORTS, type SportKey } from "@/lib/sports";

// Rule 5: bucket questions. Two taps, and the app is already about them.
const GOALS = [
  { key: "find", title: "Find winners to follow", sub: "Show me who's actually good" },
  { key: "fast", title: "Get their bets instantly", sub: "Before the price moves" },
  { key: "check", title: "Check a bettor I know", sub: "Is their record real?" },
];

export function Onboarding({ skipSport, onDone }: { skipSport: boolean; onDone: (r: { sport: SportKey | null; goal: string | null }) => void }) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<0 | 1>(0);
  const [sport, setSport] = useState<SportKey | null>(null);

  const finish = (s: SportKey | null, goal: string | null) => {
    try {
      localStorage.setItem("cb_onboarded", "1");
      if (goal) localStorage.setItem("cb_goal", goal);
    } catch {}
    setOpen(false);
    fetch("/api/me", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ ...(goal ? { goal } : {}), ...(s ? { favoriteSport: s } : {}) }) }).catch(() => {});
    onDone({ sport: s, goal });
  };

  useEffect(() => {
    let seen = true;
    let goal: string | null = null;
    try {
      seen = localStorage.getItem("cb_onboarded") === "1";
      goal = localStorage.getItem("cb_goal");
    } catch {}
    if (seen) return;
    /* eslint-disable react-hooks/set-state-in-effect -- first-visit check has to read localStorage after mount */
    if (skipSport && goal) return finish(null, goal);
    setStep(skipSport ? 1 : 0);
    setOpen(true);
    /* eslint-enable react-hooks/set-state-in-effect */
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const pickSport = (s: SportKey | null) => {
    setSport(s);
    let goal: string | null = null;
    try {
      goal = localStorage.getItem("cb_goal");
    } catch {}
    if (goal) finish(s, goal);
    else setStep(1);
  };

  return (
    <Sheet open={open} onClose={() => finish(sport, null)}>
      <AnimatePresence mode="wait" initial={false}>
        {step === 0 ? (
          <motion.div key="s" initial={{ opacity: 0, x: -24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }} transition={{ duration: 0.3 }}>
            <Dots step={0} />
            <h2 className="title mt-4 text-[28px] leading-tight">Which sport do you bet on most?</h2>
            <p className="mt-1 text-[16px] text-ink-2">We&apos;ll show you the best bettors there first.</p>
            <div className="mt-6 grid grid-cols-3 gap-2">
              {SPORTS.map((s) => (
                <button key={s.key} onClick={() => pickSport(s.key)} className="press flex aspect-square flex-col items-start justify-between rounded-[22px] p-3 text-left" style={{ background: s.tile, color: s.ink }}>
                  <SportIcon sport={s.key} size={26} />
                  <span className="text-[14px] leading-tight font-semibold">{s.label}</span>
                </button>
              ))}
            </div>
            <button onClick={() => pickSport(null)} className="press mt-3 mb-2 h-12 w-full rounded-full bg-surface text-[16px] font-semibold">
              A bit of everything
            </button>
          </motion.div>
        ) : (
          <motion.div key="g" initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 24 }} transition={{ duration: 0.3 }}>
            <Dots step={1} />
            <h2 className="title mt-4 text-[28px] leading-tight">What do you want most?</h2>
            <p className="mt-1 text-[16px] text-ink-2">Pick one. You can do all of it later.</p>
            <div className="mt-6 mb-2 space-y-2">
              {GOALS.map((g) => (
                <button key={g.key} onClick={() => finish(sport, g.key)} className="press flex w-full items-center justify-between rounded-[22px] bg-surface p-5 text-left">
                  <span>
                    <span className="block text-[17px] font-semibold">{g.title}</span>
                    <span className="text-[14px] text-ink-3">{g.sub}</span>
                  </span>
                  <svg width="20" height="20" viewBox="0 0 20 20" className="text-ink-3" aria-hidden>
                    <path d="m8 5 5 5-5 5" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </Sheet>
  );
}

function Dots({ step }: { step: number }) {
  return (
    <div className="flex gap-1.5 pt-1">
      {[0, 1].map((i) => (
        <span key={i} className={clsx("h-1.5 rounded-full transition-all duration-500 ease-brand", i === step ? "w-8 bg-brand" : "w-3 bg-surface-3")} />
      ))}
    </div>
  );
}
