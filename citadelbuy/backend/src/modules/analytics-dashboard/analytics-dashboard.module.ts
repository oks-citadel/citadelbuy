import { Module } from '@nestjs/common';
import { AnalyticsDashboardService } from './analytics-dashboard.service';
import { AnalyticsDashboardController } from './analytics-dashboard.controller';
import { PrismaModule } from '@/common/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [AnalyticsDashboardController],
  providers: [AnalyticsDashboardService],
  exports: [AnalyticsDashboardService],
})
export class AnalyticsDashboardModule {}
