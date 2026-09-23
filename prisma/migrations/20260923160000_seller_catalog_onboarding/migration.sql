CREATE TABLE "catalog_onboarding_templates" (
  "id" TEXT NOT NULL,
  "template_key" TEXT NOT NULL,
  "category_id" TEXT,
  "locale" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "required_fields" JSONB NOT NULL,
  "recommended_fields" JSONB NOT NULL,
  "attribute_guidance" JSONB NOT NULL,
  "media_guidance" JSONB NOT NULL,
  "title_example" TEXT,
  "description_example" TEXT,
  "validation_hints" JSONB NOT NULL,
  "version" INTEGER NOT NULL DEFAULT 1,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "created_by" TEXT,
  "updated_by" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "catalog_onboarding_templates_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "catalog_onboarding_templates_template_key_key" ON "catalog_onboarding_templates"("template_key");
CREATE UNIQUE INDEX "catalog_onboarding_templates_category_id_locale_key" ON "catalog_onboarding_templates"("category_id", "locale");
CREATE INDEX "catalog_onboarding_templates_category_id_locale_is_active_idx" ON "catalog_onboarding_templates"("category_id", "locale", "is_active");
ALTER TABLE "catalog_onboarding_templates" ADD CONSTRAINT "catalog_onboarding_templates_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "seller_catalog_onboarding_progress" (
  "id" TEXT NOT NULL,
  "seller_id" TEXT NOT NULL,
  "template_id" TEXT NOT NULL,
  "completed_items" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "dismissed" BOOLEAN NOT NULL DEFAULT false,
  "last_viewed_version" INTEGER NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "seller_catalog_onboarding_progress_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "seller_catalog_onboarding_progress_seller_id_template_id_key" ON "seller_catalog_onboarding_progress"("seller_id", "template_id");
CREATE INDEX "seller_catalog_onboarding_progress_seller_id_updated_at_idx" ON "seller_catalog_onboarding_progress"("seller_id", "updated_at");
ALTER TABLE "seller_catalog_onboarding_progress" ADD CONSTRAINT "seller_catalog_onboarding_progress_seller_id_fkey" FOREIGN KEY ("seller_id") REFERENCES "sellers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "seller_catalog_onboarding_progress" ADD CONSTRAINT "seller_catalog_onboarding_progress_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "catalog_onboarding_templates"("id") ON DELETE CASCADE ON UPDATE CASCADE;
