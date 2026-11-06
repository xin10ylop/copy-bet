import { NextRequest } from "next/server";
import { paramsToFilter } from "@/lib/filters";
import { bettorProfile } from "@/lib/server/stats";
import { ensureIndexed } from "@/lib/server/indexer";
import { getUser } from "@/lib/server/session";
import { db } from "@/lib/server/db";

export const maxDuration = 60;

export async function GET(req: NextRequest, ctx: RouteContext<"/api/bettors/[address]">) {
  const { address: raw } = await ctx.params;
  const address = raw.toLowerCase();
  if (!/^0x[0-9a-f]{40}$/.test(address)) return Response.json({ error: "Invalid address" }, { status: 400 });
  try {
    await ensureIndexed(address);
  } catch {
    // fall back to whatever we have
  }
  const profile = await bettorProfile(address, paramsToFilter(req.nextUrl.searchParams));
  if (!profile) return Response.json({ error: "Bettor not found" }, { status: 404 });
  const user = await getUser();
  const follow = user ? await db.follow.findUnique({ where: { userId_bettorId: { userId: user.id, bettorId: address } } }) : null;
  return Response.json({ ...profile, follow: follow ? serializeFollow(follow) : null });
}

function serializeFollow(f: { mode: string; sports: string; timing: string; minSize: number; includeSells: boolean; mutedUntil: Date | null }) {
  return { mode: f.mode, sports: JSON.parse(f.sports), timing: JSON.parse(f.timing), minSize: f.minSize, includeSells: f.includeSells, mutedUntil: f.mutedUntil?.toISOString() ?? null };
}
