/**
 * Product Sync Job Definitions
 * Defines the job data structures and types for product synchronization workers
 */

import { SYNC_STATUS, SyncStatus } from '@/common/queue/queue.constants';

/**
 * Supported product sync sources
 */
export enum ProductSyncSource {
  /** Shopify */
  SHOPIFY = 'shopify',
  /** WooCommerce */
  WOOCOMMERCE = 'woocommerce',
  /** BigCommerce */
  BIGCOMMERCE = 'bigcommerce',
  /** Magento */
  MAGENTO = 'magento',
  /** Custom CSV/API */
  CUSTOM = 'custom',
  /** Webhook-triggered */
  WEBHOOK = 'webhook',
  /** Manual import */
  MANUAL = 'manual',
}

/**
 * Sync mode
 */
export enum SyncMode {
  /** Full sync - replace all products */
  FULL = 'full',
  /** Delta sync - only changes since last sync */
  DELTA = 'delta',
  /** Inventory only - update stock levels only */
  INVENTORY_ONLY = 'inventory_only',
  /** Prices only - update prices only */
  PRICES_ONLY = 'prices_only',
}

/**
 * Conflict resolution strategy
 */
export enum ConflictResolution {
  /** Source wins - external source data takes precedence */
  SOURCE_WINS = 'source_wins',
  /** Local wins - local edits take precedence */
  LOCAL_WINS = 'local_wins',
  /** Newest wins - most recently updated data takes precedence */
  NEWEST_WINS = 'newest_wins',
  /** Flag for review - mark as conflict for manual resolution */
  FLAG_FOR_REVIEW = 'flag_for_review',
}

/**
 * Base product sync job data
 */
export interface ProductSyncJobData {
  /** Unique sync job ID */
  syncId: string;
  /** Tenant ID */
  tenantId: string;
  /** Organization ID */
  organizationId?: string;
  /** Sync source */
  source: ProductSyncSource;
  /** Sync mode */
  mode: SyncMode;
  /** Conflict resolution strategy */
  conflictResolution?: ConflictResolution;
  /** Source configuration */
  sourceConfig?: ProductSyncSourceConfig;
  /** Filter products to sync */
  filter?: ProductSyncFilter;
  /** Webhook event data (for webhook-triggered syncs) */
  webhookData?: WebhookEventData;
  /** Priority */
  priority?: 'high' | 'normal' | 'low';
  /** Correlation ID */
  correlationId?: string;
  /** Triggered by */
  triggeredBy?: string;
  /** Triggered at */
  triggeredAt?: string;
}

/**
 * Source configuration
 */
export interface ProductSyncSourceConfig {
  /** API endpoint */
  apiUrl?: string;
  /** API key/token */
  apiKey?: string;
  /** API secret */
  apiSecret?: string;
  /** Store domain (for Shopify) */
  storeDomain?: string;
  /** Additional headers */
  headers?: Record<string, string>;
  /** Pagination settings */
  pagination?: {
    pageSize: number;
    maxPages?: number;
  };
}

/**
 * Product filter for sync
 */
export interface ProductSyncFilter {
  /** Sync only specific product IDs */
  productIds?: string[];
  /** Sync only products in these categories */
  categoryIds?: string[];
  /** Sync only products updated after this date */
  updatedAfter?: Date;
  /** Sync only products with these SKUs */
  skus?: string[];
  /** Exclude products matching these criteria */
  exclude?: {
    productIds?: string[];
    skus?: string[];
  };
}

/**
 * Webhook event data
 */
export interface WebhookEventData {
  /** Webhook event type */
  eventType: string;
  /** Event ID */
  eventId: string;
  /** Event timestamp */
  timestamp: string;
  /** Event payload */
  payload: Record<string, any>;
  /** Idempotency key */
  idempotencyKey?: string;
}

/**
 * Product sync result
 */
export interface ProductSyncJobResult {
  /** Success status */
  success: boolean;
  /** Sync ID */
  syncId: string;
  /** Sync status */
  status: SyncStatus;
  /** Statistics */
  stats: ProductSyncStats;
  /** Errors */
  errors: ProductSyncError[];
  /** Conflicts requiring resolution */
  conflicts: ProductConflict[];
  /** Duration in milliseconds */
  durationMs: number;
  /** Last sync timestamp */
  lastSyncAt: string;
  /** Next recommended sync */
  nextSyncRecommended?: string;
}

