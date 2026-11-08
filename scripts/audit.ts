// End-to-end audit of what CopyBet shows, against Polymarket's own raw data.
// Needs no database access: it reads the public site API and Polymarket's public APIs.
//
//   npx tsx scripts/audit.ts [--base https://copybet-omega.vercel.app] [--sample 40] [--out audit-report.md]
//
// 1. Rankings & filters: every filter/sort combination returns only bettors that satisfy it, in the right
//    order, with no duplicates across pages, internally consistent figures (ROI = profit / staked, …), and
//    totals that only shrink when a filter is added.
// 2. List vs profile: a bettor's row in the ranking equals their profile figures for the same filter.
// 3. Per-bettor values: for a sample of bettors, every figure (bets, wins, staked, profit, ROI, win rate per
//    timeframe and sport, timing mix, open bets) is recomputed independently from Polymarket's raw positions,
//    as of the moment CopyBet indexed that bettor.
// 4. Bets: open bets and recent results are in bookmaker format, odds = 1 / price, returns ≈ stake × odds,
//    no bet loses more than its stake, and W/L matches the result.
// Exit code 1 when anything fails.

import { writeFileSync } from "fs";
import { recomputeFromRaw } from "../src/lib/server/audit";

const args = process.argv.slice(2);
const arg = (k: string, d: string) => {
  const i = args.indexOf(k);
  return i >= 0 ? args[i + 1] : d;
};
const BASE = arg("--base", "https://copybet-omega.vercel.app").replace(/\/$/, "");
const SAMPLE = Number(arg("--sample", "40"));
const OUT = arg("--out", "audit-report.md");

type Row = { address: string; name: string; bets: number; wins: number; winRate: number; staked: number; profit: number; roi: number; followers: number; openCount: number; topSports: { sport: string; share: number }[] };
type Slice = { sport: string; bets: number; wins: number; staked: number; profit: number; roi: number };
type Stats = { bets: number; wins: number; winRate: number; staked: number; profit: number; roi: number; timing: Record<string, number>; medianLeadMinutes: number | null; sports: Slice[] };
type Bet = { selection: string; market: string; event: string };
type Profile = {
  bettor: { address: string; name: string; lastIndexedAt: string | null; openCount: number; historyTruncated: boolean; isMarketMaker: boolean };
  filtered: Stats;
  everything: Stats;
  positions: { id: string; sport: string; title: string; outcome: string; size: number; avgPrice: number; cost: number; bet: Bet }[];
  recent: { id: string; sport: string; title: string; outcome: string; cost: number; pnl: number; bet: Bet }[];
};

// ─── Report ──────────────────────────────────────────────────────────────────
const sections: { name: string; checks: number; fails: string[] }[] = [];
let current: (typeof sections)[number];
const section = (name: string) => sections.push((current = { name, checks: 0, fails: [] }));
function check(ok: boolean, msg: () => string) {
  current.checks++;
  if (!ok) current.fails.push(msg());
}
const close = (a: number, b: number, abs = 0.01, rel = 1e-6) => Math.abs(a - b) <= Math.max(abs, rel * Math.max(Math.abs(a), Math.abs(b)));
const money = (n: number) => `$${Math.round(n).toLocaleString("en-US")}`;

// ─── Site API ────────────────────────────────────────────────────────────────
async function api<T>(path: string): Promise<T> {
  for (let i = 0; i < 4; i++) {
    const r = await fetch(`${BASE}${path}`, { cache: "no-store" });
    if (r.ok) return (await r.json()) as T;
    await new Promise((s) => setTimeout(s, 1500 * (i + 1)));
  }
  throw new Error(`site API failed: ${path}`);
}
async function listAll(params: string, max = 2500): Promise<{ rows: Row[]; total: number }> {
  const rows: Row[] = [];
  let total = 0;
  for (let offset = 0; offset < max; offset += 50) {
    const page = await api<{ rows: Row[]; total: number }>(`/api/bettors?${params}${params ? "&" : ""}limit=50&offset=${offset}`);
    total = page.total;
    rows.push(...page.rows);
    if (page.rows.length < 50) break;
  }
  return { rows, total };
}

// ─── 1. Rankings & filters ───────────────────────────────────────────────────
const SORT_KEY: Record<string, keyof Row> = { roi: "roi", profit: "profit", winRate: "winRate", bets: "bets", followers: "followers" };

