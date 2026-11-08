-- Results of the continuous self-checks (kept for a week).
CREATE TABLE "AuditCheck" (
    "id" TEXT NOT NULL,
    "at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "kind" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "ok" BOOLEAN NOT NULL,
    "issues" TEXT[],
    CONSTRAINT "AuditCheck_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "AuditCheck_at_idx" ON "AuditCheck"("at");
CREATE INDEX "AuditCheck_kind_at_idx" ON "AuditCheck"("kind", "at");
