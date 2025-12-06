-- Rollback migration: 20251201_organization_module
-- This script reverses all changes made in migration.sql

-- Drop foreign keys (in reverse order of creation)
ALTER TABLE "organization_invoices" DROP CONSTRAINT IF EXISTS "organization_invoices_billingId_fkey";
ALTER TABLE "organization_billing" DROP CONSTRAINT IF EXISTS "organization_billing_organizationId_fkey";
ALTER TABLE "organization_audit_logs" DROP CONSTRAINT IF EXISTS "organization_audit_logs_organizationId_fkey";
ALTER TABLE "organization_api_keys" DROP CONSTRAINT IF EXISTS "organization_api_keys_organizationId_fkey";
ALTER TABLE "organization_invitations" DROP CONSTRAINT IF EXISTS "organization_invitations_organizationId_fkey";
ALTER TABLE "kyc_applications" DROP CONSTRAINT IF EXISTS "kyc_applications_organizationId_fkey";
ALTER TABLE "organization_roles" DROP CONSTRAINT IF EXISTS "organization_roles_organizationId_fkey";
ALTER TABLE "teams" DROP CONSTRAINT IF EXISTS "teams_departmentId_fkey";
ALTER TABLE "teams" DROP CONSTRAINT IF EXISTS "teams_organizationId_fkey";
ALTER TABLE "departments" DROP CONSTRAINT IF EXISTS "departments_parentId_fkey";
ALTER TABLE "departments" DROP CONSTRAINT IF EXISTS "departments_organizationId_fkey";
ALTER TABLE "organization_members" DROP CONSTRAINT IF EXISTS "organization_members_teamId_fkey";
ALTER TABLE "organization_members" DROP CONSTRAINT IF EXISTS "organization_members_departmentId_fkey";
ALTER TABLE "organization_members" DROP CONSTRAINT IF EXISTS "organization_members_roleId_fkey";
ALTER TABLE "organization_members" DROP CONSTRAINT IF EXISTS "organization_members_organizationId_fkey";

-- Drop indexes (in reverse order)
DROP INDEX IF EXISTS "organization_invoices_status_idx";
DROP INDEX IF EXISTS "organization_invoices_billingId_idx";
DROP INDEX IF EXISTS "organization_invoices_number_key";
DROP INDEX IF EXISTS "organization_billing_organizationId_key";
DROP INDEX IF EXISTS "organization_audit_logs_createdAt_idx";
DROP INDEX IF EXISTS "organization_audit_logs_action_idx";
DROP INDEX IF EXISTS "organization_audit_logs_userId_idx";
DROP INDEX IF EXISTS "organization_audit_logs_organizationId_idx";
DROP INDEX IF EXISTS "organization_api_keys_keyPrefix_idx";
DROP INDEX IF EXISTS "organization_api_keys_organizationId_idx";
DROP INDEX IF EXISTS "organization_invitations_token_idx";
DROP INDEX IF EXISTS "organization_invitations_email_idx";
DROP INDEX IF EXISTS "organization_invitations_organizationId_idx";
DROP INDEX IF EXISTS "organization_invitations_token_key";
DROP INDEX IF EXISTS "kyc_applications_status_idx";
DROP INDEX IF EXISTS "kyc_applications_organizationId_idx";
DROP INDEX IF EXISTS "permissions_category_idx";
DROP INDEX IF EXISTS "permissions_code_key";
DROP INDEX IF EXISTS "organization_roles_isSystem_idx";
DROP INDEX IF EXISTS "organization_roles_organizationId_idx";
DROP INDEX IF EXISTS "organization_roles_organizationId_name_key";
DROP INDEX IF EXISTS "teams_departmentId_idx";
DROP INDEX IF EXISTS "teams_organizationId_idx";
DROP INDEX IF EXISTS "teams_organizationId_name_key";
DROP INDEX IF EXISTS "departments_parentId_idx";
DROP INDEX IF EXISTS "departments_organizationId_idx";
DROP INDEX IF EXISTS "departments_organizationId_name_key";
DROP INDEX IF EXISTS "organization_members_roleId_idx";
DROP INDEX IF EXISTS "organization_members_userId_idx";
DROP INDEX IF EXISTS "organization_members_organizationId_idx";
DROP INDEX IF EXISTS "organization_members_organizationId_userId_key";
DROP INDEX IF EXISTS "organizations_ownerId_idx";
DROP INDEX IF EXISTS "organizations_status_idx";
DROP INDEX IF EXISTS "organizations_slug_idx";
DROP INDEX IF EXISTS "organizations_slug_key";

-- Drop tables (in reverse order of creation)
DROP TABLE IF EXISTS "organization_invoices";
DROP TABLE IF EXISTS "organization_billing";
DROP TABLE IF EXISTS "organization_audit_logs";
DROP TABLE IF EXISTS "organization_api_keys";
DROP TABLE IF EXISTS "organization_invitations";
DROP TABLE IF EXISTS "kyc_applications";
DROP TABLE IF EXISTS "permissions";
DROP TABLE IF EXISTS "organization_roles";
DROP TABLE IF EXISTS "teams";
DROP TABLE IF EXISTS "departments";
DROP TABLE IF EXISTS "organization_members";
DROP TABLE IF EXISTS "organizations";

-- Drop enums (in reverse order)
DROP TYPE IF EXISTS "KycStatus";
DROP TYPE IF EXISTS "MemberStatus";
DROP TYPE IF EXISTS "OrganizationStatus";
DROP TYPE IF EXISTS "OrganizationType";
