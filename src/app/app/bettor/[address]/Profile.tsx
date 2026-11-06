"use client";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import clsx from "clsx";
import { Avatar } from "@/components/ui/Avatar";
import { Segmented } from "@/components/ui/Segmented";
import { Ticker } from "@/components/ui/Ticker";
import { Button } from "@/components/ui/Button";
import { SportIcon } from "@/components/SportIcon";
import { FollowSheet } from "@/components/app/FollowSheet";
import { useFollowing } from "@/components/app/MeProvider";
import { type BettorStats, type TimingKey, TIMEFRAMES, TIMINGS, describeFilter, filterToParams, formatLead, formatOdds, formatPct, formatUsd, paramsToFilter } from "@/lib/filters";
import { leagueLabel, sportLabel } from "@/lib/sports";
import type { BettorProfile } from "@/lib/server/stats";

type Data = BettorProfile;

export function Profile({ address }: { address: string }) {
  const sp = useSearchParams();
  const router = useRouter();
  const filter = useMemo(() => paramsToFilter(sp), [sp]);
  const key = filterToParams(filter).toString();
  const [data, setData] = useState<Data | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [scope, setScope] = useState<"filter" | "all">("filter");
  const [followOpen, setFollowOpen] = useState(false);
  const following = useFollowing(address);

  useEffect(() => {
    let live = true;
    fetch(`/api/bettors/${address}?${key}`)
      .then(async (r) => {
        if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error ?? "Couldn't load this bettor");
        return r.json();
      })
      .then((d) => live && setData(d))
      .catch((e) => live && setError(e.message));
    return () => {
      live = false;
    };
  }, [address, key]);

  const setParams = (patch: Record<string, string | null>) => {
    const p = new URLSearchParams(sp);
    for (const [k, v] of Object.entries(patch)) {
      if (v === null) p.delete(k);
      else p.set(k, v);
    }
    router.replace(`/app/bettor/${address}${p.toString() ? `?${p}` : ""}`, { scroll: false });
  };

  if (error) return <ErrorState message={error} />;
  if (!data) return <ProfileSkeleton />;

  const narrowed = data.narrowed;
  const view = narrowed && scope === "filter" ? data.filtered : data.everything;
  const filterChips = describeFilter({ ...filter, roi: {}, winRate: {}, profit: {}, bets: {}, followers: {}, hasOpen: false }, sportLabel);
  const scopeSports = narrowed && scope === "filter" ? filter.sports : [];
  const scopeTiming = narrowed && scope === "filter" ? filter.timing : [];
  const positions = data.positions.filter((p) => (!scopeSports.length || scopeSports.includes(p.sport as never)) && (!scopeTiming.length || scopeTiming.includes(p.timing as TimingKey)));
  const recent = data.recent.filter((p) => (!scopeSports.length || scopeSports.includes(p.sport as never)) && (!scopeTiming.length || scopeTiming.includes(p.timing as TimingKey)));

  return (
    <div className="pb-24">
      {/* Top bar */}
      <div className="flex items-center justify-between pt-2">
        <button onClick={() => (history.length > 1 ? router.back() : router.push(`/app?${key}`))} aria-label="Back" className="press flex h-11 w-11 items-center justify-center rounded-full bg-surface">
          <svg width="20" height="20" viewBox="0 0 20 20" aria-hidden>
            <path d="M12 4 6 10l6 6" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <ShareButton name={data.bettor.name} />
      </div>

      {/* Identity */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }} className="mt-5 flex items-center gap-4">
        <Avatar address={data.bettor.address} src={data.bettor.profileImage} name={data.bettor.name} size={72} />
        <div className="min-w-0">
          <h1 className="title truncate text-[28px] leading-tight">{data.bettor.name}</h1>
          <div className="mt-1.5 text-[14px] font-medium text-ink-2">
            <span className="num font-semibold text-ink">{data.followers}</span> copying on CopyBet
          </div>
        </div>
      </motion.div>

      {data.bettor.isMarketMaker && <div className="mt-4 rounded-2xl bg-loss-soft px-4 py-3 text-[14px] text-loss">This bettor often bets both sides of the same game, so their record may not be worth copying.</div>}

      {/* Timeframe */}
      <div className="mt-6">
        <Segmented value={filter.timeframe} onChange={(tf) => setParams({ tf: tf === "30d" ? null : tf })} options={TIMEFRAMES.map((t) => ({ key: t.key, label: t.long }))} className="w-full" />
      </div>

      {/* Your filter vs everything */}
      {narrowed ? (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.05 }} className="mt-3 overflow-hidden rounded-[28px] bg-surface">
          <div className="grid grid-cols-[1fr_1fr] text-[13px] font-semibold">
            <div className="bg-brand px-4 pt-4 pb-3 text-white">
              Your filter
              <div className="mt-1 truncate text-[12px] font-medium text-white/75">{filterChips.join(" · ")}</div>
            </div>
            <div className="bg-surface-2 px-4 pt-4 pb-3 text-ink">
              Everything
              <div className="mt-1 text-[12px] font-medium text-ink-3">All their sports</div>
            </div>
          </div>
          <CompareRow label="ROI" a={data.filtered.roi} b={data.everything.roi} fmt={(n) => formatPct(n)} colored />
          <CompareRow label="Win rate" a={data.filtered.winRate} b={data.everything.winRate} fmt={(n) => `${n.toFixed(0)}%`} />
          <CompareRow label="Profit" a={data.filtered.profit} b={data.everything.profit} fmt={(n) => formatUsd(n)} colored />
          <CompareRow label="Bets" a={data.filtered.bets} b={data.everything.bets} fmt={(n) => Math.round(n).toLocaleString("en-US")} neutral last />
        </motion.div>
      ) : (
        <HeroStats s={data.everything} />
      )}

      {narrowed && (
        <div className="mt-6">
          <Segmented
            value={scope}
            onChange={setScope}
            options={[
              { key: "filter", label: "Details: your filter" },
              { key: "all", label: "Everything" },
            ]}
            className="w-full"
          />
        </div>
      )}

      <AnimatePresence mode="wait">
        <motion.div key={scope + key} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}>
          <SportsBlock s={view} activeSports={filter.sports} onPick={(sport) => setParams({ s: filter.sports.length === 1 && filter.sports[0] === sport ? null : sport })} />
          <TimingBlock s={view} />
          <PositionsBlock positions={positions} total={data.positions.length} />
          <RecentBlock recent={recent} />
        </motion.div>
      </AnimatePresence>

      {/* Sticky follow */}
      <div className="pointer-events-none fixed inset-x-0 bottom-[92px] z-20 flex justify-center px-4">
        <motion.div initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.3, type: "spring", stiffness: 300, damping: 30 }} className="pointer-events-auto w-full max-w-[440px]">
          {following ? (
            <button onClick={() => setFollowOpen(true)} className="press flex h-14 w-full items-center justify-between rounded-full bg-ink pr-2 pl-6 text-bg shadow-xl">
              <span className="text-[16px] font-semibold">✓ Following · {following.mode === "all" ? "every bet" : "some bets"}</span>
              <span className="rounded-full bg-white/15 px-4 py-2 text-[14px] font-semibold">Edit</span>
            </button>
          ) : (
            <Button size="lg" className="w-full shadow-xl" onClick={() => setFollowOpen(true)}>
              Follow {data.bettor.name.length > 16 ? "" : data.bettor.name}
            </Button>
          )}
        </motion.div>
      </div>

      <FollowSheet
        open={followOpen}
        onClose={() => setFollowOpen(false)}
        bettor={data.bettor}
        bettorSports={data.everything.sports.map((s) => s.sport)}
        filter={filter}
        existing={following}
      />
    </div>
  );
}

