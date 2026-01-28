export interface SitemapUrl {
  loc: string;
  lastmod?: string;
  changefreq?: 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never';
  priority?: number;
  images?: SitemapImage[];
  videos?: SitemapVideo[];
  alternates?: SitemapAlternate[];
}

export interface SitemapImage {
  loc: string;
  caption?: string;
  title?: string;
  geoLocation?: string;
  license?: string;
}

export interface SitemapVideo {
  thumbnailLoc: string;
  title: string;
  description: string;
  contentLoc?: string;
  playerLoc?: string;
  duration?: number;
  expirationDate?: string;
  rating?: number;
  viewCount?: number;
  publicationDate?: string;
  familyFriendly?: boolean;
  tags?: string[];
}

export interface SitemapAlternate {
  hreflang: string;
  href: string;
}

export interface SitemapIndex {
  sitemaps: {
    loc: string;
    lastmod?: string;
  }[];
}

export interface RobotsDirective {
  userAgent: string;
  allow?: string[];
  disallow?: string[];
  crawlDelay?: number;
}

export interface RobotsConfig {
  directives: RobotsDirective[];
  sitemaps: string[];
  customContent?: string;
}

export interface SchemaOrg {
  '@context': string;
  '@type': string | string[];
  [key: string]: any;
}

export interface SEOAuditResult {
  id: string;
  url: string;
  timestamp: Date;
  score: number;
  issues: SEOIssue[];
  metrics: SEOMetrics;
}

export interface SEOIssue {
  id: string;
  category: string;
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
  title: string;
  description: string;
  recommendation?: string;
  affectedElement?: string;
  currentValue?: string;
  expectedValue?: string;
}

export interface SEOMetrics {
  titleLength?: number;
  metaDescriptionLength?: number;
  h1Count?: number;
  imageCount?: number;
  imagesWithAlt?: number;
  internalLinks?: number;
  externalLinks?: number;
  wordCount?: number;
  loadTime?: number;
  pageSize?: number;
}

export interface CoreWebVitals {
  lcp: number; // Largest Contentful Paint (ms)
  inp: number; // Interaction to Next Paint (ms)
  cls: number; // Cumulative Layout Shift
  fcp?: number; // First Contentful Paint (ms)
  ttfb?: number; // Time to First Byte (ms)
}

export interface PageSpeedResult {
  url: string;
  deviceType: 'mobile' | 'desktop';
  performanceScore: number;
  coreWebVitals: CoreWebVitals;
  opportunities: PageSpeedOpportunity[];
  diagnostics: PageSpeedDiagnostic[];
  analyzedAt: Date;
}

export interface PageSpeedOpportunity {
  id: string;
  title: string;
  description: string;
  score: number;
  savings?: {
    bytes?: number;
    ms?: number;
  };
}

export interface PageSpeedDiagnostic {
  id: string;
  title: string;
  description: string;
  score?: number;
  displayValue?: string;
}

export interface CanonicalMapping {
  sourceUrl: string;
  canonicalUrl: string;
  isSelfReferencing: boolean;
  lastVerified?: Date;
}

export interface HreflangMapping {
  baseUrl: string;
  alternates: {
    hreflang: string;
    href: string;
  }[];
  hasXDefault: boolean;
}

export interface IndexCoverage {
  url: string;
  status: 'indexed' | 'not_indexed' | 'pending' | 'blocked' | 'error';
  lastCrawled?: Date;
  issue?: string;
  robotsMeta?: string;
}

export interface KeywordData {
  keyword: string;
  searchVolume?: number;
  difficulty?: 'easy' | 'medium' | 'hard' | 'very_hard';
  cpc?: number;
  competition?: number;
  trend?: 'rising' | 'stable' | 'declining';
  relatedKeywords?: string[];
}

export interface ContentAnalysis {
  url: string;
  title: string;
  seoScore: number;
  readabilityScore: number;
  keywordDensity: number;
  wordCount: number;
  issues: ContentIssue[];
  suggestions: ContentSuggestion[];
}

export interface ContentIssue {
  type: string;
  severity: 'critical' | 'warning' | 'info';
  message: string;
  location?: string;
}

export interface ContentSuggestion {
  category: string;
  priority: 'high' | 'medium' | 'low';
  message: string;
  currentValue?: string;
  recommendedValue?: string;
}

export interface InternalLinkAnalysis {
  sourceUrl: string;
  targetUrl: string;
  anchorText: string;
  isDofollow: boolean;
  context?: string;
}

export interface ContentFreshness {
  url: string;
  title: string;
  lastModified: Date;
  daysSinceUpdate: number;
  status: 'fresh' | 'needs_update' | 'stale' | 'outdated';
  trafficTrend?: 'increasing' | 'stable' | 'decreasing';
}

export interface SEOJobConfig {
  sitemapRegenerationInterval: string; // cron expression
  auditSchedule: string; // cron expression
  vitalsCollectionInterval: string; // cron expression
  maxPagesToAudit: number;
  enableExternalLinkChecking: boolean;
}
