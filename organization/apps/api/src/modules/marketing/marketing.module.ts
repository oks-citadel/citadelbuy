import { Module } from '@nestjs/common';
import { PrismaModule } from '../../common/prisma/prisma.module';
import { CampaignService } from './campaign.service';
import { CampaignController } from './campaign.controller';
import { LandingPageService } from './landing-page.service';
import { LandingPageController } from './landing-page.controller';
import { EmailAutomationService } from './email-automation.service';
import { ABMService } from './abm.service';

@Module({
  imports: [PrismaModule],
  controllers: [CampaignController, LandingPageController],
  providers: [CampaignService, LandingPageService, EmailAutomationService, ABMService],
  exports: [CampaignService, LandingPageService, EmailAutomationService, ABMService],
})
export class MarketingModule {}
