-- Milestone 058: localized errors, notification preferences, and delivery deduplication
ALTER TABLE "users" ADD COLUMN "locale" TEXT NOT NULL DEFAULT 'bn-BD';

CREATE TABLE "user_notification_preferences" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "channel" TEXT NOT NULL,
    "event_type" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "version" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "user_notification_preferences_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "user_notification_preferences_user_id_channel_event_type_key" ON "user_notification_preferences"("user_id", "channel", "event_type");
CREATE INDEX "user_notification_preferences_user_id_event_type_idx" ON "user_notification_preferences"("user_id", "event_type");
ALTER TABLE "user_notification_preferences" ADD CONSTRAINT "user_notification_preferences_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "user_notification_deliveries" (
    "idempotency_key" TEXT NOT NULL,
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "event_type" TEXT NOT NULL,
    "channel" TEXT NOT NULL,
    "locale" TEXT NOT NULL,
    "template_key" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'QUEUED',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "last_error" TEXT,
    "delivered_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "user_notification_deliveries_pkey" PRIMARY KEY ("idempotency_key")
);
CREATE UNIQUE INDEX "user_notification_deliveries_id_key" ON "user_notification_deliveries"("id");
CREATE INDEX "user_notification_deliveries_user_id_created_at_idx" ON "user_notification_deliveries"("user_id", "created_at");
CREATE INDEX "user_notification_deliveries_status_created_at_idx" ON "user_notification_deliveries"("status", "created_at");
ALTER TABLE "user_notification_deliveries" ADD CONSTRAINT "user_notification_deliveries_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
