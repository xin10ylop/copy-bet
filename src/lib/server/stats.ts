// Stats queries. Every number is computed from SettledBet rows, so any filter
// combination (sports × timeframe × timing × ranges) works without precomputing.

import { db } from "./db";
import { DEFAULT_MIN_BETS, type BettorFilter, type BettorStats, type SportSlice, type TimingKey, timeframeSince } from "../filters";
import { displayName } from "../polymarket";
import { withBook } from "./bets";

/** Minimum total stake (USD) in the selected bets for a bettor to be ranked. */
export const MIN_STAKED = 1000;

export interface BettorRow {
  address: string;
  name: string;
  profileImage: string | null;
  verified: boolean;
  bets: number;
  wins: number;
  winRate: number;
  staked: number;
  profit: number;
  roi: number;
  followers: number;
  openCount: number;
  topSports: { sport: string; share: number }[];
}

/** Collects positional parameters for Postgres ($1, $2, …). */
class Params {
  values: unknown[] = [];
  add(v: unknown) {
    this.values.push(v);
    return `$${this.values.length}`;
  }
  list(vs: unknown[]) {
    return vs.map((v) => this.add(v)).join(",");
  }
}

/** First day (days since epoch) inside the timeframe, or null for all time. */
function sinceDay(tf: BettorFilter["timeframe"]) {
  const since = timeframeSince(tf);
  return since ? Math.floor(since.getTime() / 86400_000) : null;
}

/** WHERE clause over "DailyStat" rows (alias d) for a sport/timing/timeframe filter. */
function betWhere(f: Pick<BettorFilter, "sports" | "timing" | "timeframe">, p: Params, alias = "d") {
  const clauses: string[] = [];
  const day = sinceDay(f.timeframe);
  if (day !== null) clauses.push(`${alias}."day" >= ${p.add(day)}`);
  if (f.sports.length) clauses.push(`${alias}."sport" IN (${p.list(f.sports)})`);
  if (f.timing.length) clauses.push(`${alias}."timing" IN (${p.list(f.timing)})`);
  return clauses.length ? clauses.join(" AND ") : "TRUE";
}

const SORT_SQL: Record<BettorFilter["sort"], string> = {
  roi: `"roi" DESC`,
  profit: `"profit" DESC`,
  winRate: `"winRate" DESC`,
  followers: `"followers" DESC, "profit" DESC`,
  bets: `"bets" DESC`,
};

export async function listBettors(f: BettorFilter, limit = 30, offset = 0): Promise<{ rows: BettorRow[]; total: number }> {
  const p = new Params();
  const openSports = f.sports.length ? `AND o."sport" IN (${p.list(f.sports)})` : "";
  const where = betWhere(f, p);

  // Filters on aggregates go in an outer WHERE so they can use the column names.
  const outer: string[] = [];
  const range = (col: string, r: { min?: number; max?: number }) => {
    if (r.min !== undefined) outer.push(`"${col}" >= ${p.add(r.min)}`);
    if (r.max !== undefined) outer.push(`"${col}" <= ${p.add(r.max)}`);
  };
  range("roi", f.roi);
  range("winRate", f.winRate);
  range("profit", f.profit);
  range("bets", { min: f.bets.min ?? DEFAULT_MIN_BETS, max: f.bets.max });
  // Ignore dust: tiny stakes make ROI meaningless.
  range("staked", { min: MIN_STAKED });
  range("followers", f.followers);
  if (f.hasOpen) outer.push(`"openCount" > 0`);

  const base = `
    SELECT * FROM (
      SELECT b."address" AS "address", b."name" AS "name", b."pseudonym" AS "pseudonym", b."profileImage" AS "profileImage", b."verified" AS "verified",
        SUM(d."bets")::int AS "bets",
        SUM(d."wins")::int AS "wins",
        SUM(d."staked")::float8 AS "staked",
        SUM(d."profit")::float8 AS "profit",
        (100.0 * SUM(d."profit") / GREATEST(SUM(d."staked"), 1))::float8 AS "roi",
        (100.0 * SUM(d."wins") / GREATEST(SUM(d."bets"), 1))::float8 AS "winRate",
        (SELECT COUNT(*) FROM "Follow" fo WHERE fo."bettorId" = b."address")::int AS "followers",
        (SELECT COUNT(*) FROM "OpenPosition" o WHERE o."bettorId" = b."address" ${openSports})::int AS "openCount"
      FROM "Bettor" b JOIN "DailyStat" d ON d."bettorId" = b."address"
      WHERE b."isMarketMaker" = false AND ${where}
      GROUP BY b."address"
    ) t
    ${outer.length ? `WHERE ${outer.join(" AND ")}` : ""}`;

  const countParams = [...p.values];
  const lim = p.add(limit);
  const off = p.add(offset);
  const [rows, count] = await Promise.all([
    db.$queryRawUnsafe<Record<string, unknown>[]>(`${base} ORDER BY ${SORT_SQL[f.sort]} LIMIT ${lim} OFFSET ${off}`, ...p.values),
    db.$queryRawUnsafe<{ n: number }[]>(`SELECT COUNT(*)::int AS "n" FROM (${base}) c`, ...countParams),
  ]);

  const addresses = rows.map((r) => String(r.address));
  const mix = addresses.length ? await sportMix(addresses, f) : new Map<string, { sport: string; share: number }[]>();

  return {
    total: Number(count[0]?.n ?? 0),
    rows: rows.map((r) => ({
      address: String(r.address),
      name: displayName(r.name as string, r.pseudonym as string, String(r.address)),
      profileImage: (r.profileImage as string) || null,
      verified: Boolean(r.verified),
      bets: Number(r.bets),
      wins: Number(r.wins),
      winRate: Number(r.winRate),
      staked: Number(r.staked),
      profit: Number(r.profit),
      roi: Number(r.roi),
      followers: Number(r.followers),
      openCount: Number(r.openCount),
      topSports: mix.get(String(r.address)) ?? [],
    })),
  };
}

