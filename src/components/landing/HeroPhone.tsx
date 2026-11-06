"use client";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";
import clsx from "clsx";
import { Avatar } from "../ui/Avatar";
import { SportIcon } from "../SportIcon";
import { LogoMark } from "../Logo";
import { formatOdds, formatPct, formatUsd } from "@/lib/filters";
import { leagueLabel, sportLabel } from "@/lib/sports";

export interface PhoneBettor {
  address: string;
  name: string;
  profileImage: string | null;
  roi: number;
  profit: number;
  winRate: number;
  bets: number;
  sport: string;
}

export interface PhoneAlert {
  league: string;
  title: string;
  outcome: string;
  price: number;
  usd: number;
}

export interface PhoneCompare {
  sport: string;
  sportRoi: number;
  otherRoi: number;
  sportBets: number;
}

const EASE = [0.22, 1, 0.36, 1] as const;
// How long each screen of the demo stays up (ms): discover, profile, follow, alert.
const DURATIONS = [3600, 3600, 2800, 3800];

/** A phone running a short, looping tour of the app with real data. */
export function HeroPhone({ bettors, alert, compare }: { bettors: PhoneBettor[]; alert: PhoneAlert | null; compare: PhoneCompare | null }) {
  const [step, setStep] = useState(0);
  useEffect(() => {
    const t = setTimeout(() => setStep((s) => (s + 1) % DURATIONS.length), DURATIONS[step]);
    return () => clearTimeout(t);
  }, [step]);

  const star = bettors[0];
  if (!star) return null;

  return (
    <div className="relative mx-auto h-[560px] w-[278px] rounded-[50px] bg-[#16161a] p-[10px] shadow-[0_50px_100px_-30px_rgba(22,82,240,.45),0_30px_60px_-30px_rgba(0,0,0,.4)] sm:h-[600px] sm:w-[296px]">
      <div className="absolute top-[18px] left-1/2 z-30 h-[26px] w-[92px] -translate-x-1/2 rounded-full bg-[#16161a]" />
      <div className="relative h-full overflow-hidden rounded-[41px] bg-[#f4f6ff] text-[#10173a]">
        {/* status bar */}
        <div className="flex items-center justify-between px-7 pt-4 text-[12px] font-semibold">
          <span>9:41</span>
          <span className="flex items-center gap-1">
            <span className="h-2.5 w-4 rounded-[3px] border border-[#10173a]/70" />
          </span>
        </div>

        <AnimatePresence mode="popLayout" initial={false}>
          {step === 0 && <Discover key="d" bettors={bettors} />}
          {(step === 1 || step === 3) && <Profile key="p" b={star} cmp={compare} dim={step === 3} />}
          {step === 2 && <Follow key="f" b={star} sport={compare?.sport ?? star.sport} />}
        </AnimatePresence>

        {/* tap indicator */}
        <AnimatePresence>
          {step === 0 && <Tap key="t0" x={130} y={196} delay={2.6} />}
          {step === 1 && <Tap key="t1" x={130} y={500} delay={2.7} />}
        </AnimatePresence>

        {/* notification */}
        <AnimatePresence>
          {step === 3 && alert && (
            <motion.div
              key="n"
              initial={{ y: -120, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -120, opacity: 0 }}
              transition={{ type: "spring", stiffness: 260, damping: 24, delay: 0.35 }}
              className="absolute inset-x-2.5 top-11 z-20 rounded-[22px] bg-white/90 p-3 shadow-[0_18px_40px_-12px_rgba(16,23,58,.35)] backdrop-blur-xl"
            >
              <div className="flex items-center gap-2 text-[11px] text-[#545c80]">
                <LogoMark size={18} />
                <span className="font-semibold text-[#10173a]">CopyBet</span>
                <span className="ml-auto">now</span>
              </div>
              <div className="mt-1.5 text-[13px] leading-snug font-semibold">New bet from {star.name}</div>
              <div className="text-[12px] leading-snug text-[#545c80]">
                {leagueLabel(alert.league)} · {alert.title}
              </div>
              <div className="mt-0.5 text-[12.5px] font-semibold">
                {alert.outcome} @ {formatOdds(alert.price)} · {formatUsd(alert.usd)}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

function Screen({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <motion.div initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -40 }} transition={{ duration: 0.45, ease: EASE }} className={clsx("absolute inset-x-0 top-10 bottom-0 px-3.5 pt-3", className)}>
      {children}
    </motion.div>
  );
}

function Discover({ bettors }: { bettors: PhoneBettor[] }) {
  return (
    <Screen>
      <div className="text-[22px] leading-tight font-semibold tracking-[-0.03em]">Top bettors</div>
      <div className="mt-0.5 text-[11px] text-[#545c80]">Ranked by real results · last 30 days</div>
      <div className="mt-3 flex gap-1.5 overflow-hidden">
        {["All", "Football", "Basketball", "Soccer"].map((c, i) => (
          <span key={c} className={clsx("shrink-0 rounded-full px-3 py-1.5 text-[11px] font-semibold", i === 0 ? "bg-[#10173a] text-white" : "bg-white")}>
            {c}
          </span>
        ))}
      </div>
      <div className="mt-3 space-y-2">
        {bettors.slice(0, 4).map((b, i) => (
          <motion.div key={b.address} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 + i * 0.08, duration: 0.5, ease: EASE }} className="rounded-[18px] bg-white p-2.5">
            <div className="flex items-center gap-2">
              <Avatar address={b.address} src={b.profileImage} name={b.name} size={30} />
              <div className="min-w-0 flex-1">
                <div className="truncate text-[12.5px] font-semibold">{b.name}</div>
                <div className="flex items-center gap-1 text-[10px] text-[#545c80]">
                  <SportIcon sport={b.sport} size={11} /> {sportLabel(b.sport)} · {b.bets} bets
                </div>
              </div>
              <div className="text-right">
                <div className="text-[14px] font-semibold text-[#0fa968]">{formatPct(b.roi)}</div>
                <div className="text-[9.5px] text-[#8a91ad]">ROI</div>
              </div>
            </div>
            <div className="mt-2 flex justify-between rounded-xl bg-[#f4f6ff] px-2.5 py-1.5 text-[10px]">
              <span>
                <b className="text-[#0fa968]">{formatUsd(b.profit)}</b> profit
              </span>
              <span>
                <b>{b.winRate.toFixed(0)}%</b> wins
              </span>
            </div>
          </motion.div>
        ))}
      </div>
    </Screen>
  );
}

