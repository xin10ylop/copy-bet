import { z } from "zod";
import { db } from "@/lib/server/db";
import { getUser, requireUser } from "@/lib/server/session";

const Body = z.object({ name: z.string().min(1).max(60), query: z.string().max(500) });

export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return Response.json({ error: "Invalid body" }, { status: 400 });
  const user = await requireUser();
  const s = await db.savedSearch.create({ data: { userId: user.id, name: parsed.data.name, filter: parsed.data.query } });
  return Response.json({ id: s.id });
}

export async function DELETE(req: Request) {
  const id = new URL(req.url).searchParams.get("id");
  const user = await getUser();
  if (user && id) await db.savedSearch.deleteMany({ where: { id, userId: user.id } });
  return Response.json({ ok: true });
}
