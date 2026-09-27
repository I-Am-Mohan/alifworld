-- CreateTable: product_reviews
CREATE TABLE "product_reviews" (
    "id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "variant_id" TEXT,
    "user_id" TEXT NOT NULL,
    "order_id" TEXT,
    "order_item_id" TEXT,
    "rating" INTEGER NOT NULL,
    "title" TEXT,
    "comment" TEXT NOT NULL,
    "is_verified_purchase" BOOLEAN NOT NULL DEFAULT true,
    "status" TEXT NOT NULL DEFAULT 'APPROVED',
    "rejection_reason" TEXT,
    "helpful_votes_count" INTEGER NOT NULL DEFAULT 0,
    "unhelpful_votes_count" INTEGER NOT NULL DEFAULT 0,
    "seller_response" TEXT,
    "seller_responded_at" TIMESTAMP(3),
    "seller_responded_by" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "deleted_at" TIMESTAMP(3),
    "deleted_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "product_reviews_pkey" PRIMARY KEY ("id")
);

-- CreateTable: product_review_media
CREATE TABLE "product_review_media" (
    "id" TEXT NOT NULL,
    "review_id" TEXT NOT NULL,
    "media_type" TEXT NOT NULL DEFAULT 'IMAGE',
    "url" TEXT NOT NULL,
    "alt_text" TEXT,
    "display_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "product_review_media_pkey" PRIMARY KEY ("id")
);

-- CreateTable: product_review_votes
CREATE TABLE "product_review_votes" (
    "id" TEXT NOT NULL,
    "review_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "is_helpful" BOOLEAN NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "product_review_votes_pkey" PRIMARY KEY ("id")
);

-- Unique Constraints
CREATE UNIQUE INDEX "product_reviews_user_id_product_id_key" ON "product_reviews"("user_id", "product_id");
CREATE UNIQUE INDEX "product_review_votes_review_id_user_id_key" ON "product_review_votes"("review_id", "user_id");

-- Indexes
CREATE INDEX "product_reviews_product_id_status_idx" ON "product_reviews"("product_id", "status");
CREATE INDEX "product_reviews_user_id_status_idx" ON "product_reviews"("user_id", "status");
CREATE INDEX "product_reviews_rating_idx" ON "product_reviews"("rating");
CREATE INDEX "product_reviews_created_at_idx" ON "product_reviews"("created_at");
CREATE INDEX "product_reviews_deleted_at_idx" ON "product_reviews"("deleted_at");

CREATE INDEX "product_review_media_review_id_idx" ON "product_review_media"("review_id");

CREATE INDEX "product_review_votes_review_id_idx" ON "product_review_votes"("review_id");
CREATE INDEX "product_review_votes_user_id_idx" ON "product_review_votes"("user_id");

-- Foreign Keys
ALTER TABLE "product_reviews" ADD CONSTRAINT "product_reviews_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "product_reviews" ADD CONSTRAINT "product_reviews_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "product_reviews" ADD CONSTRAINT "product_reviews_variant_id_fkey" FOREIGN KEY ("variant_id") REFERENCES "product_variants"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "product_review_media" ADD CONSTRAINT "product_review_media_review_id_fkey" FOREIGN KEY ("review_id") REFERENCES "product_reviews"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "product_review_votes" ADD CONSTRAINT "product_review_votes_review_id_fkey" FOREIGN KEY ("review_id") REFERENCES "product_reviews"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "product_review_votes" ADD CONSTRAINT "product_review_votes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
