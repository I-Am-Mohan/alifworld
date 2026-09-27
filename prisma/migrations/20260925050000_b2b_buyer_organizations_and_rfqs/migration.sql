-- AlterTable: carts
ALTER TABLE "carts" ADD COLUMN "is_b2b" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "b2b_quote_id" TEXT,
ADD COLUMN "purchase_order_ref" TEXT;

-- CreateTable: buyer_organizations
CREATE TABLE "buyer_organizations" (
    "id" TEXT NOT NULL,
    "company_name" TEXT NOT NULL,
    "business_type" TEXT NOT NULL,
    "trade_license_number" TEXT,
    "bin_number" TEXT,
    "tin_number" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING_APPROVAL',
    "credit_status" TEXT NOT NULL DEFAULT 'DISABLED',
    "credit_limit_poisha" BIGINT NOT NULL DEFAULT 0,
    "credit_terms_days" INTEGER NOT NULL DEFAULT 0,
    "rewards_rule_version" TEXT NOT NULL DEFAULT 'b2b-rewards-v1.0',
    "earns_product_points" BOOLEAN NOT NULL DEFAULT false,
    "approved_at" TIMESTAMP(3),
    "approved_by" TEXT,
    "rejection_reason" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "deleted_at" TIMESTAMP(3),
    "deleted_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "buyer_organizations_pkey" PRIMARY KEY ("id")
);

-- CreateTable: buyer_organization_members
CREATE TABLE "buyer_organization_members" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'PURCHASER',
    "spending_limit_poisha" BIGINT NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "version" INTEGER NOT NULL DEFAULT 1,
    "deleted_at" TIMESTAMP(3),
    "deleted_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "buyer_organization_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable: b2b_rfqs
CREATE TABLE "b2b_rfqs" (
    "id" TEXT NOT NULL,
    "rfq_number" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "requester_id" TEXT NOT NULL,
    "seller_id" TEXT,
    "title" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'SUBMITTED',
    "purchase_order_ref" TEXT,
    "currency" TEXT NOT NULL DEFAULT 'BDT',
    "required_delivery_date" TIMESTAMP(3),
    "shipping_address" TEXT,
    "notes" TEXT,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "submitted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "version" INTEGER NOT NULL DEFAULT 1,
    "deleted_at" TIMESTAMP(3),
    "deleted_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "b2b_rfqs_pkey" PRIMARY KEY ("id")
);

