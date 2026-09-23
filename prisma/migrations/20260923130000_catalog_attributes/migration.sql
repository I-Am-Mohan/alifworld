CREATE TABLE "catalog_attributes" (
  "id" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "name_bn" TEXT,
  "input_type" TEXT NOT NULL,
  "is_filterable" BOOLEAN NOT NULL DEFAULT false,
  "is_comparable" BOOLEAN NOT NULL DEFAULT false,
  "is_variant_allowed" BOOLEAN NOT NULL DEFAULT true,
  "display_order" INTEGER NOT NULL DEFAULT 0,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "version" INTEGER NOT NULL DEFAULT 1,
  "deleted_at" TIMESTAMP(3),
  "deleted_by" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "catalog_attributes_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "catalog_attributes_code_key" ON "catalog_attributes"("code");
CREATE INDEX "catalog_attributes_is_active_display_order_idx" ON "catalog_attributes"("is_active", "display_order");
CREATE INDEX "catalog_attributes_deleted_at_idx" ON "catalog_attributes"("deleted_at");

CREATE TABLE "catalog_attribute_values" (
  "id" TEXT NOT NULL,
  "attribute_id" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "label" TEXT NOT NULL,
  "label_bn" TEXT,
  "swatch" TEXT,
  "display_order" INTEGER NOT NULL DEFAULT 0,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "version" INTEGER NOT NULL DEFAULT 1,
  "deleted_at" TIMESTAMP(3),
  "deleted_by" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "catalog_attribute_values_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "catalog_attribute_values_attribute_id_code_key" ON "catalog_attribute_values"("attribute_id", "code");
CREATE INDEX "catalog_attribute_values_attribute_id_is_active_display_order_idx" ON "catalog_attribute_values"("attribute_id", "is_active", "display_order");
ALTER TABLE "catalog_attribute_values" ADD CONSTRAINT "catalog_attribute_values_attribute_id_fkey" FOREIGN KEY ("attribute_id") REFERENCES "catalog_attributes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "category_attributes" (
  "id" TEXT NOT NULL,
  "category_id" TEXT NOT NULL,
  "attribute_id" TEXT NOT NULL,
  "is_required" BOOLEAN NOT NULL DEFAULT false,
  "is_variant_defining" BOOLEAN NOT NULL DEFAULT false,
  "filterable_override" BOOLEAN,
  "display_order" INTEGER NOT NULL DEFAULT 0,
  "version" INTEGER NOT NULL DEFAULT 1,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "category_attributes_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "category_attributes_category_id_attribute_id_key" ON "category_attributes"("category_id", "attribute_id");
CREATE INDEX "category_attributes_category_id_display_order_idx" ON "category_attributes"("category_id", "display_order");
ALTER TABLE "category_attributes" ADD CONSTRAINT "category_attributes_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "category_attributes" ADD CONSTRAINT "category_attributes_attribute_id_fkey" FOREIGN KEY ("attribute_id") REFERENCES "catalog_attributes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "product_attribute_values" (
  "id" TEXT NOT NULL,
  "product_id" TEXT NOT NULL,
  "attribute_id" TEXT NOT NULL,
  "value_id" TEXT,
  "text_value" TEXT,
  "number_value" DECIMAL(20,6),
  "boolean_value" BOOLEAN,
  "version" INTEGER NOT NULL DEFAULT 1,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "product_attribute_values_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "product_attribute_values_product_id_attribute_id_key" ON "product_attribute_values"("product_id", "attribute_id");
CREATE INDEX "product_attribute_values_attribute_id_value_id_idx" ON "product_attribute_values"("attribute_id", "value_id");
ALTER TABLE "product_attribute_values" ADD CONSTRAINT "product_attribute_values_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "product_attribute_values" ADD CONSTRAINT "product_attribute_values_attribute_id_fkey" FOREIGN KEY ("attribute_id") REFERENCES "catalog_attributes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "product_attribute_values" ADD CONSTRAINT "product_attribute_values_value_id_fkey" FOREIGN KEY ("value_id") REFERENCES "catalog_attribute_values"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "product_option_sets" (
  "id" TEXT NOT NULL,
  "product_id" TEXT NOT NULL,
  "attribute_id" TEXT NOT NULL,
  "is_required" BOOLEAN NOT NULL DEFAULT false,
  "is_variant_defining" BOOLEAN NOT NULL DEFAULT false,
  "display_order" INTEGER NOT NULL DEFAULT 0,
  "version" INTEGER NOT NULL DEFAULT 1,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "product_option_sets_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "product_option_sets_product_id_attribute_id_key" ON "product_option_sets"("product_id", "attribute_id");
CREATE INDEX "product_option_sets_product_id_display_order_idx" ON "product_option_sets"("product_id", "display_order");
ALTER TABLE "product_option_sets" ADD CONSTRAINT "product_option_sets_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "product_option_sets" ADD CONSTRAINT "product_option_sets_attribute_id_fkey" FOREIGN KEY ("attribute_id") REFERENCES "catalog_attributes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "product_option_set_values" (
  "id" TEXT NOT NULL,
  "option_set_id" TEXT NOT NULL,
  "value_id" TEXT NOT NULL,
  "display_order" INTEGER NOT NULL DEFAULT 0,
  CONSTRAINT "product_option_set_values_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "product_option_set_values_option_set_id_value_id_key" ON "product_option_set_values"("option_set_id", "value_id");
ALTER TABLE "product_option_set_values" ADD CONSTRAINT "product_option_set_values_option_set_id_fkey" FOREIGN KEY ("option_set_id") REFERENCES "product_option_sets"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "product_option_set_values" ADD CONSTRAINT "product_option_set_values_value_id_fkey" FOREIGN KEY ("value_id") REFERENCES "catalog_attribute_values"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "product_variant_options" (
  "id" TEXT NOT NULL,
  "variant_id" TEXT NOT NULL,
  "attribute_id" TEXT NOT NULL,
  "value_id" TEXT,
  "text_value" TEXT,
  "display_order" INTEGER NOT NULL DEFAULT 0,
  CONSTRAINT "product_variant_options_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "product_variant_options_variant_id_attribute_id_key" ON "product_variant_options"("variant_id", "attribute_id");
CREATE INDEX "product_variant_options_attribute_id_value_id_idx" ON "product_variant_options"("attribute_id", "value_id");
ALTER TABLE "product_variant_options" ADD CONSTRAINT "product_variant_options_variant_id_fkey" FOREIGN KEY ("variant_id") REFERENCES "product_variants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "product_variant_options" ADD CONSTRAINT "product_variant_options_attribute_id_fkey" FOREIGN KEY ("attribute_id") REFERENCES "catalog_attributes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "product_variant_options" ADD CONSTRAINT "product_variant_options_value_id_fkey" FOREIGN KEY ("value_id") REFERENCES "catalog_attribute_values"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
