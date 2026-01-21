export interface ISeoService {
  generateSitemap(options: GenerateSitemapOptions): Promise<string>;
  generateRobotsTxt(options: GenerateRobotsOptions): Promise<string>;
  generateManifest(organizationId: string): Promise<WebAppManifest>;
  queueReindex(request: ReindexRequest): Promise<ReindexJob>;
  getAuditResults(query: SeoAuditQuery): Promise<SeoAuditResult>;
  getCoreWebVitals(query: CoreWebVitalsQuery): Promise<CoreWebVitalsResult>;
  generateJsonLd(request: JsonLdRequest): Promise<JsonLdSchema[]>;
}

export interface GenerateSitemapOptions {
  organizationId?: string;
  includeProducts?: boolean;
  includeCategories?: boolean;
  includeContent?: boolean;
  includeBlog?: boolean;
  baseUrl?: string;
}

export interface GenerateRobotsOptions {
  organizationId?: string;
  rules?: RobotsRule[];
  sitemaps?: string[];
}

export interface RobotsRule {
  userAgent: string;
  allow?: string[];
  disallow?: string[];
  crawlDelay?: number;
}

export interface WebAppManifest {
  name: string;
  short_name?: string;
  description?: string;
  start_url: string;
  display: 'standalone' | 'fullscreen' | 'minimal-ui' | 'browser';
  theme_color: string;
  background_color: string;
  icons: ManifestIcon[];
  scope?: string;
  orientation?: string;
  categories?: string[];
}

export interface ManifestIcon {
  src: string;
  sizes: string;
  type: string;
  purpose?: string;
}

export interface ReindexRequest {
  organizationId?: string;
  urls?: string[];
  fullReindex?: boolean;
  priority?: number;
}

export interface ReindexJob {
  id: string;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  urlsQueued: number;
  createdAt: Date;
  estimatedCompletion?: Date;
}

export interface SeoAuditQuery {
  organizationId?: string;
  page?: number;
  limit?: number;
  severity?: 'critical' | 'warning' | 'info';
}

export interface SeoAuditResult {
  totalPages: number;
  crawledPages: number;
  issues: SeoIssue[];
  score: number;
  lastCrawl: Date;
  recommendations: string[];
}

export interface SeoIssue {
  id: string;
  url: string;
  type: string;
  severity: 'critical' | 'warning' | 'info';
  message: string;
  recommendation: string;
  detectedAt: Date;
}

export interface CoreWebVitalsQuery {
  organizationId?: string;
  startDate?: string;
  endDate?: string;
  url?: string;
  device?: 'mobile' | 'desktop';
}

export interface CoreWebVitalsResult {
  lcp: WebVitalMetric; // Largest Contentful Paint
  fid: WebVitalMetric; // First Input Delay
  cls: WebVitalMetric; // Cumulative Layout Shift
  fcp: WebVitalMetric; // First Contentful Paint
  ttfb: WebVitalMetric; // Time to First Byte
  inp: WebVitalMetric; // Interaction to Next Paint
  history: WebVitalsHistory[];
}

export interface WebVitalMetric {
  value: number;
  rating: 'good' | 'needs-improvement' | 'poor';
  percentile75: number;
}

export interface WebVitalsHistory {
  date: string;
  lcp: number;
  fid: number;
  cls: number;
}

export interface JsonLdRequest {
  organizationId?: string;
  schemas: JsonLdSchemaConfig[];
  format?: 'json-ld' | 'microdata' | 'rdfa';
}

export interface JsonLdSchemaConfig {
  type: string;
  entityId: string;
  additionalData?: Record<string, any>;
}

export interface JsonLdSchema {
  '@context': string;
  '@type': string;
  [key: string]: any;
}
