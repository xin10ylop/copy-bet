-- A bet is dated by when its result was decided (sale or game end), not when winnings were collected: recompute everyone.
UPDATE "Bettor" SET "lastIndexedAt" = NULL;
