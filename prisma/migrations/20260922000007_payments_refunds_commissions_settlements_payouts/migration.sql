-- ==============================================================================
-- AlifWorld PostgreSQL Schema Migration: Milestone 028
-- Models: payments, refunds, refund_items, commission_ledger, seller_settlements,
--         seller_payouts, payment_webhook_logs
-- Reference: docs/architecture/payments-refunds-commissions-settlements-and-payouts.md
-- ==============================================================================

-- CreateTable: payments
CREATE TABLE "payments" (
    "id" TEXT NOT NULL,
    "order_id" TEXT NOT NULL,
    "customer_id" TEXT NOT NULL,
    "payment_number" TEXT NOT NULL,
    "gateway_provider" TEXT NOT NULL,
    "gateway_transaction_id" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "amount_poisha" BIGINT NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'BDT',
    "fee_poisha" BIGINT NOT NULL DEFAULT 0,
    "client_ip" TEXT,
    "idempotency_key" TEXT,
    "gateway_payload" JSONB,
    "authorized_at" TIMESTAMP(3),
    "captured_at" TIMESTAMP(3),
    "failed_at" TIMESTAMP(3),
    "failure_reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable: refunds
CREATE TABLE "refunds" (
    "id" TEXT NOT NULL,
    "payment_id" TEXT NOT NULL,
    "order_id" TEXT NOT NULL,
    "fulfillment_group_id" TEXT,
    "refund_number" TEXT NOT NULL,
    "amount_poisha" BIGINT NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'BDT',
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "gateway_refund_id" TEXT,
    "reason" TEXT NOT NULL,
    "idempotency_key" TEXT,
    "reversal_points" INTEGER NOT NULL DEFAULT 0,
    "seller_deduction_poisha" BIGINT NOT NULL DEFAULT 0,
    "tax_reversal_poisha" BIGINT NOT NULL DEFAULT 0,
    "commission_reversal_poisha" BIGINT NOT NULL DEFAULT 0,
    "initiated_by" TEXT,
    "approved_by" TEXT,
    "processed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "refunds_pkey" PRIMARY KEY ("id")
);

-- CreateTable: refund_items
CREATE TABLE "refund_items" (
    "id" TEXT NOT NULL,
    "refund_id" TEXT NOT NULL,
    "order_item_id" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "amount_poisha" BIGINT NOT NULL,
    "tax_poisha" BIGINT NOT NULL DEFAULT 0,
    "product_points" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "refund_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable: commission_ledger
CREATE TABLE "commission_ledger" (
    "id" TEXT NOT NULL,
    "seller_id" TEXT NOT NULL,
    "order_id" TEXT NOT NULL,
    "fulfillment_group_id" TEXT NOT NULL,
    "basis_amount_poisha" BIGINT NOT NULL,
    "commission_rate_bps" INTEGER NOT NULL,
    "commission_poisha" BIGINT NOT NULL,
    "rule_version" TEXT NOT NULL DEFAULT 'v1.0.0',
    "status" TEXT NOT NULL DEFAULT 'EARNED',
    "reversal_of_id" TEXT,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "commission_ledger_pkey" PRIMARY KEY ("id")
);

-- CreateTable: seller_settlements
CREATE TABLE "seller_settlements" (
    "id" TEXT NOT NULL,
    "seller_id" TEXT NOT NULL,
    "settlement_number" TEXT NOT NULL,
    "period_start" TIMESTAMP(3) NOT NULL,
    "period_end" TIMESTAMP(3) NOT NULL,
    "gross_order_poisha" BIGINT NOT NULL,
    "shipping_fee_poisha" BIGINT NOT NULL,
    "tax_poisha" BIGINT NOT NULL,
    "commission_poisha" BIGINT NOT NULL,
    "refund_deduction_poisha" BIGINT NOT NULL DEFAULT 0,
    "net_payout_poisha" BIGINT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "audited_by" TEXT,
    "audited_at" TIMESTAMP(3),
    "approved_by" TEXT,
    "approved_at" TIMESTAMP(3),
    "disbursed_at" TIMESTAMP(3),
    "version" INTEGER NOT NULL DEFAULT 1,
    "deleted_at" TIMESTAMP(3),
    "deleted_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "seller_settlements_pkey" PRIMARY KEY ("id")
);

-- CreateTable: seller_payouts
CREATE TABLE "seller_payouts" (
    "id" TEXT NOT NULL,
    "settlement_id" TEXT NOT NULL,
    "seller_id" TEXT NOT NULL,
    "payout_number" TEXT NOT NULL,
    "channel" TEXT NOT NULL,
    "bank_name" TEXT,
    "account_number" TEXT,
    "account_title" TEXT,
    "routing_number" TEXT,
    "amount_poisha" BIGINT NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'BDT',
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "gateway_reference" TEXT,
    "disbursed_at" TIMESTAMP(3),
    "failure_reason" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "deleted_at" TIMESTAMP(3),
    "deleted_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "seller_payouts_pkey" PRIMARY KEY ("id")
);

-- CreateTable: payment_webhook_logs
CREATE TABLE "payment_webhook_logs" (
    "id" TEXT NOT NULL,
    "gateway_provider" TEXT NOT NULL,
    "event_type" TEXT NOT NULL,
    "external_event_id" TEXT,
    "signature" TEXT,
    "payload" JSONB NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "processed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payment_webhook_logs_pkey" PRIMARY KEY ("id")
);

-- Unique Constraints
CREATE UNIQUE INDEX "payments_payment_number_key" ON "payments"("payment_number");
CREATE UNIQUE INDEX "payments_idempotency_key_key" ON "payments"("idempotency_key");
CREATE UNIQUE INDEX "refunds_refund_number_key" ON "refunds"("refund_number");
CREATE UNIQUE INDEX "refunds_idempotency_key_key" ON "refunds"("idempotency_key");
CREATE UNIQUE INDEX "commission_ledger_reversal_of_id_key" ON "commission_ledger"("reversal_of_id");
CREATE UNIQUE INDEX "seller_settlements_settlement_number_key" ON "seller_settlements"("settlement_number");
CREATE UNIQUE INDEX "seller_payouts_payout_number_key" ON "seller_payouts"("payout_number");

-- Indexes for payments
CREATE INDEX "payments_order_id_idx" ON "payments"("order_id");
CREATE INDEX "payments_customer_id_idx" ON "payments"("customer_id");
CREATE INDEX "payments_status_created_at_idx" ON "payments"("status", "created_at");
CREATE INDEX "payments_gateway_provider_gateway_transaction_id_idx" ON "payments"("gateway_provider", "gateway_transaction_id");

-- Indexes for refunds
CREATE INDEX "refunds_payment_id_idx" ON "refunds"("payment_id");
CREATE INDEX "refunds_order_id_idx" ON "refunds"("order_id");
CREATE INDEX "refunds_fulfillment_group_id_idx" ON "refunds"("fulfillment_group_id");
CREATE INDEX "refunds_status_created_at_idx" ON "refunds"("status", "created_at");

-- Indexes for refund_items
CREATE INDEX "refund_items_refund_id_idx" ON "refund_items"("refund_id");
CREATE INDEX "refund_items_order_item_id_idx" ON "refund_items"("order_item_id");

-- Indexes for commission_ledger
CREATE INDEX "commission_ledger_seller_id_status_idx" ON "commission_ledger"("seller_id", "status");
CREATE INDEX "commission_ledger_order_id_idx" ON "commission_ledger"("order_id");
CREATE INDEX "commission_ledger_fulfillment_group_id_idx" ON "commission_ledger"("fulfillment_group_id");
CREATE INDEX "commission_ledger_created_at_idx" ON "commission_ledger"("created_at");

-- Indexes for seller_settlements
CREATE INDEX "seller_settlements_seller_id_status_idx" ON "seller_settlements"("seller_id", "status");
CREATE INDEX "seller_settlements_period_start_period_end_idx" ON "seller_settlements"("period_start", "period_end");
CREATE INDEX "seller_settlements_deleted_at_idx" ON "seller_settlements"("deleted_at");

-- Indexes for seller_payouts
CREATE INDEX "seller_payouts_settlement_id_idx" ON "seller_payouts"("settlement_id");
CREATE INDEX "seller_payouts_seller_id_status_idx" ON "seller_payouts"("seller_id", "status");
CREATE INDEX "seller_payouts_channel_idx" ON "seller_payouts"("channel");
CREATE INDEX "seller_payouts_deleted_at_idx" ON "seller_payouts"("deleted_at");

-- Indexes for payment_webhook_logs
CREATE INDEX "payment_webhook_logs_gateway_provider_external_event_id_idx" ON "payment_webhook_logs"("gateway_provider", "external_event_id");
CREATE INDEX "payment_webhook_logs_status_created_at_idx" ON "payment_webhook_logs"("status", "created_at");

-- Foreign Keys
ALTER TABLE "payments" ADD CONSTRAINT "payments_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "payments" ADD CONSTRAINT "payments_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "refunds" ADD CONSTRAINT "refunds_payment_id_fkey" FOREIGN KEY ("payment_id") REFERENCES "payments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "refunds" ADD CONSTRAINT "refunds_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "refunds" ADD CONSTRAINT "refunds_fulfillment_group_id_fkey" FOREIGN KEY ("fulfillment_group_id") REFERENCES "seller_fulfillment_groups"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "refund_items" ADD CONSTRAINT "refund_items_refund_id_fkey" FOREIGN KEY ("refund_id") REFERENCES "refunds"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "refund_items" ADD CONSTRAINT "refund_items_order_item_id_fkey" FOREIGN KEY ("order_item_id") REFERENCES "order_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "commission_ledger" ADD CONSTRAINT "commission_ledger_seller_id_fkey" FOREIGN KEY ("seller_id") REFERENCES "sellers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "commission_ledger" ADD CONSTRAINT "commission_ledger_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "commission_ledger" ADD CONSTRAINT "commission_ledger_fulfillment_group_id_fkey" FOREIGN KEY ("fulfillment_group_id") REFERENCES "seller_fulfillment_groups"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "commission_ledger" ADD CONSTRAINT "commission_ledger_reversal_of_id_fkey" FOREIGN KEY ("reversal_of_id") REFERENCES "commission_ledger"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "seller_settlements" ADD CONSTRAINT "seller_settlements_seller_id_fkey" FOREIGN KEY ("seller_id") REFERENCES "sellers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "seller_payouts" ADD CONSTRAINT "seller_payouts_settlement_id_fkey" FOREIGN KEY ("settlement_id") REFERENCES "seller_settlements"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "seller_payouts" ADD CONSTRAINT "seller_payouts_seller_id_fkey" FOREIGN KEY ("seller_id") REFERENCES "sellers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
