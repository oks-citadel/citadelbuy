/**
 * Redis Key Conventions
 * Centralized key generation for consistent cache key patterns
 *
 * Key Format: {category}:{tenant?}:{entity}:{identifier}
 *
 * All keys should:
 * - Use lowercase
 * - Use colons as separators
 * - Include tenant ID where applicable for multi-tenancy
 * - Be as specific as possible to avoid collisions
 */

/**
 * TTL constants in seconds
 */
export const CACHE_TTL = {
  /** 1 minute */
  VERY_SHORT: 60,
  /** 5 minutes */
  SHORT: 300,
  /** 15 minutes */
  MEDIUM: 900,
  /** 1 hour */
  LONG: 3600,
  /** 6 hours */
  VERY_LONG: 21600,
  /** 24 hours */
  DAY: 86400,
  /** 7 days */
  WEEK: 604800,
  /** 30 days */
  MONTH: 2592000,
} as const;

/**
 * Redis key generators for different data types
 */
export const REDIS_KEYS = {
  // ==================== FX Rates ====================
  /**
   * Single FX rate: fx:{base}:{quote}
   * Example: fx:USD:EUR -> 0.92
   */
  FX_RATE: (base: string, quote: string) =>
    `fx:${base.toUpperCase()}:${quote.toUpperCase()}`,

  /**
   * All rates for a base currency: fx:{base}:*
   * Use for pattern matching to get all rates
   */
  FX_RATES_ALL: (base: string) => `fx:${base.toUpperCase()}:*`,

  /**
   * FX rates snapshot with timestamp
   * fx:snapshot:{base}:{timestamp}
   */
  FX_RATES_SNAPSHOT: (base: string, timestamp?: number) =>
    `fx:snapshot:${base.toUpperCase()}:${timestamp || Date.now()}`,

  /**
   * Latest FX rates cache for a base currency
   * fx:latest:{base}
   */
  FX_RATES_LATEST: (base: string) => `fx:latest:${base.toUpperCase()}`,

  // ==================== Tenant Cache ====================
  /**
   * Tenant by hostname: tenant:host:{host}
   * Maps hostname to tenant configuration
   */
  TENANT_BY_HOST: (host: string) => `tenant:host:${host.toLowerCase()}`,

  /**
   * Tenant configuration: tenant:config:{tenantId}
   */
  TENANT_CONFIG: (tenantId: string) => `tenant:config:${tenantId}`,

  /**
   * Tenant feature flags: tenant:features:{tenantId}
   */
  TENANT_FEATURES: (tenantId: string) => `tenant:features:${tenantId}`,

  /**
   * Tenant subscription: tenant:subscription:{tenantId}
   */
  TENANT_SUBSCRIPTION: (tenantId: string) => `tenant:subscription:${tenantId}`,

  /**
   * Tenant domains list: tenant:domains:{tenantId}
   */
  TENANT_DOMAINS: (tenantId: string) => `tenant:domains:${tenantId}`,

  // ==================== Translation Cache ====================
  /**
   * Product translation: translation:product:{productId}:{locale}
   */
  PRODUCT_TRANSLATION: (productId: string, locale: string) =>
    `translation:product:${productId}:${locale.toLowerCase()}`,

  /**
   * Category translation: translation:category:{categoryId}:{locale}
   */
  CATEGORY_TRANSLATION: (categoryId: string, locale: string) =>
    `translation:category:${categoryId}:${locale.toLowerCase()}`,

  /**
   * Translation job status: translation:job:{jobId}
   */
  TRANSLATION_JOB: (jobId: string) => `translation:job:${jobId}`,

  /**
   * Pending translations for tenant: translation:pending:{tenantId}
   */
  TRANSLATION_PENDING: (tenantId: string) => `translation:pending:${tenantId}`,

  // ==================== Product Cache ====================
  /**
   * Product by ID: product:{tenantId}:{productId}
   */
  PRODUCT: (tenantId: string, productId: string) =>
    `product:${tenantId}:${productId}`,

  /**
   * Product listing cache: products:{tenantId}:{hash}
   * Hash is based on filters, pagination, etc.
   */
  PRODUCT_LISTING: (tenantId: string, queryHash: string) =>
    `products:${tenantId}:${queryHash}`,

  /**
   * Product inventory: inventory:{tenantId}:{productId}
   */
  PRODUCT_INVENTORY: (tenantId: string, productId: string) =>
    `inventory:${tenantId}:${productId}`,

  /**
   * Product price (with currency): price:{tenantId}:{productId}:{currency}
   */
  PRODUCT_PRICE: (tenantId: string, productId: string, currency: string) =>
    `price:${tenantId}:${productId}:${currency.toUpperCase()}`,

  // ==================== Distributed Locks ====================
  /**
   * Generic lock: lock:{key}
   */
  LOCK: (key: string) => `lock:${key}`,

  /**
   * FX refresh lock: lock:fx:refresh:{base}
   */
  LOCK_FX_REFRESH: (base: string) => `lock:fx:refresh:${base.toUpperCase()}`,

  /**
   * Sitemap generation lock: lock:sitemap:{tenantId}
   */
  LOCK_SITEMAP: (tenantId: string) => `lock:sitemap:${tenantId}`,

  /**
   * Product sync lock: lock:sync:{tenantId}:{source}
   */
  LOCK_PRODUCT_SYNC: (tenantId: string, source: string) =>
    `lock:sync:${tenantId}:${source}`,

  /**
   * Domain verification lock: lock:domain:{domainId}
   */
  LOCK_DOMAIN_VERIFICATION: (domainId: string) => `lock:domain:${domainId}`,

  // ==================== Idempotency ====================
  /**
   * Idempotency key: idempotency:{scope}:{key}
   */
  IDEMPOTENCY: (key: string, scope: string = 'default') =>
    `idempotency:${scope}:${key}`,

  /**
   * Webhook idempotency: idempotency:webhook:{source}:{eventId}
   */
  IDEMPOTENCY_WEBHOOK: (source: string, eventId: string) =>
    `idempotency:webhook:${source}:${eventId}`,

  /**
   * Payment idempotency: idempotency:payment:{tenantId}:{key}
   */
  IDEMPOTENCY_PAYMENT: (tenantId: string, key: string) =>
    `idempotency:payment:${tenantId}:${key}`,

  // ==================== Rate Limiting ====================
  /**
   * Rate limit counter: ratelimit:{key}
   */
  RATE_LIMIT: (key: string) => `ratelimit:${key}`,

  /**
   * API rate limit: ratelimit:api:{tenantId}:{endpoint}
   */
  RATE_LIMIT_API: (tenantId: string, endpoint: string) =>
    `ratelimit:api:${tenantId}:${endpoint}`,

  /**
   * User rate limit: ratelimit:user:{userId}:{action}
   */
  RATE_LIMIT_USER: (userId: string, action: string) =>
    `ratelimit:user:${userId}:${action}`,

  /**
   * IP rate limit: ratelimit:ip:{ip}
   */
  RATE_LIMIT_IP: (ip: string) => `ratelimit:ip:${ip}`,

  // ==================== Session & Auth ====================
  /**
   * User session: session:{sessionId}
   */
  SESSION: (sessionId: string) => `session:${sessionId}`,

  /**
   * User sessions list: sessions:{userId}
   */
  USER_SESSIONS: (userId: string) => `sessions:${userId}`,

  /**
   * Refresh token: refresh:{tokenId}
   */
  REFRESH_TOKEN: (tokenId: string) => `refresh:${tokenId}`,

  /**
   * Password reset token: reset:{token}
   */
  PASSWORD_RESET: (token: string) => `reset:${token}`,

  /**
   * Email verification token: verify:{token}
   */
  EMAIL_VERIFICATION: (token: string) => `verify:${token}`,

  // ==================== Cart & Checkout ====================
  /**
   * Shopping cart: cart:{tenantId}:{cartId}
   */
  CART: (tenantId: string, cartId: string) => `cart:${tenantId}:${cartId}`,

  /**
   * Checkout session: checkout:{sessionId}
   */
  CHECKOUT_SESSION: (sessionId: string) => `checkout:${sessionId}`,

  /**
   * Abandoned cart: abandoned:{tenantId}:{cartId}
   */
  ABANDONED_CART: (tenantId: string, cartId: string) =>
    `abandoned:${tenantId}:${cartId}`,

  // ==================== Search ====================
  /**
   * Search results cache: search:{tenantId}:{queryHash}
   */
  SEARCH_RESULTS: (tenantId: string, queryHash: string) =>
    `search:${tenantId}:${queryHash}`,

  /**
   * Search suggestions: suggest:{tenantId}:{prefix}
   */
  SEARCH_SUGGESTIONS: (tenantId: string, prefix: string) =>
    `suggest:${tenantId}:${prefix.toLowerCase()}`,

  /**
   * Trending searches: trending:{tenantId}
   */
  TRENDING_SEARCHES: (tenantId: string) => `trending:${tenantId}`,

  // ==================== Analytics ====================
  /**
   * Page view counter: pageviews:{tenantId}:{date}:{path}
   */
  PAGE_VIEWS: (tenantId: string, date: string, path: string) =>
    `pageviews:${tenantId}:${date}:${path}`,

  /**
   * Product views counter: productviews:{tenantId}:{productId}
   */
  PRODUCT_VIEWS: (tenantId: string, productId: string) =>
    `productviews:${tenantId}:${productId}`,

  /**
   * Real-time visitors: realtime:{tenantId}
   */
  REALTIME_VISITORS: (tenantId: string) => `realtime:${tenantId}`,

  // ==================== Sitemap ====================
  /**
   * Sitemap index: sitemap:index:{tenantId}
   */
  SITEMAP_INDEX: (tenantId: string) => `sitemap:index:${tenantId}`,

  /**
   * Sitemap content: sitemap:{tenantId}:{locale}:{type}
   */
  SITEMAP: (tenantId: string, locale: string, type: string) =>
    `sitemap:${tenantId}:${locale}:${type}`,

  /**
   * Sitemap last generated: sitemap:lastgen:{tenantId}
   */
  SITEMAP_LAST_GENERATED: (tenantId: string) => `sitemap:lastgen:${tenantId}`,

  // ==================== Domain Verification ====================
  /**
   * Domain verification status: domain:{domainId}
   */
  DOMAIN_STATUS: (domainId: string) => `domain:${domainId}`,

  /**
   * Domain verification token: domain:token:{domain}
   */
  DOMAIN_TOKEN: (domain: string) => `domain:token:${domain.toLowerCase()}`,

  /**
   * Pending domains for verification: domains:pending
   */
  DOMAINS_PENDING: () => 'domains:pending',

  // ==================== Notifications ====================
  /**
   * User notifications: notifications:{userId}
   */
  USER_NOTIFICATIONS: (userId: string) => `notifications:${userId}`,

  /**
   * Unread notification count: notifications:unread:{userId}
   */
  UNREAD_NOTIFICATIONS: (userId: string) => `notifications:unread:${userId}`,

  // ==================== Feature Flags ====================
  /**
   * Global feature flags: flags:global
   */
  FEATURE_FLAGS_GLOBAL: () => 'flags:global',

  /**
   * Tenant feature flags: flags:{tenantId}
   */
  FEATURE_FLAGS_TENANT: (tenantId: string) => `flags:${tenantId}`,

  // ==================== Job Queue Metadata ====================
  /**
   * Queue stats: queue:stats:{queueName}
   */
  QUEUE_STATS: (queueName: string) => `queue:stats:${queueName}`,

  /**
   * Worker heartbeat: worker:{workerId}
   */
  WORKER_HEARTBEAT: (workerId: string) => `worker:${workerId}`,
} as const;

/**
 * Helper to generate cache key with tenant context
 */
export function tenantKey(
  tenantId: string,
  category: string,
  ...parts: string[]
): string {
  return [category, tenantId, ...parts].join(':');
}

/**
 * Parse a cache key into its components
 */
export function parseKey(key: string): string[] {
  return key.split(':');
}

/**
 * Generate a hash for query parameters (for listing caches)
 */
export function hashQueryParams(params: Record<string, any>): string {
  const sorted = Object.keys(params)
    .sort()
    .reduce(
      (acc, key) => {
        acc[key] = params[key];
        return acc;
      },
      {} as Record<string, any>,
    );

  const str = JSON.stringify(sorted);
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return Math.abs(hash).toString(16);
}
