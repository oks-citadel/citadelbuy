import { Controller, Get, Param, Res, UseGuards, Header } from '@nestjs/common';
import { Response } from 'express';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiBearerAuth } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { SitemapService } from './sitemap.service';

@ApiTags('SEO - Sitemap')
@Controller('seo')
export class SitemapController {
  constructor(private readonly sitemapService: SitemapService) {}

  @Get('sitemap.xml')
  @Throttle({ default: { limit: 60, ttl: 60000 } }) // 60 requests per minute
  @Header('Content-Type', 'application/xml')
  @Header('Cache-Control', 'public, max-age=3600')
  @ApiOperation({
    summary: 'Get main sitemap index',
    description: 'Returns the main sitemap index file that references all other sitemaps.',
  })
  @ApiResponse({
    status: 200,
    description: 'Sitemap index XML',
    content: {
      'application/xml': {
        schema: { type: 'string' },
      },
    },
  })
  async getSitemapIndex(@Res() res: Response): Promise<void> {
    const xml = await this.sitemapService.generateSitemapIndex();
    res.send(xml);
  }

  @Get('sitemap/products.xml')
  @Throttle({ default: { limit: 60, ttl: 60000 } })
  @Header('Content-Type', 'application/xml')
  @Header('Cache-Control', 'public, max-age=3600')
  @ApiOperation({
    summary: 'Get product sitemap',
    description: 'Returns sitemap containing all active products with images.',
  })
  @ApiResponse({
    status: 200,
    description: 'Product sitemap XML',
    content: {
      'application/xml': {
        schema: { type: 'string' },
      },
    },
  })
  async getProductSitemap(@Res() res: Response): Promise<void> {
    const xml = await this.sitemapService.generateProductSitemap();
    res.send(xml);
  }

  @Get('sitemap/categories.xml')
  @Throttle({ default: { limit: 60, ttl: 60000 } })
  @Header('Content-Type', 'application/xml')
  @Header('Cache-Control', 'public, max-age=3600')
  @ApiOperation({
    summary: 'Get category sitemap',
    description: 'Returns sitemap containing all active categories.',
  })
  @ApiResponse({
    status: 200,
    description: 'Category sitemap XML',
    content: {
      'application/xml': {
        schema: { type: 'string' },
      },
    },
  })
  async getCategorySitemap(@Res() res: Response): Promise<void> {
    const xml = await this.sitemapService.generateCategorySitemap();
    res.send(xml);
  }

  @Get('sitemap/pages.xml')
  @Throttle({ default: { limit: 60, ttl: 60000 } })
  @Header('Content-Type', 'application/xml')
  @Header('Cache-Control', 'public, max-age=3600')
  @ApiOperation({
    summary: 'Get static pages sitemap',
    description: 'Returns sitemap containing all static pages (about, contact, etc.).',
  })
  @ApiResponse({
    status: 200,
    description: 'Static pages sitemap XML',
    content: {
      'application/xml': {
        schema: { type: 'string' },
      },
    },
  })
  async getPagesSitemap(@Res() res: Response): Promise<void> {
    const xml = await this.sitemapService.generatePagesSitemap();
    res.send(xml);
  }

  @Get('sitemap/blog.xml')
  @Throttle({ default: { limit: 60, ttl: 60000 } })
  @Header('Content-Type', 'application/xml')
  @Header('Cache-Control', 'public, max-age=3600')
  @ApiOperation({
    summary: 'Get blog sitemap',
    description: 'Returns sitemap containing all published blog posts and articles.',
  })
  @ApiResponse({
    status: 200,
    description: 'Blog sitemap XML',
    content: {
      'application/xml': {
        schema: { type: 'string' },
      },
    },
  })
  async getBlogSitemap(@Res() res: Response): Promise<void> {
    const xml = await this.sitemapService.generateBlogSitemap();
    res.send(xml);
  }

  @Get('sitemap/:tenant/:locale.xml')
  @Throttle({ default: { limit: 60, ttl: 60000 } })
  @Header('Content-Type', 'application/xml')
  @Header('Cache-Control', 'public, max-age=3600')
  @ApiOperation({
    summary: 'Get tenant-specific localized sitemap',
    description: 'Returns sitemap for a specific tenant and locale with hreflang tags.',
  })
  @ApiParam({ name: 'tenant', description: 'Tenant ID', example: 'default' })
  @ApiParam({ name: 'locale', description: 'Locale code', example: 'en' })
  @ApiResponse({
    status: 200,
    description: 'Localized sitemap XML',
    content: {
      'application/xml': {
        schema: { type: 'string' },
      },
    },
  })
  async getTenantLocaleSitemap(
    @Param('tenant') tenant: string,
    @Param('locale') locale: string,
    @Res() res: Response,
  ): Promise<void> {
    const xml = await this.sitemapService.generateTenantLocaleSitemap(tenant, locale);
    res.send(xml);
  }

  @Get('sitemap/stats')
  @ApiOperation({
    summary: 'Get sitemap statistics',
    description: 'Returns statistics about indexed URLs in sitemaps.',
  })
  @ApiResponse({
    status: 200,
    description: 'Sitemap statistics',
    schema: {
      type: 'object',
      properties: {
        productCount: { type: 'number' },
        categoryCount: { type: 'number' },
        totalUrls: { type: 'number' },
        lastGenerated: { type: 'string', format: 'date-time' },
      },
    },
  })
  async getSitemapStats() {
    return this.sitemapService.getSitemapStats();
  }
}
