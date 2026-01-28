import { Module } from '@nestjs/common';
import { PrismaModule } from '@/common/prisma/prisma.module';
import { MarketingAnalyticsController } from './marketing-analytics.controller';
import { MarketingAnalyticsService } from './marketing-analytics.service';

@Module({
  imports: [PrismaModule],
  controllers: [MarketingAnalyticsController],
  providers: [MarketingAnalyticsService],
  exports: [MarketingAnalyticsService],
})
export class MarketingAnalyticsModule {}
