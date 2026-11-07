import { eventMeta } from "./indexer";
import { toBookmakerBet, type BookBet } from "@/lib/betFormat";

/** Adds a bookmaker-style `bet` ({ selection, market, event }) to each item, using the game's title (fetched if we don't have it yet). */
export async function withBook<T extends { title: string; outcome: string; eventSlug: string; sport?: string | null; outcomeIndex?: number | null }>(items: T[]): Promise<(T & { bet: BookBet })[]> {
  const slugs = [...new Set(items.map((i) => i.eventSlug).filter(Boolean))];
  const metas = slugs.length ? await eventMeta(slugs).catch(() => new Map<string, { title: string | null }>()) : new Map<string, { title: string | null }>();
  return items.map((i) => ({ ...i, bet: toBookmakerBet(i.title, i.outcome, metas.get(i.eventSlug)?.title, i.sport ?? undefined, i.outcomeIndex) }));
}
