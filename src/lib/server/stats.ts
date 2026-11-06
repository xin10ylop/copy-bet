// Stats queries. Every number is computed from SettledBet rows, so any filter
// combination (sports × timeframe × timing × ranges) works without precomputing.

import { db } from "./db";
import { DEFAULT_MIN_BETS, type BettorFilter, type BettorStats, type SportSlice, type TimingKey, timeframeSince } from "../filters";
import { displayName } from "../polymarket";

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

function betWhere(f: Pick<BettorFilter, "sports" | "timing" | "timeframe">, alias = "s") {
  const clauses: string[] = [];
  const params: unknown[] = [];
  const since = timeframeSince(f.timeframe);
  if (since) {
    clauses.push(`${alias}."settledTs" >= ?`);
    params.push(Math.floor(since.getTime() / 1000));
  }
  if (f.sports.length) {
    clauses.push(`${alias}."sport" IN (${f.sports.map(() => "?").join(",")})`);
    params.push(...f.sports);
  }
  if (f.timing.length) {
    clauses.push(`${alias}."timing" IN (${f.timing.map(() => "?").join(",")})`);
    params.push(...f.timing);
  }
  return { sql: clauses.length ? clauses.join(" AND ") : "1=1", params };
}

const SORT_SQL: Record<BettorFilter["sort"], string> = {
  roi: "roi DESC",
  profit: "profit DESC",
  winRate: "winRate DESC",
  followers: "followers DESC, profit DESC",
  bets: "bets DESC",
};

