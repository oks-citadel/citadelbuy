import { Module } from '@nestjs/common';
import { PrismaModule } from '@/common/prisma/prisma.module';
import { AiMarketingController } from './ai-marketing.controller';
import { AiMarketingService } from './ai-marketing.service';

@Module({
  imports: [PrismaModule],
  controllers: [AiMarketingController],
  providers: [AiMarketingService],
  exports: [AiMarketingService],
})
export class AiMarketingModule {}
