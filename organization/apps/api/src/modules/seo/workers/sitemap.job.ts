/**
 * Sitemap Generation Job Definitions
 * Defines the job data structures and types for sitemap generation workers
 */

/**
 * Sitemap type
 */
export enum SitemapType {
  /** Main sitemap index */
  INDEX = 'index',
  /** Product sitemap */
  PRODUCTS = 'products',
  /** Category sitemap */
  CATEGORIES = 'categories',
  /** Static pages sitemap */
  PAGES = 'pages',
  /** Blog posts sitemap */
  BLOG = 'blog',
  /** Image sitemap */
  IMAGES = 'images',
  /** Video sitemap */
  VIDEOS = 'videos',
}

/**
 * Change frequency for sitemap URLs
 */
export type ChangeFrequency = 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never';

/**
 * Sitemap generation job data
 */
export interface SitemapJobData {
  /** Unique job ID */
  jobId: string;
  /** Tenant ID */
  tenantId: string;
  /** Organization ID */
  organizationId?: string;
  /** Sitemap types to generate */
  types?: SitemapType[];
  /** Locales to generate sitemaps for */
  locales?: string[];
  /** Force regeneration even if recent */
  forceRegenerate?: boolean;
  /** Upload to storage */
  uploadToStorage?: boolean;
  /** Ping search engines */
  pingSearchEngines?: boolean;
  /** Priority */
  priority?: 'high' | 'normal' | 'low';
  /** Correlation ID */
  correlationId?: string;
  /** Triggered by */
  triggeredBy?: string;
}

/**
 * Sitemap generation result
 */
export interface SitemapJobResult {
  /** Success status */
  success: boolean;
  /** Job ID */
  jobId: string;
  /** Tenant ID */
  tenantId: string;
  /** Generated sitemaps */
  sitemaps: GeneratedSitemap[];
  /** Total URLs */
  totalUrls: number;
  /** Duration in milliseconds */
  durationMs: number;
  /** Storage URLs (if uploaded) */
  storageUrls?: SitemapStorageUrls;
  /** Search engines pinged */
  pingResults?: SearchEnginePingResult[];
  /** Errors */
  errors?: string[];
}

/**
 * Generated sitemap info
 */
export interface GeneratedSitemap {
  /** Sitemap type */
  type: SitemapType;
  /** Locale */
  locale: string;
  /** Number of URLs */
  urlCount: number;
  /** File size in bytes */
  sizeBytes: number;
  /** Sitemap content (XML) */
  content?: string;
  /** Storage URL */
  storageUrl?: string;
  /** Generated at */
  generatedAt: string;
}

/**
 * Sitemap storage URLs
 */
export interface SitemapStorageUrls {
  /** Sitemap index URL */
  index: string;
  /** Individual sitemap URLs */
  sitemaps: Record<string, string>;
}

/**
 * Search engine ping result
 */
export interface SearchEnginePingResult {
  /** Search engine name */
  engine: 'google' | 'bing' | 'yandex';
  /** Success status */
  success: boolean;
  /** HTTP status code */
  statusCode?: number;
  /** Error message */
  error?: string;
}

/**
 * Sitemap URL entry
 */
export interface SitemapUrl {
  /** URL location */
  loc: string;
  /** Last modification date */
  lastmod?: string;
  /** Change frequency */
  changefreq?: ChangeFrequency;
  /** Priority (0.0 to 1.0) */
  priority?: number;
  /** Alternate language URLs */
  alternates?: SitemapAlternate[];
  /** Images */
  images?: SitemapImage[];
}

/**
 * Alternate language link
 */
export interface SitemapAlternate {
  /** Language/locale code */
  hreflang: string;
  /** URL */
  href: string;
}

/**
 * Sitemap image
 */
export interface SitemapImage {
  /** Image URL */
  loc: string;
  /** Image title */
  title?: string;
  /** Image caption */
  caption?: string;
}

/**
 * Sitemap job names
 */
