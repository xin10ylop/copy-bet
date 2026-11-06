-- CreateTable
CREATE TABLE "DailyStat" (
    "bettorId" TEXT NOT NULL,
    "day" INTEGER NOT NULL,
    "sport" TEXT NOT NULL,
    "timing" TEXT NOT NULL,
    "bets" INTEGER NOT NULL,
    "wins" INTEGER NOT NULL,
    "staked" DOUBLE PRECISION NOT NULL,
    "profit" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "DailyStat_pkey" PRIMARY KEY ("bettorId","day","sport","timing")
);

-- CreateIndex
CREATE INDEX "DailyStat_day_idx" ON "DailyStat"("day");

-- AddForeignKey
ALTER TABLE "DailyStat" ADD CONSTRAINT "DailyStat_bettorId_fkey" FOREIGN KEY ("bettorId") REFERENCES "Bettor"("address") ON DELETE CASCADE ON UPDATE CASCADE;
