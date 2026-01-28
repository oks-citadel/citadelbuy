import { Module, Global } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { SentryService } from './sentry.service';

/**
 * Sentry Monitoring Module
 * Provides error tracking and performance monitoring
 */
@Global()
@Module({
  imports: [ConfigModule],
  providers: [SentryService],
  exports: [SentryService],
})
export class SentryModule {}
