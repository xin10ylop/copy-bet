import { db } from "./db";
import { toBookmakerBet, type BookBet } from "@/lib/betFormat";

/** Adds a bookmaker-style `bet` ({ selection, market, event }) to each item, using the game's title when we know it. */
export async function withBook<T extends { title: string; outcome: string; eventSlug: string; sport?: string | null }>(items: T[]): Promise<(T & { bet: BookBet })[]> {
  const slugs = [...new Set(items.map((i) => i.eventSlug).filter(Boolean))];
  const metas = slugs.length ? await db.eventMeta.findMany({ where: { slug: { in: slugs } }, select: { slug: true, title: true } }) : [];
  const titles = new Map(metas.map((m) => [m.slug, m.title]));
  return items.map((i) => ({ ...i, bet: toBookmakerBet(i.title, i.outcome, titles.get(i.eventSlug), i.sport ?? undefined) }));
}
