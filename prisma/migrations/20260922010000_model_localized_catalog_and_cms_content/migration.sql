-- Milestone 053: normalized localized catalog content and versioned CMS content
CREATE TABLE "product_translations" (
    "id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "locale" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "warranty" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "product_translations_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "product_translations_product_id_locale_key" ON "product_translations"("product_id", "locale");
CREATE INDEX "product_translations_locale_idx" ON "product_translations"("locale");
ALTER TABLE "product_translations" ADD CONSTRAINT "product_translations_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "category_translations" (
    "id" TEXT NOT NULL,
    "category_id" TEXT NOT NULL,
    "locale" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "category_translations_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "category_translations_category_id_locale_key" ON "category_translations"("category_id", "locale");
CREATE INDEX "category_translations_locale_idx" ON "category_translations"("locale");
ALTER TABLE "category_translations" ADD CONSTRAINT "category_translations_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "brand_translations" (
    "id" TEXT NOT NULL,
    "brand_id" TEXT NOT NULL,
    "locale" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "brand_translations_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "brand_translations_brand_id_locale_key" ON "brand_translations"("brand_id", "locale");
CREATE INDEX "brand_translations_locale_idx" ON "brand_translations"("locale");
ALTER TABLE "brand_translations" ADD CONSTRAINT "brand_translations_brand_id_fkey" FOREIGN KEY ("brand_id") REFERENCES "brands"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "cms_contents" (
    "id" TEXT NOT NULL,
    "content_type" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "published_at" TIMESTAMP(3),
    "published_by" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "created_by" TEXT,
    "updated_by" TEXT,
    "deleted_at" TIMESTAMP(3),
    "deleted_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "cms_contents_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "cms_contents_slug_key" ON "cms_contents"("slug");
CREATE INDEX "cms_contents_content_type_status_idx" ON "cms_contents"("content_type", "status");
CREATE INDEX "cms_contents_deleted_at_idx" ON "cms_contents"("deleted_at");

CREATE TABLE "cms_content_translations" (
    "id" TEXT NOT NULL,
    "content_id" TEXT NOT NULL,
    "locale" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" JSONB NOT NULL,
    "seo_title" TEXT,
    "seo_description" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "cms_content_translations_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "cms_content_translations_content_id_locale_key" ON "cms_content_translations"("content_id", "locale");
CREATE INDEX "cms_content_translations_locale_idx" ON "cms_content_translations"("locale");
ALTER TABLE "cms_content_translations" ADD CONSTRAINT "cms_content_translations_content_id_fkey" FOREIGN KEY ("content_id") REFERENCES "cms_contents"("id") ON DELETE CASCADE ON UPDATE CASCADE;
