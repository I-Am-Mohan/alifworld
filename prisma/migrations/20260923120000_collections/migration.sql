CREATE TABLE "collections" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "description" TEXT,
  "collection_type" TEXT NOT NULL DEFAULT 'CURATED',
  "rule" JSONB,
  "status" TEXT NOT NULL DEFAULT 'DRAFT',
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "display_order" INTEGER NOT NULL DEFAULT 0,
  "version" INTEGER NOT NULL DEFAULT 1,
  "deleted_at" TIMESTAMP(3),
  "deleted_by" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "collections_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "collections_slug_key" ON "collections"("slug");
CREATE INDEX "collections_status_is_active_idx" ON "collections"("status", "is_active");
CREATE INDEX "collections_collection_type_idx" ON "collections"("collection_type");

CREATE TABLE "collection_products" (
  "id" TEXT NOT NULL,
  "collection_id" TEXT NOT NULL,
  "product_id" TEXT NOT NULL,
  "display_order" INTEGER NOT NULL DEFAULT 0,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "collection_products_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "collection_products_collection_id_product_id_key" ON "collection_products"("collection_id", "product_id");
CREATE INDEX "collection_products_collection_id_display_order_idx" ON "collection_products"("collection_id", "display_order");
CREATE INDEX "collection_products_product_id_idx" ON "collection_products"("product_id");
ALTER TABLE "collection_products" ADD CONSTRAINT "collection_products_collection_id_fkey" FOREIGN KEY ("collection_id") REFERENCES "collections"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "collection_products" ADD CONSTRAINT "collection_products_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;
