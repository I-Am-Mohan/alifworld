CREATE TABLE "seller_payout_profiles" (
  "id" TEXT NOT NULL,
  "seller_id" TEXT NOT NULL,
  "method" TEXT NOT NULL DEFAULT 'BANK_ACCOUNT',
  "provider_name" TEXT NOT NULL,
  "encrypted_account_reference" TEXT NOT NULL,
  "encrypted_routing_reference" TEXT,
  "encrypted_account_title" TEXT,
  "account_fingerprint" TEXT NOT NULL,
  "account_last4" TEXT NOT NULL,
  "routing_last4" TEXT,
  "status" TEXT NOT NULL DEFAULT 'PENDING_VERIFICATION',
  "is_primary" BOOLEAN NOT NULL DEFAULT true,
  "version" INTEGER NOT NULL DEFAULT 1,
  "created_by" TEXT NOT NULL,
  "updated_by" TEXT NOT NULL,
  "verified_at" TIMESTAMP(3),
  "verified_by" TEXT,
  "deleted_at" TIMESTAMP(3),
  "deleted_by" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "seller_payout_profiles_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "seller_payout_profiles_seller_id_status_idx" ON "seller_payout_profiles"("seller_id", "status");
CREATE INDEX "seller_payout_profiles_account_fingerprint_idx" ON "seller_payout_profiles"("account_fingerprint");
CREATE INDEX "seller_payout_profiles_deleted_at_idx" ON "seller_payout_profiles"("deleted_at");
CREATE UNIQUE INDEX "seller_payout_profiles_primary_seller_key" ON "seller_payout_profiles"("seller_id") WHERE "is_primary" = true AND "deleted_at" IS NULL;
ALTER TABLE "seller_payout_profiles" ADD CONSTRAINT "seller_payout_profiles_seller_id_fkey" FOREIGN KEY ("seller_id") REFERENCES "sellers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
