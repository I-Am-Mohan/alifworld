-- Add idempotency support to immutable seller application review decisions.
ALTER TABLE "seller_application_reviews"
  ADD COLUMN "idempotency_key" TEXT;

CREATE UNIQUE INDEX "seller_application_reviews_idempotency_key_key"
  ON "seller_application_reviews"("idempotency_key");
