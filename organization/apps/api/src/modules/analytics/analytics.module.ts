import { Module } from '@nestjs/common';
import { AnalyticsService } from './analytics.service';
import { AnalyticsController } from './analytics.controller';
import { CategoryAnalyticsService } from './category-analytics.service';
import { CategoryAnalyticsController } from './category-analytics.controller';
import { PrismaModule } from '@/common/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [AnalyticsController, CategoryAnalyticsController],
  providers: [AnalyticsService, CategoryAnalyticsService],
  exports: [AnalyticsService, CategoryAnalyticsService],
})
export class AnalyticsModule {}
