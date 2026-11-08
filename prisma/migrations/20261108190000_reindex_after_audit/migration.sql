-- Stakes are never below the amount lost, and kick-off times near now are re-read: recompute everyone.
UPDATE "Bettor" SET "lastIndexedAt" = NULL;
