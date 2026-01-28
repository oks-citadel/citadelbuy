import { Module } from '@nestjs/common';
import { WishlistService } from './wishlist.service';
import { WishlistNotificationService } from './wishlist-notification.service';
import { WishlistController, SharedWishlistController } from './wishlist.controller';
import { PrismaModule } from '@/common/prisma/prisma.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [PrismaModule, NotificationsModule],
  controllers: [WishlistController, SharedWishlistController],
  providers: [WishlistService, WishlistNotificationService],
  exports: [WishlistService, WishlistNotificationService],
})
export class WishlistModule {}
