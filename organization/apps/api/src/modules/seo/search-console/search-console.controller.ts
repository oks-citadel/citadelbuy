import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { RolesGuard } from '@/common/guards/roles.guard';
import { Roles } from '@/common/decorators/roles.decorator';
import { SearchConsoleService } from './search-console.service';
import {
  SearchConsoleQueryDto,
  SearchPerformanceDto,
  SearchQueryDataDto,
  PagePerformanceDto,
  SitemapStatusDto,
  CrawlErrorDto,
  IndexCoverageReportDto,
  SubmitSitemapDto,
  InspectUrlDto,
  RequestIndexingDto,
  OAuthCallbackDto,
} from '../dto/search-console.dto';

@ApiTags('SEO - Google Search Console')
@Controller('seo/search-console')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.MARKETING)
@ApiBearerAuth()
export class SearchConsoleController {
  constructor(private readonly searchConsoleService: SearchConsoleService) {}

  @Get('auth/url')
  @ApiOperation({ summary: 'Get Google OAuth2 authorization URL' })
  @ApiQuery({ name: 'redirectUri', required: true })
  @ApiResponse({ status: 200, description: 'Authorization URL' })
  getAuthUrl(@Query('redirectUri') redirectUri: string) {
    const url = this.searchConsoleService.getAuthorizationUrl(redirectUri);
    return { authorizationUrl: url };
  }

  @Post('auth/callback')
  @ApiOperation({ summary: 'Exchange authorization code for tokens' })
  @ApiResponse({ status: 200, description: 'Tokens retrieved' })
  async authCallback(@Body() dto: OAuthCallbackDto) {
    return this.searchConsoleService.exchangeCode(dto.code, dto.redirectUri);
  }

  @Get('performance')
  @ApiOperation({ summary: 'Get search performance data' })
  @ApiQuery({ name: 'siteUrl', required: true, description: 'Site URL (e.g., https://example.com)' })
  @ApiResponse({ status: 200, description: 'Performance data', type: SearchPerformanceDto })
  async getPerformance(
    @Query('siteUrl') siteUrl: string,
    @Query() query: SearchConsoleQueryDto,
  ) {
    return this.searchConsoleService.getSearchPerformance(siteUrl, query);
  }

  @Get('queries')
  @ApiOperation({ summary: 'Get top search queries/keywords' })
  @ApiQuery({ name: 'siteUrl', required: true })
  @ApiResponse({ status: 200, description: 'Top queries', type: [SearchQueryDataDto] })
  async getTopQueries(
    @Query('siteUrl') siteUrl: string,
    @Query() query: SearchConsoleQueryDto,
  ) {
    return this.searchConsoleService.getTopQueries(siteUrl, query);
  }

  @Get('pages')
  @ApiOperation({ summary: 'Get page performance data' })
  @ApiQuery({ name: 'siteUrl', required: true })
  @ApiResponse({ status: 200, description: 'Page performance', type: [PagePerformanceDto] })
  async getPagePerformance(
    @Query('siteUrl') siteUrl: string,
    @Query() query: SearchConsoleQueryDto,
  ) {
    return this.searchConsoleService.getPagePerformance(siteUrl, query);
  }

  @Get('devices')
  @ApiOperation({ summary: 'Get performance by device type' })
  @ApiQuery({ name: 'siteUrl', required: true })
  @ApiResponse({ status: 200, description: 'Performance by device' })
  async getPerformanceByDevice(
    @Query('siteUrl') siteUrl: string,
    @Query() query: SearchConsoleQueryDto,
  ) {
    return this.searchConsoleService.getPerformanceByDevice(siteUrl, query);
  }

  @Get('countries')
  @ApiOperation({ summary: 'Get performance by country' })
  @ApiQuery({ name: 'siteUrl', required: true })
  @ApiResponse({ status: 200, description: 'Performance by country' })
  async getPerformanceByCountry(
    @Query('siteUrl') siteUrl: string,
    @Query() query: SearchConsoleQueryDto,
  ) {
    return this.searchConsoleService.getPerformanceByCountry(siteUrl, query);
  }

  @Get('sitemaps')
  @ApiOperation({ summary: 'Get sitemap status' })
  @ApiQuery({ name: 'siteUrl', required: true })
  @ApiResponse({ status: 200, description: 'Sitemap status', type: [SitemapStatusDto] })
  async getSitemapStatus(@Query('siteUrl') siteUrl: string) {
    return this.searchConsoleService.getSitemapStatus(siteUrl);
  }

  @Post('sitemaps/submit')
  @ApiOperation({ summary: 'Submit a sitemap' })
  @ApiResponse({ status: 200, description: 'Sitemap submitted' })
  async submitSitemap(@Body() dto: SubmitSitemapDto) {
    return this.searchConsoleService.submitSitemap(dto.siteUrl, dto.sitemapUrl);
  }

  @Get('errors')
  @ApiOperation({ summary: 'Get crawl errors' })
  @ApiQuery({ name: 'siteUrl', required: true })
  @ApiResponse({ status: 200, description: 'Crawl errors', type: [CrawlErrorDto] })
  async getCrawlErrors(@Query('siteUrl') siteUrl: string) {
    return this.searchConsoleService.getCrawlErrors(siteUrl);
  }

  @Get('coverage')
  @ApiOperation({ summary: 'Get index coverage report' })
  @ApiQuery({ name: 'siteUrl', required: true })
  @ApiResponse({ status: 200, description: 'Index coverage report', type: IndexCoverageReportDto })
  async getIndexCoverage(@Query('siteUrl') siteUrl: string) {
    return this.searchConsoleService.getIndexCoverageReport(siteUrl);
  }

  @Post('inspect')
  @ApiOperation({ summary: 'Inspect a URL' })
  @ApiResponse({ status: 200, description: 'URL inspection result' })
  async inspectUrl(@Body() dto: InspectUrlDto) {
    return this.searchConsoleService.inspectUrl(dto.siteUrl, dto.inspectionUrl);
  }

  @Post('indexing/request')
  @ApiOperation({ summary: 'Request indexing for a URL' })
  @ApiResponse({ status: 200, description: 'Indexing request submitted' })
  async requestIndexing(@Body() dto: RequestIndexingDto) {
    return this.searchConsoleService.requestIndexing(dto.url);
  }
}
