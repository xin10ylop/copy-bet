// Pulls a bettor's Polymarket history and stores it as settled bets + open positions,
// tagged with sport, league and timing (how long before kickoff the bet was placed).

import { db } from "./db";
import * as pm from "../polymarket";
import { classifySlug, classifyTags, classifyWithMeta, loadLeagueCodes } from "../sports";
import { LEAD_EDGES, leadBucket, timingFor } from "../filters";

const MIN_STAKE = 1; // USD — ignore dust
const RECENT_BETS_KEPT = 30;
/** Largest open positions stored per bettor (the profile shows up to 60). */
const OPEN_KEPT = 100;
/** Position history read per bettor. Pages are 1,000 rows; very active accounts have more. */
const MAX_CLOSED = 50_000;
const MAX_OPEN = 10_000;
/** Daily rows are kept for this many days (7d / 30d windows); older ones are merged per month. */
const DAILY_DAYS = 35;

/** Tracked bettors: the top TOP_N of each sports leaderboard (all-time, last 30 days, last 7 days, by profit). */
export const TOP_N = 1_000;

type Meta = { slug: string; title: string | null; isGame: boolean; startTime: Date | null; league: string | null; sport: string | null; fetchedAt: Date };

/** Event details (title, start time, sport from Polymarket's tags), cached in EventMeta; missing ones come from Gamma. */
export async function eventMeta(slugs: string[]) {
  const unique = [...new Set(slugs)].filter(Boolean);
  const known = unique.length ? await db.eventMeta.findMany({ where: { slug: { in: unique } } }) : [];
  const map = new Map<string, Meta>(known.map((e) => [e.slug, e]));
  // Re-check game events that had no start time yet (at most once an hour), and rows saved before tags were stored.
  const stale = (e: Meta) => (e.isGame && !e.startTime && Date.now() - e.fetchedAt.getTime() > 3600_000) || (e.sport === null && !classifySlug(e.slug));
  const missing = unique.filter((s) => !map.has(s) || stale(map.get(s)!));
  if (missing.length) {
    const events = await pm.gammaEvents(missing);
    const rows: Meta[] = events.map((e) => {
      const tags = (e.tags ?? []).map((t) => t.slug);
      const cls = classifySlug(e.slug) ?? classifyTags(tags);
      return {
        slug: e.slug,
        // Non-sports events only need their "not sports" mark; skip the rest to keep the cache small.
        title: cls ? (e.title ?? null) : null,
        isGame: !!cls && tags.includes("games"),
        startTime: cls && e.startTime ? new Date(e.startTime) : null,
        league: cls?.league ?? null,
        sport: cls?.sport ?? "",
        fetchedAt: new Date(),
      };
    });
    for (const r of rows) map.set(r.slug, r);
    await upsertEvents(rows);
  }
  return map;
}

/** Bulk upsert in a few round trips (one query per 500 events), not one per event. */
async function upsertEvents(rows: Meta[]) {
  const unique = [...new Map(rows.map((r) => [r.slug, r])).values()];
  for (let i = 0; i < unique.length; i += 500) {
    const chunk = unique.slice(i, i + 500);
    const values: unknown[] = [];
    const tuples = chunk.map((r) => {
      const n = values.length;
      values.push(r.slug, r.title, r.league, r.isGame, r.startTime, r.sport, r.fetchedAt);
      return `($${n + 1}, $${n + 2}, $${n + 3}, $${n + 4}, $${n + 5}, $${n + 6}, $${n + 7})`;
    });
    await db.$executeRawUnsafe(
      `INSERT INTO "EventMeta" ("slug", "title", "league", "isGame", "startTime", "sport", "fetchedAt") VALUES ${tuples.join(",")}
       ON CONFLICT ("slug") DO UPDATE SET "title" = EXCLUDED."title", "league" = EXCLUDED."league", "isGame" = EXCLUDED."isGame",
         "startTime" = EXCLUDED."startTime", "sport" = EXCLUDED."sport", "fetchedAt" = EXCLUDED."fetchedAt"`,
      ...values,
    );
  }
}

export interface IndexHint {
  name?: string;
  profileImage?: string;
  xUsername?: string;
  verified?: boolean;
  lbPnlMonth?: number;
  lbPnlAll?: number;
  lbVolumeAll?: number;
}

