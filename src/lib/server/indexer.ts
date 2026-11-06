// Pulls a bettor's Polymarket history and stores it as settled bets + open positions,
// tagged with sport, league and timing (how long before kickoff the bet was placed).

import { db } from "./db";
import * as pm from "../polymarket";
import { classifyEvent, loadLeagueCodes } from "../sports";
import { timingFor } from "../filters";

const MIN_STAKE = 1; // USD — ignore dust

async function eventMeta(slugs: string[]) {
  const unique = [...new Set(slugs)];
  const known = await db.eventMeta.findMany({ where: { slug: { in: unique } } });
  const map = new Map(known.map((e) => [e.slug, e]));
  // Re-check game events that had no start time yet, at most once an hour.
  const stale = (e: (typeof known)[number]) => !e.startTime && Date.now() - e.fetchedAt.getTime() > 3600_000;
  const missing = unique.filter((s) => !map.has(s) || stale(map.get(s)!));
  if (missing.length) {
    const events = await pm.gammaEvents(missing);
    for (const e of events) {
      const isGame = (e.tags ?? []).some((t) => t.slug === "games");
      const row = {
        slug: e.slug,
        title: e.title,
        isGame,
        startTime: e.startTime ? new Date(e.startTime) : null,
        league: classifyEvent(e.slug, e.title)?.league ?? null,
        fetchedAt: new Date(),
      };
      const saved = await db.eventMeta.upsert({ where: { slug: e.slug }, create: row, update: row });
      map.set(e.slug, saved);
    }
  }
  return map;
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
    db.settledBet.deleteMany({ where: { bettorId: address } }),
    db.openPosition.deleteMany({ where: { bettorId: address } }),
    db.settledBet.createMany({ data: settled }),
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
export async function indexLeaderboards(opts: { perBoard?: number; concurrency?: number; maxAgeMs?: number; log?: (s: string) => void } = {}) {
  const { perBoard = 200, concurrency = 4, maxAgeMs = 60 * 60_000, log = () => {} } = opts;
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
  const queue = [...hints.entries()].filter(([a]) => !fresh.has(a));
  log(`leaderboards: ${hints.size} bettors, ${queue.length} to index`);
  let done = 0;
  await Promise.all(
    Array.from({ length: concurrency }, async () => {
      for (let item = queue.shift(); item; item = queue.shift()) {
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
}
