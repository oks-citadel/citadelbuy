import { Module } from '@nestjs/common';
import { PrismaModule } from '../../common/prisma/prisma.module';
import { GrowthAnalyticsService } from './analytics.service';
import { LeadScoringService } from './lead-scoring.service';
import { RetentionService } from './retention.service';
import { ReferralService } from './referral.service';

@Module({
  imports: [PrismaModule],
  providers: [
    GrowthAnalyticsService,
    LeadScoringService,
    RetentionService,
    ReferralService,
  ],
  exports: [
    GrowthAnalyticsService,
    LeadScoringService,
    RetentionService,
    ReferralService,
  ],
})
export class GrowthModule {}
