-- CreateTable: shipping_rate_rules
CREATE TABLE "shipping_rate_rules" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "name_bn" TEXT,
    "description" TEXT,
    "shipping_method" TEXT NOT NULL DEFAULT 'STANDARD',
    "origin_zone" TEXT NOT NULL DEFAULT 'ANY',
    "destination_zone" TEXT NOT NULL DEFAULT 'ANY',
    "seller_id" TEXT,
    "courier_provider" TEXT,
    "base_rate_poisha" BIGINT NOT NULL DEFAULT 6000,
    "base_weight_grams" INTEGER NOT NULL DEFAULT 1000,
    "incremental_weight_grams" INTEGER NOT NULL DEFAULT 1000,
    "incremental_rate_poisha" BIGINT NOT NULL DEFAULT 2000,
    "free_shipping_threshold_poisha" BIGINT,
    "handling_days" INTEGER NOT NULL DEFAULT 1,
    "transit_days_min" INTEGER NOT NULL DEFAULT 1,
    "transit_days_max" INTEGER NOT NULL DEFAULT 3,
    "cutoff_time" TEXT NOT NULL DEFAULT '14:00',
    "is_cod_allowed" BOOLEAN NOT NULL DEFAULT true,
    "max_cod_amount_poisha" BIGINT NOT NULL DEFAULT 5000000,
    "fragile_surcharge_poisha" BIGINT NOT NULL DEFAULT 0,
    "heavy_surcharge_poisha" BIGINT NOT NULL DEFAULT 0,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "rule_version" TEXT NOT NULL DEFAULT 'v1.0.0',
    "metadata" JSONB,
    "version" INTEGER NOT NULL DEFAULT 1,
    "deleted_at" TIMESTAMP(3),
    "deleted_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "shipping_rate_rules_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "shipping_rate_rules_code_key" ON "shipping_rate_rules"("code");

-- CreateIndex
CREATE INDEX "shipping_rate_rules_seller_id_status_idx" ON "shipping_rate_rules"("seller_id", "status");

-- CreateIndex
CREATE INDEX "shipping_rate_rules_shipping_method_destination_zone_idx" ON "shipping_rate_rules"("shipping_method", "destination_zone");

-- CreateIndex
CREATE INDEX "shipping_rate_rules_status_priority_idx" ON "shipping_rate_rules"("status", "priority");

-- CreateIndex
CREATE INDEX "shipping_rate_rules_deleted_at_idx" ON "shipping_rate_rules"("deleted_at");

-- AddForeignKey
ALTER TABLE "shipping_rate_rules" ADD CONSTRAINT "shipping_rate_rules_seller_id_fkey" FOREIGN KEY ("seller_id") REFERENCES "sellers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
