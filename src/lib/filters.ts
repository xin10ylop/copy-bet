// The bettor filter: shared by Discover, Search, the bettor profile and follow rules.
// Kept framework-free so both server and client code can use it.

import type { SportKey } from "./sports";

export type Timeframe = "7d" | "30d" | "all";
export type TimingKey = "early" | "day" | "late" | "live" | "futures";
export type SortKey = "roi" | "winRate" | "profit" | "followers" | "bets";

export const TIMEFRAMES: { key: Timeframe; label: string; long: string }[] = [
  { key: "7d", label: "7D", long: "7 days" },
  { key: "30d", label: "30D", long: "30 days" },
  { key: "all", label: "All", long: "All time" },
];

export const TIMINGS: { key: TimingKey; label: string; hint: string }[] = [
  { key: "early", label: "Early birds", hint: "24h+ before the game" },
  { key: "day", label: "Game day", hint: "1–24h before" },
  { key: "late", label: "Last hour", hint: "Under 1h before" },
  { key: "live", label: "Live", hint: "During the game" },
  { key: "futures", label: "Futures", hint: "Season-long bets" },
];

export const SORTS: { key: SortKey; label: string }[] = [
  { key: "roi", label: "ROI" },
  { key: "profit", label: "Profit" },
  { key: "winRate", label: "Win rate" },
  { key: "followers", label: "Most copied" },
  { key: "bets", label: "Most bets" },
];

export interface Range {
  min?: number;
  max?: number;
}

export interface BettorFilter {
  sports: SportKey[];
  timeframe: Timeframe;
  timing: TimingKey[];
  roi: Range; // percent
  winRate: Range; // percent
  profit: Range; // USD
  bets: Range;
  followers: Range;
  hasOpen: boolean;
  sort: SortKey;
}

export const DEFAULT_MIN_BETS = 10;

export function emptyFilter(): BettorFilter {
  return { sports: [], timeframe: "30d", timing: [], roi: {}, winRate: {}, profit: {}, bets: {}, followers: {}, hasOpen: false, sort: "roi" };
}

export function timeframeSince(tf: Timeframe, now = Date.now()): Date | null {
  if (tf === "7d") return new Date(now - 7 * 86400_000);
  if (tf === "30d") return new Date(now - 30 * 86400_000);
  return null;
}

/** Classify a bet by how long before kickoff it was placed. */
export function timingFor(leadMinutes: number | null, isGame: boolean): TimingKey {
  if (!isGame || leadMinutes === null) return "futures";
  if (leadMinutes < 0) return "live";
  if (leadMinutes < 60) return "late";
  if (leadMinutes < 24 * 60) return "day";
  return "early";
}

const rangeKeys = ["roi", "winRate", "profit", "bets", "followers"] as const;
const short: Record<(typeof rangeKeys)[number], string> = { roi: "roi", winRate: "wr", profit: "pl", bets: "n", followers: "fol" };

export function filterToParams(f: BettorFilter): URLSearchParams {
  const p = new URLSearchParams();
  if (f.sports.length) p.set("s", f.sports.join(","));
  if (f.timeframe !== "30d") p.set("tf", f.timeframe);
  if (f.timing.length) p.set("t", f.timing.join(","));
  for (const k of rangeKeys) {
    const r = f[k];
    if (r.min !== undefined || r.max !== undefined) p.set(short[k], `${r.min ?? ""}_${r.max ?? ""}`);
  }
  if (f.hasOpen) p.set("open", "1");
  if (f.sort !== "roi") p.set("sort", f.sort);
  return p;
}

type ParamSource = URLSearchParams | Record<string, string | string[] | undefined>;

function get(src: ParamSource, k: string): string | undefined {
  if (src instanceof URLSearchParams) return src.get(k) ?? undefined;
  const v = src[k];
  return Array.isArray(v) ? v[0] : v;
}

function num(s: string | undefined): number | undefined {
  if (s === undefined || s === "") return undefined;
  const n = Number(s);
  return Number.isFinite(n) ? n : undefined;
}

