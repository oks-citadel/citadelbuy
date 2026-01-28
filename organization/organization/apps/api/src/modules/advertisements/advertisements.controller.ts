import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Request,
  Query,
  Ip,
  Headers,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AdvertisementsService } from './advertisements.service';
import { CreateCampaignDto } from './dto/create-campaign.dto';
import { UpdateCampaignDto } from './dto/update-campaign.dto';
import { CreateAdvertisementDto } from './dto/create-advertisement.dto';
import { UpdateAdvertisementDto } from './dto/update-advertisement.dto';
import { TrackImpressionDto } from './dto/track-impression.dto';
import { TrackClickDto } from './dto/track-click.dto';
import { AdQueryDto, CampaignQueryDto } from './dto/ad-query.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AuthRequest } from '../../common/types/auth-request.types';

@ApiTags('advertisements')
@Controller('advertisements')
export class AdvertisementsController {
  constructor(private readonly advertisementsService: AdvertisementsService) {}

  // ============================================
  // CAMPAIGN ENDPOINTS (Vendor Only)
  // ============================================

  @Post('campaigns')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create new advertising campaign (Vendor only)' })
  @ApiResponse({ status: 201, description: 'Campaign created successfully' })
  createCampaign(@Request() req: AuthRequest, @Body() dto: CreateCampaignDto) {
    // Check if user is vendor or admin
    if (req.user.role !== 'VENDOR' && req.user.role !== 'ADMIN') {
      throw new BadRequestException('Only vendors can create advertising campaigns');
    }

    return this.advertisementsService.createCampaign(req.user.id, dto);
  }

  @Get('campaigns')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all campaigns for current vendor' })
  @ApiResponse({ status: 200, description: 'Campaigns retrieved successfully' })
  findAllCampaigns(@Request() req: AuthRequest, @Query() query: CampaignQueryDto) {
    if (req.user.role !== 'VENDOR' && req.user.role !== 'ADMIN') {
      throw new BadRequestException('Only vendors can access campaigns');
    }

    return this.advertisementsService.findAllCampaigns(req.user.id, query);
  }

  @Get('campaigns/:id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get campaign by ID' })
  @ApiResponse({ status: 200, description: 'Campaign retrieved successfully' })
  findOneCampaign(@Param('id') id: string, @Request() req: AuthRequest) {
    return this.advertisementsService.findOneCampaign(id, req.user.id);
  }

  @Patch('campaigns/:id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update campaign' })
  @ApiResponse({ status: 200, description: 'Campaign updated successfully' })
  updateCampaign(@Param('id') id: string, @Request() req: AuthRequest, @Body() dto: UpdateCampaignDto) {
    return this.advertisementsService.updateCampaign(id, req.user.id, dto);
  }

  @Delete('campaigns/:id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete campaign' })
  @ApiResponse({ status: 200, description: 'Campaign deleted successfully' })
  deleteCampaign(@Param('id') id: string, @Request() req: AuthRequest) {
    return this.advertisementsService.deleteCampaign(id, req.user.id);
  }

  @Get('campaigns/:id/performance')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get campaign performance analytics' })
  @ApiResponse({ status: 200, description: 'Performance data retrieved successfully' })
  getCampaignPerformance(@Param('id') id: string, @Request() req: AuthRequest) {
    return this.advertisementsService.getCampaignPerformance(id, req.user.id);
  }

  // ============================================
  // ADVERTISEMENT ENDPOINTS (Vendor Only)
  // ============================================

  @Post('ads')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create new advertisement (Vendor only)' })
  @ApiResponse({ status: 201, description: 'Advertisement created successfully' })
  createAdvertisement(@Request() req: AuthRequest, @Body() dto: CreateAdvertisementDto) {
    if (req.user.role !== 'VENDOR' && req.user.role !== 'ADMIN') {
      throw new BadRequestException('Only vendors can create advertisements');
    }

    return this.advertisementsService.createAdvertisement(req.user.id, dto);
  }

  @Get('ads')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all advertisements for current vendor' })
  @ApiResponse({ status: 200, description: 'Advertisements retrieved successfully' })
  findAllAdvertisements(@Request() req: AuthRequest, @Query() query: AdQueryDto) {
    if (req.user.role !== 'VENDOR' && req.user.role !== 'ADMIN') {
      throw new BadRequestException('Only vendors can access advertisements');
    }

    return this.advertisementsService.findAllAdvertisements(req.user.id, query);
  }

  @Get('ads/:id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get advertisement by ID' })
  @ApiResponse({ status: 200, description: 'Advertisement retrieved successfully' })
  findOneAdvertisement(@Param('id') id: string, @Request() req: AuthRequest) {
    return this.advertisementsService.findOneAdvertisement(id, req.user.id);
  }

  @Patch('ads/:id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update advertisement' })
  @ApiResponse({ status: 200, description: 'Advertisement updated successfully' })
  updateAdvertisement(@Param('id') id: string, @Request() req: AuthRequest, @Body() dto: UpdateAdvertisementDto) {
    return this.advertisementsService.updateAdvertisement(id, req.user.id, dto);
  }

  @Delete('ads/:id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete advertisement' })
  @ApiResponse({ status: 200, description: 'Advertisement deleted successfully' })
  deleteAdvertisement(@Param('id') id: string, @Request() req: AuthRequest) {
    return this.advertisementsService.deleteAdvertisement(id, req.user.id);
  }

  @Get('ads/:id/performance')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get advertisement performance analytics' })
  @ApiResponse({ status: 200, description: 'Performance data retrieved successfully' })
  getAdPerformance(@Param('id') id: string, @Request() req: AuthRequest) {
    return this.advertisementsService.getAdPerformance(id, req.user.id);
  }

  // ============================================
  // PUBLIC ENDPOINTS (Ad Serving & Tracking)
  // ============================================

  @Get('display')
  @ApiOperation({ summary: 'Get ads to display (Public)' })
  @ApiResponse({ status: 200, description: 'Ads retrieved successfully' })
  getAdsForDisplay(
    @Query('placement') placement?: string,
    @Query('categoryId') categoryId?: string,
    @Query('keywords') keywords?: string,
    @Query('limit') limit?: string,
  ) {
    const parsedKeywords = keywords ? keywords.split(',').map((k) => k.trim()) : [];
    const parsedLimit = limit ? parseInt(limit, 10) : 5;

    return this.advertisementsService.getAdsForDisplay({
      placement,
      categoryId,
      keywords: parsedKeywords,
      limit: parsedLimit,
    });
  }

  @Post('track/impression')
  @ApiOperation({ summary: 'Track ad impression (Public)' })
  @ApiResponse({ status: 201, description: 'Impression tracked successfully' })
  trackImpression(
    @Body() dto: TrackImpressionDto,
    @Ip() ip: string,
    @Headers('user-agent') userAgent?: string,
  ) {
    return this.advertisementsService.trackImpression(dto, ip, userAgent);
  }

  @Post('track/click')
  @ApiOperation({ summary: 'Track ad click (Public)' })
  @ApiResponse({ status: 201, description: 'Click tracked successfully' })
  trackClick(
    @Body() dto: TrackClickDto,
    @Ip() ip: string,
    @Headers('user-agent') userAgent?: string,
  ) {
    return this.advertisementsService.trackClick(dto, ip, userAgent);
  }
}
