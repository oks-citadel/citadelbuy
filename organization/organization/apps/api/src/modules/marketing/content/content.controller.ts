import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { RolesGuard } from '@/common/guards/roles.guard';
import { Roles } from '@/common/decorators/roles.decorator';
import { UserRole } from '@prisma/client';
import { ContentService } from './content.service';
import {
  CreateContentDto,
  UpdateContentDto,
  ScheduleContentDto,
  RestoreVersionDto,
  TopicClusterDto,
  AddToClusterDto,
  ContentQueryDto,
} from './dto/content.dto';

@ApiTags('Marketing - Content')
@Controller('marketing/content')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class ContentController {
  constructor(private readonly contentService: ContentService) {}

  @Post()
  @Roles(UserRole.ADMIN, UserRole.ORGANIZATION_ADMIN)
  @ApiOperation({ summary: 'Create new content' })
  @ApiResponse({ status: 201, description: 'Content created successfully' })
  @HttpCode(HttpStatus.CREATED)
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  async createContent(@Body() dto: CreateContentDto) {
    return this.contentService.createContent({
      title: dto.title,
      slug: dto.slug,
      body: dto.body,
      excerpt: dto.excerpt,
      type: dto.type,
      organizationId: dto.organizationId,
      authorId: dto.authorId,
      featuredImage: dto.featuredImage,
      tags: dto.tags,
      categories: dto.categories,
      seo: dto.seo,
      publishNow: dto.publishNow,
      locale: dto.locale,
    });
  }

  @Get()
  @ApiOperation({ summary: 'List content with filters' })
  @ApiResponse({ status: 200, description: 'Content list retrieved' })
  @Throttle({ default: { limit: 60, ttl: 60000 } })
  async listContent(@Query() query: ContentQueryDto) {
    return this.contentService.listContent({
      organizationId: query.organizationId,
      type: query.type,
      status: query.status,
      search: query.search,
      tags: query.tags,
      locale: query.locale,
      page: query.page,
      limit: query.limit,
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get content by ID' })
  @ApiParam({ name: 'id', description: 'Content ID' })
  @ApiResponse({ status: 200, description: 'Content retrieved' })
  @Throttle({ default: { limit: 60, ttl: 60000 } })
  async getContent(@Param('id') id: string) {
    return this.contentService.getContent(id);
  }

  @Put(':id')
  @Roles(UserRole.ADMIN, UserRole.ORGANIZATION_ADMIN)
  @ApiOperation({ summary: 'Update content' })
  @ApiParam({ name: 'id', description: 'Content ID' })
  @ApiResponse({ status: 200, description: 'Content updated' })
  @Throttle({ default: { limit: 30, ttl: 60000 } })
  async updateContent(@Param('id') id: string, @Body() dto: UpdateContentDto) {
    return this.contentService.updateContent(id, {
      title: dto.title,
      slug: dto.slug,
      body: dto.body,
      excerpt: dto.excerpt,
      status: dto.status,
      featuredImage: dto.featuredImage,
      tags: dto.tags,
      categories: dto.categories,
      seo: dto.seo,
    });
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN, UserRole.ORGANIZATION_ADMIN)
  @ApiOperation({ summary: 'Delete content' })
  @ApiParam({ name: 'id', description: 'Content ID' })
  @ApiResponse({ status: 204, description: 'Content deleted' })
  @HttpCode(HttpStatus.NO_CONTENT)
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  async deleteContent(@Param('id') id: string) {
    await this.contentService.deleteContent(id);
  }

  @Post(':id/publish')
  @Roles(UserRole.ADMIN, UserRole.ORGANIZATION_ADMIN)
  @ApiOperation({ summary: 'Publish content' })
  @ApiParam({ name: 'id', description: 'Content ID' })
  @ApiResponse({ status: 200, description: 'Content published' })
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  async publishContent(@Param('id') id: string) {
    return this.contentService.publishContent(id);
  }

  @Post(':id/unpublish')
  @Roles(UserRole.ADMIN, UserRole.ORGANIZATION_ADMIN)
  @ApiOperation({ summary: 'Unpublish content' })
  @ApiParam({ name: 'id', description: 'Content ID' })
  @ApiResponse({ status: 200, description: 'Content unpublished' })
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  async unpublishContent(@Param('id') id: string) {
    return this.contentService.unpublishContent(id);
  }

  @Post('schedule')
  @Roles(UserRole.ADMIN, UserRole.ORGANIZATION_ADMIN)
  @ApiOperation({ summary: 'Schedule content publication' })
  @ApiResponse({ status: 201, description: 'Content scheduled' })
  @HttpCode(HttpStatus.CREATED)
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  async scheduleContent(@Body() dto: ScheduleContentDto) {
    return this.contentService.scheduleContent({
      contentId: dto.contentId,
      publishAt: new Date(dto.publishAt),
      unpublishAt: dto.unpublishAt ? new Date(dto.unpublishAt) : undefined,
      timezone: dto.timezone,
    });
  }

  @Get(':id/versions')
  @ApiOperation({ summary: 'Get content version history' })
  @ApiParam({ name: 'id', description: 'Content ID' })
  @ApiResponse({ status: 200, description: 'Version history retrieved' })
  @Throttle({ default: { limit: 30, ttl: 60000 } })
  async getVersions(@Param('id') id: string) {
    return this.contentService.getVersions(id);
  }

  @Post('versions/restore')
  @Roles(UserRole.ADMIN, UserRole.ORGANIZATION_ADMIN)
  @ApiOperation({ summary: 'Restore content to a specific version' })
  @ApiResponse({ status: 200, description: 'Content restored' })
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  async restoreVersion(@Body() dto: RestoreVersionDto) {
    return this.contentService.restoreVersion(dto.contentId, dto.version);
  }

  @Post('clusters')
  @Roles(UserRole.ADMIN, UserRole.ORGANIZATION_ADMIN)
  @ApiOperation({ summary: 'Create topic cluster' })
  @ApiResponse({ status: 201, description: 'Cluster created' })
  @HttpCode(HttpStatus.CREATED)
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  async createCluster(@Body() dto: TopicClusterDto) {
    return this.contentService.createCluster({
      name: dto.name,
      pillarContentId: dto.pillarContentId,
      description: dto.description,
      keywords: dto.keywords,
      organizationId: dto.organizationId,
    });
  }

  @Post('clusters/add')
  @Roles(UserRole.ADMIN, UserRole.ORGANIZATION_ADMIN)
  @ApiOperation({ summary: 'Add content to topic cluster' })
  @ApiResponse({ status: 200, description: 'Content added to cluster' })
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  async addToCluster(@Body() dto: AddToClusterDto) {
    return this.contentService.addToCluster(dto.clusterId, dto.contentIds);
  }

  @Get('clusters/:id/content')
  @ApiOperation({ summary: 'Get content in a cluster' })
  @ApiParam({ name: 'id', description: 'Cluster ID' })
  @ApiResponse({ status: 200, description: 'Cluster content retrieved' })
  @Throttle({ default: { limit: 30, ttl: 60000 } })
  async getClusterContent(@Param('id') id: string) {
    return this.contentService.getClusterContent(id);
  }

  @Get('clusters/analyze')
  @ApiOperation({ summary: 'Analyze topic clusters for optimization' })
  @ApiResponse({ status: 200, description: 'Cluster analysis retrieved' })
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  async analyzeClusters(@Query('organizationId') organizationId: string) {
    return this.contentService.analyzeClusters(organizationId);
  }
}
