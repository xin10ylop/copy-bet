-- Stakes now include entry fees and use exact costs, and each market counts as one bet: recompute everyone.
UPDATE "Bettor" SET "lastIndexedAt" = NULL;
