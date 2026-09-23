ALTER TABLE "sellers" ADD COLUMN "restriction_reason" TEXT;

CREATE TABLE "seller_lifecycle_events" (
  "id" TEXT NOT NULL,
  "seller_id" TEXT NOT NULL,
  "from_status" TEXT NOT NULL,
  "to_status" TEXT NOT NULL,
  "reason" TEXT NOT NULL,
  "actor_id" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "seller_lifecycle_events_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "seller_lifecycle_events_seller_id_created_at_idx" ON "seller_lifecycle_events"("seller_id", "created_at");
CREATE INDEX "seller_lifecycle_events_to_status_created_at_idx" ON "seller_lifecycle_events"("to_status", "created_at");
ALTER TABLE "seller_lifecycle_events" ADD CONSTRAINT "seller_lifecycle_events_seller_id_fkey" FOREIGN KEY ("seller_id") REFERENCES "sellers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
