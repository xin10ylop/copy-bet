// CopyBet worker
// 1. Listens to Polymarket's live trade stream (RTDS "activity" topic).
// 2. When a followed bettor trades a sports market, checks each follower's rules
//    (sports, timing, minimum size, sells, mute) and queues a Telegram alert.
//    Pro: sent immediately. Free: sent FREE_DELAY_MINUTES later.
// 3. Sends queued alerts within Telegram's rate limits.
// 4. Links Telegram chats to CopyBet accounts via /start <token>.
// 5. Re-indexes leaderboards and followed bettors on a schedule.
//
// Run: npm run worker   (needs DATABASE_URL; TELEGRAM_BOT_TOKEN optional — without it alerts are logged)

import { db } from "../src/lib/server/db";
import { classifySlug, classifyWithMeta, leagueLabel, loadLeagueCodes, sportLabel } from "../src/lib/sports";
import { formatOdds, formatPct, formatUsd, timingFor, type TimingKey } from "../src/lib/filters";
import { bettorStats } from "../src/lib/server/stats";
import { eventMeta, indexBettor, indexLeaderboards } from "../src/lib/server/indexer";
import { displayName } from "../src/lib/polymarket";
import { FREE_DELAY_MINUTES } from "../src/lib/server/session";
import { escapeHtml, pollUpdates, sendMessage, telegramEnabled } from "./telegram";
import { toBookmakerBet } from "../src/lib/betFormat";

const RTDS = "wss://ws-live-data.polymarket.com";
const APP_URL = (process.env.APP_URL ?? "http://localhost:3000").replace(/\/$/, "");
const MERGE_WINDOW_MS = 2500; // combine fills of one order / quick re-entries into one alert
const log = (...a: unknown[]) => console.log(new Date().toISOString().slice(11, 19), ...a);

// ─── Who follows whom (refreshed every few seconds) ──────────────────────────
type FollowRow = Awaited<ReturnType<typeof loadFollows>>[number];
let followsByBettor = new Map<string, FollowRow[]>();

async function loadFollows() {
  return db.follow.findMany({ include: { user: { select: { id: true, plan: true, telegramChatId: true } }, bettor: { select: { name: true, pseudonym: true } } } });
}

async function refreshFollows() {
  const rows = await loadFollows();
  const map = new Map<string, FollowRow[]>();
  for (const r of rows) map.set(r.bettorId, [...(map.get(r.bettorId) ?? []), r]);
  followsByBettor = map;
}

// ─── Event start times (for timing rules + "starts in 3h") ───────────────────
const eventCache = new Map<string, { isGame: boolean; start: Date | null; title: string | null; sport: string | null; league: string | null }>();
async function eventInfo(slug: string) {
  const hit = eventCache.get(slug);
  if (hit) return hit;
  const meta = (await eventMeta([slug]).catch(() => new Map())).get(slug);
  const info = { isGame: meta?.isGame ?? false, start: meta?.startTime ?? null, title: meta?.title ?? null, sport: meta?.sport ?? null, league: meta?.league ?? null };
  eventCache.set(slug, info);
  return info;
}
/** Sports market? League code in the slug, else Polymarket's own event tags. */
async function classifyBet(slug: string, title: string) {
  return classifySlug(slug) ?? classifyWithMeta(slug, title, await eventInfo(slug));
}

// ─── Live trades ──────────────────────────────────────────────────────────────
interface RtdsTrade {
  proxyWallet: string;
  side: "BUY" | "SELL";
  size: number;
  price: number;
  outcome: string;
  outcomeIndex: number;
  conditionId: string;
  eventSlug: string;
  slug: string;
  title: string;
  transactionHash: string;
  timestamp: number;
}

interface PendingBet {
  wallet: string;
  side: "BUY" | "SELL";
  title: string;
  outcome: string;
  outcomeIndex: number;
  eventSlug: string;
  txHash: string;
  shares: number;
  usd: number;
  firstSeen: number;
}
const pending = new Map<string, PendingBet>();

