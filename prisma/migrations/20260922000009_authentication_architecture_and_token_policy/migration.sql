-- ==============================================================================
-- AlifWorld PostgreSQL Database Migration: Authentication Architecture & Token Policy
-- Migration: 20260922000009_authentication_architecture_and_token_policy
-- Milestone: 031 (Phase 04: Identity and Authentication)
-- Models: User (altered: password_hash, token_version), UserSession, OtpToken
-- ==============================================================================

-- 1. Alter Users Table (Expand Phase: Non-destructive Additions)
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "password_hash" TEXT;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "token_version" INTEGER NOT NULL DEFAULT 1;

-- 2. Create User Sessions Table (Active Authentication Sessions & Refresh Tokens)
CREATE TABLE IF NOT EXISTS "user_sessions" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "session_token" TEXT NOT NULL,
    "refresh_token_hash" TEXT,
    "device_info" TEXT,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "client_type" TEXT NOT NULL DEFAULT 'WEB',
    "expires_at" TIMESTAMP(3) NOT NULL,
    "last_active_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "is_revoked" BOOLEAN NOT NULL DEFAULT false,
    "revoked_at" TIMESTAMP(3),
    "revoked_reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_sessions_pkey" PRIMARY KEY ("id")
);

-- 3. Create Ephemeral OTP & Verification Tokens Table
CREATE TABLE IF NOT EXISTS "otp_tokens" (
    "id" TEXT NOT NULL,
    "user_id" TEXT,
    "identifier" TEXT NOT NULL,
    "purpose" TEXT NOT NULL,
    "token_hash" TEXT NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "max_attempts" INTEGER NOT NULL DEFAULT 3,
    "is_used" BOOLEAN NOT NULL DEFAULT false,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "otp_tokens_pkey" PRIMARY KEY ("id")
);

-- 4. Create Unique Constraints & Performance Indexes
CREATE UNIQUE INDEX IF NOT EXISTS "user_sessions_session_token_key" ON "user_sessions"("session_token");
CREATE INDEX IF NOT EXISTS "user_sessions_user_id_is_revoked_idx" ON "user_sessions"("user_id", "is_revoked");
CREATE INDEX IF NOT EXISTS "user_sessions_session_token_idx" ON "user_sessions"("session_token");
CREATE INDEX IF NOT EXISTS "user_sessions_expires_at_idx" ON "user_sessions"("expires_at");

CREATE INDEX IF NOT EXISTS "otp_tokens_identifier_purpose_is_used_idx" ON "otp_tokens"("identifier", "purpose", "is_used");
CREATE INDEX IF NOT EXISTS "otp_tokens_expires_at_idx" ON "otp_tokens"("expires_at");

-- 5. Foreign Key Constraints with Cascade Cleanup
ALTER TABLE "user_sessions" 
    ADD CONSTRAINT "user_sessions_user_id_fkey" 
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "otp_tokens" 
    ADD CONSTRAINT "otp_tokens_user_id_fkey" 
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
