import { z } from "zod";
import { db } from "@/lib/server/db";
import { FREE_FOLLOW_LIMIT, requireUser, getUser } from "@/lib/server/session";
import { ensureIndexed } from "@/lib/server/indexer";

const Body = z.object({
  address: z.string().regex(/^0x[0-9a-fA-F]{40}$/),
  mode: z.enum(["all", "custom"]),
  sports: z.array(z.string()).max(20).default([]),
  timing: z.array(z.enum(["early", "day", "late", "live", "futures"])).default([]),
  minSize: z.number().min(0).max(10_000_000).default(0),
  includeSells: z.boolean().default(false),
});

export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return Response.json({ error: "Invalid body" }, { status: 400 });
  const b = parsed.data;
  const address = b.address.toLowerCase();
  const user = await requireUser();

  const existing = await db.follow.findUnique({ where: { userId_bettorId: { userId: user.id, bettorId: address } } });
  if (!existing && user.plan !== "pro") {
    const n = await db.follow.count({ where: { userId: user.id } });
    if (n >= FREE_FOLLOW_LIMIT) return Response.json({ error: "limit", limit: FREE_FOLLOW_LIMIT }, { status: 402 });
  }
  await ensureIndexed(address, 24 * 3600_000);
  const custom = b.mode === "custom";
  const data = {
    mode: b.mode,
    sports: JSON.stringify(custom ? b.sports : []),
    timing: JSON.stringify(custom ? b.timing : []),
    minSize: custom ? b.minSize : 0,
    includeSells: b.includeSells,
  };
  await db.follow.upsert({ where: { userId_bettorId: { userId: user.id, bettorId: address } }, create: { userId: user.id, bettorId: address, ...data }, update: data });
  return Response.json({ ok: true });
}

export async function DELETE(req: Request) {
  const address = new URL(req.url).searchParams.get("address")?.toLowerCase();
  const user = await getUser();
  if (!user || !address) return Response.json({ ok: true });
  await db.follow.deleteMany({ where: { userId: user.id, bettorId: address } });
  return Response.json({ ok: true });
}

const Mute = z.object({ address: z.string(), hours: z.number().min(0).max(24 * 30) });

export async function PATCH(req: Request) {
  const parsed = Mute.safeParse(await req.json().catch(() => ({})));
  const user = await getUser();
  if (!parsed.success || !user) return Response.json({ error: "Invalid" }, { status: 400 });
  const until = parsed.data.hours ? new Date(Date.now() + parsed.data.hours * 3600_000) : null;
  await db.follow.updateMany({ where: { userId: user.id, bettorId: parsed.data.address.toLowerCase() }, data: { mutedUntil: until } });
  return Response.json({ ok: true });
}
