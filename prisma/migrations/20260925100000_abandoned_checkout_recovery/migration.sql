-- CreateTable: abandoned_checkout_recoveries
CREATE TABLE "abandoned_checkout_recoveries" (
    "id" TEXT NOT NULL,
    "cart_id" TEXT NOT NULL,
    "recovery_token" TEXT NOT NULL,
    "customer_id" TEXT,
    "recipient_email" TEXT,
    "recipient_phone" TEXT,
    "saved_address" JSONB,
    "total_poisha" BIGINT NOT NULL DEFAULT 0,
    "item_count" INTEGER NOT NULL DEFAULT 0,
    "incentive_coupon_code" TEXT,
    "recovery_status" TEXT NOT NULL DEFAULT 'ABANDONED',
    "notified_at" TIMESTAMP(3),
    "recovered_at" TIMESTAMP(3),
    "recovered_order_id" TEXT,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "abandoned_checkout_recoveries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "abandoned_checkout_recoveries_recovery_token_key" ON "abandoned_checkout_recoveries"("recovery_token");

-- CreateIndex
CREATE INDEX "abandoned_checkout_recoveries_cart_id_idx" ON "abandoned_checkout_recoveries"("cart_id");

-- CreateIndex
CREATE INDEX "abandoned_checkout_recoveries_recovery_status_created_at_idx" ON "abandoned_checkout_recoveries"("recovery_status", "created_at");

-- CreateIndex
CREATE INDEX "abandoned_checkout_recoveries_expires_at_idx" ON "abandoned_checkout_recoveries"("expires_at");

-- AddForeignKey
ALTER TABLE "abandoned_checkout_recoveries" ADD CONSTRAINT "abandoned_checkout_recoveries_cart_id_fkey" FOREIGN KEY ("cart_id") REFERENCES "carts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
