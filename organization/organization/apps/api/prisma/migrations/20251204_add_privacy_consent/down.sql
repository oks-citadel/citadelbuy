-- Rollback migration: 20251204_add_privacy_consent
-- This script reverses all changes made in migration.sql

-- Drop foreign key constraints
ALTER TABLE "AgreedTerms" DROP CONSTRAINT IF EXISTS "AgreedTerms_userId_fkey";
ALTER TABLE "DataExportRequest" DROP CONSTRAINT IF EXISTS "DataExportRequest_userId_fkey";
ALTER TABLE "DataDeletionRequest" DROP CONSTRAINT IF EXISTS "DataDeletionRequest_userId_fkey";
ALTER TABLE "ConsentLog" DROP CONSTRAINT IF EXISTS "ConsentLog_userId_fkey";

-- Drop indexes
DROP INDEX IF EXISTS "AgreedTerms_userId_idx";
DROP INDEX IF EXISTS "DataExportRequest_status_idx";
DROP INDEX IF EXISTS "DataExportRequest_userId_idx";
DROP INDEX IF EXISTS "DataDeletionRequest_status_idx";
DROP INDEX IF EXISTS "DataDeletionRequest_userId_idx";
DROP INDEX IF EXISTS "ConsentLog_createdAt_idx";
DROP INDEX IF EXISTS "ConsentLog_userId_idx";

-- Drop columns from User table
ALTER TABLE "User" DROP COLUMN IF EXISTS "processingRestricted";
ALTER TABLE "User" DROP COLUMN IF EXISTS "deletedAt";

-- Drop tables
DROP TABLE IF EXISTS "AgreedTerms";
DROP TABLE IF EXISTS "DataExportRequest";
DROP TABLE IF EXISTS "DataDeletionRequest";
DROP TABLE IF EXISTS "ConsentLog";
