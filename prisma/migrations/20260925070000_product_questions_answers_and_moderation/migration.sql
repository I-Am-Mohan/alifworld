-- CreateTable: product_questions
CREATE TABLE "product_questions" (
    "id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'APPROVED',
    "rejection_reason" TEXT,
    "is_answered" BOOLEAN NOT NULL DEFAULT false,
    "upvotes_count" INTEGER NOT NULL DEFAULT 0,
    "version" INTEGER NOT NULL DEFAULT 1,
    "deleted_at" TIMESTAMP(3),
    "deleted_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "product_questions_pkey" PRIMARY KEY ("id")
);

-- CreateTable: product_answers
CREATE TABLE "product_answers" (
    "id" TEXT NOT NULL,
    "question_id" TEXT NOT NULL,
    "seller_id" TEXT,
    "user_id" TEXT NOT NULL,
    "answer" TEXT NOT NULL,
    "is_official_seller" BOOLEAN NOT NULL DEFAULT true,
    "status" TEXT NOT NULL DEFAULT 'APPROVED',
    "rejection_reason" TEXT,
    "upvotes_count" INTEGER NOT NULL DEFAULT 0,
    "version" INTEGER NOT NULL DEFAULT 1,
    "deleted_at" TIMESTAMP(3),
    "deleted_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "product_answers_pkey" PRIMARY KEY ("id")
);

-- CreateTable: product_question_votes
CREATE TABLE "product_question_votes" (
    "id" TEXT NOT NULL,
    "question_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "product_question_votes_pkey" PRIMARY KEY ("id")
);

-- CreateTable: product_answer_votes
CREATE TABLE "product_answer_votes" (
    "id" TEXT NOT NULL,
    "answer_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "product_answer_votes_pkey" PRIMARY KEY ("id")
);

-- Unique Constraints
CREATE UNIQUE INDEX "product_question_votes_question_id_user_id_key" ON "product_question_votes"("question_id", "user_id");
CREATE UNIQUE INDEX "product_answer_votes_answer_id_user_id_key" ON "product_answer_votes"("answer_id", "user_id");

-- Indexes
CREATE INDEX "product_questions_product_id_status_is_answered_idx" ON "product_questions"("product_id", "status", "is_answered");
CREATE INDEX "product_questions_user_id_status_idx" ON "product_questions"("user_id", "status");
CREATE INDEX "product_questions_created_at_idx" ON "product_questions"("created_at");
CREATE INDEX "product_questions_deleted_at_idx" ON "product_questions"("deleted_at");

CREATE INDEX "product_answers_question_id_status_idx" ON "product_answers"("question_id", "status");
CREATE INDEX "product_answers_seller_id_idx" ON "product_answers"("seller_id");
CREATE INDEX "product_answers_user_id_idx" ON "product_answers"("user_id");
CREATE INDEX "product_answers_created_at_idx" ON "product_answers"("created_at");
CREATE INDEX "product_answers_deleted_at_idx" ON "product_answers"("deleted_at");

CREATE INDEX "product_question_votes_question_id_idx" ON "product_question_votes"("question_id");
CREATE INDEX "product_question_votes_user_id_idx" ON "product_question_votes"("user_id");

CREATE INDEX "product_answer_votes_answer_id_idx" ON "product_answer_votes"("answer_id");
CREATE INDEX "product_answer_votes_user_id_idx" ON "product_answer_votes"("user_id");

-- Foreign Keys
ALTER TABLE "product_questions" ADD CONSTRAINT "product_questions_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "product_questions" ADD CONSTRAINT "product_questions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "product_answers" ADD CONSTRAINT "product_answers_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "product_questions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "product_answers" ADD CONSTRAINT "product_answers_seller_id_fkey" FOREIGN KEY ("seller_id") REFERENCES "sellers"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "product_answers" ADD CONSTRAINT "product_answers_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "product_question_votes" ADD CONSTRAINT "product_question_votes_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "product_questions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "product_question_votes" ADD CONSTRAINT "product_question_votes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "product_answer_votes" ADD CONSTRAINT "product_answer_votes_answer_id_fkey" FOREIGN KEY ("answer_id") REFERENCES "product_answers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "product_answer_votes" ADD CONSTRAINT "product_answer_votes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