export const SITEMAP_JOB_NAMES = {
  GENERATE_ALL: 'generate-all',
  GENERATE_INDEX: 'generate-index',
  GENERATE_PRODUCTS: 'generate-products',
  GENERATE_CATEGORIES: 'generate-categories',
  GENERATE_PAGES: 'generate-pages',
  UPLOAD: 'upload',
  PING_ENGINES: 'ping-engines',
  CLEANUP: 'cleanup',
} as const;

/**
 * Sitemap generation configuration
 */
export const SITEMAP_CONFIG = {
  /** Maximum URLs per sitemap file (Google limit is 50,000) */
  MAX_URLS_PER_FILE: 45000,
  /** Maximum sitemap file size (50MB uncompressed) */
  MAX_FILE_SIZE: 50 * 1024 * 1024,
  /** Default change frequency for products */
  PRODUCT_CHANGEFREQ: 'weekly' as ChangeFrequency,
  /** Default change frequency for categories */
  CATEGORY_CHANGEFREQ: 'monthly' as ChangeFrequency,
  /** Default change frequency for pages */
  PAGE_CHANGEFREQ: 'monthly' as ChangeFrequency,
  /** Default priority for products */
  PRODUCT_PRIORITY: 0.8,
  /** Default priority for categories */
  CATEGORY_PRIORITY: 0.7,
  /** Default priority for pages */
  PAGE_PRIORITY: 0.5,
  /** Search engine ping URLs */
  SEARCH_ENGINE_PING_URLS: {
    google: (sitemapUrl: string) =>
      `https://www.google.com/ping?sitemap=${encodeURIComponent(sitemapUrl)}`,
    bing: (sitemapUrl: string) =>
      `https://www.bing.com/ping?sitemap=${encodeURIComponent(sitemapUrl)}`,
    yandex: (sitemapUrl: string) =>
      `https://webmaster.yandex.com/ping?sitemap=${encodeURIComponent(sitemapUrl)}`,
  },
  /** Regeneration threshold (don't regenerate if generated within this time) */
  REGEN_THRESHOLD_MS: 6 * 60 * 60 * 1000, // 6 hours
} as const;

/**
 * Sitemap XML templates
 */
export const SITEMAP_TEMPLATES = {
  /** XML declaration and namespace */
  XML_HEADER: `<?xml version="1.0" encoding="UTF-8"?>`,

  /** Sitemap index opening tag */
  INDEX_OPEN: `<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`,
  INDEX_CLOSE: `</sitemapindex>`,

  /** URL set opening tag */
  URLSET_OPEN: `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">`,
  URLSET_CLOSE: `</urlset>`,

  /** Sitemap entry in index */
  SITEMAP_ENTRY: (loc: string, lastmod: string) =>
    `<sitemap><loc>${loc}</loc><lastmod>${lastmod}</lastmod></sitemap>`,

  /** URL entry */
  URL_ENTRY: (url: SitemapUrl) => {
    let xml = `<url><loc>${escapeXml(url.loc)}</loc>`;
    if (url.lastmod) xml += `<lastmod>${url.lastmod}</lastmod>`;
    if (url.changefreq) xml += `<changefreq>${url.changefreq}</changefreq>`;
    if (url.priority !== undefined) xml += `<priority>${url.priority.toFixed(1)}</priority>`;

    // Add alternates
    if (url.alternates) {
      for (const alt of url.alternates) {
        xml += `<xhtml:link rel="alternate" hreflang="${alt.hreflang}" href="${escapeXml(alt.href)}"/>`;
      }
    }

    // Add images
    if (url.images) {
      for (const img of url.images) {
        xml += `<image:image><image:loc>${escapeXml(img.loc)}</image:loc>`;
        if (img.title) xml += `<image:title>${escapeXml(img.title)}</image:title>`;
        if (img.caption) xml += `<image:caption>${escapeXml(img.caption)}</image:caption>`;
        xml += `</image:image>`;
      }
    }

    xml += `</url>`;
    return xml;
  },
} as const;

/**
 * Escape XML special characters
 */
function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export { escapeXml };
