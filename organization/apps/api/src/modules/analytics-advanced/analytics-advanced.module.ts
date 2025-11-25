import { Module } from '@nestjs/common';
import { AnalyticsAdvancedService } from './analytics-advanced.service';
import { AnalyticsAdvancedController } from './analytics-advanced.controller';
import { PrismaModule } from '@/common/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [AnalyticsAdvancedController],
  providers: [AnalyticsAdvancedService],
  exports: [AnalyticsAdvancedService],
})
export class AnalyticsAdvancedModule {}
