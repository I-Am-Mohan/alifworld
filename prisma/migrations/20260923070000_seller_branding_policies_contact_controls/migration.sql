ALTER TABLE "seller_store_settings"
  ADD COLUMN "logo_object_key" TEXT,
  ADD COLUMN "banner_object_key" TEXT,
  ADD COLUMN "store_description" TEXT,
  ADD COLUMN "shipping_policy" TEXT,
  ADD COLUMN "return_policy" TEXT,
  ADD COLUMN "cancellation_policy" TEXT,
  ADD COLUMN "public_email_enabled" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "public_phone_enabled" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "public_pickup_address_enabled" BOOLEAN NOT NULL DEFAULT false;
