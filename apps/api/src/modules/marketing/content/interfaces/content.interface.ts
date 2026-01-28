export interface IContentService {
  createContent(data: CreateContentInput): Promise<Content>;
  updateContent(id: string, data: UpdateContentInput): Promise<Content>;
  deleteContent(id: string): Promise<void>;
  getContent(id: string): Promise<Content | null>;
  listContent(query: ContentQuery): Promise<PaginatedContent>;
  publishContent(id: string): Promise<Content>;
  unpublishContent(id: string): Promise<Content>;
  scheduleContent(data: ScheduleContentInput): Promise<ScheduledContent>;
  getVersions(contentId: string): Promise<ContentVersion[]>;
  restoreVersion(contentId: string, version: number): Promise<Content>;
  createCluster(data: CreateClusterInput): Promise<TopicCluster>;
  addToCluster(clusterId: string, contentIds: string[]): Promise<TopicCluster>;
  getClusterContent(clusterId: string): Promise<Content[]>;
  analyzeClusters(organizationId: string): Promise<ClusterAnalysis>;
}

export interface Content {
  id: string;
  title: string;
  slug: string;
  body: string;
  excerpt?: string;
  type: ContentType;
  status: ContentStatus;
  organizationId?: string;
  authorId?: string;
  featuredImage?: string;
  tags: string[];
  categories: string[];
  seo: ContentSeo;
  locale: string;
  version: number;
  publishedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export type ContentType = 'PAGE' | 'BLOG_POST' | 'LANDING_PAGE' | 'FAQ' | 'HELP_ARTICLE' | 'ANNOUNCEMENT';
export type ContentStatus = 'DRAFT' | 'SCHEDULED' | 'PUBLISHED' | 'ARCHIVED';

export interface ContentSeo {
  metaTitle?: string;
  metaDescription?: string;
  keywords?: string[];
  canonicalUrl?: string;
  ogImage?: string;
}

export interface CreateContentInput {
  title: string;
  slug: string;
  body: string;
  excerpt?: string;
  type: ContentType;
  organizationId?: string;
  authorId?: string;
  featuredImage?: string;
  tags?: string[];
  categories?: string[];
  seo?: ContentSeo;
  publishNow?: boolean;
  locale?: string;
}

export interface UpdateContentInput {
  title?: string;
  slug?: string;
  body?: string;
  excerpt?: string;
  status?: ContentStatus;
  featuredImage?: string;
  tags?: string[];
  categories?: string[];
  seo?: ContentSeo;
}

export interface ContentQuery {
  organizationId?: string;
  type?: ContentType;
  status?: ContentStatus;
  search?: string;
  tags?: string[];
  locale?: string;
  page?: number;
  limit?: number;
}

export interface PaginatedContent {
  items: Content[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ScheduleContentInput {
  contentId: string;
  publishAt: Date;
  unpublishAt?: Date;
  timezone?: string;
}

export interface ScheduledContent {
  id: string;
  contentId: string;
  publishAt: Date;
  unpublishAt?: Date;
  status: 'pending' | 'published' | 'cancelled';
}

export interface ContentVersion {
  id: string;
  contentId: string;
  version: number;
  content: Content;
  changeDescription?: string;
  createdBy: string;
  createdAt: Date;
}

export interface CreateClusterInput {
  name: string;
  pillarContentId?: string;
  description?: string;
  keywords?: string[];
  organizationId?: string;
}

export interface TopicCluster {
  id: string;
  name: string;
  pillarContentId?: string;
  description?: string;
  keywords: string[];
  organizationId?: string;
  contentIds: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface ClusterAnalysis {
  clusters: TopicClusterSummary[];
  recommendations: ClusterRecommendation[];
  contentGaps: string[];
}

export interface TopicClusterSummary {
  id: string;
  name: string;
  contentCount: number;
  avgEngagement: number;
  topKeywords: string[];
}

export interface ClusterRecommendation {
  type: 'merge' | 'split' | 'new_content' | 'internal_link';
  clusters?: string[];
  description: string;
  impact: 'high' | 'medium' | 'low';
}