function HeroStats({ s }: { s: BettorStats }) {
  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="mt-3 rounded-[28px] bg-surface p-5">
      <div className="text-[14px] font-semibold text-ink-3">Return on investment</div>
      <Ticker value={s.roi} format={(n) => formatPct(n)} className={clsx("display num mt-1 block text-[56px]", s.roi >= 0 ? "text-win" : "text-loss")} />
      <div className="mt-4 grid grid-cols-3 gap-2">
        <Mini label="Profit" value={formatUsd(s.profit)} tone={s.profit >= 0 ? "win" : "loss"} />
        <Mini label="Win rate" value={`${s.winRate.toFixed(0)}%`} />
        <Mini label="Bets" value={s.bets.toLocaleString("en-US")} />
      </div>
      <div className="mt-3 text-[13px] text-ink-3">{formatUsd(s.staked)} staked on settled bets</div>
    </motion.div>
  );
}

function Mini({ label, value, tone }: { label: string; value: string; tone?: "win" | "loss" }) {
  return (
    <div className="rounded-2xl bg-surface-2 px-3 py-3">
      <div className={clsx("num text-[18px] font-semibold", tone === "win" && "text-win", tone === "loss" && "text-loss")}>{value}</div>
      <div className="text-[12px] font-medium text-ink-3">{label}</div>
    </div>
  );
}

