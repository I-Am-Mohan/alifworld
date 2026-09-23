CREATE TABLE "catalog_import_jobs" (
  "id" TEXT NOT NULL,
  "seller_id" TEXT NOT NULL,
  "source_object_key" TEXT NOT NULL,
  "format" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'UPLOADED',
  "import_mode" TEXT NOT NULL DEFAULT 'DRY_RUN',
  "idempotency_key" TEXT,
  "total_rows" INTEGER NOT NULL DEFAULT 0,
  "valid_rows" INTEGER NOT NULL DEFAULT 0,
  "error_rows" INTEGER NOT NULL DEFAULT 0,
  "committed_rows" INTEGER NOT NULL DEFAULT 0,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "completed_at" TIMESTAMP(3),
  CONSTRAINT "catalog_import_jobs_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "catalog_import_jobs_idempotency_key_key" ON "catalog_import_jobs"("idempotency_key");
CREATE INDEX "catalog_import_jobs_seller_id_created_at_idx" ON "catalog_import_jobs"("seller_id", "created_at");
CREATE INDEX "catalog_import_jobs_status_created_at_idx" ON "catalog_import_jobs"("status", "created_at");
ALTER TABLE "catalog_import_jobs" ADD CONSTRAINT "catalog_import_jobs_seller_id_fkey" FOREIGN KEY ("seller_id") REFERENCES "sellers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "catalog_import_row_errors" (
  "id" TEXT NOT NULL,
  "job_id" TEXT NOT NULL,
  "row_number" INTEGER NOT NULL,
  "field" TEXT,
  "code" TEXT NOT NULL,
  "message" TEXT NOT NULL,
  "details" JSONB,
  CONSTRAINT "catalog_import_row_errors_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "catalog_import_row_errors_job_id_row_number_idx" ON "catalog_import_row_errors"("job_id", "row_number");
ALTER TABLE "catalog_import_row_errors" ADD CONSTRAINT "catalog_import_row_errors_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "catalog_import_jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "catalog_export_jobs" (
  "id" TEXT NOT NULL,
  "seller_id" TEXT NOT NULL,
  "format" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'REQUESTED',
  "filters" JSONB,
  "output_object_key" TEXT,
  "expires_at" TIMESTAMP(3),
  "row_count" INTEGER NOT NULL DEFAULT 0,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "completed_at" TIMESTAMP(3),
  CONSTRAINT "catalog_export_jobs_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "catalog_export_jobs_seller_id_created_at_idx" ON "catalog_export_jobs"("seller_id", "created_at");
CREATE INDEX "catalog_export_jobs_status_created_at_idx" ON "catalog_export_jobs"("status", "created_at");
ALTER TABLE "catalog_export_jobs" ADD CONSTRAINT "catalog_export_jobs_seller_id_fkey" FOREIGN KEY ("seller_id") REFERENCES "sellers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
