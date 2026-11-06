"use client";
import clsx from "clsx";
import { useEffect, useState } from "react";
import { Chip } from "../ui/Chip";
import { Segmented } from "../ui/Segmented";
import { SportIcon } from "../SportIcon";
import { SPORTS, type SportKey } from "@/lib/sports";
import { type BettorFilter, type Range, type TimingKey, SORTS, TIMEFRAMES, TIMINGS, DEFAULT_MIN_BETS, emptyFilter, filterToParams } from "@/lib/filters";

type RangeKey = "roi" | "winRate" | "profit" | "bets" | "followers";

interface Preset {
  label: string;
  range: Range;
}

const ROI: Preset[] = [
  { label: "Any", range: {} },
  { label: "Profitable", range: { min: 0 } },
  { label: "5%+", range: { min: 5 } },
  { label: "10%+", range: { min: 10 } },
  { label: "20%+", range: { min: 20 } },
  { label: "50%+", range: { min: 50 } },
];
const WIN: Preset[] = [
  { label: "Any", range: {} },
  { label: "50%+", range: { min: 50 } },
  { label: "55%+", range: { min: 55 } },
  { label: "60%+", range: { min: 60 } },
  { label: "70%+", range: { min: 70 } },
];
const PROFIT: Preset[] = [
  { label: "Any", range: {} },
  { label: "$1K+", range: { min: 1_000 } },
  { label: "$10K+", range: { min: 10_000 } },
  { label: "$100K+", range: { min: 100_000 } },
  { label: "$1M+", range: { min: 1_000_000 } },
];
const BETS: Preset[] = [
  { label: `${DEFAULT_MIN_BETS}+`, range: {} },
  { label: "30+", range: { min: 30 } },
  { label: "100+", range: { min: 100 } },
  { label: "300+", range: { min: 300 } },
  { label: "1,000+", range: { min: 1000 } },
];
const FOLLOWERS: Preset[] = [
  { label: "Anyone", range: {} },
  { label: "Undiscovered", range: { max: 1 } },
  { label: "Popular", range: { min: 5 } },
  { label: "Most copied", range: { min: 25 } },
];

const same = (a: Range, b: Range) => a.min === b.min && a.max === b.max;

export function FilterPanel({ value, onChange, showSort = true }: { value: BettorFilter; onChange: (f: BettorFilter) => void; showSort?: boolean }) {
  const set = (patch: Partial<BettorFilter>) => onChange({ ...value, ...patch });
  const toggleSport = (k: SportKey) => set({ sports: value.sports.includes(k) ? value.sports.filter((x) => x !== k) : [...value.sports, k] });
  const toggleTiming = (k: TimingKey) => set({ timing: value.timing.includes(k) ? value.timing.filter((x) => x !== k) : [...value.timing, k] });

  const presetRow = (key: RangeKey, presets: Preset[]) => (
    <div className="no-scrollbar -mx-6 flex gap-2 overflow-x-auto px-6">
      {presets.map((p) => (
        <Chip key={p.label} selected={same(value[key], p.range)} onClick={() => set({ [key]: p.range } as Partial<BettorFilter>)}>
          {p.label}
        </Chip>
      ))}
    </div>
  );

  return (
    <div className="space-y-7 pb-4">
      <Section title="Sports" hint={value.sports.length ? `${value.sports.length} selected` : "All sports"}>
        <div className="grid grid-cols-3 gap-2">
          {SPORTS.map((s) => {
            const on = value.sports.includes(s.key);
            return (
              <button key={s.key} onClick={() => toggleSport(s.key)} className={clsx("press flex flex-col items-start gap-2 rounded-[20px] p-3 text-left", on ? "bg-ink text-bg" : "bg-surface text-ink")}>
                <SportIcon sport={s.key} size={22} />
                <span className="text-[13px] leading-tight font-semibold">{s.label}</span>
              </button>
            );
          })}
        </div>
      </Section>

      <Section title="Time period">
        <Segmented value={value.timeframe} onChange={(tf) => set({ timeframe: tf })} options={TIMEFRAMES.map((t) => ({ key: t.key, label: t.long }))} className="w-full" />
      </Section>

      <Section title="ROI" hint="Profit ÷ amount staked">
        {presetRow("roi", ROI)}
      </Section>
      <Section title="Win rate">{presetRow("winRate", WIN)}</Section>
      <Section title="Profit">{presetRow("profit", PROFIT)}</Section>
      <Section title="Bets placed" hint="More bets = more proof">
        {presetRow("bets", BETS)}
      </Section>

      <Section title="When they bet" hint="Before kickoff">
        <div className="grid grid-cols-2 gap-2">
          {TIMINGS.map((t) => {
            const on = value.timing.includes(t.key);
            return (
              <button key={t.key} onClick={() => toggleTiming(t.key)} className={clsx("press rounded-[20px] p-3 text-left", on ? "bg-ink text-bg" : "bg-surface")}>
                <div className="text-[15px] font-semibold">{t.label}</div>
                <div className={clsx("text-[12.5px]", on ? "opacity-70" : "text-ink-3")}>{t.hint}</div>
              </button>
            );
          })}
        </div>
      </Section>

      <Section title="Open bets right now">
        <button onClick={() => set({ hasOpen: !value.hasOpen })} className="press flex w-full items-center justify-between rounded-[20px] bg-surface p-4 text-left">
          <span>
            <span className="block text-[15px] font-semibold">Only bettors with live bets</span>
            <span className="text-[13px] text-ink-3">So there&apos;s something to follow today</span>
          </span>
          <Toggle on={value.hasOpen} />
        </button>
      </Section>

      <Section title="Copied on CopyBet">{presetRow("followers", FOLLOWERS)}</Section>

      {showSort && (
        <Section title="Sort by">
          <div className="flex flex-wrap gap-2">
            {SORTS.map((s) => (
              <Chip key={s.key} selected={value.sort === s.key} onClick={() => set({ sort: s.key })}>
                {s.label}
              </Chip>
            ))}
          </div>
        </Section>
      )}
    </div>
  );
}

function Section({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-3 flex items-baseline justify-between">
        <h3 className="title text-[17px]">{title}</h3>
        {hint && <span className="text-[13px] text-ink-3">{hint}</span>}
      </div>
      {children}
    </div>
  );
}

export function Toggle({ on }: { on: boolean }) {
  return (
    <span className={clsx("relative inline-flex h-8 w-[52px] shrink-0 rounded-full transition-colors duration-300", on ? "bg-brand" : "bg-surface-3")}>
      <span className={clsx("absolute top-1 h-6 w-6 rounded-full bg-white shadow transition-transform duration-300 ease-brand", on ? "translate-x-[24px]" : "translate-x-1")} />
    </span>
  );
}

/** Live "Show 42 bettors" count for a filter (debounced). */
export function useMatchCount(f: BettorFilter) {
  const [n, setN] = useState<number | null>(null);
  const key = filterToParams(f).toString();
  useEffect(() => {
    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      try {
        const r = await fetch(`/api/bettors?limit=1&${key}`, { signal: ctrl.signal });
        if (r.ok) setN((await r.json()).total);
      } catch {}
    }, 250);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [key]);
  return n;
}

export function resetFilter(keepSort = true, current?: BettorFilter): BettorFilter {
  const f = emptyFilter();
  if (keepSort && current) f.sort = current.sort;
  return f;
}
