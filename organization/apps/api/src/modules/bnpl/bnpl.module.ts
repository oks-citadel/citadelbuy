import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';
import { BnplService } from './bnpl.service';
import { BnplController } from './bnpl.controller';
import { PrismaModule } from '@/common/prisma/prisma.module';
import { BnplProviderService } from './services/bnpl-provider.service';

@Module({
  imports: [
    PrismaModule,
    ConfigModule,
    HttpModule.register({
      timeout: 30000,
      maxRedirects: 5,
    }),
  ],
  controllers: [BnplController],
  providers: [BnplService, BnplProviderService],
  exports: [BnplService, BnplProviderService],
})
export class BnplModule {}
