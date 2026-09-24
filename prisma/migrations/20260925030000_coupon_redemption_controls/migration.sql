-- CreateTable: coupon_redemptions
CREATE TABLE "coupon_redemptions" (
    "id" TEXT NOT NULL,
    "coupon_code" TEXT NOT NULL,
    "discount_rule_id" TEXT,
    "promotion_id" TEXT,
    "customer_id" TEXT NOT NULL,
    "order_id" TEXT,
    "seller_id" TEXT,
    "discount_amount_poisha" BIGINT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'RESERVED',
    "reserved_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "committed_at" TIMESTAMP(3),
    "reversed_at" TIMESTAMP(3),
    "reversal_reason" TEXT,
    "rule_version" TEXT NOT NULL DEFAULT 'v1.0.0',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "coupon_redemptions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "coupon_redemptions_coupon_code_customer_id_idx" ON "coupon_redemptions"("coupon_code", "customer_id");
CREATE INDEX "coupon_redemptions_customer_id_status_idx" ON "coupon_redemptions"("customer_id", "status");
CREATE INDEX "coupon_redemptions_order_id_idx" ON "coupon_redemptions"("order_id");
CREATE INDEX "coupon_redemptions_seller_id_created_at_idx" ON "coupon_redemptions"("seller_id", "created_at");
CREATE INDEX "coupon_redemptions_status_reserved_at_idx" ON "coupon_redemptions"("status", "reserved_at");

-- AddForeignKey
ALTER TABLE "coupon_redemptions" ADD CONSTRAINT "coupon_redemptions_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "coupon_redemptions" ADD CONSTRAINT "coupon_redemptions_discount_rule_id_fkey" FOREIGN KEY ("discount_rule_id") REFERENCES "discount_rules"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "coupon_redemptions" ADD CONSTRAINT "coupon_redemptions_promotion_id_fkey" FOREIGN KEY ("promotion_id") REFERENCES "promotions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "coupon_redemptions" ADD CONSTRAINT "coupon_redemptions_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "coupon_redemptions" ADD CONSTRAINT "coupon_redemptions_seller_id_fkey" FOREIGN KEY ("seller_id") REFERENCES "sellers"("id") ON DELETE SET NULL ON UPDATE CASCADE;
