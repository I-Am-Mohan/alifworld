ALTER TABLE "products" ADD COLUMN "length_mm" INTEGER;
ALTER TABLE "products" ADD COLUMN "width_mm" INTEGER;
ALTER TABLE "products" ADD COLUMN "height_mm" INTEGER;
ALTER TABLE "products" ADD COLUMN "shipping_class" TEXT;
ALTER TABLE "products" ADD COLUMN "requires_shipping" BOOLEAN NOT NULL DEFAULT true;