export async function listBettors(f: BettorFilter, limit = 30, offset = 0): Promise<{ rows: BettorRow[]; total: number }> {
  const where = betWhere(f);
  const having: string[] = [];
  const hp: unknown[] = [];
  const range = (expr: string, r: { min?: number; max?: number }) => {
    if (r.min !== undefined) {
      having.push(`${expr} >= ?`);
      hp.push(r.min);
    }
    if (r.max !== undefined) {
      having.push(`${expr} <= ?`);
      hp.push(r.max);
    }
  };
  range("roi", f.roi);
  range("winRate", f.winRate);
  range("profit", f.profit);
  range("bets", { min: f.bets.min ?? DEFAULT_MIN_BETS, max: f.bets.max });
  // Ignore dust: tiny stakes make ROI meaningless.
  range("staked", { min: MIN_STAKED });
  range("followers", f.followers);
  if (f.hasOpen) having.push("openCount > 0");

  const openSports = f.sports.length ? `AND o."sport" IN (${f.sports.map(() => "?").join(",")})` : "";
  const base = `
    SELECT b."address" AS address, b."name" AS name, b."pseudonym" AS pseudonym, b."profileImage" AS profileImage, b."verified" AS verified,
      COUNT(s."id") AS bets,
      SUM(CASE WHEN s."pnl" > 0 THEN 1 ELSE 0 END) AS wins,
      SUM(s."cost") AS staked,
      SUM(s."pnl") AS profit,
      100.0 * SUM(s."pnl") / MAX(SUM(s."cost"), 1) AS roi,
      100.0 * SUM(CASE WHEN s."pnl" > 0 THEN 1 ELSE 0 END) / COUNT(s."id") AS winRate,
      (SELECT COUNT(*) FROM "Follow" fo WHERE fo."bettorId" = b."address") AS followers,
      (SELECT COUNT(*) FROM "OpenPosition" o WHERE o."bettorId" = b."address" ${openSports}) AS openCount
    FROM "Bettor" b JOIN "SettledBet" s ON s."bettorId" = b."address"
    WHERE b."isMarketMaker" = false AND ${where.sql}
    GROUP BY b."address"
    ${having.length ? `HAVING ${having.join(" AND ")}` : ""}`;
  const params = [...f.sports, ...where.params, ...hp];

  const [rows, count] = await Promise.all([
    db.$queryRawUnsafe<Record<string, unknown>[]>(`${base} ORDER BY ${SORT_SQL[f.sort]} LIMIT ? OFFSET ?`, ...params, limit, offset),
    db.$queryRawUnsafe<{ n: number | bigint }[]>(`SELECT COUNT(*) AS n FROM (${base}) t`, ...params),
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
  const where = betWhere({ sports: [], timing: [], timeframe: f.timeframe });
  const rows = await db.$queryRawUnsafe<{ bettorId: string; sport: string; n: number | bigint }[]>(
    `SELECT s."bettorId" AS bettorId, s."sport" AS sport, COUNT(*) AS n FROM "SettledBet" s
     WHERE s."bettorId" IN (${addresses.map(() => "?").join(",")}) AND ${where.sql}
     GROUP BY s."bettorId", s."sport"`,
    ...addresses,
    ...where.params,
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

export function computeStats(rows: { sport: string; cost: number; pnl: number; timing: string; leadMinutes: number | null }[]): BettorStats {
  const bets = rows.length;
  const wins = rows.filter((r) => r.pnl > 0).length;
  const staked = rows.reduce((a, r) => a + r.cost, 0);
  const profit = rows.reduce((a, r) => a + r.pnl, 0);
  const timing = Object.fromEntries(TIMING_KEYS.map((k) => [k, 0])) as Record<TimingKey, number>;
  for (const r of rows) timing[r.timing as TimingKey] = (timing[r.timing as TimingKey] ?? 0) + 1;
  for (const k of TIMING_KEYS) timing[k] = bets ? timing[k] / bets : 0;
  const leads = rows.map((r) => r.leadMinutes).filter((x): x is number => x !== null).sort((a, b) => a - b);
  const bySport = new Map<string, typeof rows>();
  for (const r of rows) bySport.set(r.sport, [...(bySport.get(r.sport) ?? []), r]);
  const sports: SportSlice[] = [...bySport.entries()]
    .map(([sport, rs]) => {
      const st = rs.reduce((a, r) => a + r.cost, 0);
      const pr = rs.reduce((a, r) => a + r.pnl, 0);
      const w = rs.filter((r) => r.pnl > 0).length;
      return { sport, bets: rs.length, wins: w, staked: st, profit: pr, roi: st ? (100 * pr) / st : 0, share: rs.length / (bets || 1) };
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
    medianLeadMinutes: leads.length ? leads[Math.floor(leads.length / 2)] : null,
    sports,
  };
}

export async function bettorStats(address: string, f: Pick<BettorFilter, "sports" | "timing" | "timeframe">) {
  const since = timeframeSince(f.timeframe);
  const rows = await db.settledBet.findMany({
    where: {
      bettorId: address,
      ...(since ? { settledTs: { gte: Math.floor(since.getTime() / 1000) } } : {}),
      ...(f.sports.length ? { sport: { in: f.sports } } : {}),
      ...(f.timing.length ? { timing: { in: f.timing } } : {}),
    },
    select: { sport: true, cost: true, pnl: true, timing: true, leadMinutes: true },
  });
  return computeStats(rows);
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
    positions: positions.map((p) => ({ ...p, entryAt: p.entryAt.toISOString(), gameStartAt: p.gameStartAt?.toISOString() ?? null })),
    recent: recent.map((r) => ({
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
      settledAt: r.settledAt.toISOString(),
    })),
  };
}

export type BettorProfile = NonNullable<Awaited<ReturnType<typeof bettorProfile>>>;

/** Headline numbers for the landing page, from real indexed data. */
export async function landingStats() {
  const since30 = Math.floor((Date.now() - 30 * 86400_000) / 1000);
  const [tracked, perSport, top] = await Promise.all([
    db.bettor.count({ where: { isMarketMaker: false } }),
    db.$queryRawUnsafe<{ sport: string; bettors: number | bigint; bets: number | bigint; best: number }[]>(
      `SELECT sport, COUNT(DISTINCT bettorId) AS bettors, SUM(n) AS bets, MAX(p) AS best FROM (
         SELECT s."sport" AS sport, s."bettorId" AS bettorId, COUNT(*) AS n, SUM(s."pnl") AS p FROM "SettledBet" s
         JOIN "Bettor" b ON b."address" = s."bettorId" AND b."isMarketMaker" = false
         WHERE s."settledTs" >= ? GROUP BY s."sport", s."bettorId") GROUP BY sport`,
      since30,
    ),
    listBettors({ sports: [], timeframe: "30d", timing: [], roi: {}, winRate: {}, profit: {}, bets: { min: 20 }, followers: {}, hasOpen: false, sort: "profit" }, 6),
  ]);
  return {
    tracked,
    perSport: Object.fromEntries(perSport.map((r) => [r.sport, { bettors: Number(r.bettors), bets: Number(r.bets), best: Number(r.best) }])),
    top: top.rows,
  };
}
