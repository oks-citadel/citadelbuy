import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';
import {
  IContentService,
  Content,
  CreateContentInput,
  UpdateContentInput,
  ContentQuery,
  PaginatedContent,
  ScheduleContentInput,
  ScheduledContent,
  ContentVersion,
  CreateClusterInput,
  TopicCluster,
  ClusterAnalysis,
} from './interfaces/content.interface';

@Injectable()
export class ContentService implements IContentService {
  private readonly logger = new Logger(ContentService.name);

  // In-memory storage for demo (would use database in production)
  private contents: Map<string, Content> = new Map();
  private versions: Map<string, ContentVersion[]> = new Map();
  private schedules: Map<string, ScheduledContent> = new Map();
  private clusters: Map<string, TopicCluster> = new Map();

  constructor(private readonly prisma: PrismaService) {}

  async createContent(data: CreateContentInput): Promise<Content> {
    this.logger.log(`Creating content: ${data.title}`);

    const id = `content-${Date.now()}`;
    const now = new Date();

    const content: Content = {
      id,
      title: data.title,
      slug: data.slug,
      body: data.body,
      excerpt: data.excerpt,
      type: data.type,
      status: data.publishNow ? 'PUBLISHED' : 'DRAFT',
      organizationId: data.organizationId,
      authorId: data.authorId,
      featuredImage: data.featuredImage,
      tags: data.tags || [],
      categories: data.categories || [],
      seo: data.seo || {},
      locale: data.locale || 'en',
      version: 1,
      publishedAt: data.publishNow ? now : undefined,
      createdAt: now,
      updatedAt: now,
    };

    this.contents.set(id, content);
    this.versions.set(id, [
      {
        id: `version-${Date.now()}`,
        contentId: id,
        version: 1,
        content: { ...content },
        createdBy: data.authorId || 'system',
        createdAt: now,
      },
    ]);

    return content;
  }

  async updateContent(id: string, data: UpdateContentInput): Promise<Content> {
    this.logger.log(`Updating content: ${id}`);

    const content = this.contents.get(id);
    if (!content) {
      throw new NotFoundException(`Content ${id} not found`);
    }

    const updatedContent: Content = {
      ...content,
      ...data,
      version: content.version + 1,
      updatedAt: new Date(),
    };

    this.contents.set(id, updatedContent);

    // Save version
    const contentVersions = this.versions.get(id) || [];
    contentVersions.push({
      id: `version-${Date.now()}`,
      contentId: id,
      version: updatedContent.version,
      content: { ...updatedContent },
      createdBy: 'system',
      createdAt: new Date(),
    });
    this.versions.set(id, contentVersions);

    return updatedContent;
  }

  async deleteContent(id: string): Promise<void> {
    this.logger.log(`Deleting content: ${id}`);

    if (!this.contents.has(id)) {
      throw new NotFoundException(`Content ${id} not found`);
    }

    this.contents.delete(id);
    this.versions.delete(id);
  }

  async getContent(id: string): Promise<Content | null> {
    return this.contents.get(id) || null;
  }

  async listContent(query: ContentQuery): Promise<PaginatedContent> {
    this.logger.log(`Listing content with query: ${JSON.stringify(query)}`);

    let items = Array.from(this.contents.values());

    // Apply filters
    if (query.organizationId) {
      items = items.filter((c) => c.organizationId === query.organizationId);
    }
    if (query.type) {
      items = items.filter((c) => c.type === query.type);
    }
    if (query.status) {
      items = items.filter((c) => c.status === query.status);
    }
    if (query.locale) {
      items = items.filter((c) => c.locale === query.locale);
    }
    if (query.tags?.length) {
      items = items.filter((c) => query.tags!.some((tag) => c.tags.includes(tag)));
    }
    if (query.search) {
      const searchLower = query.search.toLowerCase();
      items = items.filter(
        (c) =>
          c.title.toLowerCase().includes(searchLower) ||
          c.body.toLowerCase().includes(searchLower),
      );
    }

    const page = query.page || 1;
    const limit = query.limit || 20;
    const total = items.length;
    const totalPages = Math.ceil(total / limit);

    items = items.slice((page - 1) * limit, page * limit);

    return { items, total, page, limit, totalPages };
  }

  async publishContent(id: string): Promise<Content> {
    this.logger.log(`Publishing content: ${id}`);

    const content = this.contents.get(id);
    if (!content) {
      throw new NotFoundException(`Content ${id} not found`);
    }

    const updatedContent: Content = {
      ...content,
      status: 'PUBLISHED',
      publishedAt: new Date(),
      updatedAt: new Date(),
    };

    this.contents.set(id, updatedContent);
    return updatedContent;
  }

