-- CreateTable: promotions
CREATE TABLE "promotions" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "title_bn" TEXT,
    "description" TEXT,
    "promotion_type" TEXT NOT NULL DEFAULT 'PERCENTAGE',
    "funding_type" TEXT NOT NULL DEFAULT 'PLATFORM_FUNDED',
    "seller_share_percent" DECIMAL(5,2) NOT NULL DEFAULT 0.00,
    "platform_share_percent" DECIMAL(5,2) NOT NULL DEFAULT 100.00,
    "seller_id" TEXT,
    "discount_value" DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    "max_discount_poisha" BIGINT,
    "min_order_subtotal_poisha" BIGINT NOT NULL DEFAULT 0,
    "usage_limit" INTEGER,
    "usage_count" INTEGER NOT NULL DEFAULT 0,
    "per_customer_limit" INTEGER DEFAULT 1,
    "starts_at" TIMESTAMP(3) NOT NULL,
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

    CONSTRAINT "promotions_pkey" PRIMARY KEY ("id")
);

-- CreateTable: promotion_attributions
CREATE TABLE "promotion_attributions" (
    "id" TEXT NOT NULL,
    "order_id" TEXT NOT NULL,
    "fulfillment_group_id" TEXT,
    "order_item_id" TEXT,
    "seller_id" TEXT,
    "promotion_id" TEXT,
    "coupon_code" TEXT,
    "funding_type" TEXT NOT NULL,
    "discount_amount_poisha" BIGINT NOT NULL,
    "seller_share_poisha" BIGINT NOT NULL,
    "platform_share_poisha" BIGINT NOT NULL,
    "seller_share_percent" DECIMAL(5,2) NOT NULL,
    "platform_share_percent" DECIMAL(5,2) NOT NULL,
    "rule_version" TEXT NOT NULL DEFAULT 'v1.0.0',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "promotion_attributions_pkey" PRIMARY KEY ("id")
);

-- AlterTable: orders
ALTER TABLE "orders" ADD COLUMN "seller_discount_poisha" BIGINT NOT NULL DEFAULT 0,
ADD COLUMN "platform_discount_poisha" BIGINT NOT NULL DEFAULT 0;

-- AlterTable: seller_fulfillment_groups
ALTER TABLE "seller_fulfillment_groups" ADD COLUMN "discount_poisha" BIGINT NOT NULL DEFAULT 0,
ADD COLUMN "seller_discount_poisha" BIGINT NOT NULL DEFAULT 0,
ADD COLUMN "platform_discount_poisha" BIGINT NOT NULL DEFAULT 0;

-- AlterTable: order_items
ALTER TABLE "order_items" ADD COLUMN "discount_poisha" BIGINT NOT NULL DEFAULT 0,
ADD COLUMN "seller_discount_poisha" BIGINT NOT NULL DEFAULT 0,
ADD COLUMN "platform_discount_poisha" BIGINT NOT NULL DEFAULT 0;

-- CreateIndex
CREATE UNIQUE INDEX "promotions_code_key" ON "promotions"("code");
CREATE INDEX "promotions_code_idx" ON "promotions"("code");
CREATE INDEX "promotions_seller_id_status_idx" ON "promotions"("seller_id", "status");
CREATE INDEX "promotions_status_starts_at_ends_at_idx" ON "promotions"("status", "starts_at", "ends_at");
CREATE INDEX "promotions_deleted_at_idx" ON "promotions"("deleted_at");

CREATE INDEX "promotion_attributions_order_id_idx" ON "promotion_attributions"("order_id");
CREATE INDEX "promotion_attributions_fulfillment_group_id_idx" ON "promotion_attributions"("fulfillment_group_id");
CREATE INDEX "promotion_attributions_seller_id_created_at_idx" ON "promotion_attributions"("seller_id", "created_at");
CREATE INDEX "promotion_attributions_promotion_id_idx" ON "promotion_attributions"("promotion_id");
CREATE INDEX "promotion_attributions_coupon_code_idx" ON "promotion_attributions"("coupon_code");

-- AddForeignKey
ALTER TABLE "promotions" ADD CONSTRAINT "promotions_seller_id_fkey" FOREIGN KEY ("seller_id") REFERENCES "sellers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "promotion_attributions" ADD CONSTRAINT "promotion_attributions_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "promotion_attributions" ADD CONSTRAINT "promotion_attributions_fulfillment_group_id_fkey" FOREIGN KEY ("fulfillment_group_id") REFERENCES "seller_fulfillment_groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "promotion_attributions" ADD CONSTRAINT "promotion_attributions_order_item_id_fkey" FOREIGN KEY ("order_item_id") REFERENCES "order_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "promotion_attributions" ADD CONSTRAINT "promotion_attributions_seller_id_fkey" FOREIGN KEY ("seller_id") REFERENCES "sellers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "promotion_attributions" ADD CONSTRAINT "promotion_attributions_promotion_id_fkey" FOREIGN KEY ("promotion_id") REFERENCES "promotions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
