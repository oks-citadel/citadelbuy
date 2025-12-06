import { Module } from '@nestjs/common';
import { OrderTrackingController } from './order-tracking.controller';
import { OrderTrackingService } from './order-tracking.service';
import { PrismaModule } from '../../common/prisma/prisma.module';
import { ShippingModule } from '../shipping/shipping.module';

@Module({
  imports: [PrismaModule, ShippingModule],
  controllers: [OrderTrackingController],
  providers: [OrderTrackingService],
  exports: [OrderTrackingService],
})
export class OrderTrackingModule {}
