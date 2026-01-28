import { Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';
import { HttpModule } from '@nestjs/axios';
import { BullModule } from '@nestjs/bull';
import { HealthController } from './health.controller';
import { QueueHealthIndicator } from './queue-health.service';
import { PrismaModule } from '@/common/prisma/prisma.module';
import { RedisModule } from '@/common/redis/redis.module';
import { QUEUES } from '@/common/queue/queue.constants';

@Module({
  imports: [
    TerminusModule,
    HttpModule,
    PrismaModule,
    RedisModule,
    // Register queues for health monitoring
    BullModule.registerQueue(
      { name: QUEUES.FX_REFRESH },
      { name: QUEUES.TRANSLATION },
      { name: QUEUES.PRODUCT_SYNC },
      { name: QUEUES.SITEMAP },
      { name: QUEUES.DOMAIN_VERIFICATION },
    ),
  ],
  controllers: [HealthController],
  providers: [QueueHealthIndicator],
  exports: [QueueHealthIndicator],
})
export class HealthModule {}
