// Thin client for Polymarket's public APIs.
// Data API v2: https://data-api.polymarket.com/v2  (leaderboard, positions, trades, user stats)
// Gamma API:   https://gamma-api.polymarket.com     (events, sports metadata)

const DATA = "https://data-api.polymarket.com/v2";
const GAMMA = "https://gamma-api.polymarket.com";

export type TimePeriod = "day" | "week" | "month" | "all";

export interface LeaderboardEntry {
  rank: number;
  user_id: string;
  pnl: number;
  volume: number;
  user_name: string;
  profile_image: string;
  x_username: string;
  verified: boolean;
}

export interface Position {
  proxy_wallet: string;
  token_id: string;
  condition_id: string;
  current_size: number;
  avg_price: number;
  /** cost of the shares still held (exact) */
  entry_cost_usdc: number;
  /** trading fees paid on entry */
  entry_fees_usdc?: number;
  /** entry_cost_usdc + entry_fees_usdc */
  total_cost_usdc: number;
  /** realized_pnl as a % of the (exact) entry cost, excluding fees */
  percent_realized_pnl?: number;
  current_price: number;
  current_value: number;
  total_size: number;
  realized_pnl: number;
  unrealized_pnl: number;
  total_pnl: number;
  status: "OPEN" | "REDEEMABLE" | "REDEEMABLE_LOST" | "MERGEABLE" | "CLOSED";
  redeemable: boolean;
  mergeable: boolean;
  title: string;
  slug: string;
  icon: string;
  event_id: string;
  event_slug: string;
  outcome: string;
  outcome_index: number;
  end_date: string;
  last_event_at: number;
  first_entry_at: number;
  name?: string;
  profile_image?: string;
  verified?: boolean;
}

export interface Trade {
  proxy_wallet: string;
  side: "BUY" | "SELL";
  condition_id: string;
  size: number;
  price: number;
  timestamp: number;
  title: string;
  slug: string;
  icon: string;
  event_slug: string;
  outcome: string;
  outcome_index: number;
  name: string;
  pseudonym: string;
  transaction_hash: string;
}

export interface GammaEvent {
  id: string;
  slug: string;
  title: string;
  startTime?: string | null;
  endDate?: string | null;
  tags?: { slug: string }[];
}

interface Page<T> {
  data: T[];
  pagination?: { has_more: boolean; next_cursor: string | null };
}

// Polymarket rate-limits by IP. Every request in this process goes through one pacer, and a 429
// pauses all of them (not just the one that got it), so parallel work can't keep hammering the API.
const MIN_GAP_MS = 120;
let nextSlot = 0;
let coolUntil = 0;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
async function pace() {
  const now = Date.now();
  const at = Math.max(now, nextSlot, coolUntil);
  nextSlot = at + MIN_GAP_MS;
  if (at > now) await sleep(at - now);
}

async function getJson<T>(url: string, attempt = 0): Promise<T> {
  await pace();
  const res = await fetch(url, { cache: "no-store", headers: { accept: "application/json" } });
  if ((res.status === 429 || res.status >= 500) && attempt < 9) {
    // Respect Retry-After when given, otherwise exponential backoff with jitter.
    const retryAfter = Number(res.headers.get("retry-after"));
    const wait = Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter * 1000 : 1000 * 2 ** attempt + Math.random() * 500;
    if (res.status === 429) coolUntil = Math.max(coolUntil, Date.now() + Math.min(wait, 45_000));
    await sleep(Math.min(wait, 45_000));
    return getJson<T>(url, attempt + 1);
  }
  if (!res.ok) throw new Error(`Polymarket ${res.status} for ${url}`);
  return (await res.json()) as T;
}

function qs(params: Record<string, string | number | boolean | undefined>): string {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== "") p.set(k, String(v));
  return p.toString();
}

/** Read every page of a cursor-paginated endpoint, up to maxRows. */
async function paginate<T>(path: string, params: Record<string, string | number | boolean | undefined>, maxRows: number): Promise<T[]> {
  const out: T[] = [];
  let cursor: string | null | undefined;
  do {
    // v2 requires the same anchor (user/condition) alongside every cursor.
    const page = await getJson<Page<T>>(`${DATA}${path}?${qs(cursor ? { ...params, limit: undefined, cursor } : params)}`);
    out.push(...(page.data ?? []));
    cursor = page.pagination?.has_more ? page.pagination.next_cursor : null;
  } while (cursor && out.length < maxRows);
  return out.slice(0, maxRows);
}