export function paramsToFilter(src: ParamSource): BettorFilter {
  const f = emptyFilter();
  const s = get(src, "s");
  if (s) f.sports = s.split(",").filter(Boolean) as SportKey[];
  const tf = get(src, "tf");
  if (tf === "7d" || tf === "30d" || tf === "all") f.timeframe = tf;
  const t = get(src, "t");
  if (t) f.timing = t.split(",").filter(Boolean) as TimingKey[];
  for (const k of rangeKeys) {
    const v = get(src, short[k]);
    if (v) {
      const [a, b] = v.split("_");
      f[k] = { min: num(a), max: num(b) };
    }
  }
  f.hasOpen = get(src, "open") === "1";
  const sort = get(src, "sort");
  if (sort && SORTS.some((x) => x.key === sort)) f.sort = sort as SortKey;
  return f;
}

/** True when the filter narrows which bets count (sport or timing), not just which bettors show. */
export function narrowsBets(f: BettorFilter): boolean {
  return f.sports.length > 0 || f.timing.length > 0;
}

export function activeRuleCount(f: BettorFilter): number {
  let n = 0;
  if (f.sports.length) n++;
  if (f.timing.length) n++;
  for (const k of rangeKeys) if (f[k].min !== undefined || f[k].max !== undefined) n++;
  if (f.hasOpen) n++;
  return n;
}

export interface SportSlice {
  sport: string;
  bets: number;
  wins: number;
  staked: number;
  profit: number;
  roi: number;
  share: number;
}

export interface BettorStats {
  bets: number;
  wins: number;
  winRate: number; // 0–100
  staked: number;
  profit: number;
  roi: number; // percent
  timing: Record<TimingKey, number>; // share 0–1
  medianLeadMinutes: number | null;
  sports: SportSlice[];
}

export function formatUsd(n: number, compact = true): string {
  const sign = n < 0 ? "-" : "";
  const a = Math.abs(n);
  if (compact && a >= 1_000_000) return `${sign}$${(a / 1_000_000).toFixed(a >= 10_000_000 ? 1 : 2)}M`;
  if (compact && a >= 10_000) return `${sign}$${(a / 1000).toFixed(a >= 100_000 ? 0 : 1)}K`;
  return `${sign}$${a.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
}

export function formatPct(n: number, signed = true): string {
  const s = signed && n > 0 ? "+" : "";
  return `${s}${n.toFixed(Math.abs(n) >= 100 ? 0 : 1)}%`;
}

export function formatLead(minutes: number | null): string {
  if (minutes === null) return "—";
  if (minutes < 0) return "In-game";
  if (minutes < 60) return `${Math.round(minutes)}m before`;
  if (minutes < 48 * 60) return `${Math.round(minutes / 60)}h before`;
  return `${Math.round(minutes / 1440)}d before`;
}

/** Short human labels for the active rules, e.g. ["Basketball", "Game day", "ROI 10%+"]. */
export function describeFilter(f: BettorFilter, sportLabelOf: (k: string) => string, opts: { includeTimeframe?: boolean } = {}): string[] {
  const out: string[] = [];
  if (f.sports.length) out.push(f.sports.length > 2 ? `${f.sports.length} sports` : f.sports.map(sportLabelOf).join(" + "));
  if (f.timing.length) out.push(f.timing.map((t) => TIMINGS.find((x) => x.key === t)?.label ?? t).join(" + "));
  const r = (label: string, x: Range, fmt: (n: number) => string) => {
    if (x.min !== undefined && x.max !== undefined) out.push(`${label} ${fmt(x.min)}–${fmt(x.max)}`);
    else if (x.min !== undefined) out.push(`${label} ${fmt(x.min)}+`);
    else if (x.max !== undefined) out.push(`${label} ≤ ${fmt(x.max)}`);
  };
  r("ROI", f.roi, (n) => `${n}%`);
  r("Win", f.winRate, (n) => `${n}%`);
  r("Profit", f.profit, (n) => formatUsd(n));
  r("Bets", f.bets, (n) => `${n}`);
  r("Copiers", f.followers, (n) => `${n}`);
  if (f.hasOpen) out.push("Live bets");
  if (opts.includeTimeframe) out.push(TIMEFRAMES.find((t) => t.key === f.timeframe)!.long);
  return out;
}
