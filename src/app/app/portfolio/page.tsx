"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import clsx from "clsx";
import { useMe } from "@/components/app/MeProvider";
import { Avatar } from "@/components/ui/Avatar";
import { Segmented } from "@/components/ui/Segmented";
import { ButtonLink } from "@/components/ui/Button";
import { SportIcon } from "@/components/SportIcon";
import { TIMINGS, formatOdds, formatUsd } from "@/lib/filters";
import { leagueLabel, sportLabel } from "@/lib/sports";

interface FeedItem {
  id: string;
  address: string;
  name: string;
  profileImage: string | null;
  side: "BUY" | "SELL";
  title: string;
  outcome: string;
  price: number;
  usd: number;
  sport: string;
  league: string;
  eventSlug: string;
  timestamp: number;
}

export default function PortfolioPage() {
  const { me, refresh } = useMe();
  const [tab, setTab] = useState<"feed" | "bettors">("feed");
  const [feed, setFeed] = useState<FeedItem[] | null>(null);
  const follows = me?.follows ?? [];

  useEffect(() => {
    let live = true;
    const load = () =>
      fetch("/api/feed")
        .then((r) => r.json())
        .then((d) => live && setFeed(d.items));
    load();
    const t = setInterval(load, 15_000);
    return () => {
      live = false;
      clearInterval(t);
    };
  }, [follows.length]);

  const mute = async (address: string, hours: number) => {
    await fetch("/api/follow", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ address, hours }) });
    refresh();
  };

  if (me && follows.length === 0) {
    return (
      <div>
        <h1 className="display pt-6 text-[40px] sm:text-[48px]">Portfolio</h1>
        <div className="mt-8 rounded-[32px] bg-surface p-8 text-center">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-brand-soft">
            <svg width="34" height="34" viewBox="0 0 24 24" className="text-brand" aria-hidden>
              <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
            </svg>
          </div>
          <h2 className="title mt-5 text-[24px]">Your portfolio is empty</h2>
          <p className="mx-auto mt-2 max-w-[320px] text-[16px] text-ink-2">Follow the bettors you trust. Their bets show up here and in your Telegram.</p>
          <ButtonLink href="/app" size="lg" className="mt-6">
            Find bettors
          </ButtonLink>
        </div>
      </div>
    );
  }

  return (
    <div>
      <h1 className="display pt-6 text-[40px] sm:text-[48px]">Portfolio</h1>
      <p className="mt-2 text-[16px] text-ink-2">
        {follows.length} bettor{follows.length === 1 ? "" : "s"}
        {me?.limits.follows ? ` of ${me.limits.follows} on Free` : ""} · {me?.user?.telegram ? "alerts on" : "alerts off"}
      </p>

      {!me?.user?.telegram && (
        <Link href="/app/account" className="press mt-4 flex items-center justify-between rounded-[22px] bg-[#2AABEE] p-4 text-white">
          <span>
            <span className="block text-[16px] font-semibold">Connect Telegram</span>
            <span className="text-[14px] text-white/80">Get their bets on your phone</span>
          </span>
          <span className="text-[22px]">→</span>
        </Link>
      )}

      <Segmented
        value={tab}
        onChange={setTab}
        className="mt-5 w-full"
        options={[
          { key: "feed", label: "Live feed" },
          { key: "bettors", label: `Bettors (${follows.length})` },
        ]}
      />

      <AnimatePresence mode="wait">
        {tab === "feed" ? (
          <motion.div key="feed" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="mt-4 space-y-2">
            {feed === null ? (
              Array.from({ length: 4 }, (_, i) => <div key={i} className="h-24 animate-pulse rounded-[22px] bg-surface" />)
            ) : feed.length === 0 ? (
              <div className="rounded-[22px] bg-surface p-6 text-center text-ink-3">No sports bets from your bettors yet. New ones appear here live.</div>
            ) : (
              <AnimatePresence initial={false}>
                {feed.map((it) => (
                  <motion.div layout key={it.id} initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} className="flex gap-3 rounded-[22px] bg-surface p-4">
                    <Avatar address={it.address} src={it.profileImage} name={it.name} size={40} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="truncate text-[15px] font-semibold">{it.name}</span>
                        <span className="shrink-0 text-[12px] text-ink-3">{ago(it.timestamp)}</span>
                      </div>
                      <div className="mt-0.5 flex items-center gap-1.5 text-[13px] text-ink-3">
                        <SportIcon sport={it.sport} size={14} /> {leagueLabel(it.league)} · <span className="truncate">{it.title}</span>
                      </div>
                      <div className="mt-1.5 flex items-center gap-2">
                        <span className={clsx("rounded-full px-2 py-0.5 text-[11px] font-bold", it.side === "BUY" ? "bg-win-soft text-win" : "bg-loss-soft text-loss")}>{it.side === "BUY" ? "BOUGHT" : "SOLD"}</span>
                        <span className="text-[15px] font-semibold">
                          {it.outcome} @ {formatOdds(it.price)}
                        </span>
                        <span className="num ml-auto text-[15px] font-semibold">{formatUsd(it.usd)}</span>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            )}
          </motion.div>
        ) : (
          <motion.div key="bettors" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="mt-4 space-y-2">
            {follows.map((f) => {
              const muted = f.mutedUntil && new Date(f.mutedUntil) > new Date();
              const rules = f.mode === "all" ? ["Every bet"] : [...f.sports.map(sportLabel), ...f.timing.map((t) => TIMINGS.find((x) => x.key === t)?.label ?? t), ...(f.minSize ? [`${formatUsd(f.minSize)}+`] : [])];
              return (
                <div key={f.address} className="rounded-[22px] bg-surface p-4">
                  <Link href={`/app/bettor/${f.address}${f.mode === "custom" && f.sports.length ? `?s=${f.sports.join(",")}` : ""}`} className="flex items-center gap-3">
                    <Avatar address={f.address} src={f.profileImage} name={f.name} size={44} />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[16px] font-semibold">{f.name}</div>
                      <div className="mt-1 flex flex-wrap gap-1">
                        {rules.map((r) => (
                          <span key={r} className="rounded-full bg-surface-2 px-2 py-0.5 text-[12px] font-medium text-ink-2">
                            {r}
                          </span>
                        ))}
                        {f.includeSells && <span className="rounded-full bg-surface-2 px-2 py-0.5 text-[12px] font-medium text-ink-2">+ sells</span>}
                      </div>
                    </div>
                    <span className="text-ink-3">›</span>
                  </Link>
                  <div className="mt-3 flex gap-2">
                    <button onClick={() => mute(f.address, muted ? 0 : 24)} className={clsx("press h-9 flex-1 rounded-full text-[13px] font-semibold", muted ? "bg-lime text-[#10173a]" : "bg-surface-2")}>
                      {muted ? "Muted · unmute" : "Mute 24h"}
                    </button>
                    <Link href={`/app/bettor/${f.address}`} className="press flex h-9 flex-1 items-center justify-center rounded-full bg-surface-2 text-[13px] font-semibold">
                      Edit alerts
                    </Link>
                  </div>
                </div>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function ago(ts: number) {
  const s = Math.max(1, Math.floor(Date.now() / 1000 - ts));
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}
