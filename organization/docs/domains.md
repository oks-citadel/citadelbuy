# Tenant Domains - Architecture and Setup Guide

## Overview

The Broxiva platform supports multi-tenancy through custom domains, allowing vendors to operate their storefronts on their own domains or platform subdomains.

### Domain Types

1. **Subdomain** - Automatically provisioned under the platform domain
   - Example: `mystore.broxiva.com`
   - No DNS configuration required
   - Instantly active upon creation

2. **Custom Domain** - Vendor's own domain
   - Example: `shop.myvendor.com`
   - Requires DNS configuration and verification
   - Supports both subdomain and apex domain configurations

## Architecture

```
                    ┌─────────────────────────────────────────┐
                    │              Load Balancer              │
                    │         (Handles SSL/TLS, CDN)          │
                    └─────────────────┬───────────────────────┘
                                      │
                    ┌─────────────────▼───────────────────────┐
                    │        Tenant Context Middleware        │
                    │   (Resolves host → tenant mapping)      │
                    └─────────────────┬───────────────────────┘
                                      │
          ┌───────────────────────────┼───────────────────────────┐
          │                           │                           │
          ▼                           ▼                           ▼
┌─────────────────┐        ┌─────────────────┐         ┌─────────────────┐
│   Vendor A      │        │   Vendor B      │         │   Vendor C      │
│ shop.a.com     │        │ store.broxiva   │         │ b2b.vendor.io   │
│ (Custom)        │        │ (Subdomain)     │         │ (Custom)        │
└─────────────────┘        └─────────────────┘         └─────────────────┘
```

## Database Schema

### TenantDomain Table

```prisma
model TenantDomain {
  id                String        @id @default(cuid())
  host              String        @unique    // e.g., "shop.vendor.com"
  tenantId          String                   // Organization ID
  domainType        DomainType              // SUBDOMAIN | CUSTOM
  status            DomainStatus            // PENDING_VERIFICATION | VERIFIED | ACTIVE | SUSPENDED
  verificationToken String?                 // TXT record token
  cnameTarget       String?                 // CNAME target for custom domains
  verifiedAt        DateTime?
  sslStatus         SslStatus?              // PENDING | PROVISIONING | ACTIVE | FAILED
  isPrimary         Boolean       @default(false)
  redirectToWww     Boolean       @default(false)
  createdAt         DateTime      @default(now())
  updatedAt         DateTime      @updatedAt
}
```

## Vendor Setup Guide

### Setting Up a Subdomain

1. Navigate to **Organization Settings** → **Domains**
2. Click **Add Subdomain**
3. Enter your desired subdomain (e.g., `mystore`)
4. The subdomain `mystore.broxiva.com` will be instantly active

### Setting Up a Custom Domain

#### Step 1: Add the Domain

1. Navigate to **Organization Settings** → **Domains**
2. Click **Add Custom Domain**
3. Enter your domain (e.g., `shop.mystore.com`)

#### Step 2: Configure DNS Records

Add the following DNS records at your domain registrar:

##### TXT Record (Domain Verification)
```
Name:  _broxiva-verification.shop.mystore.com
Type:  TXT
Value: bx-verify=<your-verification-token>
TTL:   300
```

##### CNAME Record (Traffic Routing)
```
Name:  shop.mystore.com
Type:  CNAME
Value: domains.broxiva.com
TTL:   300
```

#### For Apex Domains (e.g., mystore.com)

If you're using an apex domain (no subdomain), use A records instead of CNAME:

```
Name:  mystore.com
Type:  A
Value: <platform-ip-1>
       <platform-ip-2>
TTL:   300
```

Also add the verification TXT record:
```
Name:  _broxiva-verification.mystore.com
Type:  TXT
Value: bx-verify=<your-verification-token>
TTL:   300
```

#### Step 3: Verify the Domain

1. After adding DNS records, wait 5-10 minutes for propagation
2. Click **Verify Domain** in the dashboard
3. Once verified, your domain will be activated
4. SSL certificate will be automatically provisioned

## API Reference

### Base URL
```
https://api.broxiva.com/api/v1
```

### Endpoints

#### Create Domain
```http
POST /domains
Authorization: Bearer <token>
Content-Type: application/json

{
  "host": "shop.mystore.com",
  "tenantId": "org_123456",
  "domainType": "CUSTOM",
  "isPrimary": false
}
```

Response:
```json
{
  "success": true,
  "data": {
    "id": "dm_abc123",
    "host": "shop.mystore.com",
    "status": "PENDING_VERIFICATION",
    "verificationToken": "a1b2c3d4e5f6...",
    "cnameTarget": "domains.broxiva.com"
  },
  "dnsInstructions": {
    "txtRecord": {
      "name": "_broxiva-verification.shop.mystore.com",
      "type": "TXT",
      "value": "bx-verify=a1b2c3d4e5f6...",
      "ttl": 300
    },
    "cnameRecord": {
      "name": "shop.mystore.com",
      "type": "CNAME",
      "value": "domains.broxiva.com",
      "ttl": 300
    }
  }
}
```

