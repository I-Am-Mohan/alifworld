-- AlterTable: products
ALTER TABLE "products" ADD COLUMN "cost_price_poisha" BIGINT,
ADD COLUMN "min_price_poisha" BIGINT,
ADD COLUMN "min_order_quantity" INTEGER NOT NULL DEFAULT 1;

-- AlterTable: product_variants
ALTER TABLE "product_variants" ADD COLUMN "cost_price_poisha" BIGINT,
ADD COLUMN "min_price_poisha" BIGINT,
ADD COLUMN "min_order_quantity" INTEGER;

-- CreateTable: price_lists
CREATE TABLE "price_lists" (
    "id" TEXT NOT NULL,
    "seller_id" TEXT,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "channel" TEXT NOT NULL DEFAULT 'RETAIL',
    "currency" TEXT NOT NULL DEFAULT 'BDT',
    "buyer_segment" TEXT,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "starts_at" TIMESTAMP(3),
    "ends_at" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "rule_version" TEXT NOT NULL DEFAULT 'v1.0.0',
    "created_by" TEXT,
    "updated_by" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "deleted_at" TIMESTAMP(3),
    "deleted_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "price_lists_pkey" PRIMARY KEY ("id")
);

-- CreateTable: price_list_rules
CREATE TABLE "price_list_rules" (
    "id" TEXT NOT NULL,
    "price_list_id" TEXT NOT NULL,
    "product_id" TEXT,
    "variant_id" TEXT,
    "price_poisha" BIGINT NOT NULL,
    "compare_at_price_poisha" BIGINT,
    "min_quantity" INTEGER NOT NULL DEFAULT 1,
    "max_quantity" INTEGER,
    "product_point_override" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "price_list_rules_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "price_lists_code_key" ON "price_lists"("code");
CREATE INDEX "price_lists_code_idx" ON "price_lists"("code");
CREATE INDEX "price_lists_seller_id_status_idx" ON "price_lists"("seller_id", "status");
CREATE INDEX "price_lists_channel_buyer_segment_status_idx" ON "price_lists"("channel", "buyer_segment", "status");
CREATE INDEX "price_lists_deleted_at_idx" ON "price_lists"("deleted_at");

CREATE INDEX "price_list_rules_price_list_id_idx" ON "price_list_rules"("price_list_id");
CREATE INDEX "price_list_rules_product_id_idx" ON "price_list_rules"("product_id");
CREATE INDEX "price_list_rules_variant_id_idx" ON "price_list_rules"("variant_id");
CREATE INDEX "price_list_rules_min_quantity_max_quantity_idx" ON "price_list_rules"("min_quantity", "max_quantity");

-- AddForeignKey
ALTER TABLE "price_lists" ADD CONSTRAINT "price_lists_seller_id_fkey" FOREIGN KEY ("seller_id") REFERENCES "sellers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "price_list_rules" ADD CONSTRAINT "price_list_rules_price_list_id_fkey" FOREIGN KEY ("price_list_id") REFERENCES "price_lists"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "price_list_rules" ADD CONSTRAINT "price_list_rules_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "price_list_rules" ADD CONSTRAINT "price_list_rules_variant_id_fkey" FOREIGN KEY ("variant_id") REFERENCES "product_variants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