function Profile({ b, cmp, dim }: { b: PhoneBettor; cmp: PhoneCompare | null; dim: boolean }) {
  return (
    <Screen className={clsx("transition-[filter] duration-500", dim && "blur-[1.5px] brightness-[.97]")}>
      <div className="flex items-center gap-2.5">
        <Avatar address={b.address} src={b.profileImage} name={b.name} size={44} />
        <div className="min-w-0">
          <div className="truncate text-[17px] font-semibold tracking-[-0.02em]">{b.name}</div>
          <div className="text-[10.5px] text-[#545c80]">{b.bets} settled bets</div>
        </div>
      </div>
      {cmp && (
      <div className="mt-3 overflow-hidden rounded-[18px] bg-white">
        <div className="grid grid-cols-2 text-[10.5px] font-semibold">
          <div className="bg-[#1652F0] px-3 py-2 text-white">{sportLabel(cmp.sport)} only</div>
          <div className="bg-[#ebeffd] px-3 py-2">Everything else</div>
        </div>
        <div className="grid grid-cols-2">
          <div className="px-3 py-2.5">
            <div className="text-[9.5px] text-[#8a91ad]">ROI</div>
            <div className="text-[20px] font-semibold text-[#0fa968]">{formatPct(cmp.sportRoi)}</div>
          </div>
          <div className="bg-[#f4f6ff] px-3 py-2.5">
            <div className="text-[9.5px] text-[#8a91ad]">ROI</div>
            <div className={clsx("text-[20px] font-semibold", cmp.otherRoi >= 0 ? "text-[#10173a]" : "text-[#e8435f]")}>{formatPct(cmp.otherRoi)}</div>
          </div>
        </div>
      </div>
      )}
      <div className="mt-2 grid grid-cols-3 gap-1.5">
        {[
          ["Profit", formatUsd(b.profit), b.profit >= 0],
          ["Win rate", `${b.winRate.toFixed(0)}%`, null],
          ["Bets", b.bets.toLocaleString("en-US"), null],
        ].map(([k, v, up]) => (
          <div key={k as string} className="rounded-[14px] bg-white px-2 py-2">
            <div className={clsx("text-[13px] font-semibold", up === true && "text-[#0fa968]", up === false && "text-[#e8435f]")}>{v}</div>
            <div className="text-[9.5px] text-[#8a91ad]">{k}</div>
          </div>
        ))}
      </div>
      {cmp && (
        <>
      <div className="mt-3 text-[12px] font-semibold">Sports they win at</div>
      <div className="mt-1.5 space-y-1.5">
        {[
          [cmp.sport, cmp.sportRoi, 1],
          ["other", cmp.otherRoi, 0.45],
        ].map(([s, roi, w]) => (
          <div key={s as string} className="flex items-center gap-2 rounded-[14px] bg-white p-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-[#ebeffd]">
              <SportIcon sport={s as string} size={15} />
            </span>
            <div className="flex-1">
              <div className="flex justify-between text-[11px] font-semibold">
                <span>{s === "other" ? "Other sports" : sportLabel(s as string)}</span>
                <span className={(roi as number) >= 0 ? "text-[#0fa968]" : "text-[#e8435f]"}>{formatPct(roi as number)}</span>
              </div>
              <div className="mt-1 h-1 overflow-hidden rounded-full bg-[#ebeffd]">
                <motion.div initial={{ width: 0 }} animate={{ width: `${(w as number) * 100}%` }} transition={{ duration: 0.9, delay: 0.3, ease: EASE }} className={clsx("h-full rounded-full", (roi as number) >= 0 ? "bg-[#0fa968]" : "bg-[#e8435f]")} />
              </div>
            </div>
          </div>
        ))}
      </div>
        </>
      )}
      <div className="absolute inset-x-3.5 bottom-4 flex h-11 items-center justify-center rounded-full bg-[#1652F0] text-[13px] font-semibold text-white shadow-[0_10px_24px_-10px_rgba(22,82,240,.7)]">Follow {b.name.length > 14 ? "" : b.name}</div>
    </Screen>
  );
}