function CompareRow({ label, a, b, fmt, colored, neutral, last }: { label: string; a: number; b: number; fmt: (n: number) => string; colored?: boolean; neutral?: boolean; last?: boolean }) {
  const better = neutral ? null : a > b ? "a" : b > a ? "b" : null;
  const tone = (n: number) => (colored ? (n >= 0 ? "text-win" : "text-loss") : "text-ink");
  return (
    <div className={clsx("grid grid-cols-2", !last && "border-b border-line")}>
      <div className="px-4 py-3.5">
        <div className="text-[12px] font-medium text-ink-3">{label}</div>
        <div className={clsx("num flex items-center gap-1.5 text-[22px] font-semibold", tone(a))}>
          <Ticker value={a} format={fmt} />
          {better === "a" && <span className="rounded-full bg-lime px-1.5 text-[10px] font-bold text-[#10173a]">BETTER</span>}
        </div>
      </div>
      <div className="bg-surface-2/50 px-4 py-3.5">
        <div className="text-[12px] font-medium text-ink-3">{label}</div>
        <div className={clsx("num text-[22px] font-semibold", tone(b))}>
          <Ticker value={b} format={fmt} />
        </div>
      </div>
    </div>
  );
}

function Block({ title, hint, children }: { title: string; hint?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="mt-8">
      <div className="mb-3 flex items-baseline justify-between px-1">
        <h2 className="title text-[20px]">{title}</h2>
        {hint && <span className="text-[13px] text-ink-3">{hint}</span>}
      </div>
      {children}
    </section>
  );
}

function SportsBlock({ s, activeSports, onPick }: { s: BettorStats; activeSports: string[]; onPick: (sport: string) => void }) {
  if (!s.sports.length) return <Block title="Sports they bet on"><EmptyCard text="No settled bets in this period." /></Block>;
  const maxAbs = Math.max(...s.sports.map((x) => Math.abs(x.roi)), 1);
  return (
    <Block title="Sports they bet on" hint="Tap to filter">
      <div className="space-y-2">
        {s.sports.map((x, i) => (
          <motion.button
            key={x.sport}
            onClick={() => onPick(x.sport)}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.04 }}
            className={clsx("press flex w-full items-center gap-3 rounded-[22px] p-3 text-left", activeSports.includes(x.sport as never) ? "bg-brand-soft ring-2 ring-brand" : "bg-surface")}
          >
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-surface-2">
              <SportIcon sport={x.sport} size={22} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="flex items-baseline justify-between gap-2">
                <span className="truncate text-[16px] font-semibold">{sportLabel(x.sport)}</span>
                <span className={clsx("num text-[16px] font-semibold", x.roi >= 0 ? "text-win" : "text-loss")}>{formatPct(x.roi)}</span>
              </span>
              <span className="mt-1.5 flex items-center gap-2">
                <span className="relative h-1.5 flex-1 overflow-hidden rounded-full bg-surface-2">
                  <motion.span initial={{ width: 0 }} animate={{ width: `${(Math.abs(x.roi) / maxAbs) * 100}%` }} transition={{ duration: 0.8, delay: 0.1 + i * 0.04, ease: [0.22, 1, 0.36, 1] }} className={clsx("absolute inset-y-0 left-0 rounded-full", x.roi >= 0 ? "bg-win" : "bg-loss")} />
                </span>
                <span className="num shrink-0 text-[12px] text-ink-3">
                  {x.bets} bets · {Math.round(x.share * 100)}% · {formatUsd(x.profit)}
                </span>
              </span>
            </span>
          </motion.button>
        ))}
      </div>
    </Block>
  );
}