  async unpublishContent(id: string): Promise<Content> {
    this.logger.log(`Unpublishing content: ${id}`);

    const content = this.contents.get(id);
    if (!content) {
      throw new NotFoundException(`Content ${id} not found`);
    }

    const updatedContent: Content = {
      ...content,
      status: 'DRAFT',
      updatedAt: new Date(),
    };

    this.contents.set(id, updatedContent);
    return updatedContent;
  }

  async scheduleContent(data: ScheduleContentInput): Promise<ScheduledContent> {
    this.logger.log(`Scheduling content: ${data.contentId}`);

    const content = this.contents.get(data.contentId);
    if (!content) {
      throw new NotFoundException(`Content ${data.contentId} not found`);
    }

    const schedule: ScheduledContent = {
      id: `schedule-${Date.now()}`,
      contentId: data.contentId,
      publishAt: data.publishAt,
      unpublishAt: data.unpublishAt,
      status: 'pending',
    };

    this.schedules.set(schedule.id, schedule);

    // Update content status
    const updatedContent: Content = {
      ...content,
      status: 'SCHEDULED',
      updatedAt: new Date(),
    };
    this.contents.set(data.contentId, updatedContent);

    return schedule;
  }

  async getVersions(contentId: string): Promise<ContentVersion[]> {
    return this.versions.get(contentId) || [];
  }

  async restoreVersion(contentId: string, version: number): Promise<Content> {
    this.logger.log(`Restoring content ${contentId} to version ${version}`);

    const contentVersions = this.versions.get(contentId);
    if (!contentVersions) {
      throw new NotFoundException(`No versions found for content ${contentId}`);
    }

    const targetVersion = contentVersions.find((v) => v.version === version);
    if (!targetVersion) {
      throw new NotFoundException(`Version ${version} not found`);
    }

    const restoredContent: Content = {
      ...targetVersion.content,
      version: (this.contents.get(contentId)?.version || 0) + 1,
      updatedAt: new Date(),
    };

    this.contents.set(contentId, restoredContent);
    return restoredContent;
  }

  async createCluster(data: CreateClusterInput): Promise<TopicCluster> {
    this.logger.log(`Creating topic cluster: ${data.name}`);

    const id = `cluster-${Date.now()}`;
    const now = new Date();

    const cluster: TopicCluster = {
      id,
      name: data.name,
      pillarContentId: data.pillarContentId,
      description: data.description,
      keywords: data.keywords || [],
      organizationId: data.organizationId,
      contentIds: data.pillarContentId ? [data.pillarContentId] : [],
      createdAt: now,
      updatedAt: now,
    };

    this.clusters.set(id, cluster);
    return cluster;
  }

  async addToCluster(clusterId: string, contentIds: string[]): Promise<TopicCluster> {
    this.logger.log(`Adding content to cluster: ${clusterId}`);

    const cluster = this.clusters.get(clusterId);
    if (!cluster) {
      throw new NotFoundException(`Cluster ${clusterId} not found`);
    }

    const updatedCluster: TopicCluster = {
      ...cluster,
      contentIds: [...new Set([...cluster.contentIds, ...contentIds])],
      updatedAt: new Date(),
    };

    this.clusters.set(clusterId, updatedCluster);
    return updatedCluster;
  }

  async getClusterContent(clusterId: string): Promise<Content[]> {
    const cluster = this.clusters.get(clusterId);
    if (!cluster) {
      throw new NotFoundException(`Cluster ${clusterId} not found`);
    }

    return cluster.contentIds
      .map((id) => this.contents.get(id))
      .filter((c): c is Content => c !== undefined);
  }

  async analyzeClusters(organizationId: string): Promise<ClusterAnalysis> {
    this.logger.log(`Analyzing clusters for organization: ${organizationId}`);

    const orgClusters = Array.from(this.clusters.values()).filter(
      (c) => c.organizationId === organizationId,
    );

    return {
      clusters: orgClusters.map((cluster) => ({
        id: cluster.id,
        name: cluster.name,
        contentCount: cluster.contentIds.length,
        avgEngagement: Math.random() * 100,
        topKeywords: cluster.keywords.slice(0, 5),
      })),
      recommendations: [
        {
          type: 'new_content',
          description: 'Create content covering "getting started" topics',
          impact: 'high',
        },
        {
          type: 'internal_link',
          description: 'Add internal links between cluster content',
          impact: 'medium',
        },
      ],
      contentGaps: ['Product tutorials', 'Case studies', 'Industry news'],
    };
  }
}
