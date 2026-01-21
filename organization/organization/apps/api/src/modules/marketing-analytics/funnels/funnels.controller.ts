import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { FunnelsService } from './funnels.service';
import {
  CreateFunnelDto,
  UpdateFunnelDto,
  FunnelQueryDto,
  FunnelAnalysisResultDto,
  FunnelResponseDto,
} from './dto/funnel.dto';
import { JwtAuthGuard } from '@/modules/auth/guards/jwt-auth.guard';

@ApiTags('Marketing Analytics - Funnels')
@Controller('analytics/funnels')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class FunnelsController {
  constructor(private readonly funnelsService: FunnelsService) {}

  @Get()
  @ApiOperation({
    summary: 'List all funnels',
    description: 'Retrieve all funnel definitions for the organization.',
  })
  @ApiResponse({
    status: 200,
    description: 'Funnels retrieved successfully',
    type: [FunnelResponseDto],
  })
  async listFunnels(
    @Query('organizationId') organizationId?: string,
  ): Promise<FunnelResponseDto[]> {
    return this.funnelsService.listFunnels(organizationId);
  }

  @Post()
  @ApiOperation({
    summary: 'Create a new funnel',
    description: `
      Create a new funnel definition with multiple steps.

      Each step corresponds to an event type. Users progress through
      the funnel by triggering events in sequence (for ordered funnels)
      or in any order (for unordered funnels).

      Example: Checkout Funnel
      - Step 1: product_viewed
      - Step 2: product_added_to_cart
      - Step 3: checkout_started
      - Step 4: checkout_completed
    `,
  })
  @ApiResponse({
    status: 201,
    description: 'Funnel created successfully',
    type: FunnelResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid funnel definition',
  })
  async createFunnel(@Body() dto: CreateFunnelDto): Promise<FunnelResponseDto> {
    return this.funnelsService.createFunnel(dto);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get funnel by ID',
    description: 'Retrieve a specific funnel definition.',
  })
  @ApiParam({ name: 'id', description: 'Funnel ID' })
  @ApiResponse({
    status: 200,
    description: 'Funnel retrieved successfully',
    type: FunnelResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Funnel not found',
  })
  async getFunnel(@Param('id') id: string): Promise<FunnelResponseDto> {
    return this.funnelsService.getFunnel(id);
  }

  @Put(':id')
  @ApiOperation({
    summary: 'Update funnel',
    description: 'Update an existing funnel definition.',
  })
  @ApiParam({ name: 'id', description: 'Funnel ID' })
  @ApiResponse({
    status: 200,
    description: 'Funnel updated successfully',
    type: FunnelResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Funnel not found',
  })
  async updateFunnel(
    @Param('id') id: string,
    @Body() dto: UpdateFunnelDto,
  ): Promise<FunnelResponseDto> {
    return this.funnelsService.updateFunnel(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Delete funnel',
    description: 'Delete a funnel definition. This does not delete historical analysis data.',
  })
  @ApiParam({ name: 'id', description: 'Funnel ID' })
  @ApiResponse({
    status: 204,
    description: 'Funnel deleted successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Funnel not found',
  })
  async deleteFunnel(@Param('id') id: string): Promise<void> {
    return this.funnelsService.deleteFunnel(id);
  }

  @Get(':id/analysis')
  @ApiOperation({
    summary: 'Get funnel analysis',
    description: `
      Analyze funnel performance over a time period.

      Returns:
      - Total users entering the funnel
      - Users completing each step
      - Conversion and dropoff rates per step
      - Average time to complete each step
      - Optional breakdowns by device, source, and time period
    `,
  })
  @ApiParam({ name: 'id', description: 'Funnel ID' })
  @ApiResponse({
    status: 200,
    description: 'Funnel analysis retrieved successfully',
    type: FunnelAnalysisResultDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Funnel not found',
  })
  async analyzeFunnel(
    @Param('id') id: string,
    @Query() query: FunnelQueryDto,
  ): Promise<FunnelAnalysisResultDto> {
    return this.funnelsService.analyzeFunnel(id, query);
  }

  @Get(':id/conversion')
  @ApiOperation({
    summary: 'Get conversion rates per step',
    description: 'Get simplified conversion rate data for each funnel step.',
  })
  @ApiParam({ name: 'id', description: 'Funnel ID' })
  @ApiResponse({
    status: 200,
    description: 'Conversion rates retrieved successfully',
  })
  async getConversionRates(
    @Param('id') id: string,
    @Query() query: FunnelQueryDto,
  ): Promise<{
    funnelId: string;
    steps: Array<{
      stepIndex: number;
      stepName: string;
      conversionRate: number;
      dropoffRate: number;
    }>;
  }> {
    return this.funnelsService.getConversionRates(id, query);
  }
}
