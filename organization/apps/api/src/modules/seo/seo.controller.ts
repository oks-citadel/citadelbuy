import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { SeoService } from './seo.service';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { RolesGuard } from '@/common/guards/roles.guard';
import { Roles } from '@/common/decorators/roles.decorator';
import { UserRole } from '@prisma/client';

@ApiTags('SEO')
@Controller('seo')
export class SeoController {
  constructor(private readonly seoService: SeoService) {}

  @Post('meta/:entityType/:entityId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  async upsertMeta(@Param('entityType') entityType: string, @Param('entityId') entityId: string, @Body() data: any) {
    return this.seoService.upsertSeoMeta(entityType, entityId, data);
  }

  @Get('meta/:entityType/:entityId')
  async getMeta(@Param('entityType') entityType: string, @Param('entityId') entityId: string) {
    return this.seoService.getSeoMeta(entityType, entityId);
  }

  @Post('sitemap/generate')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  async generateSitemap() {
    return this.seoService.generateSitemap();
  }

  @Get('sitemap')
  async getSitemap() {
    return this.seoService.getSitemap();
  }
}
