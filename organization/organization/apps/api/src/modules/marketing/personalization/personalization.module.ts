import { Module } from '@nestjs/common';
import { PrismaModule } from '@/common/prisma/prisma.module';
import { MarketingPersonalizationController } from './personalization.controller';
import { MarketingPersonalizationService } from './personalization.service';

@Module({
  imports: [PrismaModule],
  controllers: [MarketingPersonalizationController],
  providers: [MarketingPersonalizationService],
  exports: [MarketingPersonalizationService],
})
export class MarketingPersonalizationModule {}
