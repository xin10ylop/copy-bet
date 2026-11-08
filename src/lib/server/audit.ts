// Continuous self-checks. The worker runs these all the time; scripts/audit.ts runs the same recompute against the live site.
//   checkBettor     – a bettor's stored figures are internally consistent (after every refresh)
//   recomputeBettor – a bettor's figures match an independent recompute from Polymarket's raw positions
//   checkRankings   – filtered/sorted rankings return the right bettors, in order, matching their profiles
import { db } from "./db";
import * as pm from "../polymarket";
import { bettorStats, listBettors, type BettorRow } from "./stats";
import { classifyKeywords, classifySlug, classifyTags, loadLeagueCodes, type SportKey } from "../sports";
import { emptyFilter, type BettorFilter, type TimingKey } from "../filters";

const TIMEFRAMES = ["7d", "30d", "all"] as const;
const close = (a: number, b: number, abs = 0.01, rel = 1e-6) => Math.abs(a - b) <= Math.max(abs, rel * Math.max(Math.abs(a), Math.abs(b)));
const usd = (n: number) => `$${Math.round(n).toLocaleString("en-US")}`;

/** Internal consistency of everything we serve for one bettor. Cheap: runs after every refresh. */
export async function checkBettor(address: string): Promise<string[]> {
  const issues: string[] = [];
  const s: Record<string, Awaited<ReturnType<typeof bettorStats>>> = {};
  for (const tf of TIMEFRAMES) {
    const x = (s[tf] = await bettorStats(address, { sports: [], timing: [], timeframe: tf }));
    if (x.wins > x.bets) issues.push(`[${tf}] ${x.wins} wins > ${x.bets} bets`);
    if (x.bets && x.staked <= 0) issues.push(`[${tf}] ${x.bets} bets but nothing staked`);
    if (x.roi < -100.01) issues.push(`[${tf}] ROI ${x.roi.toFixed(2)}% is below -100%`);
    if (![x.roi, x.profit, x.winRate, x.staked].every(Number.isFinite)) issues.push(`[${tf}] non-finite figure`);
    if (x.sports.reduce((a, y) => a + y.bets, 0) !== x.bets || !close(x.sports.reduce((a, y) => a + y.profit, 0), x.profit)) issues.push(`[${tf}] sports don't add up to the total`);
    const ts = Object.values(x.timing).reduce((a, y) => a + y, 0);
    if (x.bets && Math.abs(ts - 1) > 1e-6) issues.push(`[${tf}] timing shares add up to ${ts.toFixed(4)}`);
  }
  if (s["7d"].bets > s["30d"].bets || s["30d"].bets > s.all.bets) issues.push(`time windows don't nest: 7d ${s["7d"].bets}, 30d ${s["30d"].bets}, all ${s.all.bets}`);
  const [b, stored] = await Promise.all([db.bettor.findUnique({ where: { address } }), db.openPosition.count({ where: { bettorId: address } })]);
  if (b && b.openCount < stored) issues.push(`open bets ${b.openCount} < stored ${stored}`);
  return issues;
}

// ─── Independent recompute from Polymarket's raw positions ───────────────────
const gameCache = new Map<string, { sport: string | null; isGame: boolean; start: number | null; missing?: boolean }>();
async function events(slugs: string[]) {
  const missing = [...new Set(slugs)].filter((s) => !gameCache.has(s));
  for (let i = 0; i < missing.length; i += 40) {
    const chunk = missing.slice(i, i + 40);
    for (const e of await pm.gammaEvents(chunk)) {
      const tags = (e.tags ?? []).map((t) => t.slug);
      const cls = classifySlug(e.slug) ?? classifyTags(tags);
      gameCache.set(e.slug, { sport: cls?.sport ?? null, isGame: !!cls && tags.includes("games"), start: e.startTime ? Date.parse(e.startTime) / 1000 : null });
    }
    for (const s of chunk) if (!gameCache.has(s)) gameCache.set(s, { sport: classifySlug(s)?.sport ?? null, isGame: false, start: null, missing: true });
  }
}