/** Each bettor's sport mix over the timeframe (ignores the sport filter on purpose). */
async function sportMix(addresses: string[], f: BettorFilter) {
  const p = new Params();
  const inList = p.list(addresses);
  const where = betWhere({ sports: [], timing: [], timeframe: f.timeframe }, p);
  const rows = await db.$queryRawUnsafe<{ bettorId: string; sport: string; n: number }[]>(
    `SELECT d."bettorId" AS "bettorId", d."sport" AS "sport", SUM(d."bets")::int AS "n" FROM "DailyStat" d
     WHERE d."bettorId" IN (${inList}) AND ${where}
     GROUP BY d."bettorId", d."sport"`,
    ...p.values,
  );
  const out = new Map<string, { sport: string; share: number }[]>();
  const totals = new Map<string, number>();
  for (const r of rows) totals.set(r.bettorId, (totals.get(r.bettorId) ?? 0) + Number(r.n));
  for (const r of rows) {
    const list = out.get(r.bettorId) ?? [];
    list.push({ sport: r.sport, share: Number(r.n) / (totals.get(r.bettorId) || 1) });
    out.set(r.bettorId, list);
  }
  for (const list of out.values()) list.sort((a, b) => b.share - a.share);
  return out;
}

const TIMING_KEYS: TimingKey[] = ["early", "day", "late", "live", "futures"];

type DailyRow = { sport: string; timing: string; bets: number; wins: number; staked: number; profit: number };

/** Combine daily totals into a bettor's stats. `leads` = minutes before kickoff of their recent bets. */
export function computeStats(rows: DailyRow[], leads: number[] = []): BettorStats {
  const sum = (rs: DailyRow[], k: "bets" | "wins" | "staked" | "profit") => rs.reduce((a, r) => a + r[k], 0);
  const bets = sum(rows, "bets");
  const wins = sum(rows, "wins");
  const staked = sum(rows, "staked");
  const profit = sum(rows, "profit");
  const timing = Object.fromEntries(TIMING_KEYS.map((k) => [k, 0])) as Record<TimingKey, number>;
  for (const r of rows) timing[r.timing as TimingKey] = (timing[r.timing as TimingKey] ?? 0) + r.bets;
  for (const k of TIMING_KEYS) timing[k] = bets ? timing[k] / bets : 0;
  const sorted = [...leads].sort((a, b) => a - b);
  const bySport = new Map<string, DailyRow[]>();
  for (const r of rows) bySport.set(r.sport, [...(bySport.get(r.sport) ?? []), r]);
  const sports: SportSlice[] = [...bySport.entries()]
    .map(([sport, rs]) => {
      const st = sum(rs, "staked");
      const pr = sum(rs, "profit");
      const n = sum(rs, "bets");
      return { sport, bets: n, wins: sum(rs, "wins"), staked: st, profit: pr, roi: st ? (100 * pr) / st : 0, share: n / (bets || 1) };
    })
    .sort((a, b) => b.bets - a.bets);
  return {
    bets,
    wins,
    winRate: bets ? (100 * wins) / bets : 0,
    staked,
    profit,
    roi: staked ? (100 * profit) / staked : 0,
    timing,
    medianLeadMinutes: sorted.length ? sorted[Math.floor(sorted.length / 2)] : null,
    sports,
  };
}