function onTrade(t: RtdsTrade) {
  const wallet = t.proxyWallet?.toLowerCase();
  if (!wallet || !followsByBettor.has(wallet)) return;
  const key = `${wallet}:${t.conditionId}:${t.outcomeIndex}:${t.side}`;
  const prev = pending.get(key);
  if (prev) {
    prev.shares += t.size;
    prev.usd += t.size * t.price;
    return;
  }
  pending.set(key, { wallet, side: t.side, title: t.title, outcome: t.outcome, outcomeIndex: t.outcomeIndex, eventSlug: t.eventSlug, txHash: t.transactionHash, shares: t.size, usd: t.size * t.price, firstSeen: Date.now() });
  setTimeout(() => {
    const bet = pending.get(key);
    pending.delete(key);
    if (bet) handleBet(bet).catch((e) => log("[bet] error", e));
  }, MERGE_WINDOW_MS);
}

const roiCache = new Map<string, { at: number; text: string }>();
async function recordLine(wallet: string, sport: string) {
  const k = `${wallet}:${sport}`;
  const hit = roiCache.get(k);
  if (hit && Date.now() - hit.at < 10 * 60_000) return hit.text;
  const s = await bettorStats(wallet, { sports: [sport as never], timing: [], timeframe: "30d" });
  const text = s.bets ? `Their ${sportLabel(sport)} record (30d): ${formatPct(s.roi)} ROI · ${s.winRate.toFixed(0)}% wins · ${s.bets} bets` : "";
  roiCache.set(k, { at: Date.now(), text });
  return text;
}

function startsIn(start: Date | null) {
  if (!start) return "";
  const m = Math.round((start.getTime() - Date.now()) / 60000);
  if (m < 0) return " · live now";
  if (m < 60) return ` · starts in ${m}m`;
  if (m < 48 * 60) return ` · starts in ${Math.floor(m / 60)}h ${m % 60}m`;
  return ` · ${start.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`;
}

async function handleBet(bet: PendingBet) {
  const cls = await classifyBet(bet.eventSlug, bet.title);
  if (!cls) return; // not a sports market
  const followers = followsByBettor.get(bet.wallet) ?? [];
  if (!followers.length) return;
  const ev = await eventInfo(bet.eventSlug);
  const lead = ev.start ? Math.round((ev.start.getTime() - Date.now()) / 60000) : null;
  const timing: TimingKey = timingFor(lead, ev.isGame);
  const price = bet.shares ? bet.usd / bet.shares : 0;
  const now = new Date();
  let queued = 0;

  for (const f of followers) {
    if (!f.user.telegramChatId) continue;
    if (f.mutedUntil && f.mutedUntil > now) continue;
    if (bet.side === "SELL" && !f.includeSells) continue;
    if (f.mode === "custom") {
      const sports = JSON.parse(f.sports) as string[];
      const timings = JSON.parse(f.timing) as string[];
      if (sports.length && !sports.includes(cls.sport)) continue;
      if (timings.length && !timings.includes(timing)) continue;
      if (f.minSize && bet.usd < f.minSize) continue;
    }
    const delay = f.user.plan === "pro" ? 0 : FREE_DELAY_MINUTES * 60_000;
    try {
      await db.alertLog.create({
        data: {
          userId: f.userId,
          bettorId: bet.wallet,
          txHash: bet.txHash,
          title: bet.title,
          outcome: bet.outcome,
          outcomeIndex: bet.outcomeIndex,
          side: bet.side,
          price,
          usdSize: bet.usd,
          eventSlug: bet.eventSlug,
          sport: cls.sport,
          sendAt: new Date(now.getTime() + delay),
        },
      });
      queued++;
    } catch {
      // duplicate (same tx already queued for this user)
    }
  }
  const name = displayName(followers[0].bettor.name, followers[0].bettor.pseudonym, bet.wallet);
  log(`[bet] ${name} ${bet.side} ${bet.outcome} @ ${formatOdds(price)} ${formatUsd(bet.usd)} · ${bet.title} → ${queued} alert(s)`);
}