export async function indexBettor(addressRaw: string, hint: IndexHint = {}) {
  const address = addressRaw.toLowerCase();
  await loadLeagueCodes();

  // CLOSED = exited positions. OPEN is a superset: live positions plus resolved-but-unredeemed
  // ones (winners and losers), which come back with redeemable=true / status REDEEMABLE.
  const [closed, openAll] = await Promise.all([pm.positions(address, "CLOSED", MAX_CLOSED), pm.positions(address, "OPEN", MAX_OPEN)]);
  const historyTruncated = closed.length >= MAX_CLOSED || openAll.length >= MAX_OPEN;
  const resolved = openAll.filter((p) => p.redeemable || p.status === "REDEEMABLE");
  const open = openAll.filter((p) => !(p.redeemable || p.status === "REDEEMABLE"));

  // Market-maker heuristic: holding both sides of many markets.
  const all = [...closed, ...openAll];
  const sidesByCondition = new Map<string, Set<number>>();
  for (const p of all) {
    const s = sidesByCondition.get(p.condition_id) ?? new Set<number>();
    s.add(p.outcome_index);
    sidesByCondition.set(p.condition_id, s);
  }
  const twoSided = [...sidesByCondition.values()].filter((s) => s.size > 1).length;
  const isMarketMaker = sidesByCondition.size >= 40 && twoSided / sidesByCondition.size > 0.35;

  // Sport: league code in the slug, else Polymarket's own event tags (older markets have no league code).
  const meta = await eventMeta(all.map((p) => p.event_slug));
  const classify = (p: pm.Position) => classifyWithMeta(p.event_slug, p.title, meta.get(p.event_slug));
  const settledSrc = [...closed, ...resolved].map((p) => ({ p, cls: classify(p) })).filter((x) => x.cls !== null);
  const openSrc = open
    .filter((p) => p.current_size > 0)
    .map((p) => ({ p, cls: classify(p) }))
    .filter((x) => x.cls !== null);
  const nowS = Math.floor(Date.now() / 1000);

  const settledRows = settledSrc
    .map(({ p, cls }) => {
      const cost = pm.stakeOf(p);
      const pnl = p.status === "CLOSED" ? p.realized_pnl : (p.total_pnl ?? p.realized_pnl);
      const m = meta.get(p.event_slug);
      const start = m?.startTime ?? null;
      const entryS = p.first_entry_at || p.last_event_at;
      const lead = start ? Math.round((start.getTime() / 1000 - entryS) / 60) : null;
      const endS = p.end_date ? Math.floor(Date.parse(p.end_date) / 1000) : 0;
      const settledS = p.status === "CLOSED" ? p.last_event_at : Math.min(nowS, Math.max(p.last_event_at, endS || p.last_event_at));
      return {
        id: `${address}:${p.condition_id}:${p.outcome_index}`,
        conditionId: p.condition_id,
        bettorId: address,
        sport: cls!.sport,
        league: cls!.league,
        eventSlug: p.event_slug,
        title: p.title,
        outcome: p.outcome,
        cost,
        pnl,
        entryAt: new Date(entryS * 1000),
        settledAt: new Date(settledS * 1000),
        settledTs: settledS,
        gameStartAt: start,
        leadMinutes: m?.isGame ? lead : null,
        timing: timingFor(lead, !!m?.isGame),
        icon: p.icon || null,
      };
    })
    .filter((b) => Number.isFinite(b.cost) && Number.isFinite(b.pnl));
  // One bet per market: rows for the same market (re-entries, or both sides held, e.g. after a "split")
  // are combined. Polymarket books a split's cost on one side only, so per-side figures would be meaningless.
  const settledMap = new Map<string, (typeof settledRows)[number] & { sideCost: number }>();
  for (const b of settledRows) {
    const prev = settledMap.get(b.conditionId);
    if (!prev) {
      settledMap.set(b.conditionId, { ...b, sideCost: b.cost });
      continue;
    }
    // Show the side they put the most money on.
    if (b.cost > prev.sideCost) Object.assign(prev, { id: b.id, outcome: b.outcome, title: b.title, sideCost: b.cost });
    prev.cost += b.cost;
    prev.pnl += b.pnl;
    if (b.entryAt < prev.entryAt) Object.assign(prev, { entryAt: b.entryAt, leadMinutes: b.leadMinutes, timing: b.timing });
    if (b.settledTs > prev.settledTs) Object.assign(prev, { settledAt: b.settledAt, settledTs: b.settledTs });
  }
  const settled = [...settledMap.values()].filter((b) => b.cost >= MIN_STAKE).map(({ conditionId: _c, sideCost: _s, ...b }) => b);

  // Stats are stored as daily totals (merged per month once older than DAILY_DAYS); only the latest bets are kept individually.
  const today = Math.floor(nowS / 86400);
  const bucket = (day: number) => {
    if (day >= today - DAILY_DAYS) return day;
    const d = new Date(day * 86400_000);
    return Math.floor(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1) / 86400_000);
  };
  const dailyMap = new Map<string, { bettorId: string; day: number; sport: string; timing: string; bets: number; wins: number; staked: number; profit: number; leadHist: number[] }>();
  for (const b of settled) {
    const day = bucket(Math.floor(b.settledTs / 86400));
    const key = `${day}:${b.sport}:${b.timing}`;
    const row = dailyMap.get(key) ?? { bettorId: address, day, sport: b.sport, timing: b.timing, bets: 0, wins: 0, staked: 0, profit: 0, leadHist: Array(LEAD_EDGES.length - 1).fill(0) };
    row.bets++;
    if (b.leadMinutes !== null) row.leadHist[leadBucket(b.leadMinutes)]++;
    if (b.pnl > 0) row.wins++;
    row.staked += b.cost;
    row.profit += b.pnl;
    dailyMap.set(key, row);
  }
  const daily = [...dailyMap.values()];
  const recent = settled.sort((a, b) => b.settledTs - a.settledTs).slice(0, RECENT_BETS_KEPT);

  const allPositions = openSrc.map(({ p, cls }) => {
    const m = meta.get(p.event_slug);
    const start = m?.startTime ?? null;
    const entryS = p.first_entry_at || p.last_event_at;
    const lead = start ? Math.round((start.getTime() / 1000 - entryS) / 60) : null;
    return {
      id: `${address}:${p.token_id}`,
      bettorId: address,
      sport: cls!.sport,
      league: cls!.league,
      eventSlug: p.event_slug,
      title: p.title,
      outcome: p.outcome,
      outcomeIndex: p.outcome_index,
      size: p.current_size,
      avgPrice: p.avg_price,
      cost: p.total_cost_usdc || p.entry_cost_usdc || p.avg_price * p.current_size,
      currentValue: p.current_value,
      pnl: p.unrealized_pnl,
      entryAt: new Date(entryS * 1000),
      gameStartAt: start,
      timing: timingFor(lead, !!m?.isGame),
      icon: p.icon || null,
    };
  });
  const positions = allPositions.sort((a, b) => b.cost - a.cost).slice(0, OPEN_KEPT);

  const sample = all[0];
  const name = hint.name ?? sample?.name ?? null;
  // Users without a username get an auto name like "0xabc…-1759…"; their trades carry a readable pseudonym.
  let pseudonym: string | undefined;
  if (!name || /^0x[0-9a-f]{40}/i.test(name)) pseudonym = (await pm.trades(address, 1).catch(() => []))[0]?.pseudonym;
  const bettor = {
    name,
    pseudonym,
    profileImage: hint.profileImage || sample?.profile_image || null,
    xUsername: hint.xUsername || null,
    verified: hint.verified ?? sample?.verified ?? false,
    isMarketMaker,
    lbPnlMonth: hint.lbPnlMonth,
    lbPnlAll: hint.lbPnlAll,
    lbVolumeAll: hint.lbVolumeAll,
    openCount: allPositions.length,
    historyTruncated,
    lastIndexedAt: new Date(),
  };

  await db.$transaction([
    db.bettor.upsert({ where: { address }, create: { address, ...bettor }, update: stripUndefined(bettor) }),
    db.dailyStat.deleteMany({ where: { bettorId: address } }),
    db.settledBet.deleteMany({ where: { bettorId: address } }),
    db.openPosition.deleteMany({ where: { bettorId: address } }),
    db.dailyStat.createMany({ data: daily }),
    db.settledBet.createMany({ data: recent }),
    db.openPosition.createMany({ data: positions }),
  ]);

  return { address, settled: settled.length, open: allPositions.length, isMarketMaker, historyTruncated };
}

