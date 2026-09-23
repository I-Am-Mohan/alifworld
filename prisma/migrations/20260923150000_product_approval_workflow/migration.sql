CREATE TABLE "product_approval_requests" (
  "id" TEXT NOT NULL,
  "product_id" TEXT NOT NULL,
  "submitted_version" INTEGER NOT NULL,
  "submitted_by" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "decision_by" TEXT,
  "reason" TEXT,
  "review_notes" TEXT,
  "idempotency_key" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "decided_at" TIMESTAMP(3),
  CONSTRAINT "product_approval_requests_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "product_approval_requests_idempotency_key_key" ON "product_approval_requests"("idempotency_key");
CREATE INDEX "product_approval_requests_product_id_status_created_at_idx" ON "product_approval_requests"("product_id", "status", "created_at");
CREATE INDEX "product_approval_requests_status_created_at_idx" ON "product_approval_requests"("status", "created_at");
ALTER TABLE "product_approval_requests" ADD CONSTRAINT "product_approval_requests_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "product_status_history" (
  "id" TEXT NOT NULL,
  "product_id" TEXT NOT NULL,
  "from_status" TEXT,
  "to_status" TEXT NOT NULL,
  "reason" TEXT,
  "actor_id" TEXT NOT NULL,
  "request_id" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "product_status_history_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "product_status_history_product_id_created_at_idx" ON "product_status_history"("product_id", "created_at");
CREATE INDEX "product_status_history_to_status_created_at_idx" ON "product_status_history"("to_status", "created_at");
ALTER TABLE "product_status_history" ADD CONSTRAINT "product_status_history_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;
