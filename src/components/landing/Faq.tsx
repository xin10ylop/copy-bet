"use client";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";

const QA = [
  { q: "Which bookmaker do I need?", a: "Any. Stake, Bet365 or whichever one you already use. You get the pick and the odds, and place it wherever you like. Odds can differ a little between bookmakers." },
  { q: "Where do the records come from?", a: "From real, settled bets placed with real money. Every result is verified and public, so a record can't be faked or edited after the fact." },
  { q: "How fast do I get their bets?", a: "Within seconds on Pro, so you can bet before the odds move. On the free plan, they arrive 10 minutes later." },
  { q: "Can I follow only some of a bettor's bets?", a: "Yes. Follow everything they bet, or only the bets that match your filter: certain sports, a minimum stake, or bets placed a certain time before the game. Your current filter is pre-selected when you follow, so it's one tap." },
  { q: "How are bettors ranked?", a: "By their real, settled results: profit, ROI and win rate, for the sport and time period you choose. Accounts that bet both sides of the same game are left out, so you only see real bettors." },
  { q: "Will I make money?", a: "Nobody can promise that, and you should be wary of anyone who does. What we give you is the clearest picture of who actually wins, and their bets in time to act. Past results don't guarantee future ones. Only bet what you can afford to lose." },
];

export function Faq() {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <div className="divide-y divide-line rounded-[32px] bg-white px-6 sm:px-8">
      {QA.map((x, i) => (
        <div key={x.q}>
          <button onClick={() => setOpen(open === i ? null : i)} className="flex w-full items-center justify-between gap-4 py-5 text-left sm:py-6">
            <span className="title text-[16px] sm:text-[20px]">{x.q}</span>
            <motion.span animate={{ rotate: open === i ? 45 : 0 }} transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-surface-2">
              <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden>
                <path d="M7 2v10M2 7h10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              </svg>
            </motion.span>
          </button>
          <AnimatePresence initial={false}>
            {open === i && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }} className="overflow-hidden">
                <p className="max-w-[720px] pb-6 text-[15px] leading-[1.55] text-ink-2 sm:text-[17px]">{x.a}</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      ))}
    </div>
  );
}
