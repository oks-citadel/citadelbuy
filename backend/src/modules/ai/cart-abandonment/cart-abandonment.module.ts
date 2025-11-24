import { Module } from '@nestjs/common';
import { CartAbandonmentController } from './cart-abandonment.controller';
import { CartAbandonmentService } from './cart-abandonment.service';
import { RecoveryStrategyService } from './recovery-strategy.service';

@Module({
  controllers: [CartAbandonmentController],
  providers: [CartAbandonmentService, RecoveryStrategyService],
  exports: [CartAbandonmentService, RecoveryStrategyService],
})
export class CartAbandonmentModule {}