/** What was paid for a position, fees included: written out again here, on purpose, so the check is independent of the indexer. */
function stake(p: pm.Position) {
  const fees = p.entry_fees_usdc ?? 0;
  if (p.status === "CLOSED") {
    const pct = p.percent_realized_pnl ?? 0;
    if (Math.abs(pct) >= 0.5 && Math.abs(p.realized_pnl) > 0) {
      const exact = p.realized_pnl / (pct / 100);
      if (exact > 0) return exact + fees;
    }
  } else if (p.current_size > 0 && p.entry_cost_usdc > 0 && p.current_size >= 0.2 * p.total_size) return p.entry_cost_usdc * (p.total_size / p.current_size) + fees;
  return p.avg_price * p.total_size + fees;
}

/**
 * `edge` = bets that settled within EDGE_S of the index moment. Indexing a big account takes a while, so these can
 * legitimately land on either side of the snapshot; the comparison allows exactly that much difference, no more.
 */
export type Recomputed = Record<
  (typeof TIMEFRAMES)[number],
  { bets: number; wins: number; staked: number; profit: number; sports: Record<string, { bets: number; profit: number }>; timing: Record<string, number>; edge: { bets: number; staked: number; profit: number } }
>;
const EDGE_S = 5 * 60;

/** All settled sports bets of a bettor as of `asOfS`, rebuilt from scratch: one bet per market, stake incl. fees. */
export async function recomputeFromRaw(address: string, asOfS: number): Promise<Recomputed> {
  await loadLeagueCodes();
  const [closed, open] = await Promise.all([pm.positions(address, "CLOSED", 50_000), pm.positions(address, "OPEN", 10_000)]);
  await events([...closed, ...open].map((p) => p.event_slug));
  // League code first, then Polymarket's own tags (authoritative: "not sports" stays not sports), keywords only if never looked up.
  const sportOf = (p: pm.Position) => {
    const bySlug = classifySlug(p.event_slug);
    if (bySlug) return bySlug.sport;
    const g = gameCache.get(p.event_slug);
    return g && !g.missing ? g.sport : (classifyKeywords(p.event_slug, p.title)?.sport ?? null);
  };
  const markets = new Map<string, { sport: string; cost: number; pnl: number; settled: number; entry: number; slug: string }>();
  for (const p of [...closed, ...open.filter((q) => q.redeemable || q.status === "REDEEMABLE")]) {
    const sport = sportOf(p);
    if (!sport) continue;
    const pnl = p.status === "CLOSED" ? p.realized_pnl : (p.total_pnl ?? p.realized_pnl);
    const end = p.end_date ? Date.parse(p.end_date) / 1000 : 0;
    // When the result was decided (the sale or the game's end), not when winnings were collected.
    const settled = p.status === "CLOSED" ? (end ? Math.min(p.last_event_at, Math.max(end, p.first_entry_at || 0)) : p.last_event_at) : Math.min(asOfS, Math.max(p.last_event_at, end || p.last_event_at));
    const entry = p.first_entry_at || p.last_event_at;
    const m = markets.get(p.condition_id);
    const cost = Math.max(stake(p), -pnl); // nobody loses more than they paid
    if (m) Object.assign(m, { cost: m.cost + cost, pnl: m.pnl + pnl, settled: Math.max(m.settled, settled), entry: Math.min(m.entry, entry) });
    else markets.set(p.condition_id, { sport, cost, pnl, settled, entry, slug: p.event_slug });
  }
  const bets = [...markets.values()].filter((b) => b.cost >= 1 && b.settled <= asOfS + EDGE_S);
  const from = { "7d": Math.floor((asOfS - 7 * 86400) / 86400), "30d": Math.floor((asOfS - 30 * 86400) / 86400), all: -Infinity };
  const out = {} as Recomputed;
  for (const tf of TIMEFRAMES) {
    const o: Recomputed[typeof tf] = (out[tf] = { bets: 0, wins: 0, staked: 0, profit: 0, sports: {}, timing: {}, edge: { bets: 0, staked: 0, profit: 0 } });
    for (const b of bets) {
      if (Math.floor(b.settled / 86400) < from[tf]) continue;
      if (Math.abs(b.settled - asOfS) <= EDGE_S) Object.assign(o.edge, { bets: o.edge.bets + 1, staked: o.edge.staked + b.cost, profit: o.edge.profit + Math.abs(b.pnl) });
      if (b.settled > asOfS + 60) continue; // after the snapshot: only counted as edge
      o.bets++;
      if (b.pnl > 0) o.wins++;
      o.staked += b.cost;
      o.profit += b.pnl;
      const sl = (o.sports[b.sport] ??= { bets: 0, profit: 0 });
      sl.bets++;
      sl.profit += b.pnl;
      const g = gameCache.get(b.slug);
      const lead = g?.start ? Math.round((g.start - b.entry) / 60) : null;
      const t = !g?.isGame || lead === null ? "futures" : lead < 0 ? "live" : lead < 60 ? "late" : lead < 1440 ? "day" : "early";
      o.timing[t] = (o.timing[t] ?? 0) + 1;
    }
  }
  return out;
}

