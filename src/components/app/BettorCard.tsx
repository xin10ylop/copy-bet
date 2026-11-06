"use client";
import Link from "next/link";
import { motion } from "motion/react";
import clsx from "clsx";
import { Avatar } from "../ui/Avatar";
import { SportIcon } from "../SportIcon";
import { formatPct, formatUsd } from "@/lib/filters";
import { sportLabel } from "@/lib/sports";
import { useFollowing } from "./MeProvider";

export interface BettorRowData {
  address: string;
  name: string;
  profileImage: string | null;
  bets: number;
  winRate: number;
  profit: number;
  roi: number;
  followers: number;
  openCount: number;
  topSports: { sport: string; share: number }[];
}

export function BettorCard({ b, rank, href, index = 0 }: { b: BettorRowData; rank: number; href: string; index?: number }) {
  const following = useFollowing(b.address);
  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(index, 8) * 0.035, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}>
      <Link href={href} className="press block rounded-[28px] bg-surface p-4 active:bg-surface-2 sm:p-5">
        <div className="flex items-center gap-3">
          <div className="relative">
            <Avatar address={b.address} src={b.profileImage} name={b.name} size={48} />
            <span className="num absolute -bottom-1 -left-1 flex h-6 min-w-6 items-center justify-center rounded-full bg-ink px-1.5 text-[11px] font-bold text-bg ring-2 ring-surface">{rank}</span>
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <span className="truncate text-[17px] font-semibold">{b.name}</span>
              {following && <span className="shrink-0 rounded-full bg-brand-soft px-2 py-0.5 text-[11px] font-semibold text-brand">Following</span>}
            </div>
            <div className="mt-1 flex items-center gap-1.5 overflow-hidden">
              {b.topSports.slice(0, 2).map((s, i) => (
                <span key={s.sport} className={clsx("min-w-0 items-center gap-1 rounded-full bg-surface-2 py-0.5 pr-2 pl-1.5 text-[12px] font-medium text-ink-2", i === 0 ? "inline-flex shrink-0" : "hidden min-[400px]:inline-flex")}>
                  <SportIcon sport={s.sport} size={13} />
                  <span className="truncate">
                    {sportLabel(s.sport)} {Math.round(s.share * 100)}%
                  </span>
                </span>
              ))}
              {b.openCount > 0 && (
                <span className="inline-flex shrink-0 items-center gap-1 text-[12px] font-medium text-win">
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-win opacity-60" />
                    <span className="relative h-1.5 w-1.5 rounded-full bg-win" />
                  </span>
                  {b.openCount} live
                </span>
              )}
            </div>
          </div>
          <div className="text-right">
            <div className={clsx("num text-[22px] font-semibold tracking-tight", b.roi >= 0 ? "text-win" : "text-loss")}>{formatPct(b.roi)}</div>
            <div className="text-[12px] font-medium text-ink-3">ROI</div>
          </div>
        </div>
        <div className="mt-4 grid grid-cols-4 gap-1 rounded-2xl bg-surface-2/70 p-2.5 text-center">
          <Stat label="Profit" value={formatUsd(b.profit)} tone={b.profit >= 0 ? "win" : "loss"} />
          <Stat label="Win rate" value={`${b.winRate.toFixed(0)}%`} />
          <Stat label="Bets" value={b.bets.toLocaleString("en-US")} />
          <Stat label="Copying" value={b.followers.toLocaleString("en-US")} />
        </div>
      </Link>
    </motion.div>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: "win" | "loss" }) {
  return (
    <div>
      <div className={clsx("num text-[15px] font-semibold", tone === "win" && "text-win", tone === "loss" && "text-loss")}>{value}</div>
      <div className="text-[11px] font-medium text-ink-3">{label}</div>
    </div>
  );
}

export function BettorCardSkeleton() {
  return (
    <div className="rounded-[28px] bg-surface p-4 sm:p-5">
      <div className="flex items-center gap-3">
        <div className="h-12 w-12 animate-pulse rounded-full bg-surface-2" />
        <div className="flex-1 space-y-2">
          <div className="h-4 w-32 animate-pulse rounded-full bg-surface-2" />
          <div className="h-3 w-44 animate-pulse rounded-full bg-surface-2" />
        </div>
        <div className="h-6 w-16 animate-pulse rounded-full bg-surface-2" />
      </div>
      <div className="mt-4 h-14 animate-pulse rounded-2xl bg-surface-2" />
    </div>
  );
}
