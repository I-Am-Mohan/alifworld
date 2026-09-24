-- CreateTable: discount_rules
CREATE TABLE "discount_rules" (
    "id" TEXT NOT NULL,
    "code" TEXT,
    "title" TEXT NOT NULL,
    "title_bn" TEXT,
    "description" TEXT,
    "discount_type" TEXT NOT NULL DEFAULT 'PERCENTAGE',
    "target_scope" TEXT NOT NULL DEFAULT 'CART_SUBTOTAL',
    "discount_value" DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    "max_discount_poisha" BIGINT,
    "min_order_subtotal_poisha" BIGINT NOT NULL DEFAULT 0,
    "min_quantity" INTEGER NOT NULL DEFAULT 1,
    "buy_quantity" INTEGER,
    "get_quantity" INTEGER,
    "get_discount_percent" DECIMAL(5,2),
    "is_automatic" BOOLEAN NOT NULL DEFAULT true,
    "funding_type" TEXT NOT NULL DEFAULT 'PLATFORM_FUNDED',
    "seller_share_percent" DECIMAL(5,2) NOT NULL DEFAULT 0.00,
    "platform_share_percent" DECIMAL(5,2) NOT NULL DEFAULT 100.00,
    "seller_id" TEXT,
    "buyer_segment" TEXT,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "starts_at" TIMESTAMP(3) NOT NULL,
    "ends_at" TIMESTAMP(3),
    "usage_limit" INTEGER,
    "usage_count" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "rule_version" TEXT NOT NULL DEFAULT 'v1.0.0',
    "created_by" TEXT,
    "updated_by" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "deleted_at" TIMESTAMP(3),
    "deleted_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "discount_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable: discount_rule_targets
CREATE TABLE "discount_rule_targets" (
    "id" TEXT NOT NULL,
    "discount_rule_id" TEXT NOT NULL,
    "target_type" TEXT NOT NULL,
    "target_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "discount_rule_targets_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "discount_rules_code_key" ON "discount_rules"("code");
CREATE INDEX "discount_rules_code_idx" ON "discount_rules"("code");
CREATE INDEX "discount_rules_seller_id_status_idx" ON "discount_rules"("seller_id", "status");
CREATE INDEX "discount_rules_is_automatic_status_starts_at_ends_at_idx" ON "discount_rules"("is_automatic", "status", "starts_at", "ends_at");
CREATE INDEX "discount_rules_deleted_at_idx" ON "discount_rules"("deleted_at");

CREATE INDEX "discount_rule_targets_discount_rule_id_idx" ON "discount_rule_targets"("discount_rule_id");
CREATE INDEX "discount_rule_targets_target_type_target_id_idx" ON "discount_rule_targets"("target_type", "target_id");

-- AddForeignKey
ALTER TABLE "discount_rules" ADD CONSTRAINT "discount_rules_seller_id_fkey" FOREIGN KEY ("seller_id") REFERENCES "sellers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "discount_rule_targets" ADD CONSTRAINT "discount_rule_targets_discount_rule_id_fkey" FOREIGN KEY ("discount_rule_id") REFERENCES "discount_rules"("id") ON DELETE CASCADE ON UPDATE CASCADE;
