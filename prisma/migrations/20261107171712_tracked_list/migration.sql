-- AlterTable
ALTER TABLE "Bettor" ADD COLUMN     "historyTruncated" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "openCount" INTEGER NOT NULL DEFAULT 0;