function connectRealtime() {
  let backoff = 1000;
  let ping: ReturnType<typeof setInterval> | undefined;
  const open = () => {
    const ws = new WebSocket(RTDS);
    ws.onopen = () => {
      backoff = 1000;
      log("[rtds] connected");
      ws.send(JSON.stringify({ action: "subscribe", subscriptions: [{ topic: "activity", type: "trades" }] }));
      ping = setInterval(() => ws.readyState === ws.OPEN && ws.send("PING"), 5000);
    };
    ws.onmessage = (m) => {
      const s = String(m.data);
      if (!s || s[0] !== "{") return;
      try {
        const msg = JSON.parse(s) as { topic?: string; type?: string; payload?: RtdsTrade };
        if (msg.topic === "activity" && msg.payload) onTrade(msg.payload);
      } catch {}
    };
    ws.onclose = () => {
      clearInterval(ping);
      log(`[rtds] closed, reconnecting in ${backoff}ms`);
      setTimeout(open, backoff);
      backoff = Math.min(backoff * 2, 30_000);
    };
    ws.onerror = () => ws.close();
  };
  open();
}

// ─── Sending ─────────────────────────────────────────────────────────────────
const lastSentToChat = new Map<string, number>();
const GLOBAL_PER_SECOND = 25; // Telegram allows ~30/s per bot

async function sendDue() {
  const due = await db.alertLog.findMany({ where: { sentAt: null, sendAt: { lte: new Date() } }, orderBy: { sendAt: "asc" }, take: 200, include: { user: true } });
  let sentThisTick = 0;
  for (const a of due) {
    if (sentThisTick >= GLOBAL_PER_SECOND) break;
    const chat = a.user.telegramChatId;
    if (!chat) {
      await db.alertLog.update({ where: { id: a.id }, data: { sentAt: new Date() } });
      continue;
    }
    if (Date.now() - (lastSentToChat.get(chat) ?? 0) < 1050) continue; // ~1 msg/s per chat
    const html = await formatAlert(a);
    const buttons = [[{ text: "Their record", url: `${APP_URL}/app/bettor/${a.bettorId}` }]];
    try {
      if (telegramEnabled) await sendMessage(chat, html, buttons);
      else log(`[dry-run → ${chat}]\n${html.replace(/<[^>]+>/g, "")}`);
      lastSentToChat.set(chat, Date.now());
      sentThisTick++;
      await db.alertLog.update({ where: { id: a.id }, data: { sentAt: new Date() } });
    } catch (e) {
      const err = e as Error & { retryAfter?: number; status?: number };
      if (err.retryAfter) {
        log(`[tg] rate limited, waiting ${err.retryAfter}s`);
        await new Promise((r) => setTimeout(r, err.retryAfter! * 1000));
        break;
      }
      if (err.status === 403) {
        // user blocked the bot: stop sending to this chat
        await db.user.update({ where: { id: a.userId }, data: { telegramChatId: null } });
      }
      await db.alertLog.update({ where: { id: a.id }, data: { sentAt: new Date() } });
      log("[tg] send failed", err.message);
    }
  }
}

async function formatAlert(a: { bettorId: string; side: string; title: string; outcome: string; outcomeIndex: number | null; price: number; usdSize: number; eventSlug: string; sport: string | null; detectedAt: Date; sendAt: Date; user: { plan: string } }) {
  const bettor = await db.bettor.findUnique({ where: { address: a.bettorId } });
  const name = escapeHtml(displayName(bettor?.name, bettor?.pseudonym, a.bettorId));
  const cls = await classifyBet(a.eventSlug, a.title);
  const ev = await eventInfo(a.eventSlug);
  const record = a.sport ? await recordLine(a.bettorId, a.sport) : "";
  const bet = toBookmakerBet(a.title, a.outcome, ev.title, a.sport ?? undefined, a.outcomeIndex);
  const sell = a.side === "SELL";
  const lines = [
    `${sell ? "🔴" : "🟢"} <b>${sell ? "Cashed out" : "New bet"} · ${name}</b>`,
    sell ? `<b>${escapeHtml(bet.selection)}</b>` : `<b>${escapeHtml(bet.selection)} @ ${formatOdds(a.price)}</b>`,
    `${escapeHtml([cls ? leagueLabel(cls.league) : "", bet.market, bet.event || a.title].filter(Boolean).join(" · "))}${startsIn(ev.start)}`,
    sell ? `${formatUsd(a.usdSize, false)} cashed out at ${Math.round(a.price * 100)}¢` : `${formatUsd(a.usdSize, false)} staked`,
  ];
  if (record) lines.push(escapeHtml(record));
  if (a.user.plan !== "pro") {
    const mins = Math.round((Date.now() - a.detectedAt.getTime()) / 60000);
    lines.push("", `<i>Placed ${mins} min ago. Pro gets this within seconds.</i>`);
  }
  return lines.join("\n");
}

