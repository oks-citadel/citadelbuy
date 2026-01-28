-- Rollback migration: 20251202_add_owner_relation_and_role_permissions
-- This script reverses all changes made in migration.sql

-- Drop foreign keys
ALTER TABLE "role_permissions" DROP CONSTRAINT IF EXISTS "role_permissions_permissionId_fkey";
ALTER TABLE "role_permissions" DROP CONSTRAINT IF EXISTS "role_permissions_roleId_fkey";
ALTER TABLE "organizations" DROP CONSTRAINT IF EXISTS "organizations_ownerId_fkey";

-- Drop indexes
DROP INDEX IF EXISTS "role_permissions_roleId_permissionId_key";
DROP INDEX IF EXISTS "role_permissions_permissionId_idx";
DROP INDEX IF EXISTS "role_permissions_roleId_idx";

-- Drop tables
DROP TABLE IF EXISTS "role_permissions";
