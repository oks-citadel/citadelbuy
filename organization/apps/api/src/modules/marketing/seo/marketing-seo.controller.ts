import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  Res,
  Header,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';
import { Throttle } from '@nestjs/throttler';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
  ApiProduces,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { RolesGuard } from '@/common/guards/roles.guard';
import { Roles } from '@/common/decorators/roles.decorator';
import { UserRole } from '@prisma/client';
import { MarketingSeoService } from './marketing-seo.service';
import {
  GenerateSitemapDto,
  GenerateRobotsDto,
  ReindexRequestDto,
  SeoAuditQueryDto,
  CoreWebVitalsQueryDto,
  GenerateSchemaDto,
} from './dto/seo.dto';

@ApiTags('Marketing - SEO')
@Controller('marketing/seo')
export class MarketingSeoController {
  constructor(private readonly seoService: MarketingSeoService) {}

  @Get('sitemap.xml')
  @ApiOperation({ summary: 'Generate dynamic sitemap.xml' })
  @ApiProduces('application/xml')
  @ApiResponse({ status: 200, description: 'Sitemap XML generated' })
  @ApiQuery({ name: 'organizationId', required: false })
  @Header('Content-Type', 'application/xml')
  @Throttle({ default: { limit: 60, ttl: 60000 } })
  async getSitemap(
    @Query('organizationId') organizationId?: string,
    @Res() res?: Response,
  ): Promise<void> {
    const sitemap = await this.seoService.generateSitemap({
      organizationId,
      includeProducts: true,
      includeCategories: true,
      includeContent: true,
    });

    if (res) {
      res.set('Content-Type', 'application/xml');
      res.send(sitemap);
    }
  }

  @Get('robots.txt')
  @ApiOperation({ summary: 'Generate dynamic robots.txt' })
  @ApiProduces('text/plain')
  @ApiResponse({ status: 200, description: 'Robots.txt generated' })
  @ApiQuery({ name: 'organizationId', required: false })
  @Header('Content-Type', 'text/plain')
  @Throttle({ default: { limit: 60, ttl: 60000 } })
  async getRobotsTxt(
    @Query('organizationId') organizationId?: string,
    @Res() res?: Response,
  ): Promise<void> {
    const robotsTxt = await this.seoService.generateRobotsTxt({
      organizationId,
      sitemaps: [`https://example.com/marketing/seo/sitemap.xml`],
    });

    if (res) {
      res.set('Content-Type', 'text/plain');
      res.send(robotsTxt);
    }
  }

  @Get('manifest.json')
  @ApiOperation({ summary: 'Generate web app manifest' })
  @ApiProduces('application/json')
  @ApiResponse({ status: 200, description: 'Web App Manifest generated' })
  @ApiQuery({ name: 'organizationId', required: true })
  @Header('Content-Type', 'application/manifest+json')
  @Throttle({ default: { limit: 60, ttl: 60000 } })
  async getManifest(@Query('organizationId') organizationId: string) {
    return this.seoService.generateManifest(organizationId);
  }

  @Post('reindex')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.ORGANIZATION_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Queue sitemap refresh and reindex request' })
  @ApiResponse({ status: 201, description: 'Reindex job queued' })
  @HttpCode(HttpStatus.CREATED)
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  async queueReindex(@Body() dto: ReindexRequestDto) {
    return this.seoService.queueReindex({
      organizationId: dto.organizationId,
      urls: dto.urls,
      fullReindex: dto.fullReindex,
      priority: dto.priority,
    });
  }

  @Get('audit')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.ORGANIZATION_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get full SEO crawl and audit results' })
  @ApiResponse({ status: 200, description: 'Audit results retrieved' })
  @Throttle({ default: { limit: 30, ttl: 60000 } })
  async getAuditResults(@Query() query: SeoAuditQueryDto) {
    return this.seoService.getAuditResults({
      organizationId: query.organizationId,
      page: query.page,
      limit: query.limit,
      severity: query.severity,
    });
  }

  @Get('vitals')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.ORGANIZATION_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get Core Web Vitals tracking data' })
  @ApiResponse({ status: 200, description: 'Core Web Vitals retrieved' })
  @Throttle({ default: { limit: 30, ttl: 60000 } })
  async getCoreWebVitals(@Query() query: CoreWebVitalsQueryDto) {
    return this.seoService.getCoreWebVitals({
      organizationId: query.organizationId,
      startDate: query.startDate,
      endDate: query.endDate,
      url: query.url,
      device: query.device,
    });
  }

  @Post('schema/generate')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.ORGANIZATION_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Generate JSON-LD structured data schemas' })
  @ApiResponse({ status: 201, description: 'JSON-LD schemas generated' })
  @HttpCode(HttpStatus.CREATED)
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  async generateSchema(@Body() dto: GenerateSchemaDto) {
    return this.seoService.generateJsonLd({
      organizationId: dto.organizationId,
      schemas: dto.schemas,
      format: dto.format,
    });
  }
}