#### Create Subdomain
```http
POST /domains/subdomain
Authorization: Bearer <token>
Content-Type: application/json

{
  "subdomain": "mystore",
  "tenantId": "org_123456",
  "isPrimary": true
}
```

#### List Domains
```http
GET /domains?tenantId=org_123456&status=ACTIVE
Authorization: Bearer <token>
```

#### Get Domain Details
```http
GET /domains/:id
Authorization: Bearer <token>
```

#### Verify Domain
```http
POST /domains/:id/verify
Authorization: Bearer <token>
Content-Type: application/json

{
  "force": false
}
```

Response:
```json
{
  "success": true,
  "data": {
    "status": "ACTIVE",
    "details": {
      "txtVerified": true,
      "cnameVerified": true,
      "sslStatus": "PROVISIONING"
    },
    "errors": []
  }
}
```

#### Delete Domain
```http
DELETE /domains/:id
Authorization: Bearer <token>
```

#### Resolve Tenant (Public)
```http
GET /tenant/resolve?host=shop.mystore.com
```

Response:
```json
{
  "success": true,
  "data": {
    "tenantId": "org_123456",
    "host": "shop.mystore.com",
    "domainType": "CUSTOM",
    "isPrimary": true,
    "tenant": {
      "id": "org_123456",
      "name": "My Store",
      "slug": "my-store",
      "status": "ACTIVE",
      "logoUrl": "https://...",
      "primaryColor": "#4F46E5"
    }
  }
}
```

## Tenant Context Middleware

The middleware automatically resolves tenant context from incoming requests.

### Request Flow

1. Extract host from headers (`X-Forwarded-Host` → `X-Original-Host` → `Host`)
2. Look up domain in database/cache
3. Verify domain is active and tenant is active
4. Attach tenant context to request
5. Set response headers (`X-BX-Tenant`, `X-BX-Tenant-Slug`)

### Accessing Tenant Context

In controllers:
```typescript
import { RequestWithTenant } from '@/common/middleware/tenant-context.middleware';

@Get()
async handler(@Req() req: RequestWithTenant) {
  const tenantId = req.tenantId;
  const tenant = req.tenantContext?.tenant;
}
```

Using async local storage:
```typescript
import { getCurrentTenantId } from '@/common/middleware/tenant-context.middleware';

async someFunction() {
  const tenantId = getCurrentTenantId();
}
```

## Security Considerations

### Domain Hijacking Prevention

- Domains require DNS verification before activation
- Verification token is unique per domain registration
- Cannot register a domain already active for another tenant

### Reserved Subdomains

The following subdomains are reserved and cannot be registered:
- www, api, admin, dashboard, app
- mail, smtp, pop, imap
- ftp, sftp, ssh, git
- cdn, static, assets, media, images
- docs, help, support, status, blog
- shop, store, pay, payments, checkout
- auth, login, signup, register, account
- billing, console, portal

## SSL Certificate Management

SSL certificates are automatically provisioned for verified domains using:
- Let's Encrypt for standard certificates
- Platform wildcard certificate for subdomains

Certificate status lifecycle:
1. `PENDING` - Domain not yet verified
2. `PROVISIONING` - Certificate being issued (typically 1-5 minutes)
3. `ACTIVE` - Certificate active and auto-renewing
4. `FAILED` - Issuance failed (check DNS configuration)

## Troubleshooting

### Domain Verification Fails

1. **Check DNS propagation**: Use `dig` or online DNS tools
   ```bash
   dig TXT _broxiva-verification.shop.mystore.com
   dig CNAME shop.mystore.com
   ```

2. **Verify record values**: Ensure exact match with provided values

3. **Wait for propagation**: DNS changes can take up to 48 hours

### SSL Certificate Not Provisioning

1. Ensure CNAME/A record points to platform
2. Check for CAA records blocking Let's Encrypt
3. Verify domain is not on any blocklists

### Tenant Not Resolving

1. Verify domain status is `ACTIVE`
2. Check organization status is `ACTIVE`
3. Clear any CDN/proxy caches
4. Check for typos in hostname

## Environment Variables

```env
# Platform domain for subdomains
PLATFORM_DOMAIN=broxiva.com

# CNAME target for custom domains
DOMAIN_CNAME_TARGET=domains.broxiva.com

# Platform IP addresses for A records (comma-separated)
PLATFORM_IPS=10.0.0.1,10.0.0.2
```
