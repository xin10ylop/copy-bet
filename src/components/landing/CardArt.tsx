"use client";
// Illustrations for the showcase cards. Built from HTML/SVG + motion (no videos),
// and only animated while on screen.
import { AnimatePresence, animate, motion, useInView } from "motion/react";
import { useEffect, useRef, useState } from "react";
import clsx from "clsx";
import { Avatar } from "../ui/Avatar";
import { SportIcon } from "../SportIcon";
import { Mascot } from "../Mascot";
import { formatOdds, formatPct, formatUsd } from "@/lib/filters";
import { leagueLabel, sportLabel } from "@/lib/sports";
import type { PhoneAlert, PhoneBettor, PhoneCompare } from "./HeroPhone";

const EASE = [0.22, 1, 0.36, 1] as const;

function useLoop(ms: number, steps: number) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { margin: "-10% 0px" });
  const [step, setStep] = useState(0);
  useEffect(() => {
    if (!inView) return;
    const t = setInterval(() => setStep((s) => (s + 1) % steps), ms);
    return () => clearInterval(t);
  }, [inView, ms, steps]);
  return { ref, inView, step };
}

function Count({ to, format, run }: { to: number; format: (n: number) => string; run: boolean }) {
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    if (!run || !ref.current) return;
    const node = ref.current;
    const c = animate(0, to, { duration: 1.4, ease: EASE, onUpdate: (v) => (node.textContent = format(v)) });
    return () => c.stop();
  }, [run, to, format]);
  return <span ref={ref}>{format(0)}</span>;
}

