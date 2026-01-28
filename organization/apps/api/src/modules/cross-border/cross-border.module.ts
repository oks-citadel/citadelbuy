import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { PrismaModule } from '../../common/prisma/prisma.module';
import { RedisModule } from '../../common/redis/redis.module';
import { TradeComplianceService } from './trade-compliance.service';
import { CustomsService } from './customs.service';
import { LogisticsService } from './logistics.service';
import { CurrencyExchangeService } from './currency-exchange.service';
import { FxRefreshProcessor } from './workers/fx-refresh.processor';
import { QUEUES } from '../../common/queue/queue.constants';

@Module({
  imports: [
    PrismaModule,
    RedisModule,
    BullModule.registerQueue({
      name: QUEUES.FX_REFRESH,
    }),
  ],
  providers: [
    TradeComplianceService,
    CustomsService,
    LogisticsService,
    CurrencyExchangeService,
    FxRefreshProcessor,
  ],
  exports: [
    TradeComplianceService,
    CustomsService,
    LogisticsService,
    CurrencyExchangeService,
    FxRefreshProcessor,
  ],
})
export class CrossBorderModule {}
