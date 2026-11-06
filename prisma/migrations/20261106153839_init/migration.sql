-- CreateTable
CREATE TABLE "Bettor" (
    "address" TEXT NOT NULL,
    "name" TEXT,
    "pseudonym" TEXT,
    "profileImage" TEXT,
    "xUsername" TEXT,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "isMarketMaker" BOOLEAN NOT NULL DEFAULT false,
    "lbPnlMonth" DOUBLE PRECISION,
    "lbPnlAll" DOUBLE PRECISION,
    "lbVolumeAll" DOUBLE PRECISION,
    "lastIndexedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Bettor_pkey" PRIMARY KEY ("address")
);

-- CreateTable
CREATE TABLE "SettledBet" (
    "id" TEXT NOT NULL,
    "bettorId" TEXT NOT NULL,
    "sport" TEXT NOT NULL,
    "league" TEXT NOT NULL,
    "eventSlug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "outcome" TEXT NOT NULL,
    "cost" DOUBLE PRECISION NOT NULL,
    "pnl" DOUBLE PRECISION NOT NULL,
    "entryAt" TIMESTAMP(3) NOT NULL,
    "settledAt" TIMESTAMP(3) NOT NULL,
    "settledTs" INTEGER NOT NULL,
    "gameStartAt" TIMESTAMP(3),
    "leadMinutes" INTEGER,
    "timing" TEXT NOT NULL,
    "icon" TEXT,

    CONSTRAINT "SettledBet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OpenPosition" (
    "id" TEXT NOT NULL,
    "bettorId" TEXT NOT NULL,
    "sport" TEXT NOT NULL,
    "league" TEXT NOT NULL,
    "eventSlug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "outcome" TEXT NOT NULL,
    "size" DOUBLE PRECISION NOT NULL,
    "avgPrice" DOUBLE PRECISION NOT NULL,
    "cost" DOUBLE PRECISION NOT NULL,
    "currentValue" DOUBLE PRECISION NOT NULL,
    "pnl" DOUBLE PRECISION NOT NULL,
    "entryAt" TIMESTAMP(3) NOT NULL,
    "gameStartAt" TIMESTAMP(3),
    "timing" TEXT NOT NULL,
    "icon" TEXT,

    CONSTRAINT "OpenPosition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EventMeta" (
    "slug" TEXT NOT NULL,
    "title" TEXT,
    "league" TEXT,
    "isGame" BOOLEAN NOT NULL DEFAULT false,
    "startTime" TIMESTAMP(3),
    "fetchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EventMeta_pkey" PRIMARY KEY ("slug")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "plan" TEXT NOT NULL DEFAULT 'free',
    "telegramChatId" TEXT,
    "telegramUsername" TEXT,
    "telegramName" TEXT,
    "linkToken" TEXT NOT NULL,
    "goal" TEXT,
    "favoriteSport" TEXT,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Follow" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "bettorId" TEXT NOT NULL,
    "mode" TEXT NOT NULL DEFAULT 'all',
    "sports" TEXT NOT NULL DEFAULT '[]',
    "timing" TEXT NOT NULL DEFAULT '[]',
    "minSize" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "includeSells" BOOLEAN NOT NULL DEFAULT false,
    "mutedUntil" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Follow_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SavedSearch" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "filter" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SavedSearch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AlertLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "bettorId" TEXT NOT NULL,
    "txHash" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "outcome" TEXT NOT NULL,
    "side" TEXT NOT NULL,
    "price" DOUBLE PRECISION NOT NULL,
    "usdSize" DOUBLE PRECISION NOT NULL,
    "eventSlug" TEXT NOT NULL,
    "sport" TEXT,
    "detectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sendAt" TIMESTAMP(3) NOT NULL,
    "sentAt" TIMESTAMP(3),

    CONSTRAINT "AlertLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SettledBet_bettorId_settledTs_idx" ON "SettledBet"("bettorId", "settledTs");

-- CreateIndex
CREATE INDEX "SettledBet_sport_settledTs_idx" ON "SettledBet"("sport", "settledTs");

-- CreateIndex
CREATE INDEX "OpenPosition_bettorId_idx" ON "OpenPosition"("bettorId");

-- CreateIndex
CREATE UNIQUE INDEX "User_telegramChatId_key" ON "User"("telegramChatId");

-- CreateIndex
CREATE UNIQUE INDEX "User_linkToken_key" ON "User"("linkToken");

-- CreateIndex
CREATE INDEX "Follow_bettorId_idx" ON "Follow"("bettorId");

-- CreateIndex
CREATE UNIQUE INDEX "Follow_userId_bettorId_key" ON "Follow"("userId", "bettorId");

-- CreateIndex
CREATE INDEX "AlertLog_sentAt_sendAt_idx" ON "AlertLog"("sentAt", "sendAt");

-- CreateIndex
CREATE INDEX "AlertLog_userId_detectedAt_idx" ON "AlertLog"("userId", "detectedAt");

-- CreateIndex
CREATE UNIQUE INDEX "AlertLog_userId_bettorId_txHash_outcome_side_key" ON "AlertLog"("userId", "bettorId", "txHash", "outcome", "side");

-- AddForeignKey
ALTER TABLE "SettledBet" ADD CONSTRAINT "SettledBet_bettorId_fkey" FOREIGN KEY ("bettorId") REFERENCES "Bettor"("address") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OpenPosition" ADD CONSTRAINT "OpenPosition_bettorId_fkey" FOREIGN KEY ("bettorId") REFERENCES "Bettor"("address") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Follow" ADD CONSTRAINT "Follow_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Follow" ADD CONSTRAINT "Follow_bettorId_fkey" FOREIGN KEY ("bettorId") REFERENCES "Bettor"("address") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SavedSearch" ADD CONSTRAINT "SavedSearch_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AlertLog" ADD CONSTRAINT "AlertLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
