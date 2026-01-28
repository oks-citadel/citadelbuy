import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { I18nController } from './i18n.controller';
import { I18nService } from './i18n.service';
import { TranslationProcessor } from './workers/translation.processor';
import { PrismaModule } from '@/common/prisma/prisma.module';
import { RedisModule } from '@/common/redis/redis.module';
import { QUEUES } from '@/common/queue/queue.constants';

@Module({
  imports: [
    PrismaModule,
    RedisModule,
    BullModule.registerQueue({
      name: QUEUES.TRANSLATION,
    }),
  ],
  controllers: [I18nController],
  providers: [I18nService, TranslationProcessor],
  exports: [I18nService, TranslationProcessor],
})
export class I18nModule {}
