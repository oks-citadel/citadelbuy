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
  Request,
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
import { JwtAuthGuard } from '@/modules/auth/guards/jwt-auth.guard';
import { AdminGuard } from '@/modules/auth/guards/admin.guard';
import { FeatureFlagsService } from '../services/feature-flags.service';
import {
  CreateFeatureFlagDto,
  UpdateFeatureFlagDto,
  EvaluateFlagDto,
  BulkEvaluateFlagsDto,
  FeatureFlagQueryDto,
  FeatureFlagResponseDto,
  FlagEvaluationResponseDto,
  BulkFlagEvaluationResponseDto,
} from '../dto/feature-flag.dto';

@ApiTags('Feature Flags')
@Controller('flags')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class FeatureFlagsController {
  constructor(private readonly featureFlagsService: FeatureFlagsService) {}

  @Post()
  @UseGuards(AdminGuard)
  @ApiOperation({ summary: 'Create a new feature flag' })
  @ApiResponse({
    status: 201,
    description: 'Feature flag created successfully',
    type: FeatureFlagResponseDto,
  })
  @ApiResponse({ status: 409, description: 'Flag key already exists' })
  async create(
    @Body() dto: CreateFeatureFlagDto,
    @Request() req: any,
  ) {
    return this.featureFlagsService.create(dto, req.user?.id);
  }

  @Get()
  @UseGuards(AdminGuard)
  @ApiOperation({ summary: 'List all feature flags' })
  @ApiResponse({
    status: 200,
    description: 'List of feature flags',
  })
  async findAll(@Query() query: FeatureFlagQueryDto) {
    return this.featureFlagsService.findAll(query);
  }

  @Get('enabled')
  @ApiOperation({ summary: 'Get all enabled flags for SDK initialization' })
  @ApiResponse({
    status: 200,
    description: 'Map of enabled flag keys to their configurations',
  })
  async getEnabledFlags() {
    return this.featureFlagsService.getEnabledFlags();
  }

  @Get(':key')
  @UseGuards(AdminGuard)
  @ApiOperation({ summary: 'Get feature flag by key' })
  @ApiParam({ name: 'key', description: 'Feature flag key' })
  @ApiResponse({
    status: 200,
    description: 'Feature flag details',
    type: FeatureFlagResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Feature flag not found' })
  async findByKey(@Param('key') key: string) {
    return this.featureFlagsService.findByKey(key);
  }

  @Put(':key')
  @UseGuards(AdminGuard)
  @ApiOperation({ summary: 'Update feature flag' })
  @ApiParam({ name: 'key', description: 'Feature flag key' })
  @ApiResponse({
    status: 200,
    description: 'Feature flag updated successfully',
    type: FeatureFlagResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Feature flag not found' })
  async update(
    @Param('key') key: string,
    @Body() dto: UpdateFeatureFlagDto,
    @Request() req: any,
  ) {
    return this.featureFlagsService.update(key, dto, req.user?.id);
  }

  @Delete(':key')
  @UseGuards(AdminGuard)
  @ApiOperation({ summary: 'Delete feature flag' })
  @ApiParam({ name: 'key', description: 'Feature flag key' })
  @ApiResponse({ status: 200, description: 'Feature flag deleted successfully' })
  @ApiResponse({ status: 404, description: 'Feature flag not found' })
  async delete(
    @Param('key') key: string,
    @Request() req: any,
  ) {
    return this.featureFlagsService.delete(key, req.user?.id);
  }

  @Post(':key/evaluate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Evaluate feature flag for a user' })
  @ApiParam({ name: 'key', description: 'Feature flag key' })
  @ApiResponse({
    status: 200,
    description: 'Flag evaluation result with value and reason',
    type: FlagEvaluationResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Feature flag not found' })
  async evaluate(
    @Param('key') key: string,
    @Body() dto: EvaluateFlagDto,
  ): Promise<FlagEvaluationResponseDto> {
    return this.featureFlagsService.evaluate(key, dto);
  }

  @Post('bulk-evaluate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Evaluate multiple feature flags for a user' })
  @ApiResponse({
    status: 200,
    description: 'Bulk flag evaluation results',
    type: BulkFlagEvaluationResponseDto,
  })
  async bulkEvaluate(
    @Body() dto: BulkEvaluateFlagsDto,
  ): Promise<BulkFlagEvaluationResponseDto> {
    return this.featureFlagsService.bulkEvaluate(dto);
  }

  @Post(':key/toggle')
  @UseGuards(AdminGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Toggle feature flag enabled state' })
  @ApiParam({ name: 'key', description: 'Feature flag key' })
  @ApiResponse({
    status: 200,
    description: 'Feature flag toggled successfully',
    type: FeatureFlagResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Feature flag not found' })
  async toggle(
    @Param('key') key: string,
    @Body() body: { enabled: boolean },
    @Request() req: any,
  ) {
    return this.featureFlagsService.toggle(key, body.enabled, req.user?.id);
  }

  @Get(':key/audit-logs')
  @UseGuards(AdminGuard)
  @ApiOperation({ summary: 'Get feature flag audit logs' })
  @ApiParam({ name: 'key', description: 'Feature flag key' })
  @ApiResponse({ status: 200, description: 'Audit logs' })
  async getAuditLogs(
    @Param('key') key: string,
    @Query('limit') limit?: number,
  ) {
    return this.featureFlagsService.getAuditLogs(key, limit);
  }
}
