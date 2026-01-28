import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  UseGuards,
  Res,
} from '@nestjs/common';
import { Response } from 'express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
  ApiParam,
} from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { RolesGuard } from '@/common/guards/roles.guard';
import { Roles } from '@/common/decorators/roles.decorator';
import { RedirectsService } from './redirects.service';
import {
  CreateRedirectDto,
  UpdateRedirectDto,
  RedirectDto,
  RedirectQueryDto,
  RedirectBulkImportDto,
  RedirectChainDto,
  RedirectAnalyticsDto,
  RedirectValidationResultDto,
  RedirectTestDto,
  RedirectExportDto,
} from '../dto/redirects.dto';

@ApiTags('SEO - Redirects')
@Controller('seo/redirects')
export class RedirectsController {
  constructor(private readonly redirectsService: RedirectsService) {}

  @Get()
  @ApiOperation({ summary: 'Get all redirects with filtering and pagination' })
  @ApiResponse({ status: 200, description: 'List of redirects', type: [RedirectDto] })
  async getRedirects(@Query() query: RedirectQueryDto) {
    return this.redirectsService.getRedirects(query);
  }

  @Get('chains')
  @ApiOperation({ summary: 'Detect redirect chains' })
  @ApiResponse({ status: 200, description: 'List of redirect chains', type: [RedirectChainDto] })
  async detectChains() {
    return this.redirectsService.detectRedirectChains();
  }

  @Get('analytics')
  @ApiOperation({ summary: 'Get redirect analytics' })
  @ApiResponse({ status: 200, description: 'Redirect analytics', type: [RedirectAnalyticsDto] })
  async getAnalytics() {
    return this.redirectsService.getAnalytics();
  }

  @Get('analytics/:id')
  @ApiOperation({ summary: 'Get analytics for a specific redirect' })
  @ApiParam({ name: 'id', description: 'Redirect ID' })
  @ApiResponse({ status: 200, description: 'Redirect analytics', type: RedirectAnalyticsDto })
  async getAnalyticsById(@Param('id') id: string) {
    return this.redirectsService.getAnalytics(id);
  }

  @Get('export')
  @ApiOperation({ summary: 'Export redirects' })
  @ApiQuery({ name: 'format', enum: ['json', 'csv', 'htaccess', 'nginx'], required: true })
  @ApiResponse({ status: 200, description: 'Exported redirects' })
  async exportRedirects(
    @Query('format') format: 'json' | 'csv' | 'htaccess' | 'nginx',
    @Res() res: Response,
  ) {
    const exported = await this.redirectsService.exportRedirects(format);

    let contentType = 'text/plain';
    let filename = `redirects.${format}`;

    switch (format) {
      case 'json':
        contentType = 'application/json';
        break;
      case 'csv':
        contentType = 'text/csv';
        break;
      case 'htaccess':
        filename = '.htaccess';
        break;
      case 'nginx':
        filename = 'redirects.conf';
        break;
    }

    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(exported);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single redirect by ID' })
  @ApiParam({ name: 'id', description: 'Redirect ID' })
  @ApiResponse({ status: 200, description: 'Redirect details', type: RedirectDto })
  @ApiResponse({ status: 404, description: 'Redirect not found' })
  async getRedirect(@Param('id') id: string) {
    return this.redirectsService.getRedirect(id);
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.MARKETING)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new redirect' })
  @ApiResponse({ status: 201, description: 'Redirect created', type: RedirectDto })
  @ApiResponse({ status: 409, description: 'Redirect already exists or would create loop' })
  async createRedirect(@Body() dto: CreateRedirectDto) {
    return this.redirectsService.createRedirect(dto);
  }

  @Post('bulk-import')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.MARKETING)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Bulk import redirects' })
  @ApiResponse({ status: 200, description: 'Import results' })
  async bulkImport(@Body() dto: RedirectBulkImportDto) {
    return this.redirectsService.bulkImport(dto);
  }

  @Post('test')
  @ApiOperation({ summary: 'Test a URL for redirects' })
  @ApiResponse({ status: 200, description: 'Test results' })
  async testRedirect(@Body() dto: RedirectTestDto) {
    return this.redirectsService.testRedirect(dto.url);
  }

  @Post('validate')
  @ApiOperation({ summary: 'Validate a redirect configuration' })
  @ApiResponse({ status: 200, description: 'Validation results', type: RedirectValidationResultDto })
  async validateRedirect(@Body() dto: CreateRedirectDto) {
    return this.redirectsService.validateRedirect(dto.source, dto.destination);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.MARKETING)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a redirect' })
  @ApiParam({ name: 'id', description: 'Redirect ID' })
  @ApiResponse({ status: 200, description: 'Redirect updated', type: RedirectDto })
  @ApiResponse({ status: 404, description: 'Redirect not found' })
  async updateRedirect(@Param('id') id: string, @Body() dto: UpdateRedirectDto) {
    return this.redirectsService.updateRedirect(id, dto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.MARKETING)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a redirect' })
  @ApiParam({ name: 'id', description: 'Redirect ID' })
  @ApiResponse({ status: 204, description: 'Redirect deleted' })
  @ApiResponse({ status: 404, description: 'Redirect not found' })
  async deleteRedirect(@Param('id') id: string) {
    return this.redirectsService.deleteRedirect(id);
  }

  @Get('lookup/:url')
  @ApiOperation({ summary: 'Find redirect for a URL (used by middleware)' })
  @ApiParam({ name: 'url', description: 'URL to lookup (URL-encoded)' })
  @ApiResponse({ status: 200, description: 'Redirect if found', type: RedirectDto })
  async lookupRedirect(@Param('url') url: string) {
    const decoded = decodeURIComponent(url);
    return this.redirectsService.findRedirectForUrl(decoded);
  }
}