/** Blue card: a slab of the leaderboard rising into the card. */
export function ArtLeaderboard({ bettors }: { bettors: PhoneBettor[] }) {
  const { ref, inView } = useLoop(9999, 1);
  return (
    <div ref={ref} className="absolute inset-0">
      <motion.div initial={{ rotate: -14, scale: 0 }} animate={inView ? { rotate: -10, scale: 1 } : {}} transition={{ type: "spring", stiffness: 260, damping: 14, delay: 0.7 }} className="absolute top-3 right-5 z-20 rounded-full bg-lime px-3 py-1 text-[14px] font-bold text-[#10173a] shadow-lg">
        #1 this month
      </motion.div>
      <div className="absolute inset-x-5 top-12 bottom-0 rounded-t-[24px] bg-white p-3 text-[#10173a] shadow-[0_-10px_40px_rgba(0,0,0,.15)]">
        {bettors.slice(0, 4).map((b, i) => (
          <motion.div key={b.address} initial={{ opacity: 0, y: 24 }} animate={inView ? { opacity: 1, y: 0 } : {}} transition={{ delay: 0.15 + i * 0.12, duration: 0.6, ease: EASE }} className={clsx("flex items-center gap-2.5 rounded-2xl p-2", i === 0 && "bg-[#f1f4ff]")}>
            <span className="w-4 text-center text-[12px] font-bold text-[#8a91ad]">{i + 1}</span>
            <Avatar address={b.address} src={b.profileImage} name={b.name} size={34} />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[14px] font-semibold">{b.name}</span>
              <span className="flex items-center gap-1 text-[11.5px] text-[#545c80]">
                <SportIcon sport={b.sport} size={12} /> {sportLabel(b.sport)}
              </span>
            </span>
            <span className="text-[15px] font-semibold text-[#0fa968]">
              <Count to={b.roi} format={(n) => formatPct(n)} run={inView} />
            </span>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

/** Lime card: one sport vs everything else. */
export function ArtSplit({ compare, name }: { compare: PhoneCompare | null; name: string }) {
  const { ref, inView } = useLoop(9999, 1);
  const c = compare ?? { sport: "basketball", sportRoi: 0, otherRoi: 0, sportBets: 0 };
  return (
    <div ref={ref} className="absolute inset-0 flex flex-col justify-end p-6">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={inView ? { opacity: 1, y: 0 } : {}} transition={{ duration: 0.6, ease: EASE }} className="flex items-center gap-2">
        <span className="flex items-center gap-1.5 rounded-full bg-[#10173a] px-3 py-1.5 text-[13px] font-semibold text-white">
          <SportIcon sport={c.sport} size={15} /> {sportLabel(c.sport)} only
        </span>
        <span className="truncate text-[13px] font-medium opacity-60">{name}</span>
      </motion.div>
      <div className="display num mt-2 text-[72px] leading-none text-[#0a7f4c]">
        <Count to={c.sportRoi} format={(n) => formatPct(n)} run={inView} />
      </div>
      <div className="mt-1 text-[14px] font-medium opacity-70">ROI on {c.sportBets} settled bets</div>
      <motion.div initial={{ rotate: 0, opacity: 0, x: 30 }} animate={inView ? { rotate: 6, opacity: 1, x: 0 } : {}} transition={{ delay: 0.9, type: "spring", stiffness: 200, damping: 16 }} className="absolute top-8 right-5 rounded-2xl bg-white px-3.5 py-2.5 text-right shadow-[0_14px_30px_-12px_rgba(16,23,58,.4)]">
        <div className="text-[11px] font-medium text-[#8a91ad]">Everything else</div>
        <div className={clsx("text-[22px] font-semibold", c.otherRoi >= 0 ? "text-[#10173a]" : "text-[#e8435f]")}>{formatPct(c.otherRoi)}</div>
      </motion.div>
    </div>
  );
}

/** White card: rules switching on, one by one. */
export function ArtFollow() {
  const { ref, step } = useLoop(1100, 5);
  const rows = ["Every bet they place", "Only Basketball", "Only bets over $500", "Game day bets"];
  const on = (i: number) => (i === 0 ? false : step >= i);
  return (
    <div ref={ref} className="absolute inset-0 flex flex-col justify-end gap-2 p-5">
      {rows.map((r, i) => (
        <div key={r} className="flex items-center justify-between rounded-2xl bg-[#f1f4ff] px-4 py-3 text-[15px] font-medium text-[#10173a]">
          {r}
          <span className={clsx("relative h-7 w-12 rounded-full transition-colors duration-500", on(i) ? "bg-[#1652f0]" : "bg-[#dfe5fb]")}>
            <span className={clsx("absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-transform duration-500 ease-brand", on(i) ? "translate-x-6" : "translate-x-1")} />
          </span>
        </div>
      ))}
      <div className="absolute top-0 left-1/2 -translate-x-1/2">
        <Mascot size={120} animate />
      </div>
    </div>
  );
}

/** Peach card: their bets dropping in as notifications. */
export function ArtAlerts({ alert, name, sport }: { alert: PhoneAlert | null; name: string; sport: string }) {
  const { ref, step } = useLoop(1800, 3);
  const a = alert ?? { league: "nba", title: "Lakers vs. Celtics", outcome: "Lakers", price: 0.47, usd: 2500 };
  const items = [
    { t: `${leagueLabel(a.league)} · ${a.title}`, p: `${a.outcome} @ ${formatOdds(a.price)} · ${formatUsd(a.usd)}` },
    { t: "Your filter matched", p: `${sportLabel(sport)} · big bet` },
    { t: "Placed seconds ago", p: "Your move" },
  ];
  return (
    <div ref={ref} className="absolute inset-0 overflow-hidden px-4 pt-4">
      <AnimatePresence initial={false}>
        {items.slice(0, step + 1).map((it, i) => (
          <motion.div key={it.t} layout initial={{ opacity: 0, y: -30, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0 }} transition={{ type: "spring", stiffness: 260, damping: 24 }} className="mb-2 rounded-[20px] bg-white/90 p-3 shadow-[0_12px_30px_-14px_rgba(16,23,58,.35)] backdrop-blur" style={{ zIndex: 10 - i }}>
            <div className="flex items-center gap-2 text-[11.5px] text-[#545c80]">
              <Mascot size={18} />
              <span className="font-semibold text-[#10173a]">CopyBet</span>
              <span className="ml-auto">now</span>
            </div>
            <div className="mt-1 text-[13.5px] leading-snug font-semibold text-[#10173a]">{i === 0 ? `New bet from ${name}` : it.t}</div>
            <div className="text-[12.5px] text-[#545c80]">{i === 0 ? it.t : it.p}</div>
            {i === 0 && <div className="mt-0.5 text-[13px] font-semibold text-[#10173a]">{it.p}</div>}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

/** White card on the blue section: the month's biggest win. */
export function ArtBigWin({ amount }: { amount: number | null }) {
  const { ref, inView } = useLoop(9999, 1);
  const coins = [
    { x: "12%", y: "18%", s: 46, d: 0 },
    { x: "70%", y: "8%", s: 36, d: 0.4 },
    { x: "78%", y: "52%", s: 52, d: 0.8 },
    { x: "8%", y: "60%", s: 30, d: 1.2 },
  ];
  return (
    <div ref={ref} className="absolute inset-0">
      {coins.map((c, i) => (
        <motion.span key={i} className="absolute flex items-center justify-center rounded-full bg-[radial-gradient(circle_at_35%_30%,#f1ffb8,#d4ff4f_55%,#a9d51f)] font-bold text-[#10173a] shadow-[0_8px_18px_-6px_rgba(16,23,58,.35)]" style={{ left: c.x, top: c.y, width: c.s, height: c.s, fontSize: c.s * 0.45 }} animate={{ y: [0, -10, 0], rotate: [0, 12, 0] }} transition={{ duration: 3, repeat: Infinity, delay: c.d, ease: "easeInOut" }}>
          $
        </motion.span>
      ))}
      <div className="absolute inset-x-0 bottom-8 text-center">
        <div className="display num text-[56px] leading-none text-[#0a7f4c]">{amount ? <Count to={amount} format={(n) => `+${formatUsd(n)}`} run={inView} /> : "—"}</div>
        <div className="mt-2 text-[14px] font-medium text-[#545c80]">won in the last 30 days</div>
      </div>
      <div className="absolute bottom-[38%] left-1/2 -translate-x-1/2">
        <Mascot size={84} animate />
      </div>
    </div>
  );
}

/** Coral card: tilted market stickers. */
export function ArtMarkets() {
  const { ref, inView } = useLoop(9999, 1);
  const stickers = [
    { t: "Moneyline", x: "6%", y: "8%", r: -10, s: "football" },
    { t: "Spread", x: "46%", y: "4%", r: 8, s: "basketball" },
    { t: "Over / Under", x: "18%", y: "34%", r: 6, s: "soccer" },
    { t: "Live", x: "60%", y: "36%", r: -8, s: "tennis" },
    { t: "Props", x: "8%", y: "62%", r: -4, s: "baseball" },
    { t: "Futures", x: "48%", y: "66%", r: 10, s: "hockey" },
  ];
  return (
    <div ref={ref} className="absolute inset-0">
      {stickers.map((s, i) => (
        <motion.span
          key={s.t}
          className="absolute flex items-center gap-1.5 rounded-full bg-white px-3.5 py-2 text-[15px] font-semibold whitespace-nowrap text-[#10173a] shadow-[0_10px_24px_-10px_rgba(0,0,0,.35)]"
          style={{ left: s.x, top: s.y }}
          initial={{ scale: 0, rotate: 0 }}
          animate={inView ? { scale: 1, rotate: s.r, y: [0, -6, 0] } : {}}
          transition={{ scale: { type: "spring", stiffness: 260, damping: 14, delay: 0.1 + i * 0.08 }, rotate: { delay: 0.1 + i * 0.08 }, y: { duration: 3 + (i % 3), repeat: Infinity, ease: "easeInOut", delay: i * 0.3 } }}
        >
          <SportIcon sport={s.s} size={16} />
          {s.t}
        </motion.span>
      ))}
    </div>
  );
}

/** Lavender card: a bet slip at "your bookmaker". */
export function ArtSlip({ alert }: { alert: PhoneAlert | null }) {
  const { ref, step } = useLoop(1400, 4);
  const a = alert ?? { league: "nba", title: "Lakers vs. Celtics", outcome: "Lakers", price: 0.47, usd: 2500 };
  const odds = Number(formatOdds(a.price)) || 2;
  return (
    <div ref={ref} className="absolute inset-0 flex items-end justify-center p-5">
      <motion.div initial={{ y: 30, rotate: -3 }} animate={{ y: 0, rotate: -3 }} className="w-full rounded-[22px] bg-white p-4 text-[#10173a] shadow-[0_20px_40px_-18px_rgba(16,23,58,.45)]">
        <div className="flex items-center justify-between text-[12px] font-semibold text-[#8a91ad]">
          <span>YOUR BOOKMAKER</span>
          <span>Bet slip</span>
        </div>
        <div className="mt-2 text-[15px] font-semibold">{a.outcome}</div>
        <div className="truncate text-[12.5px] text-[#545c80]">
          {leagueLabel(a.league)} · {a.title}
        </div>
        <div className="mt-3 grid grid-cols-3 gap-1.5 text-center">
          <div className="rounded-xl bg-[#f1f4ff] py-2">
            <div className="text-[10.5px] text-[#8a91ad]">Odds</div>
            <div className="text-[15px] font-semibold">{odds.toFixed(2)}</div>
          </div>
          <div className="rounded-xl bg-[#f1f4ff] py-2">
            <div className="text-[10.5px] text-[#8a91ad]">Stake</div>
            <div className="text-[15px] font-semibold">$100</div>
          </div>
          <div className="rounded-xl bg-[#dbf6e9] py-2">
            <div className="text-[10.5px] text-[#0a7f4c]">To win</div>
            <div className="text-[15px] font-semibold text-[#0a7f4c]">${Math.round(100 * odds)}</div>
          </div>
        </div>
        <motion.div animate={step === 3 ? { scale: [1, 0.96, 1] } : {}} className={clsx("mt-3 flex h-11 items-center justify-center rounded-full text-[14px] font-semibold transition-colors duration-500", step === 3 ? "bg-[#0fa968] text-white" : "bg-[#1652f0] text-white")}>
          {step === 3 ? "Bet placed ✓" : "Place bet"}
        </motion.div>
      </motion.div>
    </div>
  );
}

/** Lime card: a ring that fills in seconds. */
export function ArtSpeed() {
  const { ref, step } = useLoop(1000, 4);
  const pct = [0.15, 0.5, 0.85, 1][step];
  const C = 2 * Math.PI * 70;
  return (
    <div ref={ref} className="absolute inset-0 flex items-center justify-center">
      <svg width="190" height="190" viewBox="0 0 170 170" className="-rotate-90">
        <circle cx="85" cy="85" r="70" fill="none" stroke="rgba(16,23,58,.12)" strokeWidth="14" />
        <motion.circle cx="85" cy="85" r="70" fill="none" stroke="#1652f0" strokeWidth="14" strokeLinecap="round" strokeDasharray={C} animate={{ strokeDashoffset: C * (1 - pct) }} transition={{ duration: 0.9, ease: EASE }} />
      </svg>
      <div className="absolute text-center">
        <div className="display text-[48px] leading-none">{step + 1}s</div>
        <div className="mt-1 text-[12.5px] font-medium opacity-60">their bet → your phone</div>
      </div>
    </div>
  );
}
