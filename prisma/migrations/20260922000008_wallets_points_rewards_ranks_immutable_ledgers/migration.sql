-- ==============================================================================
-- AlifWorld PostgreSQL Database Migration: Wallets, Points, Rewards, Ranks, and Immutable Ledgers
-- Migration: 20260922000008_wallets_points_rewards_ranks_immutable_ledgers
-- Milestone: 029 (Phase 03: Data Architecture)
-- Models: Wallet, LedgerAccount, LedgerJournal, LedgerPosting, PointAccount, PointEvent, RewardRule, RewardAllocation, RankDefinition, UserRank, LeaderboardSnapshot
-- ==============================================================================

-- 1. Multi-Account User & Merchant Wallets
CREATE TABLE "wallets" (
    "id" TEXT NOT NULL,
    "user_id" TEXT,
    "seller_id" TEXT,
    "type" TEXT NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'BDT',
    "available_poisha" BIGINT NOT NULL DEFAULT 0,
    "pending_poisha" BIGINT NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "version" INTEGER NOT NULL DEFAULT 1,
    "deleted_at" TIMESTAMP(3),
    "deleted_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "wallets_pkey" PRIMARY KEY ("id")
);

-- 2. Double-Entry Chart of Accounts
CREATE TABLE "ledger_accounts" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'BDT',
    "description" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "version" INTEGER NOT NULL DEFAULT 1,
    "deleted_at" TIMESTAMP(3),
    "deleted_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ledger_accounts_pkey" PRIMARY KEY ("id")
);

-- 3. Immutable Double-Entry Journal Transactions
CREATE TABLE "ledger_journals" (
    "id" TEXT NOT NULL,
    "journal_number" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "reference_type" TEXT NOT NULL,
    "reference_id" TEXT,
    "total_poisha" BIGINT NOT NULL,
    "idempotency_key" TEXT,
    "rule_version" TEXT,
    "reversal_of_id" TEXT,
    "posted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ledger_journals_pkey" PRIMARY KEY ("id")
);

-- 4. Immutable Double-Entry Ledger Postings
CREATE TABLE "ledger_postings" (
    "id" TEXT NOT NULL,
    "journal_id" TEXT NOT NULL,
    "account_id" TEXT NOT NULL,
    "wallet_id" TEXT,
    "direction" TEXT NOT NULL,
    "amount_poisha" BIGINT NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'BDT',
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ledger_postings_pkey" PRIMARY KEY ("id")
);

-- 5. Decoupled Customer Point Account
CREATE TABLE "point_accounts" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "available_points" INTEGER NOT NULL DEFAULT 0,
    "pending_points" INTEGER NOT NULL DEFAULT 0,
    "lifetime_points" INTEGER NOT NULL DEFAULT 0,
    "version" INTEGER NOT NULL DEFAULT 1,
    "deleted_at" TIMESTAMP(3),
    "deleted_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "point_accounts_pkey" PRIMARY KEY ("id")
);

-- 6. Immutable Point Event Stream
CREATE TABLE "point_events" (
    "id" TEXT NOT NULL,
    "point_account_id" TEXT NOT NULL,
    "event_type" TEXT NOT NULL,
    "points" INTEGER NOT NULL,
    "order_id" TEXT,
    "order_item_id" TEXT,
    "rule_version" TEXT NOT NULL DEFAULT 'v1.0.0',
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "point_events_pkey" PRIMARY KEY ("id")
);

-- 7. Versioned Reward & Commission Split Rules
CREATE TABLE "reward_rules" (
    "id" TEXT NOT NULL,
    "rule_code" TEXT NOT NULL,
    "version" TEXT NOT NULL DEFAULT 'v1.0.0',
    "name" TEXT NOT NULL,
    "description" TEXT,
    "splits" JSONB NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "effective_from" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "effective_to" TIMESTAMP(3),
    "deleted_at" TIMESTAMP(3),
    "deleted_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "reward_rules_pkey" PRIMARY KEY ("id")
);

