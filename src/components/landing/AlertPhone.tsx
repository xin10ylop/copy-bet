"use client";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";
import { LogoMark } from "../Logo";
import { formatUsd } from "@/lib/filters";
import { leagueLabel } from "@/lib/sports";

export interface HeroAlert {
  name: string;
  league: string;
  title: string;
  outcome: string;
  price: number;
  usd: number;
  roi: number;
}

/** Phone showing Telegram-style alerts landing one after another (real recent bets). */
export function AlertPhone({ alerts }: { alerts: HeroAlert[] }) {
  const [n, setN] = useState(1);
  useEffect(() => {
    if (alerts.length < 2) return;
    const t = setInterval(() => setN((v) => (v >= alerts.length ? 1 : v + 1)), 2600);
    return () => clearInterval(t);
  }, [alerts.length]);
  const shown = alerts.slice(0, n).reverse().slice(0, 4);

  return (
    <div className="relative mx-auto h-[520px] w-[280px] rounded-[48px] bg-[#05071a] p-3 shadow-[0_40px_80px_-24px_rgba(0,0,0,.6)] ring-1 ring-white/10 sm:h-[580px] sm:w-[300px]">
      <div className="absolute top-3 left-1/2 z-10 h-7 w-28 -translate-x-1/2 rounded-full bg-[#05071a]" />
      <div className="relative h-full overflow-hidden rounded-[38px] bg-[#e9edf9]">
        <div className="flex items-center gap-2 bg-white/90 px-4 pt-12 pb-3 backdrop-blur">
          <LogoMark size={34} />
          <div>
            <div className="text-[14px] font-semibold text-[#10173a]">CopyBet Alerts</div>
            <div className="text-[11px] text-[#3A5BFF]">bot · online</div>
          </div>
        </div>
        <div className="flex flex-col gap-2.5 p-3">
          <AnimatePresence initial={false} mode="popLayout">
            {shown.map((a, i) => (
              <motion.div
                key={`${a.name}-${a.title}-${alerts.indexOf(a)}`}
                layout
                initial={{ opacity: 0, y: -30, scale: 0.9 }}
                animate={{ opacity: i === 0 ? 1 : 0.9 - i * 0.12, y: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ type: "spring", stiffness: 300, damping: 28 }}
                className="rounded-[18px] rounded-tl-md bg-white p-3 text-[12.5px] leading-snug text-[#10173a] shadow-sm"
              >
                <div className="mb-1 flex items-center gap-1.5 font-semibold">
                  <span className="h-2 w-2 rounded-full bg-[#0fa968]" />
                  New bet · {a.name}
                </div>
                <div className="text-[#545c80]">
                  {leagueLabel(a.league)} · {a.title}
                </div>
                <div className="mt-1 font-semibold">
                  {a.outcome} @ {Math.round(a.price * 100)}¢ · {formatUsd(a.usd)}
                </div>
                <div className="mt-1 text-[11px] text-[#0fa968]">
                  {a.roi >= 0 ? "+" : ""}
                  {a.roi.toFixed(1)}% ROI (30d)
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