async function auditRankings() {
  section("Rankings & filters");
  const combos: { label: string; q: Record<string, string> }[] = [];
  for (const tf of ["7d", "30d", "all"]) for (const sort of ["roi", "profit", "winRate", "bets"]) combos.push({ label: `${tf} sort=${sort}`, q: { tf, sort } });
  for (const s of ["soccer", "basketball", "tennis", "combat", "football", "soccer,basketball"]) combos.push({ label: `30d sport=${s}`, q: { tf: "30d", s } });
  for (const t of ["live", "early", "day,late"]) combos.push({ label: `all timing=${t}`, q: { tf: "all", t } });
  combos.push({ label: "all roi≥10", q: { tf: "all", roi: "10_" } });
  combos.push({ label: "all win%≥55", q: { tf: "all", wr: "55_" } });
  combos.push({ label: "all bets≥100", q: { tf: "all", n: "100_" } });
  combos.push({ label: "all profit≥10k", q: { tf: "all", pl: "10000_" } });
  combos.push({ label: "30d roi 5–20", q: { tf: "30d", roi: "5_20" } });
  combos.push({ label: "30d has open bets", q: { tf: "30d", open: "1" } });
  combos.push({ label: "all soccer + live + roi≥5", q: { tf: "all", s: "soccer", t: "live", roi: "5_" } });

  const totals = new Map<string, number>();
  const samples: { address: string; q: Record<string, string>; row: Row }[] = [];
  for (const c of combos) {
    const params = new URLSearchParams(c.q).toString();
    const { rows, total } = await listAll(params);
    totals.set(c.label, total);
    check(rows.length === total, () => `[${c.label}] paged ${rows.length} rows but total says ${total}`);
    check(new Set(rows.map((r) => r.address)).size === rows.length, () => `[${c.label}] duplicate bettors across pages`);
    const key = SORT_KEY[c.q.sort ?? "roi"];
    for (let i = 1; i < rows.length; i++) check((rows[i - 1][key] as number) >= (rows[i][key] as number) - 1e-9, () => `[${c.label}] out of order at #${i}: ${rows[i - 1][key]} then ${rows[i][key]}`);
    const range = (v: string | undefined) => (v ? v.split("_").map((x) => (x === "" ? undefined : Number(x))) : [undefined, undefined]);
    const [roiMin, roiMax] = range(c.q.roi);
    const [wrMin] = range(c.q.wr);
    const [nMin] = range(c.q.n);
    const [plMin] = range(c.q.pl);
    for (const r of rows) {
      const who = `[${c.label}] ${r.name} ${r.address.slice(0, 10)}`;
      check(r.bets >= Math.max(10, nMin ?? 0), () => `${who}: ${r.bets} bets is below the minimum`);
      check(r.staked >= 1000, () => `${who}: staked ${money(r.staked)} is below $1,000`);
      check(r.wins <= r.bets, () => `${who}: ${r.wins} wins > ${r.bets} bets`);
      check(close(r.roi, (100 * r.profit) / r.staked, 0.001), () => `${who}: ROI ${r.roi} ≠ profit/staked`);
      check(close(r.winRate, (100 * r.wins) / r.bets, 0.001), () => `${who}: win rate ${r.winRate} ≠ wins/bets`);
      check(r.roi >= -100.01, () => `${who}: ROI ${r.roi.toFixed(2)}% below -100%`);
      if (roiMin !== undefined) check(r.roi >= roiMin - 1e-9, () => `${who}: ROI ${r.roi} < ${roiMin}`);
      if (roiMax !== undefined) check(r.roi <= roiMax + 1e-9, () => `${who}: ROI ${r.roi} > ${roiMax}`);
      if (wrMin !== undefined) check(r.winRate >= wrMin - 1e-9, () => `${who}: win rate ${r.winRate} < ${wrMin}`);
      if (plMin !== undefined) check(r.profit >= plMin - 1e-9, () => `${who}: profit ${r.profit} < ${plMin}`);
      if (c.q.open) check(r.openCount > 0, () => `${who}: no open bets despite the filter`);
      if (c.q.s) for (const t of r.topSports) check(c.q.s.split(",").includes(t.sport), () => `${who}: shows sport ${t.sport} outside the filter`);
    }
    // Keep a few rows from each combination to compare with the profile.
    for (const r of [rows[0], rows[Math.floor(rows.length / 2)], rows[rows.length - 1]].filter(Boolean)) samples.push({ address: r.address, q: c.q, row: r });
  }
  // Adding a restriction can only shrink the list.
  const shrink = (narrow: string, wide: string) => check((totals.get(narrow) ?? 0) <= (totals.get(wide) ?? 0), () => `"${narrow}" (${totals.get(narrow)}) has more bettors than "${wide}" (${totals.get(wide)})`);
  shrink("all roi≥10", "all sort=roi");
  shrink("all bets≥100", "all sort=roi");
  shrink("all soccer + live + roi≥5", "all timing=live");
  shrink("30d sport=soccer", "30d sport=soccer,basketball");
  shrink("30d roi 5–20", "30d sort=roi");
  return { totals, samples };
}