// ─── Telegram account linking ────────────────────────────────────────────────
async function onTelegramMessage(m: { chat: { id: number }; from?: { username?: string; first_name?: string; last_name?: string }; text?: string }) {
  const chatId = String(m.chat.id);
  const text = (m.text ?? "").trim();
  if (text.startsWith("/start")) {
    const token = text.split(/\s+/)[1];
    const user = token ? await db.user.findUnique({ where: { linkToken: token } }) : null;
    if (!user) {
      await sendMessage(chatId, `Hi! To get alerts, open CopyBet, follow a bettor and tap <b>Connect Telegram</b>.`, [[{ text: "Open CopyBet", url: `${APP_URL}/app` }]]);
      return;
    }
    // A chat can belong to one account: detach it elsewhere first.
    await db.user.updateMany({ where: { telegramChatId: chatId, NOT: { id: user.id } }, data: { telegramChatId: null } });
    await db.user.update({ where: { id: user.id }, data: { telegramChatId: chatId, telegramUsername: m.from?.username ?? null, telegramName: [m.from?.first_name, m.from?.last_name].filter(Boolean).join(" ") || null } });
    const n = await db.follow.count({ where: { userId: user.id } });
    await sendMessage(
      chatId,
      `✅ <b>Connected.</b>\nYou follow ${n} bettor${n === 1 ? "" : "s"}. Their bets will land here${user.plan === "pro" ? " within seconds" : `, ${FREE_DELAY_MINUTES} minutes after they're placed`}.\n\n/list shows who you follow.`,
      [[{ text: "Find more bettors", url: `${APP_URL}/app` }]],
    );
    await refreshFollows();
    return;
  }
  const user = await db.user.findUnique({ where: { telegramChatId: chatId }, include: { follows: { include: { bettor: true } } } });
  if (!user) {
    await sendMessage(chatId, `This chat isn't connected yet. Open CopyBet and tap <b>Connect Telegram</b>.`, [[{ text: "Open CopyBet", url: `${APP_URL}/app/account` }]]);
    return;
  }
  if (text.startsWith("/list")) {
    const rows = user.follows.map((f) => `• <b>${escapeHtml(displayName(f.bettor.name, f.bettor.pseudonym, f.bettorId))}</b>: ${f.mode === "all" ? "every bet" : "some bets"}`);
    await sendMessage(chatId, rows.length ? `You follow:\n${rows.join("\n")}` : "You don't follow anyone yet.", [[{ text: "Manage", url: `${APP_URL}/app/portfolio` }]]);
    return;
  }
  await sendMessage(chatId, `Commands:\n/list: who you follow`, [[{ text: "Open CopyBet", url: `${APP_URL}/app` }]]);
}

// ─── Scheduled re-indexing ───────────────────────────────────────────────────
async function reindexFollowed() {
  const ids = [...followsByBettor.keys()];
  for (const a of ids) await indexBettor(a).catch((e) => log("[index] failed", a, (e as Error).message));
  if (ids.length) log(`[index] refreshed ${ids.length} followed bettors`);
}

function every(ms: number, fn: () => Promise<unknown>, runNow = false) {
  let running = false;
  const tick = async () => {
    if (running) return;
    running = true;
    try {
      await fn();
    } catch (e) {
      log("[task] error", (e as Error).message);
    } finally {
      running = false;
    }
  };
  if (runNow) tick();
  setInterval(tick, ms);
}

async function main() {
  await loadLeagueCodes();
  await refreshFollows();
  log(`[worker] ${followsByBettor.size} followed bettors · telegram ${telegramEnabled ? "on" : "off (dry run)"}`);
  connectRealtime();
  every(5_000, refreshFollows);
  every(1_000, sendDue);
  every(15 * 60_000, reindexFollowed);
  if (process.env.INDEX_LEADERBOARDS !== "0") every(60 * 60_000, () => indexLeaderboards({ log: (s) => log("[index]", s) }), true);
  void pollUpdates(onTelegramMessage);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
