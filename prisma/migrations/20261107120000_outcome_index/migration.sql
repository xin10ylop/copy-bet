-- Position of the answer in the market's outcome list (0 = the side named in the title).
ALTER TABLE "OpenPosition" ADD COLUMN "outcomeIndex" INTEGER;
ALTER TABLE "AlertLog" ADD COLUMN "outcomeIndex" INTEGER;
