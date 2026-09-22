-- ==============================================================================
-- AlifWorld PostgreSQL Schema Migration: Milestone 027
-- Models: carts, cart_items, orders, seller_fulfillment_groups, order_items,
--         order_status_history, shipments, shipment_events
-- Reference: docs/architecture/carts-orders-fulfillment-groups-and-shipments.md
-- ==============================================================================

-- CreateTable: carts
CREATE TABLE "carts" (
    "id" TEXT NOT NULL,
    "user_id" TEXT,
    "currency" TEXT NOT NULL DEFAULT 'BDT',
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "coupon_code" TEXT,
    "notes" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "deleted_at" TIMESTAMP(3),
    "deleted_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "carts_pkey" PRIMARY KEY ("id")
);

-- CreateTable: cart_items
CREATE TABLE "cart_items" (
    "id" TEXT NOT NULL,
    "cart_id" TEXT NOT NULL,
    "variant_id" TEXT NOT NULL,
    "seller_id" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "price_poisha" BIGINT NOT NULL,
    "product_point" INTEGER NOT NULL DEFAULT 0,
    "version" INTEGER NOT NULL DEFAULT 1,
    "deleted_at" TIMESTAMP(3),
    "deleted_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cart_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable: orders
CREATE TABLE "orders" (
    "id" TEXT NOT NULL,
    "order_number" TEXT NOT NULL,
    "customer_id" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING_PAYMENT',
    "payment_status" TEXT NOT NULL DEFAULT 'UNPAID',
    "fulfillment_status" TEXT NOT NULL DEFAULT 'UNFULFILLED',
    "currency" TEXT NOT NULL DEFAULT 'BDT',
    "subtotal_poisha" BIGINT NOT NULL,
    "discount_poisha" BIGINT NOT NULL DEFAULT 0,
    "shipping_fee_poisha" BIGINT NOT NULL DEFAULT 0,
    "tax_poisha" BIGINT NOT NULL DEFAULT 0,
    "total_poisha" BIGINT NOT NULL,
    "total_product_points" INTEGER NOT NULL DEFAULT 0,
    "points_released" BOOLEAN NOT NULL DEFAULT false,
    "points_released_at" TIMESTAMP(3),
    "shipping_name" TEXT NOT NULL,
    "shipping_phone" TEXT NOT NULL,
    "shipping_division" TEXT NOT NULL,
    "shipping_district" TEXT NOT NULL,
    "shipping_upazila" TEXT,
    "shipping_address" TEXT NOT NULL,
    "shipping_postal_code" TEXT,
    "billing_address" TEXT,
    "rule_version" TEXT NOT NULL DEFAULT 'v1.0.0',
    "customer_notes" TEXT,
    "admin_notes" TEXT,
    "cancel_reason" TEXT,
    "cancelled_at" TIMESTAMP(3),
    "confirmed_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "version" INTEGER NOT NULL DEFAULT 1,
    "deleted_at" TIMESTAMP(3),
    "deleted_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable: seller_fulfillment_groups
CREATE TABLE "seller_fulfillment_groups" (
    "id" TEXT NOT NULL,
    "order_id" TEXT NOT NULL,
    "seller_id" TEXT NOT NULL,
    "warehouse_id" TEXT,
    "group_number" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "subtotal_poisha" BIGINT NOT NULL,
    "shipping_fee_poisha" BIGINT NOT NULL DEFAULT 0,
    "tax_poisha" BIGINT NOT NULL DEFAULT 0,
    "total_poisha" BIGINT NOT NULL,
    "seller_commission_poisha" BIGINT NOT NULL DEFAULT 0,
    "seller_payout_poisha" BIGINT NOT NULL DEFAULT 0,
    "total_product_points" INTEGER NOT NULL DEFAULT 0,
    "courier_provider" TEXT,
    "tracking_number" TEXT,
    "consignment_id" TEXT,
    "pickup_date" TIMESTAMP(3),
    "estimated_delivery" TIMESTAMP(3),
    "delivered_at" TIMESTAMP(3),
    "version" INTEGER NOT NULL DEFAULT 1,
    "deleted_at" TIMESTAMP(3),
    "deleted_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "seller_fulfillment_groups_pkey" PRIMARY KEY ("id")
);

-- CreateTable: order_items
CREATE TABLE "order_items" (
    "id" TEXT NOT NULL,
    "order_id" TEXT NOT NULL,
    "fulfillment_group_id" TEXT NOT NULL,
    "seller_id" TEXT NOT NULL,
    "variant_id" TEXT NOT NULL,
    "product_title" TEXT NOT NULL,
    "variant_title" TEXT NOT NULL,
    "sku" TEXT NOT NULL,
    "unit_price_poisha" BIGINT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "total_poisha" BIGINT NOT NULL,
    "tax_rate_percent" DECIMAL(5,2),
    "tax_poisha" BIGINT NOT NULL DEFAULT 0,
    "product_point_snapshot" INTEGER NOT NULL DEFAULT 0,
    "total_product_points" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "version" INTEGER NOT NULL DEFAULT 1,
    "deleted_at" TIMESTAMP(3),
    "deleted_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "order_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable: order_status_history
CREATE TABLE "order_status_history" (
    "id" TEXT NOT NULL,
    "order_id" TEXT NOT NULL,
    "from_status" TEXT,
    "to_status" TEXT NOT NULL,
    "actor_id" TEXT,
    "actor_role" TEXT,
    "reason" TEXT,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "order_status_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable: shipments
CREATE TABLE "shipments" (
    "id" TEXT NOT NULL,
    "fulfillment_group_id" TEXT NOT NULL,
    "seller_id" TEXT NOT NULL,
    "shipment_number" TEXT NOT NULL,
    "courier_provider" TEXT NOT NULL,
    "tracking_number" TEXT,
    "consignment_id" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "weight_grams" INTEGER,
    "package_count" INTEGER NOT NULL DEFAULT 1,
    "shipping_cost_poisha" BIGINT NOT NULL DEFAULT 0,
    "shipped_at" TIMESTAMP(3),
    "delivered_at" TIMESTAMP(3),
    "recipient_name" TEXT NOT NULL,
    "recipient_phone" TEXT NOT NULL,
    "delivery_address" TEXT NOT NULL,
    "division" TEXT NOT NULL,
    "district" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "deleted_at" TIMESTAMP(3),
    "deleted_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "shipments_pkey" PRIMARY KEY ("id")
);

-- CreateTable: shipment_events
CREATE TABLE "shipment_events" (
    "id" TEXT NOT NULL,
    "shipment_id" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "location" TEXT,
    "description" TEXT NOT NULL,
    "carrier_payload" JSONB,
    "occurred_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "shipment_events_pkey" PRIMARY KEY ("id")
);

-- Unique Constraints
CREATE UNIQUE INDEX "orders_order_number_key" ON "orders"("order_number");
CREATE UNIQUE INDEX "seller_fulfillment_groups_group_number_key" ON "seller_fulfillment_groups"("group_number");
CREATE UNIQUE INDEX "shipments_shipment_number_key" ON "shipments"("shipment_number");

-- Indexes for carts
CREATE INDEX "carts_user_id_status_idx" ON "carts"("user_id", "status");
CREATE INDEX "carts_status_created_at_idx" ON "carts"("status", "created_at");
CREATE INDEX "carts_deleted_at_idx" ON "carts"("deleted_at");

-- Indexes for cart_items
CREATE INDEX "cart_items_cart_id_idx" ON "cart_items"("cart_id");
CREATE INDEX "cart_items_variant_id_idx" ON "cart_items"("variant_id");
CREATE INDEX "cart_items_seller_id_idx" ON "cart_items"("seller_id");
CREATE INDEX "cart_items_deleted_at_idx" ON "cart_items"("deleted_at");

-- Indexes for orders
CREATE INDEX "orders_customer_id_status_idx" ON "orders"("customer_id", "status");
CREATE INDEX "orders_order_number_idx" ON "orders"("order_number");
CREATE INDEX "orders_status_created_at_idx" ON "orders"("status", "created_at");
CREATE INDEX "orders_payment_status_idx" ON "orders"("payment_status");
CREATE INDEX "orders_shipping_division_shipping_district_idx" ON "orders"("shipping_division", "shipping_district");
CREATE INDEX "orders_deleted_at_idx" ON "orders"("deleted_at");

-- Indexes for seller_fulfillment_groups
CREATE INDEX "seller_fulfillment_groups_seller_id_status_idx" ON "seller_fulfillment_groups"("seller_id", "status");
CREATE INDEX "seller_fulfillment_groups_order_id_idx" ON "seller_fulfillment_groups"("order_id");
CREATE INDEX "seller_fulfillment_groups_warehouse_id_idx" ON "seller_fulfillment_groups"("warehouse_id");
CREATE INDEX "seller_fulfillment_groups_status_created_at_idx" ON "seller_fulfillment_groups"("status", "created_at");
CREATE INDEX "seller_fulfillment_groups_deleted_at_idx" ON "seller_fulfillment_groups"("deleted_at");

-- Indexes for order_items
CREATE INDEX "order_items_order_id_idx" ON "order_items"("order_id");
CREATE INDEX "order_items_fulfillment_group_id_idx" ON "order_items"("fulfillment_group_id");
CREATE INDEX "order_items_seller_id_idx" ON "order_items"("seller_id");
CREATE INDEX "order_items_variant_id_idx" ON "order_items"("variant_id");
CREATE INDEX "order_items_deleted_at_idx" ON "order_items"("deleted_at");

-- Indexes for order_status_history
CREATE INDEX "order_status_history_order_id_created_at_idx" ON "order_status_history"("order_id", "created_at");

-- Indexes for shipments
CREATE INDEX "shipments_fulfillment_group_id_idx" ON "shipments"("fulfillment_group_id");
CREATE INDEX "shipments_seller_id_status_idx" ON "shipments"("seller_id", "status");
CREATE INDEX "shipments_tracking_number_idx" ON "shipments"("tracking_number");
CREATE INDEX "shipments_division_district_idx" ON "shipments"("division", "district");
CREATE INDEX "shipments_deleted_at_idx" ON "shipments"("deleted_at");

-- Indexes for shipment_events
CREATE INDEX "shipment_events_shipment_id_occurred_at_idx" ON "shipment_events"("shipment_id", "occurred_at");

-- Foreign Keys
ALTER TABLE "carts" ADD CONSTRAINT "carts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "cart_items" ADD CONSTRAINT "cart_items_cart_id_fkey" FOREIGN KEY ("cart_id") REFERENCES "carts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "cart_items" ADD CONSTRAINT "cart_items_variant_id_fkey" FOREIGN KEY ("variant_id") REFERENCES "product_variants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "cart_items" ADD CONSTRAINT "cart_items_seller_id_fkey" FOREIGN KEY ("seller_id") REFERENCES "sellers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "orders" ADD CONSTRAINT "orders_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "seller_fulfillment_groups" ADD CONSTRAINT "seller_fulfillment_groups_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "seller_fulfillment_groups" ADD CONSTRAINT "seller_fulfillment_groups_seller_id_fkey" FOREIGN KEY ("seller_id") REFERENCES "sellers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "seller_fulfillment_groups" ADD CONSTRAINT "seller_fulfillment_groups_warehouse_id_fkey" FOREIGN KEY ("warehouse_id") REFERENCES "warehouses"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "order_items" ADD CONSTRAINT "order_items_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_fulfillment_group_id_fkey" FOREIGN KEY ("fulfillment_group_id") REFERENCES "seller_fulfillment_groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_seller_id_fkey" FOREIGN KEY ("seller_id") REFERENCES "sellers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_variant_id_fkey" FOREIGN KEY ("variant_id") REFERENCES "product_variants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "order_status_history" ADD CONSTRAINT "order_status_history_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "shipments" ADD CONSTRAINT "shipments_fulfillment_group_id_fkey" FOREIGN KEY ("fulfillment_group_id") REFERENCES "seller_fulfillment_groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "shipment_events" ADD CONSTRAINT "shipment_events_shipment_id_fkey" FOREIGN KEY ("shipment_id") REFERENCES "shipments"("id") ON DELETE CASCADE ON UPDATE CASCADE;
