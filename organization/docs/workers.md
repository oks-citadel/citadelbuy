# Background Workers Architecture

This document describes the background worker infrastructure for the Broxiva Global Marketplace platform.

## Overview

The platform uses BullMQ (Bull) for Redis-backed job queues with the following features:

- **Reliable job processing** with automatic retries and exponential backoff
- **Distributed locking** to prevent concurrent job execution
- **Idempotency** for webhook handlers
- **Job prioritization** for time-sensitive operations
- **Rate limiting** to respect external API limits
- **Health monitoring** and alerting

## Queue Configuration

### Queue Names

All queues are defined in `apps/api/src/common/queue/queue.constants.ts`:

| Queue | Purpose | Schedule |
|-------|---------|----------|
| `fx-refresh` | Currency exchange rate updates | Every 15 minutes |
| `translation` | LLM-based product translations | On-demand |
| `product-sync` | External product synchronization | Every 6 hours (delta) |
| `sitemap-generation` | SEO sitemap generation | Daily at 3 AM UTC |
| `domain-verification` | Custom domain DNS verification | Every 5 minutes (pending) |
| `email` | Email dispatch | On-demand |
| `notification` | Push notifications | On-demand |
| `webhook-delivery` | Webhook event delivery | On-demand |

### Default Job Options

```typescript
{
  attempts: 3,
  backoff: {
    type: 'exponential',
    delay: 10000, // 10 seconds base
  },
  removeOnComplete: 100,  // Keep last 100 completed jobs
  removeOnFail: 500,      // Keep last 500 failed jobs
  timeout: 60000,         // 1 minute
}
```

## Workers

### 1. FX Refresh Worker

**Location:** `apps/api/src/modules/cross-border/workers/fx-refresh.processor.ts`

**Responsibilities:**
- Fetch rates from OpenExchangeRates/ECB APIs
- Cache in Redis with 1-hour TTL
- Write durable snapshots to Postgres `exchange_rate` table
- Support multiple base currencies (USD, EUR, GBP, etc.)
- Handle rate limiting from providers

**Job Data:**
```typescript
interface FxRefreshJobData {
  baseCurrency: string;
  targetCurrencies?: string[];
  provider?: 'openexchangerates' | 'ecb' | 'fixer';
  forceRefresh?: boolean;
}
```

**Configuration:**
- `OPEN_EXCHANGE_RATES_APP_ID` - API key
- `FIXER_API_KEY` - Backup API key

### 2. Translation Worker

**Location:** `apps/api/src/modules/i18n/workers/translation.processor.ts`

**Responsibilities:**
- Auto-translate product content using LLM (Anthropic/OpenAI)
- Status lifecycle: `DRAFT` -> `AUTO_TRANSLATED` -> `VENDOR_APPROVED` -> `PUBLISHED`
- Batch translation support
- Preserve HTML/markdown formatting
- Quality scoring and review flagging

**Job Data:**
```typescript
interface TranslationJobData {
  jobId: string;
  tenantId: string;
  sourceLocale: string;
  targetLocale: string;
  content: {
    type: 'product_title' | 'product_description' | 'category_name' | ...;
    entityId: string;
    fieldName: string;
    sourceText: string;
  };
  provider?: 'anthropic' | 'openai';
}
```

**Configuration:**
- `ANTHROPIC_API_KEY` - Claude API key (preferred)
- `OPENAI_API_KEY` - Fallback

### 3. Product Sync Worker

**Location:** `apps/api/src/modules/products/workers/product-sync.processor.ts`

**Responsibilities:**
- Webhook-driven sync from external sources (Shopify, WooCommerce)
- Scheduled delta sync (every 6 hours)
- Normalize product data from different sources
- Handle inventory updates
- Detect and resolve conflicts

**Job Data:**
```typescript
interface ProductSyncJobData {
  syncId: string;
  tenantId: string;
  source: 'shopify' | 'woocommerce' | 'bigcommerce' | 'custom';
  mode: 'full' | 'delta' | 'inventory_only';
  conflictResolution?: 'source_wins' | 'local_wins' | 'newest_wins';
  webhookData?: any;
}
```

**Conflict Resolution Strategies:**
- `source_wins` - External source data takes precedence
- `local_wins` - Local edits take precedence
- `newest_wins` - Most recently updated data wins
- `flag_for_review` - Mark as conflict for manual resolution

### 4. Sitemap Generator Worker

**Location:** `apps/api/src/modules/seo/workers/sitemap.processor.ts`

**Responsibilities:**
- Generate per-locale sitemaps
- Tenant-aware (each tenant gets own sitemap)
- Include products, categories, pages
- Upload to S3/storage
- Ping search engines on update

**Job Data:**
```typescript
interface SitemapJobData {
  jobId: string;
  tenantId: string;
  types?: ('products' | 'categories' | 'pages' | 'index')[];
  locales?: string[];
  uploadToStorage?: boolean;
  pingSearchEngines?: boolean;
}
```

**Sitemap Limits:**
- Max 45,000 URLs per sitemap (Google limit: 50,000)
- Max 50MB file size

### 5. Domain Verification Worker

**Location:** `apps/api/src/modules/domains/workers/domain-verification.processor.ts`

**Responsibilities:**
- Check TXT records for verification token
- Check CNAME records for proper setup
- Update `tenant_domains.status`
- Retry verification for pending domains
- Send notification on success/failure

