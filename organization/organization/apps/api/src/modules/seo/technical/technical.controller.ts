import { Controller, Get, Post, Body, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { RolesGuard } from '@/common/guards/roles.guard';
import { Roles } from '@/common/decorators/roles.decorator';
import { UserRole } from '@prisma/client';
import { TechnicalService } from './technical.service';
import {
  CanonicalUrlDto,
  HreflangMappingDto,
  IndexCoverageSummaryDto,
  UpdateCanonicalDto,
  UpdateHreflangDto,
  ReindexRequestDto,
  ReindexResponseDto,
  TechnicalSEOSummaryDto,
  QueryTechnicalDto,
  DuplicateContentDto,
  StructuredDataValidationDto,
  IndexStatus,
} from '../dto/technical.dto';

@ApiTags('SEO - Technical')
@Controller('seo')
export class TechnicalController {
  constructor(private readonly technicalService: TechnicalService) {}

  @Get('technical/summary')
  @ApiOperation({
    summary: 'Get technical SEO summary',
    description: 'Returns a summary of technical SEO metrics and issues.',
  })
  @ApiResponse({ status: 200, description: 'Technical SEO summary', type: TechnicalSEOSummaryDto })
  async getTechnicalSummary(): Promise<TechnicalSEOSummaryDto> {
    return this.technicalService.getTechnicalSummary();
  }

  @Get('canonicals')
  @ApiOperation({
    summary: 'Get canonical URL mappings',
    description: 'Returns all canonical URL mappings and identifies potential issues.',
  })
  @ApiQuery({ name: 'urlPattern', required: false, description: 'Filter by URL pattern (regex)' })
  @ApiQuery({ name: 'hasIssuesOnly', required: false, type: Boolean, description: 'Show only URLs with issues' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({
    status: 200,
    description: 'Canonical URL mappings',
    schema: {
      type: 'object',
      properties: {
        canonicals: { type: 'array', items: { $ref: '#/components/schemas/CanonicalUrlDto' } },
        total: { type: 'number' },
      },
    },
  })
  async getCanonicals(@Query() query: QueryTechnicalDto) {
    return this.technicalService.getCanonicals(query);
  }

  @Post('canonicals')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Update canonical URL mapping',
    description: 'Sets or updates a canonical URL mapping for a specific URL.',
  })
  @ApiResponse({ status: 200, description: 'Canonical mapping updated', type: CanonicalUrlDto })
  async updateCanonical(@Body() dto: UpdateCanonicalDto): Promise<CanonicalUrlDto> {
    return this.technicalService.updateCanonical(dto);
  }

  @Get('hreflang')
  @ApiOperation({
    summary: 'Get hreflang tag mappings',
    description: 'Returns hreflang tag configurations for internationalized pages.',
  })
  @ApiQuery({ name: 'urlPattern', required: false, description: 'Filter by URL pattern (regex)' })
  @ApiQuery({ name: 'hasIssuesOnly', required: false, type: Boolean })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({
    status: 200,
    description: 'Hreflang mappings',
    schema: {
      type: 'object',
      properties: {
        mappings: { type: 'array', items: { $ref: '#/components/schemas/HreflangMappingDto' } },
        total: { type: 'number' },
      },
    },
  })
  async getHreflangMappings(@Query() query: QueryTechnicalDto) {
    return this.technicalService.getHreflangMappings(query);
  }

  @Post('hreflang')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Update hreflang mapping',
    description: 'Sets or updates hreflang tags for a specific URL.',
  })
  @ApiResponse({ status: 200, description: 'Hreflang mapping updated', type: HreflangMappingDto })
  async updateHreflang(@Body() dto: UpdateHreflangDto): Promise<HreflangMappingDto> {
    return this.technicalService.updateHreflang(dto);
  }

  @Get('index-coverage')
  @ApiOperation({
    summary: 'Get index coverage analysis',
    description: 'Returns index coverage status for all tracked URLs.',
  })
  @ApiQuery({ name: 'indexStatus', enum: IndexStatus, required: false })
  @ApiQuery({ name: 'urlPattern', required: false })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Index coverage summary', type: IndexCoverageSummaryDto })
  async getIndexCoverage(@Query() query: QueryTechnicalDto): Promise<IndexCoverageSummaryDto> {
    return this.technicalService.getIndexCoverage(query);
  }

  @Post('reindex')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Request cache invalidation/reindexing',
    description: 'Queues URLs for cache invalidation and signals for reindexing.',
  })
  @ApiResponse({ status: 200, description: 'Reindex request created', type: ReindexResponseDto })
  async requestReindex(@Body() dto: ReindexRequestDto): Promise<ReindexResponseDto> {
    return this.technicalService.requestReindex(dto);
  }

  @Get('duplicate-content')
  @ApiOperation({
    summary: 'Detect duplicate content',
    description: 'Identifies pages with duplicate or very similar content.',
  })
  @ApiResponse({
    status: 200,
    description: 'Duplicate content report',
    type: [DuplicateContentDto],
  })
  async detectDuplicateContent(): Promise<DuplicateContentDto[]> {
    return this.technicalService.detectDuplicateContent();
  }

  @Get('structured-data/validate')
  @ApiOperation({
    summary: 'Validate structured data',
    description: 'Validates JSON-LD structured data on a specific URL.',
  })
  @ApiQuery({ name: 'url', description: 'URL to validate' })
  @ApiResponse({ status: 200, description: 'Validation result', type: StructuredDataValidationDto })
  async validateStructuredData(@Query('url') url: string): Promise<StructuredDataValidationDto> {
    return this.technicalService.validateStructuredData(url);
  }

  @Get('supported-languages')
  @ApiOperation({
    summary: 'Get supported languages',
    description: 'Returns a list of supported language codes for hreflang tags.',
  })
  @ApiResponse({
    status: 200,
    description: 'Supported languages',
    schema: {
      type: 'array',
      items: { type: 'string' },
    },
  })
  getSupportedLanguages() {
    return [
      { code: 'en', name: 'English' },
      { code: 'en-US', name: 'English (US)' },
      { code: 'en-GB', name: 'English (UK)' },
      { code: 'es', name: 'Spanish' },
      { code: 'es-ES', name: 'Spanish (Spain)' },
      { code: 'es-MX', name: 'Spanish (Mexico)' },
      { code: 'fr', name: 'French' },
      { code: 'fr-FR', name: 'French (France)' },
      { code: 'fr-CA', name: 'French (Canada)' },
      { code: 'de', name: 'German' },
      { code: 'de-DE', name: 'German (Germany)' },
      { code: 'it', name: 'Italian' },
      { code: 'pt', name: 'Portuguese' },
      { code: 'pt-BR', name: 'Portuguese (Brazil)' },
      { code: 'ja', name: 'Japanese' },
      { code: 'zh', name: 'Chinese' },
      { code: 'zh-CN', name: 'Chinese (Simplified)' },
      { code: 'zh-TW', name: 'Chinese (Traditional)' },
      { code: 'ko', name: 'Korean' },
      { code: 'ar', name: 'Arabic' },
      { code: 'ru', name: 'Russian' },
      { code: 'nl', name: 'Dutch' },
      { code: 'pl', name: 'Polish' },
      { code: 'x-default', name: 'Default/Fallback' },
    ];
  }
}
