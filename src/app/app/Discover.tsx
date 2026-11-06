"use client";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import clsx from "clsx";
import Link from "next/link";
import { BettorCard, BettorCardSkeleton, type BettorRowData } from "@/components/app/BettorCard";
import { FilterPanel, useMatchCount } from "@/components/app/FilterPanel";
import { Onboarding } from "@/components/app/Onboarding";
import { Sheet } from "@/components/ui/Sheet";
import { Segmented } from "@/components/ui/Segmented";
import { Button } from "@/components/ui/Button";
import { SportIcon } from "@/components/SportIcon";
import { LogoMark } from "@/components/Logo";
import { useMe } from "@/components/app/MeProvider";
import { SPORTS, sportLabel, type SportKey } from "@/lib/sports";
import { type BettorFilter, SORTS, TIMEFRAMES, activeRuleCount, describeFilter, emptyFilter, filterToParams, paramsToFilter } from "@/lib/filters";

const PAGE = 20;

export function Discover() {
  const sp = useSearchParams();
  const router = useRouter();
  const filter = useMemo(() => paramsToFilter(sp), [sp]);
  const key = filterToParams(filter).toString();
  const [rows, setRows] = useState<BettorRowData[] | null>(null);
  const [total, setTotal] = useState(0);
  const [loadingMore, setLoadingMore] = useState(false);
  const [sheet, setSheet] = useState<null | "filter" | "sort">(null);
  const [draft, setDraft] = useState<BettorFilter>(filter);
  const { me } = useMe();
  const reqId = useRef(0);

  const apply = useCallback((f: BettorFilter) => router.replace(`/app${filterToParams(f).toString() ? `?${filterToParams(f)}` : ""}`, { scroll: false }), [router]);

  useEffect(() => {
    const id = ++reqId.current;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- show skeletons while the new filter loads
    setRows(null);
    fetch(`/api/bettors?limit=${PAGE}&${key}`)
      .then((r) => r.json())
      .then((d) => {
        if (id !== reqId.current) return;
        setRows(d.rows);
        setTotal(d.total);
      });
  }, [key]);

  const more = async () => {
    setLoadingMore(true);
    const d = await fetch(`/api/bettors?limit=${PAGE}&offset=${rows?.length ?? 0}&${key}`).then((r) => r.json());
    setRows((prev) => [...(prev ?? []), ...d.rows]);
    setLoadingMore(false);
  };

  const toggleSport = (k: SportKey | null) => apply({ ...filter, sports: k === null ? [] : filter.sports.includes(k) ? filter.sports.filter((x) => x !== k) : [...filter.sports, k] });
  const rules = activeRuleCount(filter) - (filter.sports.length ? 1 : 0);
  const chips = describeFilter({ ...filter, sports: [] }, sportLabel);
  const title = filter.sports.length === 1 ? `${sportLabel(filter.sports[0])} bettors` : filter.sports.length ? "Your sports" : "Top sports bettors";
  const profileHref = (address: string) => `/app/bettor/${address}${key ? `?${key}` : ""}`;

  return (
    <div>
      <Onboarding skipSport={filter.sports.length > 0} onDone={({ sport }) => sport && apply({ ...filter, sports: [sport] })} />

      <header className="flex items-center justify-between pt-2">
        <Link href="/" aria-label="Home" className="press">
          <LogoMark size={36} follow />
        </Link>
        <Link href="/app/account" className={clsx("press flex h-10 items-center gap-2 rounded-full px-4 text-[14px] font-semibold", me?.user?.telegram ? "bg-win-soft text-win" : "bg-surface text-ink")}>
          <span className={clsx("h-2 w-2 rounded-full", me?.user?.telegram ? "bg-win" : "bg-ink-3")} />
          {me?.user?.telegram ? "Alerts on" : "Alerts off"}
        </Link>
      </header>

      <motion.h1 key={title} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="display mt-6 text-[40px] sm:text-[48px]">
        {title}
      </motion.h1>
      <p className="mt-2 text-[16px] text-ink-2">Ranked by real, settled results · {filter.timeframe === "all" ? "all time" : `last ${TIMEFRAMES.find((t) => t.key === filter.timeframe)?.long}`}.</p>

      {/* Sport chips */}
      <div className="no-scrollbar -mx-4 mt-5 flex gap-2 overflow-x-auto px-4 sm:-mx-6 sm:px-6">
        <SportPill on={!filter.sports.length} onClick={() => toggleSport(null)} label="All" />
        {SPORTS.map((s) => (
          <SportPill key={s.key} on={filter.sports.includes(s.key)} onClick={() => toggleSport(s.key)} label={s.label} sport={s.key} />
        ))}
      </div>

      {/* Timeframe + sort + filter */}
      <div className="sticky top-0 z-20 -mx-4 mt-3 flex items-center gap-2 bg-bg/85 px-4 py-2 backdrop-blur-xl sm:-mx-6 sm:px-6">
        <Segmented size="sm" value={filter.timeframe} onChange={(tf) => apply({ ...filter, timeframe: tf })} options={TIMEFRAMES.map((t) => ({ key: t.key, label: t.label }))} />
        <div className="flex-1" />
        <button onClick={() => setSheet("sort")} className="press flex h-10 items-center gap-1.5 rounded-full bg-surface px-3.5 text-[14px] font-semibold">
          <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden>
            <path d="M5 3v10M5 13l-2.5-2.5M5 13l2.5-2.5M11 13V3M11 3 8.5 5.5M11 3l2.5 2.5" stroke="currentColor" strokeWidth="1.6" fill="none" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          {SORTS.find((s) => s.key === filter.sort)?.label}
        </button>
        <button
          onClick={() => {
            setDraft(filter);
            setSheet("filter");
          }}
          className={clsx("press relative flex h-10 items-center gap-1.5 rounded-full px-3.5 text-[14px] font-semibold", rules ? "bg-ink text-bg" : "bg-surface")}
        >
          <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden>
            <path d="M2 4h12M4.5 8h7M7 12h2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
          Filter{rules ? ` · ${rules}` : ""}
        </button>
      </div>

      <AnimatePresence initial={false}>
        {chips.length > 0 && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
            <div className="flex flex-wrap items-center gap-1.5 pt-1 pb-2">
              {chips.map((c) => (
                <span key={c} className="rounded-full bg-brand-soft px-3 py-1 text-[13px] font-semibold text-brand">
                  {c}
                </span>
              ))}
              <button onClick={() => apply({ ...emptyFilter(), sports: filter.sports, timeframe: filter.timeframe, sort: filter.sort })} className="px-2 text-[13px] font-semibold text-ink-3">
                Clear
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="mt-2 space-y-2.5">
        {rows === null ? (
          Array.from({ length: 5 }, (_, i) => <BettorCardSkeleton key={i} />)
        ) : rows.length === 0 ? (
          <Empty onReset={() => apply(emptyFilter())} />
        ) : (
          rows.map((b, i) => <BettorCard key={b.address} b={b} rank={i + 1} index={i} href={profileHref(b.address)} />)
        )}
      </div>

      {rows && rows.length < total && (
        <Button variant="soft" className="mt-4 w-full" onClick={more} disabled={loadingMore}>
          {loadingMore ? "Loading…" : `Show more (${total - rows.length} left)`}
        </Button>
      )}

      <Sheet open={sheet === "sort"} onClose={() => setSheet(null)} title="Sort by">
        <div className="space-y-2 pb-2">
          {SORTS.map((s) => (
            <button
              key={s.key}
              onClick={() => {
                apply({ ...filter, sort: s.key });
                setSheet(null);
              }}
              className={clsx("press flex h-14 w-full items-center justify-between rounded-[20px] px-5 text-[17px] font-semibold", filter.sort === s.key ? "bg-ink text-bg" : "bg-surface")}
            >
              {s.label}
              {filter.sort === s.key && <span>✓</span>}
            </button>
          ))}
        </div>
      </Sheet>

      <FilterSheet open={sheet === "filter"} draft={draft} setDraft={setDraft} onClose={() => setSheet(null)} onApply={() => (apply(draft), setSheet(null))} />
    </div>
  );
}

function FilterSheet({ open, draft, setDraft, onClose, onApply }: { open: boolean; draft: BettorFilter; setDraft: (f: BettorFilter) => void; onClose: () => void; onApply: () => void }) {
  const n = useMatchCount(draft);
  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={
        <div className="flex items-center justify-between">
          Filter
          <button onClick={() => setDraft({ ...emptyFilter(), sort: draft.sort })} className="text-[15px] font-semibold text-brand">
            Reset
          </button>
        </div>
      }
    >
      <FilterPanel value={draft} onChange={setDraft} showSort={false} />
      <div className="sticky bottom-0 -mx-6 bg-gradient-to-t from-bg via-bg to-bg/0 px-6 pt-4">
        <Button size="lg" className="w-full" onClick={onApply}>
          {n === null ? "Show bettors" : n === 0 ? "No bettors match" : `Show ${n} bettor${n === 1 ? "" : "s"}`}
        </Button>
      </div>
    </Sheet>
  );
}

function SportPill({ on, onClick, label, sport }: { on: boolean; onClick: () => void; label: string; sport?: string }) {
  return (
    <motion.button whileTap={{ scale: 0.94 }} onClick={onClick} className={clsx("flex h-11 shrink-0 items-center gap-2 rounded-full pr-4 text-[15px] font-semibold transition-colors duration-300", sport ? "pl-2" : "pl-4", on ? "bg-ink text-bg" : "bg-surface text-ink")}>
      {sport && (
        <span className={clsx("flex h-7 w-7 items-center justify-center rounded-full", on ? "bg-white/15" : "bg-surface-2")}>
          <SportIcon sport={sport} size={17} />
        </span>
      )}
      {label}
    </motion.button>
  );
}

function Empty({ onReset }: { onReset: () => void }) {
  return (
    <div className="rounded-[28px] bg-surface p-8 text-center">
      <div className="title text-[22px]">No one matches all of that</div>
      <p className="mt-2 text-[15px] text-ink-2">Try a longer time period, or loosen one of the rules.</p>
      <Button variant="soft" className="mt-5" onClick={onReset}>
        Reset filters
      </Button>
    </div>
  );
}
