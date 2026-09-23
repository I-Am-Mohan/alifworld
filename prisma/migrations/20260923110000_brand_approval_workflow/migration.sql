ALTER TABLE "brands"
  ALTER COLUMN "is_verified" SET DEFAULT false,
  ADD COLUMN "approval_status" TEXT NOT NULL DEFAULT 'PENDING',
  ADD COLUMN "rejection_reason" TEXT,
  ADD COLUMN "reviewed_by" TEXT,
  ADD COLUMN "reviewed_at" TIMESTAMP(3);
CREATE INDEX "brands_approval_status_idx" ON "brands"("approval_status");
