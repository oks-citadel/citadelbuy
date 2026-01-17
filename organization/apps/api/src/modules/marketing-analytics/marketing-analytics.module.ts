import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { ConfigModule, ConfigService } from '@nestjs/config';

// Sub-modules
import { EventsModule } from './events/events.module';
import { FunnelsModule } from './funnels/funnels.module';
import { CohortsModule } from './cohorts/cohorts.module';
import { AttributionModule } from './attribution/attribution.module';
import { SessionsModule } from './sessions/sessions.module';
import { BehaviorModule } from './behavior/behavior.module';
import { RealtimeModule } from './realtime/realtime.module';

// Core dependencies
import { PrismaModule } from '@/common/prisma/prisma.module';
import { RedisModule } from '@/common/redis/redis.module';

/**
 * Marketing Analytics Module
 *
 * Self-hosted analytics platform providing comprehensive
 * tracking and analysis capabilities without external dependencies.
 *
 * Features:
 * - Event Ingestion: Track user events with idempotency and batch support
 * - Funnel Analysis: Define and analyze conversion funnels
 * - Cohort Analysis: User segmentation, retention, LTV, and churn
 * - Multi-touch Attribution: Multiple attribution models
 * - Session Analytics: Session metrics and individual session analysis
 * - Behavior Analytics: Heatmaps, clickmaps, scroll depth, recordings
 * - Real-time Analytics: Live users, events, and metrics via WebSocket
 *
 * Key Technical Features:
 * - Idempotent event ingestion (no duplicates)
 * - Async processing via Bull queues
 * - Aggregates stored in PostgreSQL
 * - Real-time data in Redis
 * - Materialized views for fast queries
 * - Sampling support for high-volume events
 *
 * API Endpoints:
 * - POST /events/ingest - Single event ingestion
 * - POST /events/batch - Batch event ingestion (up to 1000)
 * - GET /events/schema - Event schema definitions
 * - POST /events/validate - Validate event payload
 *
 * - GET /analytics/funnels - List all funnels
 * - POST /analytics/funnels - Create funnel
 * - GET /analytics/funnels/{id} - Get funnel analysis
 * - GET /analytics/funnels/{id}/conversion - Conversion rates
 *
 * - GET /analytics/cohorts - List cohorts
 * - POST /analytics/cohorts - Create cohort
 * - GET /analytics/cohorts/{id} - Cohort analysis
 * - GET /analytics/retention - Retention curves
 * - GET /analytics/ltv - Customer lifetime value
 * - GET /analytics/churn - Churn analysis
 *
 * - GET /analytics/attribution - Multi-touch attribution
 * - GET /analytics/attribution/models - Available models
 * - GET /analytics/journey - Customer journey mapping
 * - GET /analytics/touchpoints - Touchpoint analysis
 *
 * - GET /analytics/sessions - Session metrics
 * - GET /analytics/sessions/{id} - Session detail
 * - GET /analytics/sessions/{id}/events - Events in session
 *
 * - GET /analytics/heatmaps - Heatmap data
 * - GET /analytics/recordings - Session replay metadata
 * - GET /analytics/scrollmaps - Scroll depth analysis
 * - GET /analytics/clickmaps - Click pattern analysis
 *
 * - GET /analytics/realtime/users - Active users now
 * - GET /analytics/realtime/events - Event stream
 * - WebSocket /analytics/realtime/stream - Real-time event stream
 */
@Module({
  imports: [
    ConfigModule,
    PrismaModule,
    RedisModule,
    BullModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        redis: {
          host: configService.get<string>('REDIS_HOST', 'localhost'),
          port: configService.get<number>('REDIS_PORT', 6379),
          password: configService.get<string>('REDIS_PASSWORD'),
        },
        defaultJobOptions: {
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 1000,
          },
          removeOnComplete: 100,
          removeOnFail: 1000,
        },
      }),
      inject: [ConfigService],
    }),

    // Feature modules
    EventsModule,
    FunnelsModule,
    CohortsModule,
    AttributionModule,
    SessionsModule,
    BehaviorModule,
    RealtimeModule,
  ],
  exports: [
    EventsModule,
    FunnelsModule,
    CohortsModule,
    AttributionModule,
    SessionsModule,
    BehaviorModule,
    RealtimeModule,
  ],
})
export class MarketingAnalyticsModule {}
