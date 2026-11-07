// Pulls a bettor's Polymarket history and stores it as settled bets + open positions,
// tagged with sport, league and timing (how long before kickoff the bet was placed).

import { db } from "./db";
import * as pm from "../polymarket";
import { classifyEvent, loadLeagueCodes } from "../sports";
import { timingFor } from "../filters";

const MIN_STAKE = 1; // USD — ignore dust
const RECENT_BETS_KEPT = 50;

export async function eventMeta(slugs: string[]) {
  const unique = [...new Set(slugs)];
  const known = await db.eventMeta.findMany({ where: { slug: { in: unique } } });
  const map = new Map(known.map((e) => [e.slug, e]));
  // Re-check game events that had no start time yet, at most once an hour.
  const stale = (e: (typeof known)[number]) => e.isGame && !e.startTime && Date.now() - e.fetchedAt.getTime() > 3600_000;
  const missing = unique.filter((s) => !map.has(s) || stale(map.get(s)!));
  if (missing.length) {
    const events = await pm.gammaEvents(missing);
    const rows = events.map((e) => ({
      slug: e.slug,
      title: e.title ?? null,
      isGame: (e.tags ?? []).some((t) => t.slug === "games"),
      startTime: e.startTime ? new Date(e.startTime) : null,
      league: classifyEvent(e.slug, e.title)?.league ?? null,
      fetchedAt: new Date(),
    }));
    for (const r of rows) map.set(r.slug, r);
    await upsertEvents(rows);
  }
  return map;
}