/** Compare what we serve for a bettor with the raw recompute, as of the moment we indexed them. */
export async function recomputeBettor(address: string): Promise<string[]> {
  const b = await db.bettor.findUnique({ where: { address } });
  if (!b?.lastIndexedAt || b.historyTruncated) return [];
  const ref = await recomputeFromRaw(address, Math.floor(b.lastIndexedAt.getTime() / 1000));
  const issues: string[] = [];
  for (const tf of TIMEFRAMES) {
    const app = await bettorStats(address, { sports: [], timing: [], timeframe: tf });
    const r = ref[tf];
    // Only bets that settled around the index moment may differ (see EDGE_S), plus rounding.
    const slack = r.edge.bets + 1;
    if (Math.abs(app.bets - r.bets) > slack || Math.abs(app.wins - r.wins) > slack) issues.push(`[${tf}] ${app.bets} bets/${app.wins} wins, raw data says ${r.bets}/${r.wins}`);
    if (!close(app.profit, r.profit, 5 + r.edge.profit, 0.002)) issues.push(`[${tf}] profit ${usd(app.profit)}, raw data says ${usd(r.profit)}`);
    if (!close(app.staked, r.staked, 5 + r.edge.staked, 0.002)) issues.push(`[${tf}] staked ${usd(app.staked)}, raw data says ${usd(r.staked)}`);
    for (const sl of app.sports) {
      const rs = r.sports[sl.sport] ?? { bets: 0, profit: 0 };
      if (Math.abs(sl.bets - rs.bets) > slack || !close(sl.profit, rs.profit, 5 + r.edge.profit, 0.002)) issues.push(`[${tf}] ${sl.sport}: ${sl.bets} bets ${usd(sl.profit)}, raw data says ${rs.bets} bets ${usd(rs.profit)}`);
    }
    for (const [t, share] of Object.entries(app.timing)) {
      const rs = r.bets ? (r.timing[t] ?? 0) / r.bets : 0;
      if (Math.abs(share - rs) > 0.02) issues.push(`[${tf}] ${t} bets ${(share * 100).toFixed(1)}%, raw data says ${(rs * 100).toFixed(1)}%`);
    }
  }
  return issues;
}

// ─── Rankings & filters ──────────────────────────────────────────────────────
const SORT_FIELD: Record<BettorFilter["sort"], keyof BettorRow> = { roi: "roi", profit: "profit", winRate: "winRate", bets: "bets", followers: "followers" };
const pick = <T>(xs: readonly T[]) => xs[Math.floor(Math.random() * xs.length)];

