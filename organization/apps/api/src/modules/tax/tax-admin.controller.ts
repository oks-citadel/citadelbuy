import {
  Controller,
  Post,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
  Get,
  Query,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { TaxService } from './tax.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { IsString, IsOptional } from 'class-validator';

class SyncTaxRatesDto {
  @IsString()
  country: string;

  @IsString()
  @IsOptional()
  state?: string;

  @IsString()
  @IsOptional()
  city?: string;

  @IsString()
  @IsOptional()
  zipCode?: string;
}

class ClearCacheDto {
  @IsString()
  country: string;

  @IsString()
  @IsOptional()
  state?: string;

  @IsString()
  @IsOptional()
  zipCode?: string;
}

@ApiTags('Tax Administration')
@Controller('tax/admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
@ApiBearerAuth()
export class TaxAdminController {
  constructor(private readonly taxService: TaxService) {}

  @Post('sync-rates')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Sync tax rates from external provider (TaxJar/Avalara)',
    description: 'Fetches current tax rates from the configured external provider and updates local database',
  })
  @ApiResponse({
    status: 200,
    description: 'Tax rates synced successfully',
    schema: {
      example: {
        synced: 3,
        provider: 'TaxJar',
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin only' })
  @ApiResponse({ status: 400, description: 'No external provider configured' })
  async syncTaxRates(@Body() dto: SyncTaxRatesDto) {
    return this.taxService.syncTaxRatesFromProvider(dto);
  }

  @Post('clear-cache')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Clear tax calculation cache',
    description: 'Invalidates cached tax calculations for a specific location',
  })
  @ApiResponse({
    status: 204,
    description: 'Cache cleared successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin only' })
  async clearCache(@Body() dto: ClearCacheDto) {
    await this.taxService['invalidateTaxRateCache'](
      dto.country,
      dto.state,
      dto.zipCode,
    );
    return;
  }

  @Get('provider-info')
  @ApiOperation({
    summary: 'Get configured tax provider information',
    description: 'Returns information about the currently configured external tax provider',
  })
  @ApiResponse({
    status: 200,
    description: 'Provider information retrieved successfully',
    schema: {
      example: {
        provider: 'TaxJar',
        configured: true,
        environment: 'production',
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin only' })
  async getProviderInfo() {
    const factory = this.taxService['taxProviderFactory'];
    const provider = factory.getProvider();

    return {
      provider: factory.getProviderName(),
      configured: factory.hasProvider(),
      hasProvider: provider !== null,
      environment: process.env.TAX_PROVIDER_ENV || 'production',
    };
  }

  @Get('health-check')
  @ApiOperation({
    summary: 'Check tax service health',
    description: 'Performs a health check on tax calculation service and external provider',
  })
  @ApiResponse({
    status: 200,
    description: 'Health check completed',
    schema: {
      example: {
        status: 'healthy',
        internalCalculation: true,
        externalProvider: {
          configured: true,
          provider: 'TaxJar',
          reachable: true,
        },
        cache: {
          available: true,
        },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin only' })
  async healthCheck() {
    const factory = this.taxService['taxProviderFactory'];
    const provider = factory.getProvider();
    const redis = this.taxService['redisService'];

    let providerReachable = false;
    let providerError = null;

    // Test external provider if configured
    if (provider) {
      try {
        await provider.getTaxRates({
          country: 'US',
          state: 'CA',
          zip: '90210',
        });
        providerReachable = true;
      } catch (error) {
        providerError = error.message;
      }
    }

    // Test Redis cache
    let cacheAvailable = false;
    try {
      await redis.set('tax:health:test', 'ok', 10);
      const value = await redis.get('tax:health:test');
      cacheAvailable = value === 'ok';
      await redis.del('tax:health:test');
    } catch (error) {
      // Cache not available
    }

    return {
      status: 'healthy',
      internalCalculation: true,
      externalProvider: {
        configured: factory.hasProvider(),
        provider: factory.getProviderName(),
        reachable: providerReachable,
        error: providerError,
      },
      cache: {
        available: cacheAvailable,
        type: 'redis',
      },
      timestamp: new Date().toISOString(),
    };
  }

  @Get('statistics')
  @ApiOperation({
    summary: 'Get tax calculation statistics',
    description: 'Returns statistics about tax calculations for monitoring',
  })
  @ApiQuery({ name: 'days', required: false, description: 'Number of days to look back (default: 30)' })
  @ApiResponse({
    status: 200,
    description: 'Statistics retrieved successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin only' })
  async getStatistics(@Query('days') days?: string) {
    const daysBack = days ? parseInt(days, 10) : 30;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysBack);

    const prisma = this.taxService['prisma'];

    const [totalCalculations, avgTaxAmount, calculationsByMethod] = await Promise.all([
      prisma.taxCalculation.count({
        where: {
          calculatedAt: { gte: startDate },
        },
      }),
      prisma.taxCalculation.aggregate({
        where: {
          calculatedAt: { gte: startDate },
        },
        _avg: {
          taxAmount: true,
        },
      }),
      prisma.taxCalculation.groupBy({
        by: ['calculationMethod'],
        where: {
          calculatedAt: { gte: startDate },
        },
        _count: true,
      }),
    ]);

    return {
      period: {
        start: startDate.toISOString(),
        end: new Date().toISOString(),
        days: daysBack,
      },
      totalCalculations,
      averageTaxAmount: avgTaxAmount._avg.taxAmount || 0,
      calculationsByMethod: calculationsByMethod.reduce((acc: Record<string, number>, item) => {
        acc[item.calculationMethod] = item._count;
        return acc;
      }, {} as Record<string, number>),
    };
  }
}
