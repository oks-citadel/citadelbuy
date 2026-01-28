import { Module } from '@nestjs/common';
import { PrismaModule } from '@/common/prisma/prisma.module';
import { MarketingSeoController } from './marketing-seo.controller';
import { MarketingSeoService } from './marketing-seo.service';

@Module({
  imports: [PrismaModule],
  controllers: [MarketingSeoController],
  providers: [MarketingSeoService],
  exports: [MarketingSeoService],
})
export class MarketingSeoModule {}