function Follow({ b, sport }: { b: PhoneBettor; sport: string }) {
  const [done, setDone] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setDone(true), 1500);
    return () => clearTimeout(t);
  }, []);
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 z-10 bg-[#0b0b10]/30">
      <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} transition={{ type: "spring", stiffness: 300, damping: 32 }} className="absolute inset-x-0 bottom-0 rounded-t-[28px] bg-[#f4f6ff] px-4 pt-3 pb-5">
        <div className="mx-auto h-1 w-9 rounded-full bg-[#dfe5fb]" />
        <AnimatePresence mode="wait">
          {!done ? (
            <motion.div key="r" exit={{ opacity: 0 }}>
              <div className="mt-3 text-[16px] font-semibold">Follow {b.name}</div>
              <div className="text-[11px] text-[#545c80]">Which of their bets do you want?</div>
              <div className="mt-3 grid grid-cols-2 gap-1.5">
                <div className="rounded-[14px] bg-white p-2.5 text-[11px] font-semibold">Everything</div>
                <div className="rounded-[14px] bg-[#dce3ff] p-2.5 text-[11px] font-semibold ring-2 ring-[#1652F0]">Only some</div>
              </div>
              <div className="mt-2.5 flex gap-1.5">
                <span className="flex items-center gap-1 rounded-full bg-[#10173a] px-2.5 py-1 text-[10.5px] font-semibold text-white">
                  <SportIcon sport={sport} size={12} /> {sportLabel(sport)} ✕
                </span>
                <span className="rounded-full bg-white px-2.5 py-1 text-[10.5px] font-semibold">$500+</span>
              </div>
              <div className="mt-3 flex h-10 items-center justify-center rounded-full bg-[#1652F0] text-[12.5px] font-semibold text-white">Follow these bets</div>
            </motion.div>
          ) : (
            <motion.div key="d" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="py-4 text-center">
              <motion.div initial={{ scale: 0.4, rotate: -20 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: "spring", stiffness: 260, damping: 14 }} className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#D4FF4F]">
                <svg width="26" height="26" viewBox="0 0 16 16" aria-hidden>
                  <path d="M3.5 8.5l3 3 6-7" stroke="#10173a" strokeWidth="2.2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </motion.div>
              <div className="mt-2.5 text-[15px] font-semibold">You&apos;re following {b.name}</div>
              <div className="text-[11px] text-[#545c80]">Their bets come straight to your phone</div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  );
}

function Tap({ x, y, delay }: { x: number; y: number; delay: number }) {
  return (
    <motion.span
      className="pointer-events-none absolute z-40 h-9 w-9 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#10173a]/25 ring-4 ring-white/70"
      style={{ left: x, top: y }}
      initial={{ opacity: 0, scale: 1.4 }}
      animate={{ opacity: [0, 1, 1, 0], scale: [1.4, 1, 0.85, 1.2] }}
      exit={{ opacity: 0 }}
      transition={{ delay, duration: 0.8, times: [0, 0.3, 0.6, 1] }}
    />
  );
}
