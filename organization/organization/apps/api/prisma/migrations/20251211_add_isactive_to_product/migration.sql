-- Add isActive field to Product model
-- Migration: 20251211_add_isactive_to_product

-- Add isActive column with default true
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "isActive" BOOLEAN NOT NULL DEFAULT true;

-- Create index for isActive field for efficient filtering
CREATE INDEX IF NOT EXISTS "products_isActive_idx" ON "products"("isActive");

-- Add comment to document the field
COMMENT ON COLUMN "products"."isActive" IS 'Indicates whether the product is active and visible to customers';
