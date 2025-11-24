import { Module } from '@nestjs/common';
import { CouponsService } from './coupons.service';
import { CouponsController, AutomaticDiscountsController } from './coupons.controller';
import { PrismaModule } from '@/common/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [CouponsController, AutomaticDiscountsController],
  providers: [CouponsService],
  exports: [CouponsService],
})
export class CouponsModule {}
