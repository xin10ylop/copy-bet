import { z } from "zod";
import { db } from "@/lib/server/db";
import { FREE_DELAY_MINUTES, FREE_FOLLOW_LIMIT, getUser, requireUser } from "@/lib/server/session";
import { displayName } from "@/lib/polymarket";

export async function GET() {
  const user = await getUser();
  if (!user) return Response.json({ user: null, follows: [], searches: [], limits: { follows: FREE_FOLLOW_LIMIT, delayMinutes: FREE_DELAY_MINUTES } });
  const [follows, searches] = await Promise.all([
    db.follow.findMany({ where: { userId: user.id }, include: { bettor: true }, orderBy: { createdAt: "desc" } }),
    db.savedSearch.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" } }),
  ]);
  const bot = process.env.TELEGRAM_BOT_USERNAME;
  return Response.json({
    user: {
      id: user.id,
      plan: user.plan,
      telegram: user.telegramChatId ? { username: user.telegramUsername, name: user.telegramName } : null,
      telegramLink: bot ? `https://t.me/${bot}?start=${user.linkToken}` : null,
      goal: user.goal,
      favoriteSport: user.favoriteSport,
    },
    follows: follows.map((f) => ({
      address: f.bettorId,
      name: displayName(f.bettor.name, f.bettor.pseudonym, f.bettorId),
      profileImage: f.bettor.profileImage,
      mode: f.mode,
      sports: JSON.parse(f.sports),
      timing: JSON.parse(f.timing),
      minSize: f.minSize,
      includeSells: f.includeSells,
      mutedUntil: f.mutedUntil?.toISOString() ?? null,
      createdAt: f.createdAt.toISOString(),
    })),
    searches: searches.map((s) => ({ id: s.id, name: s.name, query: s.filter })),
    limits: { follows: user.plan === "pro" ? null : FREE_FOLLOW_LIMIT, delayMinutes: user.plan === "pro" ? 0 : FREE_DELAY_MINUTES },
  });
}

const Patch = z.object({ goal: z.string().max(40).optional(), favoriteSport: z.string().max(40).optional() });

export async function PATCH(req: Request) {
  const body = Patch.safeParse(await req.json().catch(() => ({})));
  if (!body.success) return Response.json({ error: "Invalid body" }, { status: 400 });
  const user = await requireUser();
  await db.user.update({ where: { id: user.id }, data: body.data });
  return Response.json({ ok: true });
}
