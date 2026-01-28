# Broxiva Global Marketplace - Architecture Overview

## System Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              CLIENTS                                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐    │
│  │   Web App    │  │  Mobile App  │  │  Vendor App  │  │  Admin Panel │    │
│  │  (Next.js)   │  │(React Native)│  │  (Next.js)   │  │  (Next.js)   │    │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘    │
└─────────┼──────────────────┼──────────────────┼──────────────────┼──────────┘
          │                  │                  │                  │
          ▼                  ▼                  ▼                  ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         VERCEL EDGE NETWORK                                  │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                      Edge Middleware                                 │   │
│  │  • Tenant Resolution (host → tenant_id)                             │   │
│  │  • Geo Detection (country, region)                                   │   │
│  │  • Language/Currency Inference                                       │   │
│  │  • Request Headers (x-bx-tenant, x-bx-country, x-bx-currency, etc.) │   │
│  │  • Locale Routing (/en-us, /fr-ca, /yo-ng)                          │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                    │                                        │
│  ┌─────────────────────────────────┴─────────────────────────────────┐     │
│  │                    Next.js App Router                              │     │
│  │  • Server Components (RSC)                                         │     │
│  │  • Localized Routes ([locale]/...)                                 │     │
│  │  • ISR/SSG for Product Pages                                       │     │
│  │  • API Routes (BFF pattern)                                        │     │
│  └─────────────────────────────────┬─────────────────────────────────┘     │
└─────────────────────────────────────┼───────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           RAILWAY BACKEND                                    │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                      NestJS API Server                               │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐                  │   │
│  │  │   Guards    │  │ Interceptors│  │   Pipes     │                  │   │
│  │  │ • JWT Auth  │  │ • Transform │  │ • Validate  │                  │   │
│  │  │ • Tenant    │  │ • Logging   │  │ • Sanitize  │                  │   │
│  │  │ • Roles     │  │ • Cache     │  │             │                  │   │
│  │  └─────────────┘  └─────────────┘  └─────────────┘                  │   │
│  │                                                                      │   │
│  │  ┌───────────────────────────────────────────────────────────────┐  │   │
│  │  │                    Feature Modules (60+)                       │  │   │
│  │  │  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ │  │   │
│  │  │  │  Auth   │ │Products │ │ Orders  │ │Payments │ │ Domains │ │  │   │
│  │  │  └─────────┘ └─────────┘ └─────────┘ └─────────┘ └─────────┘ │  │   │
│  │  │  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ │  │   │
│  │  │  │Currency │ │  i18n   │ │Connectors│ │   SEO   │ │Analytics│ │  │   │
│  │  │  └─────────┘ └─────────┘ └─────────┘ └─────────┘ └─────────┘ │  │   │
│  │  └───────────────────────────────────────────────────────────────┘  │   │
│  └─────────────────────────────────┬───────────────────────────────────┘   │
│                                    │                                        │
│  ┌─────────────────────────────────┴───────────────────────────────────┐   │
│  │                     Background Workers (BullMQ)                      │   │
│  │  ┌───────────┐ ┌───────────┐ ┌───────────┐ ┌───────────┐           │   │
│  │  │FX Refresh │ │Translation│ │Product Sync│ │  Sitemap  │           │   │
│  │  │  (15min)  │ │  (async)  │ │ (webhook)  │ │  (daily)  │           │   │
│  │  └───────────┘ └───────────┘ └───────────┘ └───────────┘           │   │
│  │  ┌───────────┐ ┌───────────┐                                        │   │
│  │  │  Domain   │ │  Email    │                                        │   │
│  │  │Verification│ │ Delivery │                                        │   │
│  │  └───────────┘ └───────────┘                                        │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                         Data Layer                                   │   │
│  │                                                                      │   │
│  │  ┌─────────────────────┐      ┌─────────────────────┐              │   │
│  │  │     PostgreSQL      │      │        Redis        │              │   │
│  │  │  (Primary Database) │      │   (Cache + Queues)  │              │   │
│  │  │                     │      │                     │              │   │
│  │  │  • Organizations    │      │  • Session Cache    │              │   │
│  │  │  • Tenant Domains   │      │  • FX Rate Cache    │              │   │
│  │  │  • Products         │      │  • Tenant Cache     │              │   │
│  │  │  • Translations     │      │  • Rate Limiting    │              │   │
│  │  │  • Orders           │      │  • Job Queues       │              │   │
│  │  │  • FX Snapshots     │      │  • Distributed Locks│              │   │
│  │  │  • User Preferences │      │  • Idempotency Keys │              │   │
│  │  └─────────────────────┘      └─────────────────────┘              │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│                        EXTERNAL INTEGRATIONS                                 │
│                                                                              │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐        │
│  │   Stripe    │  │   PayPal    │  │  Shopify    │  │ WooCommerce │        │
│  │  (Payments) │  │  (Payments) │  │ (Products)  │  │ (Products)  │        │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘        │
│                                                                              │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐        │
│  │ OpenAI/LLM  │  │  SendGrid   │  │ Cloudflare  │  │    S3/R2    │        │
│  │(Translations)│  │   (Email)   │  │   (CDN)     │  │  (Storage)  │        │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘        │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Multi-Tenant Architecture