-- 8. Immutable Reward Allocation Snapshot
CREATE TABLE "reward_allocations" (
    "id" TEXT NOT NULL,
    "rule_id" TEXT NOT NULL,
    "rule_version" TEXT NOT NULL,
    "source_type" TEXT NOT NULL,
    "source_id" TEXT NOT NULL,
    "beneficiary_type" TEXT NOT NULL,
    "beneficiary_id" TEXT NOT NULL,
    "basis_poisha" BIGINT NOT NULL,
    "allocated_poisha" BIGINT NOT NULL,
    "split_breakdown" JSONB NOT NULL,
    "journal_id" TEXT,
    "reversal_of_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reward_allocations_pkey" PRIMARY KEY ("id")
);

-- 9. Customer & Seller Rank Definitions
CREATE TABLE "rank_definitions" (
    "id" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "period" TEXT NOT NULL,
    "point_threshold" INTEGER,
    "star_position_min" INTEGER,
    "star_position_max" INTEGER,
    "pool_share_bps" INTEGER,
    "effective_from" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "effective_to" TIMESTAMP(3),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "deleted_at" TIMESTAMP(3),
    "deleted_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rank_definitions_pkey" PRIMARY KEY ("id")
);

-- 10. User & Seller Rank Achievements
CREATE TABLE "user_ranks" (
    "id" TEXT NOT NULL,
    "user_id" TEXT,
    "seller_id" TEXT,
    "rank_definition_id" TEXT NOT NULL,
    "period" TEXT NOT NULL,
    "period_date" TIMESTAMP(3) NOT NULL,
    "qualifying_points" INTEGER NOT NULL,
    "position" INTEGER,
    "reward_allocated_poisha" BIGINT NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "deleted_at" TIMESTAMP(3),
    "deleted_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_ranks_pkey" PRIMARY KEY ("id")
);

-- 11. Immutable Periodic Leaderboard Ranking Snapshots
CREATE TABLE "leaderboard_snapshots" (
    "id" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "period" TEXT NOT NULL,
    "period_start" TIMESTAMP(3) NOT NULL,
    "period_end" TIMESTAMP(3) NOT NULL,
    "actor_id" TEXT NOT NULL,
    "actor_name" TEXT NOT NULL,
    "rank_position" INTEGER NOT NULL,
    "accumulated_points" INTEGER NOT NULL,
    "star_band" TEXT,
    "pool_share_bps" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "leaderboard_snapshots_pkey" PRIMARY KEY ("id")
);

-- Indexes & Unique Constraints
CREATE UNIQUE INDEX "wallets_user_id_type_key" ON "wallets"("user_id", "type");
CREATE UNIQUE INDEX "wallets_seller_id_type_key" ON "wallets"("seller_id", "type");
CREATE INDEX "wallets_user_id_status_idx" ON "wallets"("user_id", "status");
CREATE INDEX "wallets_seller_id_status_idx" ON "wallets"("seller_id", "status");
CREATE INDEX "wallets_type_status_idx" ON "wallets"("type", "status");
CREATE INDEX "wallets_deleted_at_idx" ON "wallets"("deleted_at");

CREATE UNIQUE INDEX "ledger_accounts_code_key" ON "ledger_accounts"("code");
CREATE INDEX "ledger_accounts_type_is_active_idx" ON "ledger_accounts"("type", "is_active");
CREATE INDEX "ledger_accounts_deleted_at_idx" ON "ledger_accounts"("deleted_at");

CREATE UNIQUE INDEX "ledger_journals_journal_number_key" ON "ledger_journals"("journal_number");
CREATE UNIQUE INDEX "ledger_journals_idempotency_key_key" ON "ledger_journals"("idempotency_key");
CREATE UNIQUE INDEX "ledger_journals_reversal_of_id_key" ON "ledger_journals"("reversal_of_id");
CREATE INDEX "ledger_journals_reference_type_reference_id_idx" ON "ledger_journals"("reference_type", "reference_id");
CREATE INDEX "ledger_journals_posted_at_idx" ON "ledger_journals"("posted_at");

CREATE INDEX "ledger_postings_journal_id_idx" ON "ledger_postings"("journal_id");
CREATE INDEX "ledger_postings_account_id_idx" ON "ledger_postings"("account_id");
CREATE INDEX "ledger_postings_wallet_id_idx" ON "ledger_postings"("wallet_id");
CREATE INDEX "ledger_postings_direction_created_at_idx" ON "ledger_postings"("direction", "created_at");

