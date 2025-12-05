-- Rollback migration: 20251117022438_add_password_reset_table
-- This script reverses all changes made in migration.sql

-- Drop foreign keys
ALTER TABLE "reviews" DROP CONSTRAINT IF EXISTS "reviews_productId_fkey";
ALTER TABLE "reviews" DROP CONSTRAINT IF EXISTS "reviews_userId_fkey";
ALTER TABLE "order_items" DROP CONSTRAINT IF EXISTS "order_items_productId_fkey";
ALTER TABLE "order_items" DROP CONSTRAINT IF EXISTS "order_items_orderId_fkey";
ALTER TABLE "orders" DROP CONSTRAINT IF EXISTS "orders_userId_fkey";
ALTER TABLE "products" DROP CONSTRAINT IF EXISTS "products_categoryId_fkey";
ALTER TABLE "products" DROP CONSTRAINT IF EXISTS "products_vendorId_fkey";

-- Drop indexes
DROP INDEX IF EXISTS "password_resets_token_idx";
DROP INDEX IF EXISTS "password_resets_email_idx";
DROP INDEX IF EXISTS "password_resets_token_key";
DROP INDEX IF EXISTS "reviews_userId_productId_key";
DROP INDEX IF EXISTS "reviews_productId_idx";
DROP INDEX IF EXISTS "order_items_productId_idx";
DROP INDEX IF EXISTS "order_items_orderId_idx";
DROP INDEX IF EXISTS "orders_status_idx";
DROP INDEX IF EXISTS "orders_userId_idx";
DROP INDEX IF EXISTS "products_slug_idx";
DROP INDEX IF EXISTS "products_categoryId_idx";
DROP INDEX IF EXISTS "products_vendorId_idx";
DROP INDEX IF EXISTS "products_slug_key";
DROP INDEX IF EXISTS "categories_slug_key";
DROP INDEX IF EXISTS "categories_name_key";
DROP INDEX IF EXISTS "users_email_key";

-- Drop tables
DROP TABLE IF EXISTS "password_resets";
DROP TABLE IF EXISTS "reviews";
DROP TABLE IF EXISTS "order_items";
DROP TABLE IF EXISTS "orders";
DROP TABLE IF EXISTS "products";
DROP TABLE IF EXISTS "categories";
DROP TABLE IF EXISTS "users";

-- Drop enums
DROP TYPE IF EXISTS "OrderStatus";
DROP TYPE IF EXISTS "UserRole";
