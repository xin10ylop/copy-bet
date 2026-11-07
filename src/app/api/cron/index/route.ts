import { after } from "next/server";
import { db } from "@/lib/server/db";
import { indexBettor, indexLeaderboards, pruneUntracked, shardOf } from "@/lib/server/indexer";

// Refreshes every tracked bettor from Polymarket.
// Called by Vercel Cron (Authorization: Bearer $CRON_SECRET) or manually with ?key=$CRON_SECRET.
// A call without ?shard fans out into SHARDS parallel runs. Each run works for ~4.5 minutes in the
// background and, while bettors are still waiting, hands over to a fresh run of the same shard
// (up to MAX_HOPS times), so the whole list is refreshed without a long-running server.
export const maxDuration = 300;

/** Stop starting new bettors and hand over to the next run after this long (in-flight ones may finish). */
const HANDOVER_MS = 200_000;
const SHARDS = 3;
const MAX_HOPS = 30;
/** Bettors refreshed in the last REFRESH_MS are skipped. */
const REFRESH_MS = 20 * 3600_000;

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  const url = new URL(req.url);
  const given = req.headers.get("authorization")?.replace(/^Bearer /, "") ?? url.searchParams.get("key");
  if (!secret || given !== secret) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const call = (params: Record<string, string | number>) => {
    const next = new URL(url.pathname, url.origin);
    for (const [k, v] of Object.entries(params)) next.searchParams.set(k, String(v));
    // The target answers immediately ({ started: true }); we only wait for that.
    return fetch(next, { headers: { authorization: `Bearer ${secret}` }, signal: AbortSignal.timeout(15_000) }).catch((e) => console.log("[index] hand-over failed", e));
  };

  const shardParam = url.searchParams.get("shard");
  if (shardParam === null) {
    const removed = await pruneUntracked().catch(() => 0);
    const [bettors, fresh] = await Promise.all([db.bettor.count(), db.bettor.count({ where: { lastIndexedAt: { gte: new Date(Date.now() - REFRESH_MS) } } })]);
    await Promise.all(Array.from({ length: SHARDS }, (_, shard) => call({ shard, of: SHARDS, hop: 0 })));
    return Response.json({ started: true, shards: SHARDS, bettors, fresh, removed });
  }

  const shard = Number(shardParam);
  const of = Number(url.searchParams.get("of") ?? SHARDS);
  const hop = Number(url.searchParams.get("hop") ?? 0);
  const deadline = Date.now() + HANDOVER_MS;
  const tag = `[index ${shard}/${of} hop ${hop}]`;

  after(async () => {
    // Hand over on a fixed clock, not when the last bettor finishes: a very large account can run past
    // the function's time limit, and the chain must not die with it.
    let handedOver = false;
    const handOver = async () => {
      if (handedOver || hop + 1 >= MAX_HOPS) return;
      handedOver = true;
      await call({ shard, of, hop: hop + 1 });
    };
    const work = (async () => {
      // 1. Bettors people follow come first, so their profiles stay current.
      if (hop === 0) {
        const followed = await db.follow.findMany({ distinct: ["bettorId"], select: { bettorId: true } });
        for (const f of followed) {
          if (Date.now() > deadline - 60_000) break;
          if (shardOf(f.bettorId, of) === shard) await indexBettor(f.bettorId).catch(() => {});
        }
      }
      // 2. Then everyone on the tracked list, never-indexed and oldest first.
      return indexLeaderboards({ shard, of, maxAgeMs: REFRESH_MS, deadline, log: (s) => console.log(tag, s) });
    })();
    let finished = false;
    void work.then(() => (finished = true), () => (finished = true));
    await Promise.race([work.catch(() => null), new Promise((r) => setTimeout(r, HANDOVER_MS + 5_000))]);
    if (!finished) await handOver(); // still finishing in-flight bettors: let the next run carry on
    const r = await work.catch((e) => (console.log(tag, "failed", e), null));
    console.log(tag, "done", r);
    if (!r || r.remaining > 0) await handOver();
  });

  return Response.json({ started: true, shard, of, hop });
}
