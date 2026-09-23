-- Milestone 056: Bangladesh geography hierarchy and normalized customer addresses
CREATE TABLE "geo_divisions" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name_en" TEXT NOT NULL,
    "name_bn" TEXT NOT NULL,
    "headquarters" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "version" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "geo_divisions_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "geo_divisions_code_key" ON "geo_divisions"("code");
CREATE INDEX "geo_divisions_is_active_idx" ON "geo_divisions"("is_active");

CREATE TABLE "geo_districts" (
    "id" TEXT NOT NULL,
    "division_code" TEXT NOT NULL,
    "name_en" TEXT NOT NULL,
    "name_bn" TEXT NOT NULL,
    "postal_code_prefix" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "version" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "geo_districts_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "geo_districts_division_code_idx" ON "geo_districts"("division_code");
CREATE INDEX "geo_districts_is_active_idx" ON "geo_districts"("is_active");
ALTER TABLE "geo_districts" ADD CONSTRAINT "geo_districts_division_code_fkey" FOREIGN KEY ("division_code") REFERENCES "geo_divisions"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "geo_upazilas" (
    "id" TEXT NOT NULL,
    "district_id" TEXT NOT NULL,
    "name_en" TEXT NOT NULL,
    "name_bn" TEXT NOT NULL,
    "postal_code" TEXT,
    "level" TEXT NOT NULL DEFAULT 'UPAZILA',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "version" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "geo_upazilas_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "geo_upazilas_district_id_idx" ON "geo_upazilas"("district_id");
CREATE INDEX "geo_upazilas_is_active_idx" ON "geo_upazilas"("is_active");
ALTER TABLE "geo_upazilas" ADD CONSTRAINT "geo_upazilas_district_id_fkey" FOREIGN KEY ("district_id") REFERENCES "geo_districts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "user_addresses" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "recipient_name" TEXT NOT NULL,
    "recipient_phone" TEXT NOT NULL,
    "division_code" TEXT NOT NULL,
    "district_id" TEXT NOT NULL,
    "upazila_id" TEXT,
    "address_line" TEXT NOT NULL,
    "postal_code" TEXT,
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "version" INTEGER NOT NULL DEFAULT 1,
    "deleted_at" TIMESTAMP(3),
    "deleted_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "user_addresses_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "user_addresses_user_id_deleted_at_idx" ON "user_addresses"("user_id", "deleted_at");
CREATE INDEX "user_addresses_division_code_district_id_idx" ON "user_addresses"("division_code", "district_id");
ALTER TABLE "user_addresses" ADD CONSTRAINT "user_addresses_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "user_addresses" ADD CONSTRAINT "user_addresses_division_code_fkey" FOREIGN KEY ("division_code") REFERENCES "geo_divisions"("code") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "user_addresses" ADD CONSTRAINT "user_addresses_district_id_fkey" FOREIGN KEY ("district_id") REFERENCES "geo_districts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "user_addresses" ADD CONSTRAINT "user_addresses_upazila_id_fkey" FOREIGN KEY ("upazila_id") REFERENCES "geo_upazilas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
