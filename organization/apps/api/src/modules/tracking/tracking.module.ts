/**
 * Tracking Module
 * Provides server-side tracking services for advertising platforms
 */

import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';
import { MetaConversionsService } from './meta-conversions.service';
import { TikTokEventsService } from './tiktok-events.service';
import { ServerTrackingService } from './server-tracking.service';

@Module({
  imports: [
    HttpModule,
    ConfigModule,
  ],
  providers: [
    MetaConversionsService,
    TikTokEventsService,
    ServerTrackingService,
  ],
  exports: [
    MetaConversionsService,
    TikTokEventsService,
    ServerTrackingService,
  ],
})
export class TrackingModule {}
