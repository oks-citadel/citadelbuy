import { Module, OnModuleInit, Logger } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { BullModule } from '@nestjs/bull';
import { CartService } from './cart.service';
import { CartController } from './cart.controller';
import { CartAbandonmentService } from './cart-abandonment.service';
import { CartAbandonmentController } from './cart-abandonment.controller';
import { CartAbandonmentQueueAdminController } from './cart-abandonment-admin.controller';
import { CartAbandonmentJobs } from './cart-abandonment.jobs';
import { CartAbandonmentProcessor, CART_ABANDONMENT_QUEUE } from './cart-abandonment.processor';
import { CartAbandonmentQueueService } from './cart-abandonment-queue.service';
import { PrismaModule } from '@/common/prisma/prisma.module';
import { EmailModule } from '@/modules/email/email.module';

@Module({
  imports: [
    PrismaModule,
    EmailModule,
    ConfigModule,
    // Optional: Bull Queue for advanced job processing
    // Can run alongside cron jobs or replace them for better scalability
    BullModule.registerQueueAsync({
      name: CART_ABANDONMENT_QUEUE,
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        redis: {
          host: configService.get('REDIS_HOST', 'localhost'),
          port: configService.get('REDIS_PORT', 6379),
          password: configService.get('REDIS_PASSWORD'),
          db: configService.get('REDIS_DB', 0),
        },
        defaultJobOptions: {
          removeOnComplete: true,
          removeOnFail: false,
          attempts: 3,
        },
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [
    CartController,
    CartAbandonmentController,
    CartAbandonmentQueueAdminController,
  ],
  providers: [
    CartService,
    CartAbandonmentService,
    CartAbandonmentJobs,
    CartAbandonmentProcessor,
    CartAbandonmentQueueService,
  ],
  exports: [CartService, CartAbandonmentService, CartAbandonmentQueueService],
})
export class CartModule implements OnModuleInit {
  private readonly logger = new Logger(CartModule.name);

  constructor(
    private readonly queueService: CartAbandonmentQueueService,
    private readonly configService: ConfigService,
  ) {}

  async onModuleInit() {
    // Initialize recurring queue jobs on module startup
    // Only initialize if Redis is configured
    const redisHost = this.configService.get('REDIS_HOST');
    if (redisHost && redisHost !== 'localhost') {
      try {
        await this.queueService.initializeRecurringJobs();
        this.logger.log('Cart abandonment queue jobs initialized successfully');
      } catch (error) {
        this.logger.error('Failed to initialize cart abandonment queue jobs:', error);
        // Don't throw - allow app to start even if queue initialization fails
        // Cron jobs will still work as fallback
      }
    } else {
      this.logger.log('Redis not configured - using cron jobs only for cart abandonment');
    }
  }
}
