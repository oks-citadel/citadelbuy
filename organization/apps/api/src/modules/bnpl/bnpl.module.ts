import { Module } from '@nestjs/common';
import { BnplService } from './bnpl.service';
import { BnplController } from './bnpl.controller';
import { PrismaModule } from '@/common/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [BnplController],
  providers: [BnplService],
  exports: [BnplService],
})
export class BnplModule {}