-- CreateTable: b2b_rfq_items
CREATE TABLE "b2b_rfq_items" (
    "id" TEXT NOT NULL,
    "rfq_id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "variant_id" TEXT,
    "product_title" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "target_price_poisha" BIGINT,
    "specifications" TEXT,
    "min_order_quantity" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "b2b_rfq_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable: b2b_quotes
CREATE TABLE "b2b_quotes" (
    "id" TEXT NOT NULL,
    "quote_number" TEXT NOT NULL,
    "rfq_id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "seller_id" TEXT NOT NULL,
    "current_version" INTEGER NOT NULL DEFAULT 1,
    "status" TEXT NOT NULL DEFAULT 'PENDING_BUYER_REVIEW',
    "currency" TEXT NOT NULL DEFAULT 'BDT',
    "valid_until" TIMESTAMP(3) NOT NULL,
    "poisha_subtotal" BIGINT NOT NULL,
    "tax_poisha" BIGINT NOT NULL DEFAULT 0,
    "shipping_poisha" BIGINT NOT NULL DEFAULT 0,
    "total_poisha" BIGINT NOT NULL,
    "points_awarded" INTEGER NOT NULL DEFAULT 0,
    "rule_version" TEXT NOT NULL DEFAULT 'b2b-rewards-v1.0',
    "payment_terms" TEXT NOT NULL DEFAULT 'IMMEDIATE',
    "converted_cart_id" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "deleted_at" TIMESTAMP(3),
    "deleted_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "b2b_quotes_pkey" PRIMARY KEY ("id")
);

-- CreateTable: b2b_quote_items
CREATE TABLE "b2b_quote_items" (
    "id" TEXT NOT NULL,
    "quote_id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "variant_id" TEXT,
    "product_title" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unit_price_poisha" BIGINT NOT NULL,
    "line_total_poisha" BIGINT NOT NULL,
    "quantity_break_tier" TEXT,
    "lead_time_days" INTEGER,

    CONSTRAINT "b2b_quote_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable: b2b_quote_versions
CREATE TABLE "b2b_quote_versions" (
    "id" TEXT NOT NULL,
    "quote_id" TEXT NOT NULL,
    "version_number" INTEGER NOT NULL,
    "proposed_by" TEXT NOT NULL,
    "proposer_user_id" TEXT NOT NULL,
    "total_poisha" BIGINT NOT NULL,
    "items_snapshot" JSONB NOT NULL,
    "payment_terms" TEXT NOT NULL,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "b2b_quote_versions_pkey" PRIMARY KEY ("id")
);

-- Unique & Indexes
CREATE UNIQUE INDEX "buyer_organization_members_organization_id_user_id_key" ON "buyer_organization_members"("organization_id", "user_id");
CREATE UNIQUE INDEX "b2b_rfqs_rfq_number_key" ON "b2b_rfqs"("rfq_number");
CREATE UNIQUE INDEX "b2b_quotes_quote_number_key" ON "b2b_quotes"("quote_number");
CREATE UNIQUE INDEX "b2b_quote_versions_quote_id_version_number_key" ON "b2b_quote_versions"("quote_id", "version_number");

CREATE INDEX "buyer_organizations_status_idx" ON "buyer_organizations"("status");
CREATE INDEX "buyer_organizations_credit_status_idx" ON "buyer_organizations"("credit_status");
CREATE INDEX "buyer_organizations_deleted_at_idx" ON "buyer_organizations"("deleted_at");

CREATE INDEX "buyer_organization_members_user_id_idx" ON "buyer_organization_members"("user_id");
CREATE INDEX "buyer_organization_members_organization_id_status_idx" ON "buyer_organization_members"("organization_id", "status");
CREATE INDEX "buyer_organization_members_deleted_at_idx" ON "buyer_organization_members"("deleted_at");

CREATE INDEX "b2b_rfqs_organization_id_status_idx" ON "b2b_rfqs"("organization_id", "status");
CREATE INDEX "b2b_rfqs_seller_id_status_idx" ON "b2b_rfqs"("seller_id", "status");
CREATE INDEX "b2b_rfqs_status_expires_at_idx" ON "b2b_rfqs"("status", "expires_at");
CREATE INDEX "b2b_rfqs_deleted_at_idx" ON "b2b_rfqs"("deleted_at");

CREATE INDEX "b2b_rfq_items_rfq_id_idx" ON "b2b_rfq_items"("rfq_id");

CREATE INDEX "b2b_quotes_organization_id_status_idx" ON "b2b_quotes"("organization_id", "status");
CREATE INDEX "b2b_quotes_seller_id_status_idx" ON "b2b_quotes"("seller_id", "status");
CREATE INDEX "b2b_quotes_rfq_id_idx" ON "b2b_quotes"("rfq_id");
CREATE INDEX "b2b_quotes_valid_until_idx" ON "b2b_quotes"("valid_until");
CREATE INDEX "b2b_quotes_deleted_at_idx" ON "b2b_quotes"("deleted_at");

CREATE INDEX "b2b_quote_items_quote_id_idx" ON "b2b_quote_items"("quote_id");
CREATE INDEX "b2b_quote_versions_quote_id_idx" ON "b2b_quote_versions"("quote_id");

-- Foreign Keys
ALTER TABLE "buyer_organization_members" ADD CONSTRAINT "buyer_organization_members_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "buyer_organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "buyer_organization_members" ADD CONSTRAINT "buyer_organization_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "b2b_rfqs" ADD CONSTRAINT "b2b_rfqs_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "buyer_organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "b2b_rfqs" ADD CONSTRAINT "b2b_rfqs_requester_id_fkey" FOREIGN KEY ("requester_id") REFERENCES "buyer_organization_members"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "b2b_rfqs" ADD CONSTRAINT "b2b_rfqs_seller_id_fkey" FOREIGN KEY ("seller_id") REFERENCES "sellers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "b2b_rfq_items" ADD CONSTRAINT "b2b_rfq_items_rfq_id_fkey" FOREIGN KEY ("rfq_id") REFERENCES "b2b_rfqs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "b2b_quotes" ADD CONSTRAINT "b2b_quotes_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "buyer_organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "b2b_quotes" ADD CONSTRAINT "b2b_quotes_rfq_id_fkey" FOREIGN KEY ("rfq_id") REFERENCES "b2b_rfqs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "b2b_quotes" ADD CONSTRAINT "b2b_quotes_seller_id_fkey" FOREIGN KEY ("seller_id") REFERENCES "sellers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "b2b_quote_items" ADD CONSTRAINT "b2b_quote_items_quote_id_fkey" FOREIGN KEY ("quote_id") REFERENCES "b2b_quotes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "b2b_quote_versions" ADD CONSTRAINT "b2b_quote_versions_quote_id_fkey" FOREIGN KEY ("quote_id") REFERENCES "b2b_quotes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