**Verification Methods:**
- `dns_txt` - TXT record at `_broxiva-verification.{domain}`
- `dns_cname` - CNAME pointing to `domains.broxiva.com`
- `http_file` - File at `/.well-known/broxiva-verification.txt`
- `meta_tag` - Meta tag on homepage

## Redis Key Conventions

All Redis keys follow a consistent pattern defined in `apps/api/src/common/redis/keys.ts`:

```
{category}:{tenant?}:{entity}:{identifier}
```

### Key Categories

| Prefix | Purpose | TTL |
|--------|---------|-----|
| `fx:` | Exchange rates | 1 hour |
| `tenant:` | Tenant configuration | 1 hour |
| `translation:` | Translation cache | 24 hours |
| `product:` | Product cache | 1 hour |
| `lock:` | Distributed locks | 30-60 seconds |
| `idempotency:` | Webhook replay protection | 24 hours |
| `ratelimit:` | Rate limiting counters | Varies |
| `sitemap:` | Generated sitemaps | 24 hours |
| `domain:` | Domain verification | 5 minutes |

## Distributed Locking

The `DistributedLockService` provides Redis-based locking:

```typescript
// Acquire lock
const lock = await lockService.acquireLock('resource-key', {
  ttlSeconds: 30,
  waitTimeMs: 5000,
});

if (lock.acquired) {
  try {
    // Critical section
  } finally {
    await lockService.releaseLock('resource-key', lock.lockId);
  }
}

// Or use withLock helper
await lockService.withLock('resource-key', async () => {
  // Critical section
});
```

## Idempotency

Webhook handlers use the `IdempotencyService` for replay protection:

```typescript
const idempotencyKey = webhookEvent.id;
const { acquired } = await idempotencyService.tryAcquireLock(
  `webhook:${source}:${idempotencyKey}`,
  undefined,
  86400, // 24 hour TTL
);

if (!acquired) {
  // Duplicate webhook, skip processing
  return;
}
```

## Job Retry Policies

| Queue | Attempts | Backoff | Max Delay |
|-------|----------|---------|-----------|
| FX Refresh | 3 | Exponential 5s | 1 minute |
| Translation | 3 | Exponential 10s | 5 minutes |
| Product Sync | 5 | Exponential 30s | 10 minutes |
| Sitemap | 3 | Exponential 60s | 10 minutes |
| Domain Verification | 10 | Exponential 60s | 1 hour |

## Monitoring and Debugging

### Health Checks

The `QueueHealthIndicator` provides health endpoints:

```
GET /health/queues     - All queues summary
GET /health/queue/:name - Specific queue details
```

Health check response:
```json
{
  "totalQueues": 5,
  "healthyQueues": 5,
  "totalWaiting": 12,
  "totalActive": 3,
  "totalFailed": 0,
  "queues": {
    "fx-refresh": { "waiting": 2, "active": 1, "failed": 0, "healthy": true },
    "translation": { "waiting": 5, "active": 1, "failed": 0, "healthy": true }
  }
}
```

### Alerting Thresholds

| Metric | Warning | Critical |
|--------|---------|----------|
| Waiting jobs | > 1000 | > 5000 |
| Failed jobs | > 50 | > 200 |
| No workers | With jobs waiting | - |
| Job age | > 1 hour | > 6 hours |

### Debugging Failed Jobs

1. Check job status in Redis:
   ```
   redis-cli HGETALL broxiva:queue:fx-refresh:job:12345
   ```

2. View failed job details:
   ```
   redis-cli LRANGE broxiva:queue:fx-refresh:failed 0 10
   ```

3. Retry failed job:
   ```typescript
   const job = await queue.getJob(jobId);
   await job.retry();
   ```

4. Clean old failed jobs:
   ```typescript
   await queue.clean(86400000, 'failed'); // Clean failed jobs older than 24h
   ```

## Adding New Workers

### 1. Create Job Definition

```typescript
// modules/my-feature/workers/my-job.job.ts
export interface MyJobData {
  tenantId: string;
  // ... job-specific data
}

export interface MyJobResult {
  success: boolean;
  // ... result data
}

export const MY_JOB_NAMES = {
  PROCESS: 'process',
  CLEANUP: 'cleanup',
} as const;
```

### 2. Create Processor

```typescript
// modules/my-feature/workers/my-job.processor.ts
@Injectable()
@Processor('my-queue')
export class MyJobProcessor {
  @Process(MY_JOB_NAMES.PROCESS)
  async handleProcess(job: Job<MyJobData>): Promise<MyJobResult> {
    // Process job
  }
}
```

### 3. Register Queue

Add to `QUEUES` constant in `queue.constants.ts`:

```typescript
export const QUEUES = {
  // ... existing queues
  MY_QUEUE: 'my-queue',
} as const;
```

### 4. Update Module

```typescript
@Module({
  imports: [
    BullModule.registerQueue({ name: QUEUES.MY_QUEUE }),
  ],
  providers: [MyJobProcessor],
})
export class MyFeatureModule {}
```

## Environment Variables

```env
# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_QUEUE_DB=1

# Queue prefix
QUEUE_PREFIX=broxiva:queue

# FX APIs
OPEN_EXCHANGE_RATES_APP_ID=
FIXER_API_KEY=

# Translation APIs
ANTHROPIC_API_KEY=
OPENAI_API_KEY=

# Sitemap storage
SITEMAP_STORAGE_URL=https://storage.broxiva.com/sitemaps
```