CREATE UNIQUE INDEX "point_accounts_user_id_key" ON "point_accounts"("user_id");
CREATE INDEX "point_accounts_user_id_idx" ON "point_accounts"("user_id");
CREATE INDEX "point_accounts_deleted_at_idx" ON "point_accounts"("deleted_at");

CREATE INDEX "point_events_point_account_id_created_at_idx" ON "point_events"("point_account_id", "created_at");
CREATE INDEX "point_events_order_id_order_item_id_idx" ON "point_events"("order_id", "order_item_id");
CREATE INDEX "point_events_event_type_idx" ON "point_events"("event_type");

CREATE UNIQUE INDEX "reward_rules_rule_code_version_key" ON "reward_rules"("rule_code", "version");
CREATE INDEX "reward_rules_rule_code_is_active_idx" ON "reward_rules"("rule_code", "is_active");
CREATE INDEX "reward_rules_deleted_at_idx" ON "reward_rules"("deleted_at");

CREATE UNIQUE INDEX "reward_allocations_reversal_of_id_key" ON "reward_allocations"("reversal_of_id");
CREATE INDEX "reward_allocations_beneficiary_type_beneficiary_id_idx" ON "reward_allocations"("beneficiary_type", "beneficiary_id");
CREATE INDEX "reward_allocations_source_type_source_id_idx" ON "reward_allocations"("source_type", "source_id");
CREATE INDEX "reward_allocations_created_at_idx" ON "reward_allocations"("created_at");

CREATE UNIQUE INDEX "rank_definitions_category_code_period_key" ON "rank_definitions"("category", "code", "period");
CREATE INDEX "rank_definitions_category_is_active_idx" ON "rank_definitions"("category", "is_active");
CREATE INDEX "rank_definitions_deleted_at_idx" ON "rank_definitions"("deleted_at");

CREATE INDEX "user_ranks_user_id_rank_definition_id_idx" ON "user_ranks"("user_id", "rank_definition_id");
CREATE INDEX "user_ranks_seller_id_rank_definition_id_idx" ON "user_ranks"("seller_id", "rank_definition_id");
CREATE INDEX "user_ranks_period_period_date_idx" ON "user_ranks"("period", "period_date");
CREATE INDEX "user_ranks_deleted_at_idx" ON "user_ranks"("deleted_at");

CREATE UNIQUE INDEX "leaderboard_snapshots_category_period_period_start_rank_pos_key" ON "leaderboard_snapshots"("category", "period", "period_start", "rank_position");
CREATE INDEX "leaderboard_snapshots_actor_id_period_idx" ON "leaderboard_snapshots"("actor_id", "period");
CREATE INDEX "leaderboard_snapshots_category_period_period_start_idx" ON "leaderboard_snapshots"("category", "period", "period_start");

-- Foreign Key Constraints
ALTER TABLE "wallets" ADD CONSTRAINT "wallets_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "wallets" ADD CONSTRAINT "wallets_seller_id_fkey" FOREIGN KEY ("seller_id") REFERENCES "sellers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "ledger_journals" ADD CONSTRAINT "ledger_journals_reversal_of_id_fkey" FOREIGN KEY ("reversal_of_id") REFERENCES "ledger_journals"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "ledger_postings" ADD CONSTRAINT "ledger_postings_journal_id_fkey" FOREIGN KEY ("journal_id") REFERENCES "ledger_journals"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ledger_postings" ADD CONSTRAINT "ledger_postings_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "ledger_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ledger_postings" ADD CONSTRAINT "ledger_postings_wallet_id_fkey" FOREIGN KEY ("wallet_id") REFERENCES "wallets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "point_accounts" ADD CONSTRAINT "point_accounts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "point_events" ADD CONSTRAINT "point_events_point_account_id_fkey" FOREIGN KEY ("point_account_id") REFERENCES "point_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "reward_allocations" ADD CONSTRAINT "reward_allocations_rule_id_fkey" FOREIGN KEY ("rule_id") REFERENCES "reward_rules"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "user_ranks" ADD CONSTRAINT "user_ranks_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "user_ranks" ADD CONSTRAINT "user_ranks_seller_id_fkey" FOREIGN KEY ("seller_id") REFERENCES "sellers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "user_ranks" ADD CONSTRAINT "user_ranks_rank_definition_id_fkey" FOREIGN KEY ("rank_definition_id") REFERENCES "rank_definitions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
