-- AlterTable: promotions
ALTER TABLE "promotions" ADD COLUMN "priority" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "is_stackable" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "exclusion_scope" TEXT NOT NULL DEFAULT 'STACKABLE';

-- AlterTable: discount_rules
ALTER TABLE "discount_rules" ADD COLUMN "is_stackable" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "exclusion_scope" TEXT NOT NULL DEFAULT 'STACKABLE';
