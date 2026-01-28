import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { RolesGuard } from '@/common/guards/roles.guard';
import { Roles } from '@/common/decorators/roles.decorator';
import { LocalSeoService } from './local-seo.service';
import {
  BusinessProfileDto,
  CreateBusinessProfileDto,
  UpdateBusinessProfileDto,
  LocalCitationDto,
  CreateLocalCitationDto,
  LocalSearchAnalyticsDto,
  ReviewSummaryDto,
  LocalKeywordRankingDto,
  NAPConsistencyDto,
  LocalSchemaDto,
  GeoTargetingDto,
} from '../dto/local-seo.dto';

@ApiTags('SEO - Local SEO')
@Controller('seo/local')
export class LocalSeoController {
  constructor(private readonly localSeoService: LocalSeoService) {}

  // Business Profile endpoints

  @Get('profile')
  @ApiOperation({ summary: 'Get business profile' })
  @ApiQuery({ name: 'id', required: false, description: 'Profile ID (default if not specified)' })
  @ApiResponse({ status: 200, description: 'Business profile', type: BusinessProfileDto })
  async getBusinessProfile(@Query('id') id?: string) {
    return this.localSeoService.getBusinessProfile(id);
  }

  @Post('profile')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.MARKETING)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create business profile' })
  @ApiResponse({ status: 201, description: 'Profile created', type: BusinessProfileDto })
  async createBusinessProfile(@Body() dto: CreateBusinessProfileDto) {
    return this.localSeoService.createBusinessProfile(dto);
  }

  @Put('profile/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.MARKETING)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update business profile' })
  @ApiParam({ name: 'id', description: 'Profile ID' })
  @ApiResponse({ status: 200, description: 'Profile updated', type: BusinessProfileDto })
  async updateBusinessProfile(
    @Param('id') id: string,
    @Body() dto: UpdateBusinessProfileDto,
  ) {
    return this.localSeoService.updateBusinessProfile(id, dto);
  }

  // Citations endpoints

  @Get('citations')
  @ApiOperation({ summary: 'Get local citations' })
  @ApiQuery({ name: 'profileId', required: false })
  @ApiResponse({ status: 200, description: 'List of citations', type: [LocalCitationDto] })
  async getCitations(@Query('profileId') profileId?: string) {
    return this.localSeoService.getCitations(profileId);
  }

  @Post('citations')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.MARKETING)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Add or update citation' })
  @ApiResponse({ status: 200, description: 'Citation saved', type: LocalCitationDto })
  async upsertCitation(@Body() dto: CreateLocalCitationDto) {
    return this.localSeoService.upsertCitation(dto);
  }

  @Get('nap-consistency')
  @ApiOperation({ summary: 'Check NAP consistency across citations' })
  @ApiQuery({ name: 'profileId', required: false })
  @ApiResponse({ status: 200, description: 'NAP consistency report', type: NAPConsistencyDto })
  async checkNAPConsistency(@Query('profileId') profileId?: string) {
    return this.localSeoService.checkNAPConsistency(profileId);
  }

  // Analytics endpoints

  @Get('analytics')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.MARKETING)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get local search analytics' })
  @ApiQuery({ name: 'profileId', required: false })
  @ApiResponse({ status: 200, description: 'Local search analytics', type: LocalSearchAnalyticsDto })
  async getLocalSearchAnalytics(@Query('profileId') profileId?: string) {
    return this.localSeoService.getLocalSearchAnalytics(profileId);
  }

  @Get('reviews')
  @ApiOperation({ summary: 'Get review summary' })
  @ApiQuery({ name: 'profileId', required: false })
  @ApiResponse({ status: 200, description: 'Review summary', type: ReviewSummaryDto })
  async getReviewSummary(@Query('profileId') profileId?: string) {
    return this.localSeoService.getReviewSummary(profileId);
  }

  @Get('keywords')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.MARKETING)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get local keyword rankings' })
  @ApiQuery({ name: 'profileId', required: false })
  @ApiResponse({ status: 200, description: 'Local keyword rankings', type: [LocalKeywordRankingDto] })
  async getLocalKeywordRankings(@Query('profileId') profileId?: string) {
    return this.localSeoService.getLocalKeywordRankings(profileId);
  }

  // Schema endpoints

  @Get('schema')
  @ApiOperation({ summary: 'Generate LocalBusiness JSON-LD schema' })
  @ApiQuery({ name: 'profileId', required: false })
  @ApiResponse({ status: 200, description: 'LocalBusiness schema', type: LocalSchemaDto })
  async generateLocalBusinessSchema(@Query('profileId') profileId?: string) {
    return this.localSeoService.generateLocalBusinessSchema(profileId);
  }

  // Geo-targeting endpoints

  @Get('geo-targeting')
  @ApiOperation({ summary: 'Get geo-targeting rules' })
  @ApiResponse({ status: 200, description: 'Geo-targeting rules', type: [GeoTargetingDto] })
  async getGeoTargeting() {
    return this.localSeoService.getGeoTargeting();
  }

  @Post('geo-targeting')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.MARKETING)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Set geo-targeting rule' })
  @ApiResponse({ status: 200, description: 'Geo-targeting saved', type: GeoTargetingDto })
  async setGeoTargeting(@Body() dto: GeoTargetingDto) {
    return this.localSeoService.setGeoTargeting(dto);
  }

  // Audit endpoint

  @Get('audit')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.MARKETING)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get local SEO audit' })
  @ApiQuery({ name: 'profileId', required: false })
  @ApiResponse({ status: 200, description: 'Local SEO audit report' })
  async getLocalSeoAudit(@Query('profileId') profileId?: string) {
    return this.localSeoService.getLocalSeoAudit(profileId);
  }
}
