import { db } from "@/lib/server/db";

// Health of the data: is the live worker running, how fresh is every bettor, and what did the continuous
// self-checks find (see src/lib/server/audit.ts and worker/index.ts).
export const dynamic = "force-dynamic";

export async function GET() {
  const now = Date.now();
  const ago = (ms: number) => new Date(now - ms);
  const [beat, bettors, fresh5m, fresh1h, fresh24h, checks24h, failed24h, recentFailures, lastByKind] = await Promise.all([
    db.auditCheck.findUnique({ where: { id: "heartbeat" } }),
    db.bettor.count(),
    db.bettor.count({ where: { lastIndexedAt: { gte: ago(5 * 60_000) } } }),
    db.bettor.count({ where: { lastIndexedAt: { gte: ago(3600_000) } } }),
    db.bettor.count({ where: { lastIndexedAt: { gte: ago(86400_000) } } }),
    db.auditCheck.count({ where: { at: { gte: ago(86400_000) }, kind: { not: "heartbeat" } } }),
    db.auditCheck.count({ where: { at: { gte: ago(86400_000) }, ok: false } }),
    db.auditCheck.findMany({ where: { ok: false }, orderBy: { at: "desc" }, take: 20 }),
    db.$queryRawUnsafe<{ kind: string; at: Date; n: number; failed: number }[]>(
      `SELECT "kind", MAX("at") AS "at", COUNT(*)::int AS "n", SUM(CASE WHEN "ok" THEN 0 ELSE 1 END)::int AS "failed"
       FROM "AuditCheck" WHERE "at" > NOW() - INTERVAL '24 hours' AND "kind" <> 'heartbeat' GROUP BY "kind"`,
    ),
  ]);
  const workerAlive = !!beat && now - beat.at.getTime() < 3 * 60_000;
  return Response.json({
    worker: { alive: workerAlive, lastSeen: beat?.at ?? null, stats: beat?.issues ?? [] },
    data: { bettors, refreshedLast5Min: fresh5m, refreshedLastHour: fresh1h, refreshedLast24h: fresh24h },
    audit: {
      last24h: { checks: checks24h, failed: failed24h },
      byKind: Object.fromEntries(lastByKind.map((k) => [k.kind, { checks: k.n, failed: k.failed, last: k.at }])),
      recentFailures: recentFailures.map((c) => ({ at: c.at, kind: c.kind, subject: c.subject, issues: c.issues })),
    },
  });
}
