/**
 * Feature Flags Controller
 *
 * Admin API for managing feature flags.
 * All endpoints require admin authentication.
 */

import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  HttpCode,
  HttpStatus,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiBody } from '@nestjs/swagger';
import { FeatureFlagsService } from './feature-flags.service';
import { FeatureFlag, FlagContext, FlagEvaluation } from './feature-flags.interface';

// DTOs
class CreateFeatureFlagDto {
  name: string;
  key: string;
  description?: string;
  enabled?: boolean;
  rolloutPercentage?: number;
}

class UpdateFeatureFlagDto {
  name?: string;
  description?: string;
  enabled?: boolean;
  rolloutPercentage?: number;
}

class EvaluateFlagDto {
  userId?: string;
  email?: string;
  role?: string;
  organizationId?: string;
  country?: string;
  vendorId?: string;
  sessionId?: string;
}

@ApiTags('Feature Flags')
@ApiBearerAuth()
@Controller('admin/feature-flags')
// @UseGuards(AdminGuard) // Uncomment when admin guard is configured
export class FeatureFlagsController {
  constructor(private readonly featureFlagsService: FeatureFlagsService) {}

  @Get()
  @ApiOperation({ summary: 'Get all feature flags' })
  async getAllFlags(): Promise<FeatureFlag[]> {
    return this.featureFlagsService.getAllFlags();
  }

  @Post()
  @ApiOperation({ summary: 'Create a new feature flag' })
  @ApiBody({ type: CreateFeatureFlagDto })
  async createFlag(@Body() dto: CreateFeatureFlagDto): Promise<FeatureFlag> {
    return this.featureFlagsService.createFlag({
      name: dto.name,
      key: dto.key,
      description: dto.description,
      enabled: dto.enabled ?? false,
      rolloutPercentage: dto.rolloutPercentage ?? 0,
    });
  }

  @Put(':key')
  @ApiOperation({ summary: 'Update a feature flag' })
  async updateFlag(
    @Param('key') key: string,
    @Body() dto: UpdateFeatureFlagDto,
  ): Promise<FeatureFlag> {
    return this.featureFlagsService.updateFlag(key, dto);
  }

  @Delete(':key')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a feature flag' })
  async deleteFlag(@Param('key') key: string): Promise<void> {
    return this.featureFlagsService.deleteFlag(key);
  }

  @Post(':key/toggle')
  @ApiOperation({ summary: 'Toggle a feature flag on/off' })
  async toggleFlag(@Param('key') key: string): Promise<FeatureFlag> {
    return this.featureFlagsService.toggleFlag(key);
  }

  @Put(':key/rollout')
  @ApiOperation({ summary: 'Set rollout percentage for a feature flag' })
  async setRollout(
    @Param('key') key: string,
    @Body('percentage') percentage: number,
  ): Promise<FeatureFlag> {
    return this.featureFlagsService.setRolloutPercentage(key, percentage);
  }

  @Post(':key/evaluate')
  @ApiOperation({ summary: 'Evaluate a feature flag for a given context' })
  @ApiBody({ type: EvaluateFlagDto })
  async evaluateFlag(
    @Param('key') key: string,
    @Body() context: EvaluateFlagDto,
  ): Promise<FlagEvaluation> {
    return this.featureFlagsService.evaluate(key, context as FlagContext);
  }

  @Get(':key/enabled')
  @ApiOperation({ summary: 'Check if a feature flag is enabled' })
  async isEnabled(
    @Param('key') key: string,
    @Query('userId') userId?: string,
    @Query('email') email?: string,
    @Query('role') role?: string,
  ): Promise<{ enabled: boolean }> {
    const context: FlagContext = { userId, email, role };
    const enabled = await this.featureFlagsService.isEnabled(key, context);
    return { enabled };
  }
}

/**
 * Public endpoint for client-side flag evaluation
 */
@ApiTags('Feature Flags')
@Controller('feature-flags')
export class PublicFeatureFlagsController {
  constructor(private readonly featureFlagsService: FeatureFlagsService) {}

  @Post('evaluate')
  @ApiOperation({ summary: 'Evaluate multiple feature flags for a context' })
  async evaluateFlags(
    @Body() body: { flags: string[]; context: EvaluateFlagDto },
  ): Promise<Record<string, FlagEvaluation>> {
    const results: Record<string, FlagEvaluation> = {};

    for (const flagKey of body.flags) {
      results[flagKey] = await this.featureFlagsService.evaluate(
        flagKey,
        body.context as FlagContext,
      );
    }

    return results;
  }

  @Get('enabled')
  @ApiOperation({ summary: 'Get enabled flags for client-side rendering' })
  async getEnabledFlags(
    @Query('flags') flagKeys: string,
    @Query('userId') userId?: string,
    @Query('sessionId') sessionId?: string,
  ): Promise<Record<string, boolean>> {
    const flags = flagKeys.split(',');
    const context: FlagContext = { userId, sessionId };
    const results: Record<string, boolean> = {};

    for (const flagKey of flags) {
      results[flagKey] = await this.featureFlagsService.isEnabled(
        flagKey.trim(),
        context,
      );
    }

    return results;
  }
}
