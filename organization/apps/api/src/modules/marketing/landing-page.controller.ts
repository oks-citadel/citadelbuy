import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { LandingPageService } from './landing-page.service';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { CreateLandingPageDto, UpdateLandingPageDto, LandingPageStatus } from './dto/landing-page.dto';

@Controller('marketing/landing-pages')
export class LandingPageController {
  constructor(private readonly landingPageService: LandingPageService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  async createLandingPage(@Body() dto: CreateLandingPageDto) {
    return this.landingPageService.createLandingPage(dto);
  }

  @Get()
  async getLandingPages(
    @Query('organizationId') organizationId?: string,
    @Query('campaignId') campaignId?: string,
    @Query('status') status?: LandingPageStatus,
    @Query('region') region?: string,
    @Query('language') language?: string,
  ) {
    return this.landingPageService.getLandingPages({
      organizationId,
      campaignId,
      status,
      region,
      language,
    });
  }

  @Get('slug/:slug')
  async getLandingPageBySlug(@Param('slug') slug: string) {
    return this.landingPageService.getLandingPageBySlug(slug);
  }

  @Get(':id')
  async getLandingPageById(@Param('id') id: string) {
    return this.landingPageService.getLandingPageById(id);
  }

  @Put(':id')
  async updateLandingPage(@Param('id') id: string, @Body() dto: UpdateLandingPageDto) {
    return this.landingPageService.updateLandingPage(id, dto);
  }

  @Delete(':id')
  async deleteLandingPage(@Param('id') id: string) {
    return this.landingPageService.deleteLandingPage(id);
  }

  @Post(':id/publish')
  @UseGuards(JwtAuthGuard)
  async publishLandingPage(@Param('id') id: string) {
    return this.landingPageService.publishLandingPage(id);
  }

  @Post(':id/archive')
  @UseGuards(JwtAuthGuard)
  async archiveLandingPage(@Param('id') id: string) {
    return this.landingPageService.archiveLandingPage(id);
  }

  @Post(':id/track/view')
  @UseGuards(JwtAuthGuard)
  async trackPageView(@Param('id') id: string, @Body() data: { visitorId?: string }) {
    return this.landingPageService.trackPageView(id, data.visitorId);
  }

  @Post(':id/track/conversion')
  @UseGuards(JwtAuthGuard)
  async trackConversion(
    @Param('id') id: string,
    @Body() data: { ctaType: 'primary' | 'secondary' },
  ) {
    return this.landingPageService.trackConversion(id, data.ctaType);
  }

  @Get(':id/analytics')
  async getPageAnalytics(@Param('id') id: string) {
    return this.landingPageService.getPageAnalytics(id);
  }

  @Post(':id/duplicate')
  @UseGuards(JwtAuthGuard)
  async duplicateLandingPage(@Param('id') id: string, @Body() data: { newSlug: string }) {
    return this.landingPageService.duplicateLandingPage(id, data.newSlug);
  }
}
