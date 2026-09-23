-- CreateTable
CREATE TABLE "seller_applications" (
    "id" TEXT NOT NULL,
    "applicant_user_id" TEXT NOT NULL,
    "seller_id" TEXT,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "business_name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "trade_license_number" TEXT,
    "bin_number" TEXT,
    "tin_number" TEXT,
    "submitted_at" TIMESTAMP(3),
    "reviewed_at" TIMESTAMP(3),
    "reviewed_by" TEXT,
    "review_reason" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "deleted_at" TIMESTAMP(3),
    "deleted_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "seller_applications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "seller_application_reviews" (
    "id" TEXT NOT NULL,
    "application_id" TEXT NOT NULL,
    "reviewer_id" TEXT NOT NULL,
    "from_status" TEXT NOT NULL,
    "to_status" TEXT NOT NULL,
    "reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "seller_application_reviews_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "seller_applications_applicant_user_id_status_idx" ON "seller_applications"("applicant_user_id", "status");
CREATE INDEX "seller_applications_seller_id_status_idx" ON "seller_applications"("seller_id", "status");
CREATE INDEX "seller_applications_status_submitted_at_idx" ON "seller_applications"("status", "submitted_at");
CREATE INDEX "seller_applications_deleted_at_idx" ON "seller_applications"("deleted_at");
CREATE INDEX "seller_application_reviews_application_id_created_at_idx" ON "seller_application_reviews"("application_id", "created_at");
CREATE INDEX "seller_application_reviews_reviewer_id_created_at_idx" ON "seller_application_reviews"("reviewer_id", "created_at");

-- AddForeignKey
ALTER TABLE "seller_applications" ADD CONSTRAINT "seller_applications_applicant_user_id_fkey" FOREIGN KEY ("applicant_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "seller_applications" ADD CONSTRAINT "seller_applications_seller_id_fkey" FOREIGN KEY ("seller_id") REFERENCES "sellers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "seller_application_reviews" ADD CONSTRAINT "seller_application_reviews_application_id_fkey" FOREIGN KEY ("application_id") REFERENCES "seller_applications"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "seller_application_reviews" ADD CONSTRAINT "seller_application_reviews_reviewer_id_fkey" FOREIGN KEY ("reviewer_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
