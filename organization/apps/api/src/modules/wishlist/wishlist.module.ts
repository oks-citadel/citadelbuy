import { Module } from '@nestjs/common';
import { WishlistService } from './wishlist.service';
import { WishlistController, SharedWishlistController } from './wishlist.controller';
import { PrismaModule } from '@/common/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [WishlistController, SharedWishlistController],
  providers: [WishlistService],
  exports: [WishlistService],
})
export class WishlistModule {}