### Tenant Resolution Flow

```
1. Request arrives at Vercel Edge
   ├── shop.vendor.com (custom domain)
   └── vendorslug.broxiva.com (subdomain)

2. Edge Middleware extracts host header
   └── Queries tenant_domains table via API

3. Tenant context established
   ├── x-bx-tenant header set
   ├── Tenant config cached in Redis
   └── All subsequent queries scoped to tenant

4. Request forwarded to API
   └── TenantGuard validates tenant_id on every request
```

### Data Isolation

| Layer | Isolation Mechanism |
|-------|---------------------|
| Database | `tenant_id` column + indexes on all tenant-scoped tables |
| Queries | Prisma extension auto-filters by tenant_id |
| Cache | Redis keys prefixed with tenant_id |
| Files | S3 paths include tenant_id prefix |
| Logs | All logs include tenant_id for filtering |

## Geo/Language/Currency Flow

```
┌──────────────────────────────────────────────────────────────────┐
│                     Request Processing                            │
├──────────────────────────────────────────────────────────────────┤
│                                                                   │
│  1. GEO DETECTION (Edge Middleware)                              │
│     ├── Vercel provides: x-vercel-ip-country, x-vercel-ip-city  │
│     ├── Fallback: IP geolocation service                         │
│     └── Result: country_code (e.g., "NG", "US", "DE")           │
│                                                                   │
│  2. LANGUAGE RESOLUTION                                          │
│     ├── Priority 1: bx_lang cookie (user preference)            │
│     ├── Priority 2: Accept-Language header                       │
│     ├── Priority 3: Country default (NG → en, DE → de)          │
│     └── Result: locale (e.g., "en-us", "yo-ng", "de-de")        │
│                                                                   │
│  3. CURRENCY RESOLUTION                                          │
│     ├── Priority 1: bx_currency cookie (user preference)        │
│     ├── Priority 2: Country default (NG → NGN, US → USD)        │
│     └── Result: currency (e.g., "NGN", "USD", "EUR")            │
│                                                                   │
│  4. HEADERS SET                                                   │
│     ├── x-bx-tenant: tenant_id                                   │
│     ├── x-bx-country: country_code                               │
│     ├── x-bx-language: locale                                    │
│     ├── x-bx-currency: currency                                  │
│     └── x-bx-trace-id: unique_trace_id                          │
│                                                                   │
│  5. COOKIES SET                                                   │
│     ├── bx_country: country_code                                 │
│     ├── bx_lang: locale                                          │
│     └── bx_currency: currency                                    │
│                                                                   │
└──────────────────────────────────────────────────────────────────┘
```

## Domain Onboarding Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                  Custom Domain Setup                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  STEP 1: Vendor adds domain                                      │
│  └── POST /api/v1/domains { host: "shop.vendor.com" }           │
│                                                                  │
│  STEP 2: System generates verification                          │
│  ├── TXT record: _broxiva-verify.shop.vendor.com               │
│  │   └── Value: bx-verify=abc123xyz...                          │
│  └── CNAME record: shop.vendor.com                              │
│      └── Target: domains.broxiva.com                            │
│                                                                  │
│  STEP 3: Vendor configures DNS                                  │
│  └── Adds TXT and CNAME records at registrar                    │
│                                                                  │
│  STEP 4: Verification worker checks DNS                         │
│  ├── Runs every 5 minutes for pending domains                   │
│  ├── Verifies TXT record matches token                          │
│  └── Verifies CNAME points to broxiva                          │
│                                                                  │
│  STEP 5: Domain activated                                        │
│  ├── status: PENDING → VERIFIED → ACTIVE                        │
│  ├── SSL provisioned via Vercel/Cloudflare                      │
│  └── Traffic now routed to tenant                               │
│                                                                  │
│  SECURITY: Hijack Prevention                                     │
│  ├── Cannot claim domain active for another tenant              │
│  ├── Re-verification required on domain transfer                │
│  └── All changes logged to audit trail                          │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

## Translation Lifecycle

