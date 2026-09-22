-- ==============================================================================
-- AlifWorld PostgreSQL Migration: Lifecycle and Deletion Standards
-- Enhancements: version, updated_by, deleted_at, deleted_by, TTL & OCC indexes
-- Reference: docs/architecture/identifiers-lifecycle-and-deletion-policy.md
-- ==============================================================================

-- AlterTable
ALTER TABLE "system_configs" 
ADD COLUMN "version" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN "updated_by" TEXT,
ADD COLUMN "deleted_at" TIMESTAMP(3),
ADD COLUMN "deleted_by" TEXT;

-- AlterTable
ALTER TABLE "outbox_events" 
ADD COLUMN "version" INTEGER NOT NULL DEFAULT 1;

-- CreateIndex
CREATE INDEX "system_configs_deleted_at_idx" ON "system_configs"("deleted_at");

-- CreateIndex
CREATE INDEX "health_probes_created_at_idx" ON "health_probes"("created_at");

-- CreateIndex
CREATE INDEX "outbox_events_processed_at_idx" ON "outbox_events"("processed_at");