/**
 * Sync statistics
 */
export interface ProductSyncStats {
  /** Total products processed */
  total: number;
  /** Products created */
  created: number;
  /** Products updated */
  updated: number;
  /** Products skipped (no changes) */
  skipped: number;
  /** Products deleted */
  deleted: number;
  /** Products with errors */
  errors: number;
  /** Products with conflicts */
  conflicts: number;
  /** Inventory updates */
  inventoryUpdates: number;
  /** Price updates */
  priceUpdates: number;
}

/**
 * Sync error
 */
export interface ProductSyncError {
  /** Product ID (external) */
  externalId: string;
  /** SKU */
  sku?: string;
  /** Error message */
  message: string;
  /** Error code */
  code: string;
  /** Retryable */
  retryable: boolean;
}

/**
 * Product conflict
 */
export interface ProductConflict {
  /** Internal product ID */
  productId: string;
  /** External product ID */
  externalId: string;
  /** SKU */
  sku: string;
  /** Conflicting fields */
  fields: ConflictField[];
  /** Suggested resolution */
  suggestedResolution: ConflictResolution;
}

/**
 * Conflict field
 */
export interface ConflictField {
  /** Field name */
  field: string;
  /** Local value */
  localValue: any;
  /** Source value */
  sourceValue: any;
  /** Local last updated */
  localUpdatedAt: Date;
  /** Source last updated */
  sourceUpdatedAt: Date;
}

/**
 * Normalized product from external source
 */
export interface NormalizedProduct {
  /** External product ID */
  externalId: string;
  /** Source platform */
  source: ProductSyncSource;
  /** SKU */
  sku: string;
  /** Product name */
  name: string;
  /** Description */
  description?: string;
  /** Price */
  price: number;
  /** Compare at price */
  compareAtPrice?: number;
  /** Currency */
  currency: string;
  /** Inventory quantity */
  inventoryQuantity?: number;
  /** Categories */
  categories?: string[];
  /** Images */
  images?: string[];
  /** Variants */
  variants?: NormalizedVariant[];
  /** Attributes */
  attributes?: Record<string, any>;
  /** Status */
  status: 'active' | 'draft' | 'archived';
  /** Last updated at source */
  updatedAt: Date;
  /** Raw data from source */
  rawData?: Record<string, any>;
}

/**
 * Normalized variant
 */
export interface NormalizedVariant {
  /** External variant ID */
  externalId: string;
  /** SKU */
  sku: string;
  /** Title */
  title: string;
  /** Price */
  price: number;
  /** Inventory quantity */
  inventoryQuantity?: number;
  /** Options (e.g., size, color) */
  options?: Record<string, string>;
}

/**
 * Product sync job names
 */
export const PRODUCT_SYNC_JOB_NAMES = {
  SYNC_SINGLE: 'sync-single',
  SYNC_BATCH: 'sync-batch',
  SYNC_FULL: 'sync-full',
  SYNC_DELTA: 'sync-delta',
  SYNC_INVENTORY: 'sync-inventory',
  SYNC_WEBHOOK: 'sync-webhook',
  CLEANUP: 'cleanup',
} as const;

/**
 * Webhook event types
 */
export const WEBHOOK_EVENTS = {
  PRODUCT_CREATE: 'product.create',
  PRODUCT_UPDATE: 'product.update',
  PRODUCT_DELETE: 'product.delete',
  INVENTORY_UPDATE: 'inventory.update',
  PRICE_UPDATE: 'price.update',
  ORDER_CREATE: 'order.create',
  ORDER_FULFIL: 'order.fulfil',
} as const;

/**
 * Sync schedule configuration
 */
export const SYNC_SCHEDULES = {
  /** Delta sync every 6 hours */
  DELTA: '0 */6 * * *',
  /** Full sync daily at 2 AM */
  FULL: '0 2 * * *',
  /** Inventory sync every hour */
  INVENTORY: '0 * * * *',
} as const;