function stripUndefined<T extends object>(o: T): Partial<T> {
  return Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined)) as Partial<T>;
}

/** Make sure a bettor exists and is reasonably fresh (used when someone opens a profile). */
export async function ensureIndexed(address: string, maxAgeMs = 30 * 60_000) {
  const b = await db.bettor.findUnique({ where: { address: address.toLowerCase() } });
  if (b?.lastIndexedAt && Date.now() - b.lastIndexedAt.getTime() < maxAgeMs) return b;
  await indexBettor(address);
  return db.bettor.findUnique({ where: { address: address.toLowerCase() } });
}

/** The top TOP_N bettors of each sports leaderboard (all-time, 30-day and 7-day profit), merged. */
export async function trackedBettors() {
  const [all, month, week] = await Promise.all([
    pm.sportsLeaderboard("all", "PNL", TOP_N),
    pm.sportsLeaderboard("month", "PNL", TOP_N),
    pm.sportsLeaderboard("week", "PNL", TOP_N),
  ]);
  const hints = new Map<string, IndexHint>();
  const add = (e: pm.LeaderboardEntry, extra: Partial<IndexHint>) => {
    const a = e.user_id.toLowerCase();
    hints.set(a, { ...hints.get(a), name: e.user_name, profileImage: e.profile_image, xUsername: e.x_username, verified: e.verified, ...extra });
  };
  all.forEach((e) => add(e, { lbPnlAll: e.pnl, lbVolumeAll: e.volume }));
  month.forEach((e) => add(e, { lbPnlMonth: e.pnl }));
  week.forEach((e) => add(e, {}));
  return hints;
}

