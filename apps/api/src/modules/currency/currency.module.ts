import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CurrencyController } from './currency.controller';
import { CurrencyService } from './currency.service';
import { FxRateService } from './fx-rate.service';
import { RedisModule } from '@/common/redis/redis.module';

/**
 * Currency Module
 *
 * Provides currency and FX rate functionality:
 * - FX rate quotes (GET /api/v1/fx/quote)
 * - Currency conversion (POST /api/v1/fx/convert)
 * - Batch conversion (POST /api/v1/fx/batch-convert)
 * - Supported currencies list (GET /api/v1/currencies)
 * - Currency formatting
 *
 * Features:
 * - Redis caching for FX rates
 * - Multiple currency support (30+ currencies)
 * - Cross-rate calculation
 * - Amount formatting with locale support
 */
@Module({
  imports: [
    ConfigModule,
    RedisModule,
  ],
  controllers: [CurrencyController],
  providers: [CurrencyService, FxRateService],
  exports: [CurrencyService, FxRateService],
})
export class CurrencyModule {}
