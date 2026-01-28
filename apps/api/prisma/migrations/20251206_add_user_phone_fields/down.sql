-- Rollback migration: 20251206_add_user_phone_fields
-- This script removes the phone number fields from the User model

-- Drop the index first
DROP INDEX IF EXISTS "users_phoneNumber_idx";

-- Remove the columns
ALTER TABLE "users" DROP COLUMN IF EXISTS "phoneVerifiedAt";
ALTER TABLE "users" DROP COLUMN IF EXISTS "phoneVerified";
ALTER TABLE "users" DROP COLUMN IF EXISTS "phoneNumber";