/** A random mix of filters, so over time every combination gets exercised. */
export function randomFilter(): BettorFilter {
  const f = emptyFilter();
  f.timeframe = pick(TIMEFRAMES);
  f.sort = pick(["roi", "profit", "winRate", "bets"] as const);
  if (Math.random() < 0.5) f.sports = [pick(["soccer", "basketball", "tennis", "combat", "football", "baseball", "hockey", "esports"] as SportKey[])];
  if (Math.random() < 0.3) f.timing = [pick(["early", "day", "late", "live", "futures"] as TimingKey[])];
  if (Math.random() < 0.3) f.roi = { min: pick([0, 5, 10, 20]) };
  if (Math.random() < 0.2) f.winRate = { min: pick([50, 55, 60]) };
  if (Math.random() < 0.2) f.bets = { min: pick([20, 50, 100]) };
  if (Math.random() < 0.2) f.profit = { min: pick([1000, 10000, 100000]) };
  if (Math.random() < 0.15) f.hasOpen = true;
  return f;
}

/** Every row satisfies the filter, order is right, no duplicates across pages, and rows equal the profile figures. */
export async function checkRankings(f: BettorFilter, maxRows = 400): Promise<string[]> {
  const issues: string[] = [];
  const rows: BettorRow[] = [];
  let total = 0;
  for (let off = 0; off < maxRows; off += 50) {
    const page = await listBettors(f, 50, off);
    total = page.total;
    rows.push(...page.rows);
    if (page.rows.length < 50) break;
  }
  if (rows.length < Math.min(total, maxRows)) issues.push(`paged ${rows.length} rows, total says ${total}`);
  if (new Set(rows.map((r) => r.address)).size !== rows.length) issues.push(`duplicate bettors across pages`);
  const key = SORT_FIELD[f.sort];
  for (let i = 1; i < rows.length; i++) if ((rows[i - 1][key] as number) < (rows[i][key] as number) - 1e-9) issues.push(`out of order at #${i + 1} (${f.sort})`);
  for (const r of rows) {
    const who = `${r.name} ${r.address.slice(0, 10)}`;
    if (r.bets < Math.max(10, f.bets.min ?? 0) || r.staked < 1000) issues.push(`${who}: below the ranking minimum`);
    if (f.roi.min !== undefined && r.roi < f.roi.min - 1e-9) issues.push(`${who}: ROI ${r.roi.toFixed(2)} < ${f.roi.min}`);
    if (f.winRate.min !== undefined && r.winRate < f.winRate.min - 1e-9) issues.push(`${who}: win rate ${r.winRate.toFixed(2)} < ${f.winRate.min}`);
    if (f.profit.min !== undefined && r.profit < f.profit.min - 1e-9) issues.push(`${who}: profit ${usd(r.profit)} < ${usd(f.profit.min)}`);
    if (f.hasOpen && r.openCount <= 0) issues.push(`${who}: no open bets`);
    if (!close(r.roi, (100 * r.profit) / r.staked, 0.001) || !close(r.winRate, (100 * r.wins) / r.bets, 0.001)) issues.push(`${who}: ROI or win rate doesn't follow from profit/stake/wins`);
    if (f.sports.length) for (const t of r.topSports) if (!f.sports.includes(t.sport as SportKey)) issues.push(`${who}: shows ${t.sport} outside the sport filter`);
  }
  // Rows must match the profile's figures for the same filter.
  for (const r of [rows[0], rows[Math.floor(rows.length / 2)], rows[rows.length - 1]].filter(Boolean)) {
    const s = await bettorStats(r.address, f);
    if (s.bets !== r.bets || !close(s.profit, r.profit) || !close(s.staked, r.staked)) issues.push(`${r.name} ${r.address.slice(0, 10)}: list ${r.bets} bets ${usd(r.profit)}, profile ${s.bets} bets ${usd(s.profit)}`);
  }
  return issues;
}

/** Store a check result; old results are pruned after a week. */
export async function recordCheck(kind: string, subject: string, issues: string[]) {
  await db.auditCheck.create({ data: { kind, subject, ok: issues.length === 0, issues: issues.slice(0, 50) } });
}
export async function pruneChecks() {
  await db.auditCheck.deleteMany({ where: { at: { lt: new Date(Date.now() - 7 * 86400_000) } } });
}