const TIMING_COLORS: Record<TimingKey, string> = { early: "#3A5BFF", day: "#8FA4FF", late: "#FF7A59", live: "#E8435F", futures: "#C9CEE6" };

function TimingBlock({ s }: { s: BettorStats }) {
  if (!s.bets) return null;
  const typical = TIMINGS.slice().sort((a, b) => s.timing[b.key] - s.timing[a.key])[0];
  return (
    <Block title="When they bet" hint={s.medianLeadMinutes !== null ? `Typically ${formatLead(s.medianLeadMinutes)}` : undefined}>
      <div className="rounded-[22px] bg-surface p-4">
        <div className="text-[15px] text-ink-2">
          Mostly <span className="font-semibold text-ink">{typical.label.toLowerCase()}</span>: {typical.hint.toLowerCase()}.
        </div>
        <div className="mt-3 flex h-3 overflow-hidden rounded-full bg-surface-2">
          {TIMINGS.map((t, i) => (
            <motion.span key={t.key} initial={{ width: 0 }} animate={{ width: `${s.timing[t.key] * 100}%` }} transition={{ duration: 0.8, delay: i * 0.05, ease: [0.22, 1, 0.36, 1] }} style={{ background: TIMING_COLORS[t.key] }} />
          ))}
        </div>
        <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1.5">
          {TIMINGS.map((t) => (
            <div key={t.key} className="flex items-center justify-between text-[13px]">
              <span className="flex items-center gap-2 text-ink-2">
                <span className="h-2.5 w-2.5 rounded-full" style={{ background: TIMING_COLORS[t.key] }} />
                {t.label}
              </span>
              <span className="num font-semibold">{Math.round(s.timing[t.key] * 100)}%</span>
            </div>
          ))}
        </div>
      </div>
    </Block>
  );
}

function PositionsBlock({ positions, total }: { positions: Data["positions"]; total: number }) {
  const [all, setAll] = useState(false);
  const list = all ? positions : positions.slice(0, 6);
  return (
    <Block title="Open bets" hint={`${positions.length}${positions.length !== total ? ` of ${total}` : ""} live`}>
      {positions.length === 0 ? (
        <EmptyCard text="No open bets that match right now." />
      ) : (
        <div className="overflow-hidden rounded-[22px] bg-surface">
          {list.map((p, i) => (
            <div key={p.id} className={clsx("flex items-center gap-3 p-4", i > 0 && "border-t border-line")}>
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-surface-2">
                <SportIcon sport={p.sport} size={20} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[15px] font-semibold">{p.title}</span>
                <span className="block truncate text-[13px] text-ink-3">
                  {leagueLabel(p.league)} · {p.outcome} @ {formatOdds(p.avgPrice)}{p.gameStartAt ? ` · ${gameTime(p.gameStartAt)}` : ""}
                </span>
              </span>
              <span className="text-right">
                <span className="num block text-[15px] font-semibold">{formatUsd(p.cost)}</span>
                <span className={clsx("num block text-[12px] font-semibold", p.pnl >= 0 ? "text-win" : "text-loss")}>
                  {p.pnl >= 0 ? "+" : ""}
                  {formatUsd(p.pnl)}
                </span>
              </span>
            </div>
          ))}
        </div>
      )}
      {positions.length > 6 && (
        <button onClick={() => setAll(!all)} className="mt-2 w-full py-2 text-[14px] font-semibold text-brand">
          {all ? "Show less" : `Show all ${positions.length}`}
        </button>
      )}
    </Block>
  );
}

