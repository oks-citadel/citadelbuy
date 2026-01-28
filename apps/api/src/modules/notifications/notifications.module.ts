import { Module } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { NotificationsController } from './notifications.controller';
import { PushNotificationService } from './push-notification.service';
import { SmsService } from './sms.service';
import { PrismaModule } from '@/common/prisma/prisma.module';
import { EmailModule } from '@/modules/email/email.module';

@Module({
  imports: [PrismaModule, EmailModule],
  controllers: [NotificationsController],
  providers: [NotificationsService, PushNotificationService, SmsService],
  exports: [NotificationsService, PushNotificationService, SmsService],
})
export class NotificationsModule {}
