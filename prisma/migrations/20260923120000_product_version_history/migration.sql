CREATE TABLE "product_version_history" (
  "id" TEXT NOT NULL,
  "product_id" TEXT NOT NULL,
  "version" INTEGER NOT NULL,
  "action" TEXT NOT NULL,
  "snapshot" JSONB NOT NULL,
  "actor_id" TEXT,
  "actor_role" TEXT,
  "request_id" TEXT,
  "ip_address" TEXT,
  "user_agent" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "product_version_history_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "product_version_history_product_id_version_key" ON "product_version_history"("product_id", "version");
CREATE INDEX "product_version_history_product_id_created_at_idx" ON "product_version_history"("product_id", "created_at");
CREATE INDEX "product_version_history_actor_id_created_at_idx" ON "product_version_history"("actor_id", "created_at");
ALTER TABLE "product_version_history" ADD CONSTRAINT "product_version_history_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;
