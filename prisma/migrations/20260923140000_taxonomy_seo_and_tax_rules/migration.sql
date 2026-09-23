ALTER TABLE "category_translations" ADD COLUMN "seo_title" TEXT;
ALTER TABLE "category_translations" ADD COLUMN "seo_description" TEXT;
ALTER TABLE "category_translations" ADD COLUMN "breadcrumb_label" TEXT;
ALTER TABLE "brand_translations" ADD COLUMN "seo_title" TEXT;
ALTER TABLE "brand_translations" ADD COLUMN "seo_description" TEXT;
ALTER TABLE "brand_translations" ADD COLUMN "breadcrumb_label" TEXT;

CREATE TABLE "tax_rules" (
  "id" TEXT NOT NULL,
  "jurisdiction" TEXT NOT NULL DEFAULT 'BD',
  "category_id" TEXT,
  "name" TEXT NOT NULL,
  "tax_type" TEXT NOT NULL DEFAULT 'VAT',
  "rate_percent" DECIMAL(5,2) NOT NULL,
  "price_includes_tax" BOOLEAN NOT NULL DEFAULT false,
  "effective_from" TIMESTAMP(3) NOT NULL,
  "effective_to" TIMESTAMP(3),
  "status" TEXT NOT NULL DEFAULT 'DRAFT',
  "version" INTEGER NOT NULL DEFAULT 1,
  "created_by" TEXT,
  "updated_by" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "tax_rules_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "tax_rules_jurisdiction_effective_from_effective_to_idx" ON "tax_rules"("jurisdiction", "effective_from", "effective_to");
CREATE INDEX "tax_rules_category_id_status_idx" ON "tax_rules"("category_id", "status");
CREATE INDEX "tax_rules_status_idx" ON "tax_rules"("status");
ALTER TABLE "tax_rules" ADD CONSTRAINT "tax_rules_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
