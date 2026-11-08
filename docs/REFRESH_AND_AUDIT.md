# Refreshing and auditing CopyBet's data

## How the data stays fresh

| What | How | How fresh |
|---|---|---|
| A bettor's figures after they bet | The **worker** (`npm run worker`, always on) listens to Polymarket's live trade stream and re-indexes any tracked bettor ~30 s after their last fill. | ~30 s – 2 min |
| Bets that settle (game over) | The worker re-checks every 3 min the bettors holding bets on games that started 2.5 h+ ago. | minutes after Polymarket settles |
| Everyone else, new leaders, people who drop off | The worker refreshes all tracked bettors oldest-first, nobody older than ~1 h. Vercel Cron (`/api/cron/index`, 07:00 and 19:00 UTC) does the same as a backup and removes bettors who left every top-1,000 list. | ≤ 1 h with the worker, ≤ 12 h without |
| Telegram alerts | The worker sends them within seconds of the bet (free plan: delayed on purpose). | seconds |
| Portfolio feed | Read live from Polymarket (20 s cache). | ≤ 20 s |

Tracked bettors = the top 1,000 by sports profit on each of Polymarket's all-time, 30-day and 7-day leaderboards (merged), plus anyone a user follows.

## How the numbers are checked

Continuously, by the worker (results at **`/api/status`**, failures sent to `ADMIN_TELEGRAM_CHAT_ID`):
- after every refresh: the bettor's figures are internally consistent (wins ≤ bets, ROI ≥ −100 %, sports add up to the total, timing shares add to 100 %, 7d ⊆ 30d ⊆ all-time, open-bet counts);
- every 5 min: a random bettor is recomputed from Polymarket's raw positions and every figure compared (bets, wins, staked, profit per timeframe and sport, timing mix);
- every 10 min: a random filter/sort combination of the rankings is checked (every row satisfies the filter, correct order, no duplicates across pages, list = profile).

On demand, against the live site: `npm run audit -- --sample 40` writes `audit-report.md` (rankings & filters, list vs profile, per-bettor recompute, bets in bookmaker format, odds = 1/price, returns ≈ stake × odds, no bet losing more than its stake).

## Definitions the checks enforce

- **One bet = one market.** Rows for the same market (re-entries, or both sides after a "split") are combined, shown on the side with the most money.
- **Stake** = what was paid incl. entry fees (exact cost fields, not the 4-decimal average price). A total loss is exactly −100 %.
- **Profit** = settled result (sold or resolved). **ROI** = profit ÷ stake. **Win** = a bet with profit > 0.
- **Open bets** show stake, odds (1 ÷ price paid) and what they return if they win — never a live market value.
- **Timeframes** count bets by the day they settled. **Timing** = minutes between first entry and kick-off.
- **Ranked** = at least 10 settled bets and $1,000 staked in the selected filter, not a market maker; all-time rankings skip accounts whose history is too long to read in full.

---

## Prompt: refresh and audit (paste into Claude Code in this repo)

```text
Refresh and audit CopyBet's data, end to end, and fix what's wrong.

1. Status: open https://copybet-omega.vercel.app/api/status. Report whether the worker is alive, how many
   bettors exist and how many were refreshed in the last 5 min / hour / 24 h, and every recent check failure.
   If the worker is down, say so first (live figures and alerts depend on it).
2. Refresh: if many bettors are older than 24 h, trigger a refresh with
   curl -H "Authorization: Bearer $CRON_SECRET" https://copybet-omega.vercel.app/api/cron/index
   (CRON_SECRET is in the Vercel project's environment variables; ask me if you don't have it), then wait
   until /api/status shows them refreshed.
3. Audit: run `npm run audit -- --sample 60` (it audits the live site against Polymarket's raw data:
   rankings and every filter/sort, list vs profile, every figure of 60 bettors recomputed from raw
   positions, bets in bookmaker format, odds, returns). Read audit-report.md.
4. For every failure (from the report or /api/status): reproduce it on the real bettor, find the root cause in
   src/lib/server/indexer.ts, src/lib/server/stats.ts, src/lib/betFormat.ts or the UI, fix it, and say which
   bettors and figures it affected. A difference caused only by bets that settled after the bettor was indexed
   is not a bug; anything else is. Never loosen a check to make it pass.
5. Check the bet display: for 10 bettors' open bets and recent results, confirm the selection/market/match read
   like a Stake/Bet365 slip, odds = 1 / price, and "returns" = stake × odds.
6. Run `npx tsc --noEmit`, `npx eslint src worker scripts --quiet`, build, commit and push, then trigger a
   refresh so production picks up the fix, and re-run the audit until it passes.
7. Report in plain words: what was checked, what was wrong, what you fixed, and anything you couldn't fix.
```

## Running the worker

The worker must run somewhere that stays on (Railway, Render, Fly.io or any small VPS):

```bash
npm ci
npx prisma generate
npm run worker
```

Environment variables: `DATABASE_URL` (the same Neon database as Vercel), `APP_URL` (e.g. https://copybet-omega.vercel.app),
`TELEGRAM_BOT_TOKEN` (from @BotFather), optional `ADMIN_TELEGRAM_CHAT_ID` (where audit failures go).