// ─── 2. List vs profile ──────────────────────────────────────────────────────
async function auditListVsProfile(samples: { address: string; q: Record<string, string>; row: Row }[]) {
  section("Ranked list vs profile");
  for (const { address, q, row } of samples.sort(() => Math.random() - 0.5).slice(0, 60)) {
    const p = await api<Profile>(`/api/bettors/${address}?${new URLSearchParams(q)}`);
    const s = p.filtered;
    const who = `${row.name} ${address.slice(0, 10)} [${JSON.stringify(q)}]`;
    check(s.bets === row.bets && s.wins === row.wins, () => `${who}: list ${row.bets} bets/${row.wins} wins, profile ${s.bets}/${s.wins}`);
    check(close(s.profit, row.profit) && close(s.staked, row.staked), () => `${who}: list ${money(row.profit)}/${money(row.staked)}, profile ${money(s.profit)}/${money(s.staked)}`);
    check(close(s.roi, row.roi, 0.001) && close(s.winRate, row.winRate, 0.001), () => `${who}: ROI/win rate differ between list and profile`);
    // The profile's per-sport slices must add up to its total.
    check(s.sports.reduce((a, x) => a + x.bets, 0) === s.bets && close(s.sports.reduce((a, x) => a + x.profit, 0), s.profit), () => `${who}: sports don't add up to the total`);
    const ts = Object.values(s.timing).reduce((a, x) => a + x, 0);
    check(s.bets === 0 || Math.abs(ts - 1) < 1e-6, () => `${who}: timing shares add up to ${ts}`);
  }
}

// ─── 3. Independent recompute from Polymarket raw data (shared with the worker's continuous audit) ───

async function auditBettors(pool: string[]) {
  section("Per-bettor values vs Polymarket raw data");
  const sampleAddrs = [...new Set(pool)].sort(() => Math.random() - 0.5).slice(0, SAMPLE);
  const profiles = new Map<string, Profile>();
  let compared = 0;
  for (const address of sampleAddrs) {
    const views: Record<string, Profile> = {};
    for (const tf of ["7d", "30d", "all"]) views[tf] = await api<Profile>(`/api/bettors/${address}?tf=${tf}`);
    const p = views.all;
    profiles.set(address, p);
    if (p.bettor.historyTruncated || !p.bettor.lastIndexedAt) continue;
    const asOf = Math.floor(Date.parse(p.bettor.lastIndexedAt) / 1000);
    const r = { out: await recomputeFromRaw(address, asOf) };
    compared++;
    const who = `${p.bettor.name} ${address.slice(0, 10)}`;
    for (const tf of ["7d", "30d", "all"] as const) {
      const app = views[tf].filtered;
      const ref = r.out[tf];
      // Only bets that settled around the index moment may differ (they can land on either side of the snapshot).
      const slack = ref.edge.bets + 1;
      check(Math.abs(app.bets - ref.bets) <= slack, () => `${who} [${tf}] bets: app ${app.bets} vs raw ${ref.bets}`);
      check(Math.abs(app.wins - ref.wins) <= slack, () => `${who} [${tf}] wins: app ${app.wins} vs raw ${ref.wins}`);
      check(close(app.profit, ref.profit, 5 + ref.edge.profit, 0.002), () => `${who} [${tf}] profit: app ${money(app.profit)} vs raw ${money(ref.profit)}`);
      check(close(app.staked, ref.staked, 5 + ref.edge.staked, 0.002), () => `${who} [${tf}] staked: app ${money(app.staked)} vs raw ${money(ref.staked)}`);
      for (const sl of app.sports) {
        const rs = ref.sports[sl.sport] ?? { bets: 0, profit: 0 };
        check(Math.abs(sl.bets - rs.bets) <= slack && close(sl.profit, rs.profit, 5 + ref.edge.profit, 0.002), () => `${who} [${tf}] ${sl.sport}: app ${sl.bets} bets ${money(sl.profit)} vs raw ${rs.bets} bets ${money(rs.profit)}`);
      }
      for (const [t, share] of Object.entries(app.timing)) {
        const refShare = ref.bets ? (ref.timing[t] ?? 0) / ref.bets : 0;
        check(Math.abs(share - refShare) <= 0.02, () => `${who} [${tf}] timing ${t}: app ${(share * 100).toFixed(1)}% vs raw ${(refShare * 100).toFixed(1)}%`);
      }
    }
  }
  current.name += ` (${compared} bettors recomputed${SAMPLE > compared ? `; ${SAMPLE - compared} skipped: history too long or never indexed` : ""})`;
  return profiles;
}