function RecentBlock({ recent }: { recent: Data["recent"] }) {
  if (!recent.length) return null;
  return (
    <Block title="Recent results">
      <div className="overflow-hidden rounded-[22px] bg-surface">
        {recent.slice(0, 12).map((r, i) => (
          <div key={r.id} className={clsx("flex items-center gap-3 p-4", i > 0 && "border-t border-line")}>
            <span className={clsx("flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[13px] font-bold", r.pnl > 0 ? "bg-win-soft text-win" : "bg-loss-soft text-loss")}>{r.pnl > 0 ? "W" : "L"}</span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[15px] font-semibold">{r.title}</span>
              <span className="block truncate text-[13px] text-ink-3">
                {leagueLabel(r.league)} · {r.outcome} · {formatUsd(r.cost)} staked
              </span>
            </span>
            <span className={clsx("num text-[15px] font-semibold", r.pnl >= 0 ? "text-win" : "text-loss")}>
              {r.pnl >= 0 ? "+" : ""}
              {formatUsd(r.pnl)}
            </span>
          </div>
        ))}
      </div>
    </Block>
  );
}

function gameTime(iso: string) {
  const d = new Date(iso);
  const diff = d.getTime() - Date.now();
  if (diff < 0 && diff > -4 * 3600_000) return "Live now";
  if (diff > 0 && diff < 24 * 3600_000) return `in ${Math.max(1, Math.round(diff / 3600_000))}h`;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function EmptyCard({ text }: { text: string }) {
  return <div className="rounded-[22px] bg-surface p-5 text-[15px] text-ink-3">{text}</div>;
}

function ShareButton({ name }: { name: string }) {
  return (
    <button
      onClick={() => {
        const url = location.href;
        if (navigator.share) navigator.share({ title: `${name} on CopyBet`, url }).catch(() => {});
        else navigator.clipboard?.writeText(url);
      }}
      aria-label="Share"
      className="press flex h-11 w-11 items-center justify-center rounded-full bg-surface"
    >
      <svg width="18" height="18" viewBox="0 0 20 20" aria-hidden>
        <path d="M10 13V3M10 3 6.5 6.5M10 3l3.5 3.5M4 11v4.5A1.5 1.5 0 0 0 5.5 17h9a1.5 1.5 0 0 0 1.5-1.5V11" stroke="currentColor" strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </button>
  );
}

function ErrorState({ message }: { message: string }) {
  return (
    <div className="pt-24 text-center">
      <div className="title text-[24px]">Hmm.</div>
      <p className="mt-2 text-ink-2">{message}</p>
    </div>
  );
}

function ProfileSkeleton() {
  return (
    <div className="pt-16">
      <div className="flex items-center gap-4">
        <div className="h-[72px] w-[72px] animate-pulse rounded-full bg-surface" />
        <div className="space-y-2">
          <div className="h-6 w-40 animate-pulse rounded-full bg-surface" />
          <div className="h-4 w-28 animate-pulse rounded-full bg-surface" />
        </div>
      </div>
      <div className="mt-8 h-12 animate-pulse rounded-full bg-surface" />
      <div className="mt-3 h-56 animate-pulse rounded-[28px] bg-surface" />
      <div className="mt-8 h-40 animate-pulse rounded-[28px] bg-surface" />
    </div>
  );
}
