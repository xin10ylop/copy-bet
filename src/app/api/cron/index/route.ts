import { after } from "next/server";
import { db } from "@/lib/server/db";
import { indexBettor, indexLeaderboards } from "@/lib/server/indexer";

// Refreshes bettor data from Polymarket in time-boxed batches.
// Called by Vercel Cron (Authorization: Bearer $CRON_SECRET) or manually with ?key=$CRON_SECRET.
// Responds immediately and keeps working in the background until the time budget runs out.
export const maxDuration = 300;

const BUDGET_MS = 270_000;

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  const url = new URL(req.url);
  const given = req.headers.get("authorization")?.replace(/^Bearer /, "") ?? url.searchParams.get("key");
  if (!secret || given !== secret) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const deadline = Date.now() + BUDGET_MS;
  const [bettors, fresh] = await Promise.all([
    db.bettor.count(),
    db.bettor.count({ where: { lastIndexedAt: { gte: new Date(Date.now() - 6 * 3600_000) } } }),
  ]);

  after(async () => {
    // 1. Bettors people follow come first, so their profiles stay current.
    const followed = await db.follow.findMany({ distinct: ["bettorId"], select: { bettorId: true } });
    for (const f of followed) {
      if (Date.now() > deadline - 60_000) break;
      await indexBettor(f.bettorId).catch(() => {});
    }
    // 2. Then the sports leaderboards.
    const r = await indexLeaderboards({ perBoard: 200, maxAgeMs: 6 * 3600_000, deadline: deadline - 20_000, log: (s) => console.log("[index]", s) });
    console.log("[index] done", r);
  });

  return Response.json({ started: true, bettors, freshLast6h: bettors ? fresh : 0 });
}
