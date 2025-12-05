import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { EmailService } from './email.service';
import { EmailController } from './email.controller';
import { EmailQueueService } from './email-queue.service';
import { EmailProcessor } from './email.processor';
import { PrismaModule } from '@/common/prisma/prisma.module';
import { AlertModule } from '@/common/alerts/alert.module';

@Module({
  imports: [
    PrismaModule,
    AlertModule,
    BullModule.registerQueue({
      name: 'email',
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
        removeOnComplete: {
          age: 24 * 60 * 60,
          count: 1000,
        },
        removeOnFail: {
          age: 7 * 24 * 60 * 60,
        },
      },
    }),
  ],
  controllers: [EmailController],
  providers: [
    EmailService,
    EmailQueueService,
    EmailProcessor,
  ],
  exports: [EmailService, EmailQueueService],
})
export class EmailModule {}
