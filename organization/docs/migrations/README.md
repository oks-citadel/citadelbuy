# Organization Module Database Migration

This migration adds the complete Organization module schema to the Broxiva platform.

## Overview

The Organization module enables multi-tenant functionality with hierarchical organization structures, role-based access control, KYC verification, billing, and comprehensive audit logging.

## Migration Details

**Migration Name:** `organization_module`
**Created:** 2024-12-01
**Schema Version:** organization-v1.0.0

## What's Included

### Enums (4)
- `OrganizationType` - Organization types (INDIVIDUAL, SMALL_BUSINESS, ENTERPRISE, MARKETPLACE)
- `OrganizationStatus` - Organization status (PENDING_VERIFICATION, ACTIVE, SUSPENDED, TERMINATED)
- `MemberStatus` - Member status (INVITED, ACTIVE, SUSPENDED, REMOVED)
- `KycStatus` - KYC verification status (NOT_STARTED, DOCUMENTS_SUBMITTED, UNDER_REVIEW, APPROVED, REJECTED, EXPIRED)

### Tables (12)

1. **organizations** - Core organization data
   - Business details, branding, settings
   - Subscription tier and limits
   - Indexes: slug, status, ownerId

2. **organization_members** - Organization membership
   - Links users to organizations
   - Role, department, and team assignments
   - Unique constraint: (organizationId, userId)

3. **departments** - Organizational departments
   - Hierarchical structure support
   - Self-referencing parent-child relationships
   - Unique constraint: (organizationId, name)

4. **teams** - Teams within departments
   - Optional department association
   - Team lead tracking
   - Unique constraint: (organizationId, name)

5. **organization_roles** - Role definitions
   - System and custom roles
   - Permission arrays
   - Supports organization-specific and global roles

6. **permissions** - Permission registry
   - Permission codes (e.g., "org:read", "products:write")
   - Categorized permissions
   - Unique constraint: code

7. **kyc_applications** - KYC verification
   - Document verification tracking
   - AI verification scores
   - Review workflow support

8. **organization_invitations** - Member invitations
   - Token-based invitation system
   - Expiration tracking
   - Indexes: organizationId, email, token

9. **organization_api_keys** - API key management
   - Hashed key storage
   - Scoped permissions
   - Rate limiting support

10. **organization_audit_logs** - Audit trail
    - Action tracking
    - Before/after values
    - IP and user agent logging

11. **organization_billing** - Billing information
    - Stripe integration
    - Subscription management
    - Payment method tracking

12. **organization_invoices** - Invoice records
    - Linked to billing
    - Invoice status tracking
    - Unique constraint: number

## Running the Migration

### Automatic Method (Recommended)

Use the migration utility script:

```bash
# From the organization/apps/api directory
npm run migrate:organization

# Or directly with ts-node
ts-node scripts/migrate-organization.ts
```

The script will:
1. Check if migration is already applied
2. Run the migration if needed
3. Seed default organization data
4. Verify successful completion

### Manual Method

If you prefer to run migrations manually:

```bash
# Generate Prisma client
npx prisma generate

# Run Prisma migrations
npx prisma migrate dev --name organization_module

# Seed the database
npx prisma db seed
```

### SQL-Only Method

To run just the SQL migration:

```bash
# Connect to your database
psql -U your_username -d your_database

# Run the migration SQL
\i apps/api/prisma/migrations/organization_module/migration.sql
```

## Verification

After migration, verify the tables exist:

```sql
-- Check tables
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name LIKE 'organization%';

-- Check enums
SELECT typname
FROM pg_type
WHERE typtype = 'e'
AND typname IN ('OrganizationType', 'OrganizationStatus', 'MemberStatus', 'KycStatus');

-- Count organizations (should be 3 after seeding)
SELECT COUNT(*) FROM organizations;
```

## Seeded Data

The migration includes seed data:

### System Roles (4)
- **Owner** - Full organization access
- **Admin** - Administrative access
- **Manager** - Team oversight
- **Member** - Basic access