/** Remove bettors who dropped off every leaderboard's top TOP_N, unless someone follows them. */
export async function pruneUntracked(hints?: Map<string, IndexHint>) {
  const tracked = hints ?? (await trackedBettors());
  if (tracked.size < TOP_N) return 0; // leaderboard fetch looked incomplete: don't delete anything
  const followed = new Set((await db.follow.findMany({ distinct: ["bettorId"], select: { bettorId: true } })).map((f) => f.bettorId));
  const all = await db.bettor.findMany({ select: { address: true } });
  const drop = all.map((b) => b.address).filter((a) => !tracked.has(a) && !followed.has(a));
  for (let i = 0; i < drop.length; i += 500) await db.bettor.deleteMany({ where: { address: { in: drop.slice(i, i + 500) } } });
  return drop.length;
}

/** Stable shard for an address (0 … of-1). */
export const shardOf = (address: string, of: number) => parseInt(address.slice(-6), 16) % of;

/**
 * Index every tracked bettor, never-indexed and oldest first.
 * Run on a schedule (cron / worker / `npm run index`); `shard`/`of` split the work across parallel runs.
 */
export async function indexLeaderboards(
  opts: { concurrency?: number; maxAgeMs?: number; log?: (s: string) => void; /** stop starting new bettors after this time (epoch ms) */ deadline?: number; maxBettors?: number; shard?: number; of?: number } = {},
) {
  const { concurrency = 4, maxAgeMs = 20 * 3600_000, log = () => {}, deadline = Infinity, maxBettors = Infinity, shard = 0, of = 1 } = opts;
  const hints = await trackedBettors();
  const last = new Map(
    (await db.bettor.findMany({ select: { address: true, lastIndexedAt: true } })).map((b) => [b.address, b.lastIndexedAt?.getTime() ?? 0]),
  );
  const cutoff = Date.now() - maxAgeMs;
  const stale = [...hints.entries()]
    .filter(([a]) => shardOf(a, of) === shard && (last.get(a) ?? 0) < cutoff)
    .sort(([a], [b]) => (last.get(a) ?? 0) - (last.get(b) ?? 0));
  const queue = stale.slice(0, maxBettors);
  log(`tracked: ${hints.size} bettors; shard ${shard}/${of}: ${stale.length} to index`);
  let done = 0;
  await Promise.all(
    Array.from({ length: concurrency }, async () => {
      for (let item = queue.shift(); item && Date.now() < deadline; item = queue.shift()) {
        const [address, hint] = item;
        try {
          const r = await indexBettor(address, hint);
          log(`[${++done}] ${address} ${r.settled} settled, ${r.open} open${r.isMarketMaker ? " (market maker)" : ""}${r.historyTruncated ? " (history truncated)" : ""}`);
        } catch (e) {
          log(`[${++done}] ${address} failed: ${(e as Error).message}`);
        }
      }
    }),
  );
  return { total: hints.size, stale: stale.length, indexed: done, remaining: stale.length - done };
}
