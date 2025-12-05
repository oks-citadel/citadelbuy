# Organization Module Quick Start

## Schema Integration Complete ✅

The Organization module schema has been successfully merged into the main Prisma schema.

## Quick Commands

### Generate Prisma Client
```bash
cd organization/apps/api
npx prisma generate
```

### Create Database Migration
```bash
cd organization/apps/api
npx prisma migrate dev --name add_organization_module
```

### Run Seed Data (Optional)
```bash
cd organization/apps/api
npx prisma db seed
```

## New Models Available

### Core Organization
- `Organization` - Main organization entity
- `OrganizationMember` - User memberships
- `Department` - Hierarchical departments
- `Team` - Teams within organizations

### Access Control
- `OrganizationRole` - Custom roles
- `Permission` - Permission registry

### Compliance & Billing
- `KycApplication` - KYC verification
- `OrganizationBilling` - Billing management
- `OrganizationInvoice` - Invoice tracking

### Management
- `OrganizationInvitation` - Member invitations
- `OrganizationApiKey` - API key management
- `OrganizationAuditLog` - Audit trails

## Example: Create an Organization

```typescript
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Create organization
const org = await prisma.organization.create({
  data: {
    name: 'My Company',
    slug: 'my-company',
    type: 'SMALL_BUSINESS',
    primaryEmail: 'admin@mycompany.com',
    ownerId: userId, // User who owns the organization
    members: {
      create: {
        userId: userId,
        status: 'ACTIVE',
      },
    },
  },
  include: {
    owner: true,
    members: true,
  },
});
```

## Example: Add Organization Member

```typescript
const member = await prisma.organizationMember.create({
  data: {
    organizationId: org.id,
    userId: newUserId,
    status: 'ACTIVE',
    title: 'Developer',
  },
});
```

## Example: Query User's Organizations

```typescript
const user = await prisma.user.findUnique({
  where: { id: userId },
  include: {
    organizationsOwned: true,
    organizationMemberships: {
      include: {
        organization: true,
        role: true,
      },
    },
  },
});
```

## Available Services

The following services are ready to use:
- `OrganizationService` - Core organization management
- `OrganizationRoleService` - Role and permission management
- `OrganizationKycService` - KYC verification
- `OrganizationBillingService` - Billing and subscriptions
- `OrganizationAuditService` - Audit logging

## API Endpoints

Organization endpoints are available at:
- `POST /organizations` - Create organization
- `GET /organizations/:id` - Get organization
- `PATCH /organizations/:id` - Update organization
- `DELETE /organizations/:id` - Delete organization
- `POST /organizations/:id/members` - Add member
- `GET /organizations/:id/members` - List members
- `POST /organizations/:id/roles` - Create role
- `POST /organizations/:id/kyc` - Submit KYC

## Environment Variables

Add to your `.env` file:
```env
# Organization Module
ORG_DEFAULT_MAX_MEMBERS=5
ORG_DEFAULT_MAX_PRODUCTS=100
ORG_DEFAULT_MAX_API_CALLS=10000
ORG_KYC_ENABLED=true
```

## Migration Safety

Before running migrations:
1. ✅ Backup your database
2. ✅ Test in development first
3. ✅ Review generated SQL
4. ✅ Plan for downtime (if needed)

## Validation

The schema is validated and ready:
```bash
npx prisma validate
# Output: The schema at prisma\schema.prisma is valid 🚀
```

## Need Help?

- Schema documentation: `prisma/schema.prisma`
- Organization models start at line 5571
- Organization enums start at line 5538
- Full merge report: `SCHEMA_MERGE_COMPLETE.md`

## Status

- Schema Merge: ✅ Complete
- Validation: ✅ Passed
- Relations: ✅ Verified
- Ready for Migration: ✅ Yes
