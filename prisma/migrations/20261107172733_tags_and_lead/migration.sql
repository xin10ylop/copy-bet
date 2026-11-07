-- AlterTable
ALTER TABLE "DailyStat" ADD COLUMN     "leadHist" INTEGER[] DEFAULT ARRAY[]::INTEGER[];

-- AlterTable
ALTER TABLE "EventMeta" ADD COLUMN     "sport" TEXT;

-- Re-index everyone so stored stats pick up tag-based sports, lead histograms and the longer history.
UPDATE "Bettor" SET "lastIndexedAt" = NULL;
