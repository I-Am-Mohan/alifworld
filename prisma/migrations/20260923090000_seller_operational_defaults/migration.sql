CREATE TABLE "seller_operational_defaults" (
  "id" TEXT NOT NULL,
  "seller_id" TEXT NOT NULL,
  "tax_jurisdiction" TEXT NOT NULL DEFAULT 'BD',
  "tax_rule_version" TEXT,
  "tax_effective_from" TIMESTAMP(3),
  "shipping_mode" TEXT NOT NULL DEFAULT 'PLATFORM',
  "default_handling_days" INTEGER NOT NULL DEFAULT 2,
  "order_cutoff_time" TEXT,
  "auto_accept_orders" BOOLEAN NOT NULL DEFAULT false,
  "default_order_status" TEXT NOT NULL DEFAULT 'PENDING',
  "version" INTEGER NOT NULL DEFAULT 1,
  "created_by" TEXT NOT NULL,
  "updated_by" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "seller_operational_defaults_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "seller_operational_defaults_seller_id_key" ON "seller_operational_defaults"("seller_id");
CREATE INDEX "seller_operational_defaults_tax_jurisdiction_tax_effective_from_idx" ON "seller_operational_defaults"("tax_jurisdiction", "tax_effective_from");
ALTER TABLE "seller_operational_defaults" ADD CONSTRAINT "seller_operational_defaults_seller_id_fkey" FOREIGN KEY ("seller_id") REFERENCES "sellers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "seller_notification_defaults" (
  "id" TEXT NOT NULL,
  "seller_id" TEXT NOT NULL,
  "channel" TEXT NOT NULL,
  "event_type" TEXT NOT NULL,
  "enabled" BOOLEAN NOT NULL DEFAULT true,
  "version" INTEGER NOT NULL DEFAULT 1,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "seller_notification_defaults_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "seller_notification_defaults_seller_id_channel_event_type_key" ON "seller_notification_defaults"("seller_id", "channel", "event_type");
CREATE INDEX "seller_notification_defaults_seller_id_event_type_idx" ON "seller_notification_defaults"("seller_id", "event_type");
ALTER TABLE "seller_notification_defaults" ADD CONSTRAINT "seller_notification_defaults_seller_id_fkey" FOREIGN KEY ("seller_id") REFERENCES "sellers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