export async function bettorStats(address: string, f: Pick<BettorFilter, "sports" | "timing" | "timeframe">) {
  const day = sinceDay(f.timeframe);
  const filter = {
    bettorId: address,
    ...(f.sports.length ? { sport: { in: f.sports } } : {}),
    ...(f.timing.length ? { timing: { in: f.timing } } : {}),
  };
  const [rows, recent] = await Promise.all([
    db.dailyStat.findMany({ where: { ...filter, ...(day !== null ? { day: { gte: day } } : {}) }, select: { sport: true, timing: true, bets: true, wins: true, staked: true, profit: true } }),
    // Median lead time comes from the bettor's most recent bets that match.
    db.settledBet.findMany({ where: { ...filter, leadMinutes: { not: null } }, select: { leadMinutes: true } }),
  ]);
  return computeStats(
    rows,
    recent.map((r) => r.leadMinutes!),
  );
}

export async function bettorProfile(address: string, f: BettorFilter) {
  const bettor = await db.bettor.findUnique({ where: { address } });
  if (!bettor) return null;
  const narrowed = f.sports.length > 0 || f.timing.length > 0;
  const [filtered, everything, positions, recent, followers] = await Promise.all([
    bettorStats(address, f),
    narrowed ? bettorStats(address, { sports: [], timing: [], timeframe: f.timeframe }) : null,
    db.openPosition.findMany({ where: { bettorId: address }, orderBy: { cost: "desc" }, take: 60 }),
    db.settledBet.findMany({ where: { bettorId: address }, orderBy: { settledTs: "desc" }, take: 40 }),
    db.follow.count({ where: { bettorId: address } }),
  ]);
  return {
    bettor: {
      address: bettor.address,
      name: displayName(bettor.name, bettor.pseudonym, bettor.address),
      profileImage: bettor.profileImage,
      verified: bettor.verified,
      xUsername: bettor.xUsername,
      isMarketMaker: bettor.isMarketMaker,
      lastIndexedAt: bettor.lastIndexedAt?.toISOString() ?? null,
    },
    followers,
    filtered,
    everything: everything ?? filtered,
    narrowed,
    positions: (await withBook(positions)).map((p) => ({ ...p, entryAt: p.entryAt.toISOString(), gameStartAt: p.gameStartAt?.toISOString() ?? null })),
    recent: (await withBook(recent.map((r) => ({ ...r, outcomeIndex: Number(r.id.split(":")[2]) })))).map((r) => ({
      id: r.id,
      sport: r.sport,
      league: r.league,
      title: r.title,
      outcome: r.outcome,
      cost: r.cost,
      pnl: r.pnl,
      timing: r.timing,
      eventSlug: r.eventSlug,
      icon: r.icon,
      bet: r.bet,
      settledAt: r.settledAt.toISOString(),
    })),
  };
}

export type BettorProfile = NonNullable<Awaited<ReturnType<typeof bettorProfile>>>;

/** Headline numbers for the landing page, from real indexed data. */
export async function landingStats() {
  const [tracked, perSport, top, winners] = await Promise.all([
    db.bettor.count({ where: { isMarketMaker: false } }),
    db.$queryRawUnsafe<{ sport: string; bettors: number; bets: number; best: number }[]>(
      `SELECT "sport", COUNT(DISTINCT "bettorId")::int AS "bettors", SUM("n")::int AS "bets", MAX("p")::float8 AS "best" FROM (
         SELECT d."sport" AS "sport", d."bettorId" AS "bettorId", SUM(d."bets") AS "n", SUM(d."profit") AS "p" FROM "DailyStat" d
         JOIN "Bettor" b ON b."address" = d."bettorId" AND b."isMarketMaker" = false
         WHERE d."day" >= $1 GROUP BY d."sport", d."bettorId") x GROUP BY "sport"`,
      sinceDay("30d"),
    ),
    listBettors({ sports: [], timeframe: "30d", timing: [], roi: {}, winRate: {}, profit: {}, bets: { min: 20 }, followers: {}, hasOpen: false, sort: "profit" }, 6),
    // Bettors who are up over the last 30 days, and how much they won together.
    db.$queryRawUnsafe<{ n: number; total: number }[]>(
      `SELECT COUNT(*)::int AS "n", COALESCE(SUM("p"), 0)::float8 AS "total" FROM (
         SELECT SUM(d."profit") AS "p" FROM "DailyStat" d
         JOIN "Bettor" b ON b."address" = d."bettorId" AND b."isMarketMaker" = false
         WHERE d."day" >= $1 GROUP BY d."bettorId" HAVING SUM(d."profit") > 0) w`,
      sinceDay("30d"),
    ),
  ]);
  return {
    tracked,
    winners30d: { count: Number(winners[0]?.n ?? 0), profit: Number(winners[0]?.total ?? 0) },
    perSport: Object.fromEntries(perSport.map((r) => [r.sport, { bettors: Number(r.bettors), bets: Number(r.bets), best: Number(r.best) }])),
    top: top.rows,
  };
}
