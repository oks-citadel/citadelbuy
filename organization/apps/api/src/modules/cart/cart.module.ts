import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { ConfigModule } from '@nestjs/config';
import { CartService } from './cart.service';
import { CartController } from './cart.controller';
import { CartAbandonmentService } from './cart-abandonment.service';
import { CartAbandonmentController } from './cart-abandonment.controller';
import { CartAbandonmentJobs } from './cart-abandonment.jobs';
import { PrismaModule } from '@/common/prisma/prisma.module';
import { EmailModule } from '@/modules/email/email.module';

@Module({
  imports: [
    PrismaModule,
    EmailModule,
    ConfigModule,
    ScheduleModule.forRoot(),
  ],
  controllers: [CartController, CartAbandonmentController],
  providers: [CartService, CartAbandonmentService, CartAbandonmentJobs],
  exports: [CartService, CartAbandonmentService],
})
export class CartModule {}
