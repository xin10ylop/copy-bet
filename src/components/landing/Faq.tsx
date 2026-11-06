"use client";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";

const QA = [
  { q: "Is CopyBet part of Polymarket?", a: "No. CopyBet is an independent tool. We read Polymarket's public data: every bet on Polymarket is recorded on a public blockchain, so anyone's record can be checked." },
  { q: "How fast are the alerts?", a: "Usually within a few seconds of the bet. We listen to Polymarket's live trade feed and send the Telegram message straight away. On the free plan, alerts arrive 10 minutes later." },
  { q: "Can I follow only some of a bettor's bets?", a: "Yes. Follow everything they bet, or only the bets that match your filter: certain sports, a minimum size, or bets placed a certain time before the game. Your current filter is pre-selected when you follow, so it's one tap." },
  { q: "How are bettors ranked?", a: "By their real, settled results: ROI, profit and win rate, for the sport and time period you choose. Market makers and bots that bet both sides are left out, so you only see real bettors." },
  { q: "Do I need a Polymarket account?", a: "Not to use CopyBet. You'll need one only if you want to place the same bets yourself." },
  { q: "Will I make money?", a: "Nobody can promise that, and you should be wary of anyone who does. What we promise is the clearest view of who actually wins, and their bets in time to act. Past results don't guarantee future ones. Only bet what you can afford to lose." },
];

export function Faq() {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <div className="divide-y divide-line rounded-[32px] bg-white px-6 sm:px-8">
      {QA.map((x, i) => (
        <div key={x.q}>
          <button onClick={() => setOpen(open === i ? null : i)} className="flex w-full items-center justify-between gap-4 py-6 text-left">
            <span className="title text-[18px] sm:text-[20px]">{x.q}</span>
            <motion.span animate={{ rotate: open === i ? 45 : 0 }} transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-surface-2">
              <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden>
                <path d="M7 2v10M2 7h10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              </svg>
            </motion.span>
          </button>
          <AnimatePresence initial={false}>
            {open === i && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }} className="overflow-hidden">
                <p className="max-w-[720px] pb-6 text-[17px] leading-relaxed text-ink-2">{x.a}</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      ))}
    </div>
  );
}
