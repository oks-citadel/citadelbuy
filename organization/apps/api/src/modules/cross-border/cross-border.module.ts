import { Module } from '@nestjs/common';
import { PrismaModule } from '../../common/prisma/prisma.module';
import { TradeComplianceService } from './trade-compliance.service';
import { CustomsService } from './customs.service';
import { LogisticsService } from './logistics.service';
import { CurrencyExchangeService } from './currency-exchange.service';

@Module({
  imports: [PrismaModule],
  providers: [
    TradeComplianceService,
    CustomsService,
    LogisticsService,
    CurrencyExchangeService,
  ],
  exports: [
    TradeComplianceService,
    CustomsService,
    LogisticsService,
    CurrencyExchangeService,
  ],
})
export class CrossBorderModule {}