/**
 * What the bettor paid for a position, fees included, so a total loss is exactly -100%.
 * avg_price has only 4 decimals (off by up to ~10% on long shots), so prefer the exact fields:
 * the cost of shares still held (entry_cost_usdc), or the cost implied by the realized return %.
 */
export function stakeOf(p: Position): number {
  const fees = p.entry_fees_usdc ?? 0;
  if (p.status === "CLOSED") {
    // Everything sold or redeemed: the realized return % pins down the exact cost.
    const pct = p.percent_realized_pnl ?? 0;
    if (Math.abs(pct) >= 0.5 && Math.abs(p.realized_pnl) > 0) {
      const exact = p.realized_pnl / (pct / 100);
      if (exact > 0 && Number.isFinite(exact)) return exact + fees;
    }
  } else if (p.current_size > 0 && p.entry_cost_usdc > 0 && p.current_size >= 0.2 * p.total_size) {
    // Still (mostly) held: exact cost of the held shares, scaled up for any part sold.
    return p.entry_cost_usdc * (p.total_size / p.current_size) + fees;
  }
  return p.avg_price * p.total_size + fees;
}

export function sportsLeaderboard(period: TimePeriod, sortBy: "PNL" | "VOLUME" = "PNL", max = 500) {
  return paginate<LeaderboardEntry>("/leaderboard", { time_period: period, category: "sports", sort_by: sortBy, limit: Math.min(max, 500) }, max);
}

const POSITION_FIELDS = [
  "token_id", "condition_id", "current_size", "avg_price", "entry_cost_usdc", "entry_fees_usdc", "total_cost_usdc", "current_price", "current_value",
  "total_size", "realized_pnl", "unrealized_pnl", "total_pnl", "percent_realized_pnl", "status", "redeemable", "mergeable", "title", "icon",
  "event_slug", "outcome", "outcome_index", "end_date", "last_event_at", "first_entry_at", "name", "profile_image", "verified",
] as const;

export async function positions(user: string, status: Position["status"], max = 2000): Promise<Position[]> {
  const rows = await paginate<Position>("/positions", { user, status, limit: 1000, sort_by: "TIMESTAMP", sort_direction: "DESC" }, max);
  // Keep only the fields we use: very active accounts return tens of thousands of rows.
  return rows.map((r) => Object.fromEntries(POSITION_FIELDS.map((k) => [k, (r as unknown as Record<string, unknown>)[k]])) as unknown as Position);
}

export function trades(user: string, max = 50) {
  return paginate<Trade>("/trades", { user, limit: Math.min(max, 500) }, max);
}

export async function gammaEvents(slugs: string[], concurrency = 4): Promise<GammaEvent[]> {
  const chunks: string[][] = [];
  for (let i = 0; i < slugs.length; i += 40) chunks.push(slugs.slice(i, i + 40));
  const out: GammaEvent[] = [];
  await Promise.all(
    Array.from({ length: concurrency }, async () => {
      for (let chunk = chunks.shift(); chunk; chunk = chunks.shift()) {
        const q = chunk.map((s) => `slug=${encodeURIComponent(s)}`).join("&");
        try {
          out.push(...(await getJson<GammaEvent[]>(`${GAMMA}/events?${q}&limit=${chunk.length}`)));
        } catch {
          // one bad chunk shouldn't stop indexing
        }
      }
    }),
  );
  return out;
}

/** Polymarket generates names like "0xabc…-1759935795465" for users without a username. */
export function displayName(name: string | undefined | null, pseudonym: string | undefined | null, address: string): string {
  if (name && !/^0x[0-9a-f]{40}/i.test(name)) return name;
  if (pseudonym) return pseudonym.replace(/-/g, " ");
  return shortAddress(address);
}

export function shortAddress(a: string): string {
  return `${a.slice(0, 6)}…${a.slice(-4)}`;
}

export function polymarketProfileUrl(address: string) {
  return `https://polymarket.com/profile/${address}`;
}

export function polymarketEventUrl(eventSlug: string) {
  return `https://polymarket.com/event/${eventSlug}`;
}
