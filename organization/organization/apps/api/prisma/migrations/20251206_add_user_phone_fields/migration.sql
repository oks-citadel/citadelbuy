-- Add phone number fields to User model
-- Migration: 20251206_add_user_phone_fields

-- Add phoneNumber column (nullable)
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "phoneNumber" TEXT;

-- Add phoneVerified column with default false
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "phoneVerified" BOOLEAN NOT NULL DEFAULT false;

-- Add phoneVerifiedAt column (nullable)
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "phoneVerifiedAt" TIMESTAMP(3);

-- Create index for phone number lookups (optional but recommended for performance)
CREATE INDEX IF NOT EXISTS "users_phoneNumber_idx" ON "users"("phoneNumber");

-- Add comment to document the migration
COMMENT ON COLUMN "users"."phoneNumber" IS 'User phone number in E.164 format or local format';
COMMENT ON COLUMN "users"."phoneVerified" IS 'Indicates whether the phone number has been verified';
COMMENT ON COLUMN "users"."phoneVerifiedAt" IS 'Timestamp when the phone number was verified';
