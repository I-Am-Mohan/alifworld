-- Add integrity metadata for private KYC objects.
ALTER TABLE "seller_kyc_documents"
  ADD COLUMN "content_sha256" TEXT,
  ADD COLUMN "uploaded_by" TEXT;

CREATE INDEX "seller_kyc_documents_content_sha256_idx"
  ON "seller_kyc_documents"("content_sha256");
