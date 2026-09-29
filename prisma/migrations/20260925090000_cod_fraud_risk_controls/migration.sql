-- CreateTable: cod_fraud_blacklists
CREATE TABLE "cod_fraud_blacklists" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "identifier" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "severity" TEXT NOT NULL DEFAULT 'BLOCK',
    "added_by" TEXT,
    "expires_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cod_fraud_blacklists_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "cod_fraud_blacklists_type_identifier_key" ON "cod_fraud_blacklists"("type", "identifier");

-- CreateIndex
CREATE INDEX "cod_fraud_blacklists_type_identifier_idx" ON "cod_fraud_blacklists"("type", "identifier");
