CREATE TABLE "catalog_moderation_reviews" (
  "id" TEXT NOT NULL,
  "product_id" TEXT NOT NULL,
  "product_version" INTEGER NOT NULL,
  "moderation_status" TEXT NOT NULL DEFAULT 'PENDING',
  "duplicate_status" TEXT NOT NULL DEFAULT 'NOT_CHECKED',
  "reason" TEXT,
  "severity" TEXT NOT NULL DEFAULT 'LOW',
  "matched_product_ids" JSONB,
  "source" TEXT NOT NULL DEFAULT 'AUTOMATED',
  "decision_by" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "resolved_at" TIMESTAMP(3),
  CONSTRAINT "catalog_moderation_reviews_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "catalog_moderation_reviews_moderation_status_severity_created_at_idx" ON "catalog_moderation_reviews"("moderation_status", "severity", "created_at");
CREATE INDEX "catalog_moderation_reviews_product_id_created_at_idx" ON "catalog_moderation_reviews"("product_id", "created_at");
ALTER TABLE "catalog_moderation_reviews" ADD CONSTRAINT "catalog_moderation_reviews_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "product_duplicate_fingerprints" (
  "id" TEXT NOT NULL,
  "product_id" TEXT NOT NULL,
  "normalized_title_hash" TEXT NOT NULL,
  "brand_category_key" TEXT NOT NULL,
  "sku_fingerprint" TEXT,
  "barcode_fingerprint" TEXT,
  "variant_signature" TEXT,
  "algorithm_version" TEXT NOT NULL,
  "calculated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "product_duplicate_fingerprints_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "product_duplicate_fingerprints_product_id_key" ON "product_duplicate_fingerprints"("product_id");
CREATE INDEX "product_duplicate_fingerprints_normalized_title_hash_brand_category_key_idx" ON "product_duplicate_fingerprints"("normalized_title_hash", "brand_category_key");
CREATE INDEX "product_duplicate_fingerprints_sku_fingerprint_idx" ON "product_duplicate_fingerprints"("sku_fingerprint");
CREATE INDEX "product_duplicate_fingerprints_barcode_fingerprint_idx" ON "product_duplicate_fingerprints"("barcode_fingerprint");
ALTER TABLE "product_duplicate_fingerprints" ADD CONSTRAINT "product_duplicate_fingerprints_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;
