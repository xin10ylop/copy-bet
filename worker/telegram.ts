// Minimal Telegram Bot API client: rate-limited sending + long-polling for /start links.

const TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const API = TOKEN ? `https://api.telegram.org/bot${TOKEN}` : null;

export const telegramEnabled = Boolean(API);

export interface InlineButton {
  text: string;
  url: string;
}

async function call<T>(method: string, body: unknown): Promise<T> {
  if (!API) throw new Error("TELEGRAM_BOT_TOKEN not set");
  const res = await fetch(`${API}/${method}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
  const json = (await res.json()) as { ok: boolean; result: T; description?: string; parameters?: { retry_after?: number } };
  if (!json.ok) {
    const err = new Error(json.description ?? `Telegram ${method} failed`) as Error & { retryAfter?: number; status?: number };
    err.retryAfter = json.parameters?.retry_after;
    err.status = res.status;
    throw err;
  }
  return json.result;
}

export function sendMessage(chatId: string, html: string, buttons: InlineButton[][] = []) {
  return call("sendMessage", {
    chat_id: chatId,
    text: html,
    parse_mode: "HTML",
    link_preview_options: { is_disabled: true },
    ...(buttons.length ? { reply_markup: { inline_keyboard: buttons } } : {}),
  });
}

interface Update {
  update_id: number;
  message?: { chat: { id: number }; from?: { username?: string; first_name?: string; last_name?: string }; text?: string };
}

/** Long-poll updates forever, handing each message to `onMessage`. */
export async function pollUpdates(onMessage: (m: NonNullable<Update["message"]>) => Promise<void>) {
  if (!API) return;
  let offset = 0;
  for (;;) {
    try {
      const updates = await call<Update[]>("getUpdates", { offset, timeout: 30, allowed_updates: ["message"] });
      for (const u of updates) {
        offset = u.update_id + 1;
        if (u.message) await onMessage(u.message).catch((e) => console.error("[tg] handler error", e));
      }
    } catch (e) {
      console.error("[tg] poll error", (e as Error).message);
      await new Promise((r) => setTimeout(r, 3000));
    }
  }
}

export const escapeHtml = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
