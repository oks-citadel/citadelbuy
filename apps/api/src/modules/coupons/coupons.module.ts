import { Module, forwardRef } from '@nestjs/common';
import { CouponsService } from './coupons.service';
import { CouponsController, AutomaticDiscountsController } from './coupons.controller';
import { VendorCouponsService } from './vendor-coupons.service';
import { VendorCouponsController } from './vendor-coupons.controller';
import { MarketingCampaignsService } from './marketing-campaigns.service';
import { MarketingCampaignsController } from './marketing-campaigns.controller';
import { PrismaModule } from '@/common/prisma/prisma.module';
import { VendorsModule } from '../vendors/vendors.module';

@Module({
  imports: [
    PrismaModule,
    forwardRef(() => VendorsModule),
  ],
  controllers: [
    CouponsController,
    AutomaticDiscountsController,
    VendorCouponsController,
    MarketingCampaignsController,
  ],
  providers: [
    CouponsService,
    VendorCouponsService,
    MarketingCampaignsService,
  ],
  exports: [
    CouponsService,
    VendorCouponsService,
    MarketingCampaignsService,
  ],
})
export class CouponsModule {}