// ─── 4. Bets, odds, returns ──────────────────────────────────────────────────
function auditBets(profiles: Map<string, Profile>) {
  section("Bets: bookmaker format, odds, returns");
  for (const [address, p] of profiles) {
    const who = `${p.bettor.name} ${address.slice(0, 10)}`;
    for (const b of p.positions) {
      const odds = 1 / b.avgPrice;
      check(b.avgPrice > 0 && b.avgPrice < 1, () => `${who} open "${b.title}": price ${b.avgPrice} gives no valid odds`);
      check(!!b.bet.selection && !!b.bet.market, () => `${who} open "${b.title}": empty selection or market`);
      check(b.bet.market !== b.title, () => `${who} open "${b.title}": not translated to a bookmaker market`);
      check(b.cost > 0 && b.size > 0, () => `${who} open "${b.title}": stake ${b.cost}, return ${b.size}`);
      // Returns ≈ stake × odds (stake includes fees, so returns can be a little lower).
      check(b.size <= b.cost * odds * 1.005 && b.size >= b.cost * odds * 0.85, () => `${who} open "${b.title}": returns ${money(b.size)} vs stake ${money(b.cost)} × odds ${odds.toFixed(2)}`);
      check(!("pnl" in b), () => `${who}: open bets still carry live profit`);
    }
    for (const r of p.recent) {
      check(!!r.bet.selection && !!r.bet.market, () => `${who} result "${r.title}": empty selection or market`);
      check(r.cost > 0 && r.pnl >= -r.cost * 1.001, () => `${who} result "${r.title}": lost ${money(-r.pnl)} on a ${money(r.cost)} stake`);
    }
  }
}

// ─── Run ─────────────────────────────────────────────────────────────────────
(async () => {
  const started = new Date();
  console.log(`Auditing ${BASE} …`);
  const { totals, samples } = await auditRankings();
  console.log(" rankings done");
  await auditListVsProfile(samples);
  console.log(" list vs profile done");
  const pool = [...(await listAll("tf=all")).rows, ...(await listAll("tf=30d")).rows].map((r) => r.address);
  const profiles = await auditBettors(pool);
  console.log(" per-bettor recompute done");
  auditBets(profiles);

  const failed = sections.reduce((a, s) => a + s.fails.length, 0);
  const lines = [
    `# CopyBet audit, ${started.toISOString().slice(0, 16).replace("T", " ")} UTC`,
    ``,
    `Site: ${BASE}. Ranked bettors: ${totals.get("all sort=roi")} all-time, ${totals.get("30d sort=roi")} last 30 days, ${totals.get("7d sort=roi")} last 7 days.`,
    ``,
    `**${failed === 0 ? "PASS" : `${failed} problem(s) found`}**`,
    ``,
    ...sections.flatMap((s) => [`## ${s.fails.length ? "FAIL" : "PASS"}: ${s.name}`, ``, `${s.checks.toLocaleString()} checks, ${s.fails.length} failed.`, ``, ...s.fails.slice(0, 40).map((f) => `- ${f}`), s.fails.length > 40 ? `- … and ${s.fails.length - 40} more` : "", ``]),
  ];
  writeFileSync(OUT, lines.join("\n"));
  console.log(lines.join("\n"));
  process.exit(failed ? 1 : 0);
})().catch((e) => {
  console.error(e);
  process.exit(2);
});
