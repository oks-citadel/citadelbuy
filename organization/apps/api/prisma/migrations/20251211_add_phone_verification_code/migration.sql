-- Add PhoneVerificationCode table for phone verification system
-- Migration: 20251211_add_phone_verification_code

-- Create phone_verification_codes table
CREATE TABLE IF NOT EXISTS "phone_verification_codes" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "phoneNumber" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "maxAttempts" INTEGER NOT NULL DEFAULT 3,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "phone_verification_codes_pkey" PRIMARY KEY ("id")
);

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS "phone_verification_codes_userId_idx" ON "phone_verification_codes"("userId");
CREATE INDEX IF NOT EXISTS "phone_verification_codes_phoneNumber_idx" ON "phone_verification_codes"("phoneNumber");
CREATE INDEX IF NOT EXISTS "phone_verification_codes_code_idx" ON "phone_verification_codes"("code");
CREATE INDEX IF NOT EXISTS "phone_verification_codes_expiresAt_idx" ON "phone_verification_codes"("expiresAt");

-- Add foreign key constraint
ALTER TABLE "phone_verification_codes" ADD CONSTRAINT "phone_verification_codes_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Add comment to document the table
COMMENT ON TABLE "phone_verification_codes" IS 'Stores phone verification codes for user phone number verification';
COMMENT ON COLUMN "phone_verification_codes"."code" IS '6-digit verification code sent to user phone';
COMMENT ON COLUMN "phone_verification_codes"."attempts" IS 'Number of verification attempts made';
COMMENT ON COLUMN "phone_verification_codes"."maxAttempts" IS 'Maximum allowed verification attempts before code expires';