```
┌─────────────────────────────────────────────────────────────────┐
│                Translation Status Flow                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─────────┐    ┌───────────────┐    ┌────────────────┐        │
│  │  DRAFT  │ →  │AUTO_TRANSLATED│ →  │VENDOR_APPROVED │        │
│  └─────────┘    └───────────────┘    └────────────────┘        │
│       │                │                      │                  │
│       │                │                      ▼                  │
│       │                │              ┌─────────────┐           │
│       │                │              │  PUBLISHED  │           │
│       │                │              └─────────────┘           │
│       │                │                      │                  │
│       │                │                      │                  │
│  Product created   LLM translates      Vendor reviews       Live │
│  or updated        automatically       and approves              │
│                                                                  │
│  Triggers:                                                       │
│  • Product creation → Queue translation job                     │
│  • Locale enabled → Queue translation for all products          │
│  • Content update → Re-translate affected locales               │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

## FX Rate Handling

```
┌─────────────────────────────────────────────────────────────────┐
│                  Currency Conversion Flow                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  REAL-TIME DISPLAY (Product Pages)                              │
│  ├── Fetch rate from Redis cache                                │
│  ├── Cache TTL: 1 hour                                          │
│  ├── Fallback: Postgres fx_rates table                          │
│  └── Display converted price with "≈" indicator                 │
│                                                                  │
│  ORDER PLACEMENT (Checkout)                                      │
│  ├── Capture current rate at order creation                     │
│  ├── Store in order_fx_snapshot table                           │
│  ├── NEVER recalculate after order placed                       │
│  └── Include rate source and timestamp                          │
│                                                                  │
│  FX REFRESH WORKER (Every 15 min)                               │
│  ├── Fetch from OpenExchangeRates/ECB API                       │
│  ├── Update Redis cache                                          │
│  ├── Write to Postgres for audit trail                          │
│  └── Handle provider rate limiting                              │
│                                                                  │
│  Example Order Record:                                           │
│  {                                                               │
│    "order_id": "ord_123",                                       │
│    "original_amount": 10000,    // 100.00 USD (minor units)    │
│    "original_currency": "USD",                                  │
│    "converted_amount": 155000,  // 1550.00 NGN                 │
│    "display_currency": "NGN",                                   │
│    "fx_rate": 1550.0000,                                        │
│    "rate_source": "openexchangerates",                          │
│    "snapshot_at": "2024-01-15T10:30:00Z"                       │
│  }                                                               │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

## Project Structure

```
citadelbuy/
├── organization/
│   ├── apps/
│   │   ├── api/                    # NestJS Backend
│   │   │   ├── src/
│   │   │   │   ├── common/         # Shared utilities
│   │   │   │   │   ├── guards/     # Auth, Tenant, Roles
│   │   │   │   │   ├── middleware/ # CORS, Security, Tenant
│   │   │   │   │   ├── redis/      # Cache, Locks, Keys
│   │   │   │   │   ├── queue/      # BullMQ configuration
│   │   │   │   │   └── prisma/     # Database service
│   │   │   │   └── modules/        # Feature modules
│   │   │   │       ├── auth/
│   │   │   │       ├── domains/    # Custom domain management
│   │   │   │       ├── currency/   # FX rates, conversion
│   │   │   │       ├── connectors/ # Product integrations
│   │   │   │       ├── products/
│   │   │   │       ├── orders/
│   │   │   │       └── ...
│   │   │   └── prisma/
│   │   │       ├── schema.prisma
│   │   │       └── migrations/
│   │   │
│   │   └── web/                    # Next.js Frontend
│   │       ├── src/
│   │       │   ├── app/            # App Router pages
│   │       │   │   └── [locale]/   # Localized routes
│   │       │   ├── components/
│   │       │   ├── lib/
│   │       │   │   ├── i18n/       # Internationalization
│   │       │   │   ├── tenant/     # Tenant context
│   │       │   │   └── geo/        # Geo detection
│   │       │   └── stores/         # Zustand state
│   │       └── middleware.ts       # Edge middleware
│   │
│   ├── docs/                       # Documentation
│   │   ├── architecture-overview.md
│   │   ├── domains.md
│   │   ├── i18n.md
│   │   ├── api.md
│   │   ├── db.md
│   │   ├── workers.md
│   │   ├── seo-growth.md
│   │   ├── security.md
│   │   ├── integrations.md
│   │   └── production-readiness.md
│   │
│   └── infrastructure/             # DevOps
│       ├── kubernetes/
│       ├── terraform/
│       └── docker/
│
├── vercel.json                     # Vercel configuration
├── docker-compose.yml              # Local development
└── README.md                       # Project documentation
```

## Key Technologies

| Component | Technology | Purpose |
|-----------|------------|---------|
| Frontend | Next.js 14+ | React framework with App Router |
| Backend | NestJS | Node.js framework with TypeScript |
| Database | PostgreSQL | Primary data store |
| Cache | Redis | Caching, queues, sessions |
| Queue | BullMQ | Background job processing |
| ORM | Prisma | Database access and migrations |
| Auth | Passport + JWT | Authentication and authorization |
| Hosting (FE) | Vercel | Edge network, CDN, serverless |
| Hosting (BE) | Railway | Container hosting, databases |
| Payments | Stripe, PayPal | Payment processing |
| Email | SendGrid | Transactional email |
| Storage | S3/R2 | File storage |
| Monitoring | Sentry | Error tracking |

## Environment Variables

See `docs/production-readiness.md` for complete list of required environment variables for Vercel and Railway deployments.
