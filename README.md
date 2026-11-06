# CopyBet

Follow the best sports bettors on Polymarket. See their real record by sport, and get every bet they place on Telegram within seconds.

- **Landing page** (`/`): conversion copy built on 7 sales-psychology rules, sport tiles, live proof from real data.
- **App** (`/app`), mobile-first and installable to the home screen:
  - **Discover**: pick a sport, ranked list, 7d / 30d / all-time, sort, filter sheet.
  - **Search**: build a custom search from any stat, ready-made searches, saved searches, wallet lookup.
  - **Bettor profile**: *your filter vs everything* side by side, ROI per sport, when they bet (timing before kickoff), open bets, recent results.
  - **Follow**: choose *every bet* or *only some* (sports, timing, minimum size, sells). Rules come pre-ticked from your current filter.
  - **Portfolio**: live feed of your bettors' bets + manage alerts (mute, edit).
  - **Account**: connect Telegram, plan, install instructions.
- **Worker**: listens to Polymarket's live trade stream and sends Telegram alerts in seconds (Pro) or 10 minutes later (Free).

## Quick start

```bash
npm install
cp .env.example .env
npm run db:push          # create the local SQLite database
npm run index            # index the Polymarket sports leaderboards (~300 bettors, 10–20 min)
npm run dev              # web app on http://localhost:3000
npm run worker           # realtime alerts + Telegram bot (separate terminal)
```

Telegram: create a bot with [@BotFather](https://t.me/BotFather), then set `TELEGRAM_BOT_TOKEN` and `TELEGRAM_BOT_USERNAME` in `.env`. Without a token the worker runs in **dry-run** mode and prints alerts to the console.

## How it works

```
Polymarket Data API v2 ──► indexer ──► SettledBet / OpenPosition rows (sport, league, timing)
   (leaderboard, positions)                     │
Gamma API (events, sports) ─────────────────────┘
                                                ▼
                                   stats queries (any filter combo)
                                                ▼
                                Next.js API ──► mobile web app

Polymarket RTDS (wss, live trades) ──► worker ──► follow rules ──► AlertLog queue ──► Telegram
```

- **Data** (`src/lib/polymarket.ts`): Data API v2 (`/v2/leaderboard?category=sports`, `/v2/positions`, `/v2/trades`) and Gamma (`/events`, `/sports`).
  `OPEN` positions include resolved-but-unredeemed ones (`redeemable: true`); those count as settled bets.
- **Sports** (`src/lib/sports.ts`): ~500 Polymarket league codes grouped into 12 sports, using gamma tags plus explicit tables.
- **Stats** (`src/lib/server/stats.ts`): ROI = profit ÷ staked on settled bets; win rate; profit; bets; sport mix; timing buckets (24h+, game day, last hour, live, futures); copiers on CopyBet. Computed from rows, so any filter combination works. Wallets that bet both sides of many markets (market makers) are excluded from rankings. Bettors need $1,000+ staked to rank.
- **Realtime** (`worker/index.ts`): RTDS `activity/trades` gives every fill with the trader's wallet. Fills of one order within 2.5s are merged into one alert. Alerts are stored first (`AlertLog`), then sent at ~1 msg/s per chat and ≤25 msg/s overall.
- **Accounts**: no signup. An anonymous account (cookie) is created on the first follow and linked to Telegram via `t.me/<bot>?start=<token>`.

## Production notes

- Switch Prisma to Postgres (`provider = "postgresql"`). The raw stats SQL uses SQLite's scalar `MAX(a, b)`; on Postgres use `GREATEST(a, b)`.
- Run the web app and the worker as separate always-on processes; the worker also re-indexes leaderboards hourly and followed bettors every 15 minutes.
- Payments aren't wired yet: set `NEXT_PUBLIC_PRO_CHECKOUT_URL` (e.g. a Stripe Payment Link) and add a webhook that sets `User.plan = "pro"` using `client_reference_id`.
- Pricing ($29/mo), the free tier (3 follows, 10-minute delay) and the $1,000 minimum stake are placeholders to tune.
- CopyBet is not affiliated with Polymarket. Keep the disclaimers (no guaranteed results, 18+, legal where you live).
