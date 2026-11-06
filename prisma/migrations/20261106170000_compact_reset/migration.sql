-- Stats now live in "DailyStat"; "SettledBet" only keeps each bettor's latest bets.
-- Drop the old full history (it was most of the database) and mark every bettor for
-- re-indexing so their daily totals get built on the next indexing run.
TRUNCATE TABLE "SettledBet";
UPDATE "Bettor" SET "lastIndexedAt" = NULL;
