import { Module } from '@nestjs/common';
import { PrismaModule } from '@/common/prisma/prisma.module';
import { MarketingGrowthController } from './marketing-growth.controller';
import { MarketingGrowthService } from './marketing-growth.service';

@Module({
  imports: [PrismaModule],
  controllers: [MarketingGrowthController],
  providers: [MarketingGrowthService],
  exports: [MarketingGrowthService],
})
export class MarketingGrowthModule {}