/** Bulk upsert in a few round trips (one query per 500 events), not one per event. */
async function upsertEvents(rows: { slug: string; title: string | null; isGame: boolean; startTime: Date | null; league: string | null; fetchedAt: Date }[]) {
  const unique = [...new Map(rows.map((r) => [r.slug, r])).values()];
  for (let i = 0; i < unique.length; i += 500) {
    const chunk = unique.slice(i, i + 500);
    const values: unknown[] = [];
    const tuples = chunk.map((r) => {
      const n = values.length;
      values.push(r.slug, r.title, r.league, r.isGame, r.startTime, r.fetchedAt);
      return `($${n + 1}, $${n + 2}, $${n + 3}, $${n + 4}, $${n + 5}, $${n + 6})`;
    });
    await db.$executeRawUnsafe(
      `INSERT INTO "EventMeta" ("slug", "title", "league", "isGame", "startTime", "fetchedAt") VALUES ${tuples.join(",")}
       ON CONFLICT ("slug") DO UPDATE SET "title" = EXCLUDED."title", "league" = EXCLUDED."league", "isGame" = EXCLUDED."isGame",
         "startTime" = EXCLUDED."startTime", "fetchedAt" = EXCLUDED."fetchedAt"`,
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
  const [closed, openAll] = await Promise.all([pm.positions(address, "CLOSED", 3000), pm.positions(address, "OPEN", 3000)]);
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

  const settledSrc = [...closed, ...resolved]
    .map((p) => ({ p, cls: classifyEvent(p.event_slug, p.title) }))
    .filter((x) => x.cls !== null);
  const openSrc = open
    .filter((p) => p.current_size > 0)
    .map((p) => ({ p, cls: classifyEvent(p.event_slug, p.title) }))
    .filter((x) => x.cls !== null);

  const meta = await eventMeta([...settledSrc, ...openSrc].map((x) => x.p.event_slug));
  const nowS = Math.floor(Date.now() / 1000);

  const settledRows = settledSrc
    .map(({ p, cls }) => {
      const cost = p.total_size > 0 ? p.avg_price * p.total_size : p.entry_cost_usdc;
      const pnl = p.status === "CLOSED" ? p.realized_pnl : (p.total_pnl ?? p.realized_pnl);
      const m = meta.get(p.event_slug);
      const start = m?.startTime ?? null;
      const entryS = p.first_entry_at || p.last_event_at;
      const lead = start ? Math.round((start.getTime() / 1000 - entryS) / 60) : null;
      const endS = p.end_date ? Math.floor(Date.parse(p.end_date) / 1000) : 0;
      const settledS = p.status === "CLOSED" ? p.last_event_at : Math.min(nowS, Math.max(p.last_event_at, endS || p.last_event_at));
      return {
        id: `${address}:${p.condition_id}:${p.outcome_index}`,
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
  // The same market outcome can come back more than once (e.g. re-entered after selling): merge them.
  const settledMap = new Map<string, (typeof settledRows)[number]>();
  for (const b of settledRows) {
    const prev = settledMap.get(b.id);
    if (!prev) {
      settledMap.set(b.id, { ...b });
      continue;
    }
    prev.cost += b.cost;
    prev.pnl += b.pnl;
    if (b.entryAt < prev.entryAt) Object.assign(prev, { entryAt: b.entryAt, leadMinutes: b.leadMinutes, timing: b.timing });
    if (b.settledTs > prev.settledTs) Object.assign(prev, { settledAt: b.settledAt, settledTs: b.settledTs });
  }
  const settled = [...settledMap.values()].filter((b) => b.cost >= MIN_STAKE);

  // Stats are stored as daily totals; only the latest bets are kept individually.
  const dailyMap = new Map<string, { bettorId: string; day: number; sport: string; timing: string; bets: number; wins: number; staked: number; profit: number }>();
  for (const b of settled) {
    const day = Math.floor(b.settledTs / 86400);
    const key = `${day}:${b.sport}:${b.timing}`;
    const row = dailyMap.get(key) ?? { bettorId: address, day, sport: b.sport, timing: b.timing, bets: 0, wins: 0, staked: 0, profit: 0 };
    row.bets++;
    if (b.pnl > 0) row.wins++;
    row.staked += b.cost;
    row.profit += b.pnl;
    dailyMap.set(key, row);
  }
  const daily = [...dailyMap.values()];
  const recent = settled.sort((a, b) => b.settledTs - a.settledTs).slice(0, RECENT_BETS_KEPT);

  const positions = openSrc.map(({ p, cls }) => {
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
      cost: p.entry_cost_usdc || p.avg_price * p.current_size,
      currentValue: p.current_value,
      pnl: p.unrealized_pnl,
      entryAt: new Date(entryS * 1000),
      gameStartAt: start,
      timing: timingFor(lead, !!m?.isGame),
      icon: p.icon || null,
    };
  });

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

  return { address, settled: settled.length, open: positions.length, isMarketMaker };
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

/** Index the sports leaderboards. Run on a schedule by the worker (and `npm run index`). */
export async function indexLeaderboards(
  opts: { perBoard?: number; concurrency?: number; maxAgeMs?: number; log?: (s: string) => void; /** stop starting new bettors after this time (epoch ms) */ deadline?: number; maxBettors?: number } = {},
) {
  const { perBoard = 200, concurrency = 4, maxAgeMs = 60 * 60_000, log = () => {}, deadline = Infinity, maxBettors = Infinity } = opts;
  const [month, week, all, vol] = await Promise.all([
    pm.sportsLeaderboard("month", "PNL", perBoard),
    pm.sportsLeaderboard("week", "PNL", Math.ceil(perBoard / 2)),
    pm.sportsLeaderboard("all", "PNL", perBoard),
    pm.sportsLeaderboard("month", "VOLUME", Math.ceil(perBoard / 2)),
  ]);
  const hints = new Map<string, IndexHint>();
  const add = (e: pm.LeaderboardEntry, extra: Partial<IndexHint>) => {
    const a = e.user_id.toLowerCase();
    hints.set(a, {
      ...hints.get(a),
      name: e.user_name,
      profileImage: e.profile_image,
      xUsername: e.x_username,
      verified: e.verified,
      ...extra,
    });
  };
  month.forEach((e) => add(e, { lbPnlMonth: e.pnl }));
  week.forEach((e) => add(e, {}));
  all.forEach((e) => add(e, { lbPnlAll: e.pnl, lbVolumeAll: e.volume }));
  vol.forEach((e) => add(e, {}));

  const fresh = new Set(
    (await db.bettor.findMany({ where: { lastIndexedAt: { gte: new Date(Date.now() - maxAgeMs) } }, select: { address: true } })).map((b) => b.address),
  );
  const stale = [...hints.entries()].filter(([a]) => !fresh.has(a));
  const queue = stale.slice(0, maxBettors);
  log(`leaderboards: ${hints.size} bettors, ${stale.length} to index`);
  let done = 0;
  await Promise.all(
    Array.from({ length: concurrency }, async () => {
      for (let item = queue.shift(); item && Date.now() < deadline; item = queue.shift()) {
        const [address, hint] = item;
        try {
          const r = await indexBettor(address, hint);
          log(`[${++done}] ${address} ${r.settled} settled, ${r.open} open${r.isMarketMaker ? " (market maker)" : ""}`);
        } catch (e) {
          log(`[${++done}] ${address} failed: ${(e as Error).message}`);
        }
      }
    }),
  );
  return { total: hints.size, stale: stale.length, indexed: done };
}
