import { Module } from '@nestjs/common';
import { PrismaModule } from '../../common/prisma/prisma.module';

// Legacy services (existing)
import { CampaignService } from './campaign.service';
import { CampaignController } from './campaign.controller';
import { LandingPageService } from './landing-page.service';
import { LandingPageController } from './landing-page.controller';
import { EmailAutomationService } from './email-automation.service';
import { ABMService } from './abm.service';

// New Marketing Sub-Modules
import { MarketingSeoModule } from './seo';
import { ContentModule } from './content';
import { MarketingGrowthModule } from './growth';
import { LifecycleModule } from './lifecycle';
import { MarketingAnalyticsModule } from './analytics';
import { MarketingPersonalizationModule } from './personalization';
import { ExperimentsModule } from './experiments';
import { ReputationModule } from './reputation';
import { LocalizationModule } from './localization';
import { CommerceModule } from './commerce';
import { AiMarketingModule } from './ai';

@Module({
  imports: [
    PrismaModule,
    // Marketing Sub-Modules
    MarketingSeoModule,
    ContentModule,
    MarketingGrowthModule,
    LifecycleModule,
    MarketingAnalyticsModule,
    MarketingPersonalizationModule,
    ExperimentsModule,
    ReputationModule,
    LocalizationModule,
    CommerceModule,
    AiMarketingModule,
  ],
  controllers: [CampaignController, LandingPageController],
  providers: [CampaignService, LandingPageService, EmailAutomationService, ABMService],
  exports: [
    // Legacy exports
    CampaignService,
    LandingPageService,
    EmailAutomationService,
    ABMService,
    // Re-export sub-modules for external access
    MarketingSeoModule,
    ContentModule,
    MarketingGrowthModule,
    LifecycleModule,
    MarketingAnalyticsModule,
    MarketingPersonalizationModule,
    ExperimentsModule,
    ReputationModule,
    LocalizationModule,
    CommerceModule,
    AiMarketingModule,
  ],
})
export class MarketingModule {}