### Permissions (25)
Categorized permissions for:
- Organization management
- Member management
- Product management
- Order management
- Billing
- Settings
- Analytics

### Organizations (3)
- **Broxiva Platform** (Marketplace) - Platform organization
- **TechStore** (Small Business) - Electronics vendor
- **Fashion Boutique** (Small Business) - Fashion vendor

### Additional Data
- 3 Departments (Engineering, Marketing, Support)
- 3 Teams (Backend, Frontend, Content)
- 3 Organization members
- 2 KYC applications (approved)
- 3 Billing records

## Schema Changes to Existing Models

### User Model
Added relation:
```prisma
organizationMemberships OrganizationMember[]
```

This allows users to be members of multiple organizations.

## Rollback

To rollback this migration:

```sql
-- Drop tables in reverse order (respecting foreign keys)
DROP TABLE IF EXISTS organization_invoices CASCADE;
DROP TABLE IF EXISTS organization_billing CASCADE;
DROP TABLE IF EXISTS organization_audit_logs CASCADE;
DROP TABLE IF EXISTS organization_api_keys CASCADE;
DROP TABLE IF EXISTS organization_invitations CASCADE;
DROP TABLE IF EXISTS kyc_applications CASCADE;
DROP TABLE IF EXISTS permissions CASCADE;
DROP TABLE IF EXISTS organization_roles CASCADE;
DROP TABLE IF EXISTS teams CASCADE;
DROP TABLE IF EXISTS departments CASCADE;
DROP TABLE IF EXISTS organization_members CASCADE;
DROP TABLE IF EXISTS organizations CASCADE;

-- Drop enums
DROP TYPE IF EXISTS KycStatus CASCADE;
DROP TYPE IF EXISTS MemberStatus CASCADE;
DROP TYPE IF EXISTS OrganizationStatus CASCADE;
DROP TYPE IF EXISTS OrganizationType CASCADE;
```

**Note:** This will delete all organization data. Make sure to backup before rollback.

## Post-Migration Steps

1. **Generate Prisma Client**
   ```bash
   npx prisma generate
   ```

2. **Restart API Server**
   ```bash
   npm run dev
   ```

3. **Test Organization Endpoints**
   - GET /api/organizations
   - POST /api/organizations
   - GET /api/organizations/:id/members

4. **Check API Documentation**
   Visit: http://localhost:4000/api/docs

## Troubleshooting

### Migration Already Applied
If you see "already exists" errors, the migration may already be applied. Run the check script:

```bash
ts-node scripts/migrate-organization.ts
```

### Prisma Client Out of Sync
If you get Prisma client errors:

```bash
npx prisma generate
```

### Seed Data Already Exists
The seed script checks for existing data and skips if found. To re-seed:

```sql
-- Delete existing organization data
DELETE FROM organization_invoices;
DELETE FROM organization_billing;
DELETE FROM organization_audit_logs;
DELETE FROM organization_api_keys;
DELETE FROM organization_invitations;
DELETE FROM kyc_applications;
DELETE FROM organization_members;
DELETE FROM teams;
DELETE FROM departments;
DELETE FROM organization_roles WHERE "isSystem" = true;
DELETE FROM permissions;
DELETE FROM organizations;
```

Then run: `npm run db:seed`

## Support

For issues or questions:
1. Check the main documentation at `/organization/docs/DROPSHIPPING_ENGINE_ROADMAP.md`
2. Review the schema at `/organization/apps/api/prisma/schema.prisma`
3. Contact the development team

## Related Files

- **Main Schema:** `apps/api/prisma/schema.prisma`
- **Organization Schema:** `apps/api/prisma/schema-organization.prisma`
- **Migration Script:** `apps/api/scripts/migrate-organization.ts`
- **Seed Function:** `apps/api/prisma/seeds/organization.seed.ts`
- **Main Seed:** `apps/api/prisma/seed.ts`
