import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CampaignService } from './campaign.service';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { CreateCampaignDto, UpdateCampaignDto, CampaignStatus, CampaignMetricsDto } from './dto/campaign.dto';

@ApiTags('marketing/campaigns')
@Controller('marketing/campaigns')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class CampaignController {
  constructor(private readonly campaignService: CampaignService) {}

  @Post()
  async createCampaign(@Body() dto: CreateCampaignDto) {
    return this.campaignService.createCampaign(dto);
  }

  @Get()
  async getCampaigns(
    @Query('organizationId') organizationId?: string,
    @Query('status') status?: CampaignStatus,
    @Query('type') type?: string,
    @Query('region') region?: string,
  ) {
    return this.campaignService.getCampaigns({
      organizationId,
      status,
      type,
      region,
    });
  }

  @Get(':id')
  async getCampaignById(@Param('id') id: string) {
    return this.campaignService.getCampaignById(id);
  }

  @Put(':id')
  async updateCampaign(@Param('id') id: string, @Body() dto: UpdateCampaignDto) {
    return this.campaignService.updateCampaign(id, dto);
  }

  @Delete(':id')
  async deleteCampaign(@Param('id') id: string) {
    return this.campaignService.deleteCampaign(id);
  }

  @Post(':id/start')
  async startCampaign(@Param('id') id: string) {
    return this.campaignService.startCampaign(id);
  }

  @Post(':id/pause')
  async pauseCampaign(@Param('id') id: string) {
    return this.campaignService.pauseCampaign(id);
  }

  @Get(':id/metrics')
  async getCampaignMetrics(@Param('id') campaignId: string) {
    return this.campaignService.getCampaignMetrics({ campaignId });
  }

  @Post(':id/track')
  async trackEvent(
    @Param('id') campaignId: string,
    @Body() event: {
      type: 'impression' | 'click' | 'conversion';
      value?: number;
      metadata?: Record<string, any>;
    },
  ) {
    return this.campaignService.trackCampaignEvent(campaignId, event);
  }

  @Get('region/:region')
  async getCampaignsByRegion(@Param('region') region: string) {
    return this.campaignService.getCampaignsByRegion(region);
  }
}
