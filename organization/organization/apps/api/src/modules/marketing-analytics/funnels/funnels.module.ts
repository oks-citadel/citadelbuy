import { Module } from '@nestjs/common';
import { FunnelsController } from './funnels.controller';
import { FunnelsService } from './funnels.service';
import { PrismaModule } from '@/common/prisma/prisma.module';
import { RedisModule } from '@/common/redis/redis.module';

@Module({
  imports: [PrismaModule, RedisModule],
  controllers: [FunnelsController],
  providers: [FunnelsService],
  exports: [FunnelsService],
})
export class FunnelsModule {}
