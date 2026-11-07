import { db } from "@/lib/server/db";
import { getUser } from "@/lib/server/session";
import * as pm from "@/lib/polymarket";
import { classifyEvent, loadLeagueCodes } from "@/lib/sports";
import { withBook } from "@/lib/server/bets";

// Recent bets from everyone in the user's portfolio, newest first.
// Reads Polymarket directly (short cache) so the feed is live even before the worker runs.
const cache = new Map<string, { at: number; trades: pm.Trade[] }>();

async function recentTrades(address: string) {
  const hit = cache.get(address);
  if (hit && Date.now() - hit.at < 20_000) return hit.trades;
  const trades = await pm.trades(address, 25).catch(() => hit?.trades ?? []);
  cache.set(address, { at: Date.now(), trades });
  return trades;
}

export async function GET() {
  const user = await getUser();
  if (!user) return Response.json({ items: [] });
  await loadLeagueCodes();
  const follows = await db.follow.findMany({ where: { userId: user.id }, include: { bettor: true } });
  const lists = await Promise.all(follows.map(async (f) => ({ f, trades: await recentTrades(f.bettorId) })));
  const items = lists
    .flatMap(({ f, trades }) =>
      trades
        .map((t) => ({ t, cls: classifyEvent(t.event_slug, t.title) }))
        .filter((x) => x.cls)
        .map(({ t, cls }) => ({
          id: `${t.transaction_hash}:${t.outcome_index}:${t.side}`,
          address: f.bettorId,
          name: pm.displayName(f.bettor.name, f.bettor.pseudonym, f.bettorId),
          profileImage: f.bettor.profileImage,
          side: t.side,
          title: t.title,
          outcome: t.outcome,
          outcomeIndex: t.outcome_index,
          price: t.price,
          usd: t.size * t.price,
          shares: t.size,
          sport: cls!.sport,
          league: cls!.league,
          eventSlug: t.event_slug,
          timestamp: t.timestamp,
        })),
    )
    .sort((a, b) => b.timestamp - a.timestamp);
  // Collapse fills of the same order into one bet.
  const merged = new Map<string, (typeof items)[number]>();
  for (const it of items) {
    const prev = merged.get(it.id);
    if (prev) {
      prev.usd += it.usd;
      prev.shares += it.shares;
      prev.price = prev.shares > 0 ? prev.usd / prev.shares : prev.price; // volume-weighted
    } else merged.set(it.id, { ...it });
  }
  return Response.json({ items: await withBook([...merged.values()].slice(0, 60)) });
}
