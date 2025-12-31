import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { VendorsController } from './vendors.controller';
import { VendorsService } from './vendors.service';
import { VendorAnalyticsController } from './vendor-analytics.controller';
import { VendorAnalyticsService } from './vendor-analytics.service';
import { BulkUploadController } from './bulk-upload.controller';
import { BulkUploadService } from './bulk-upload.service';
import { VendorPayoutsController, AdminPayoutsController } from './vendor-payouts.controller';
import { VendorPayoutsService } from './vendor-payouts.service';
import {
  FeaturedProductsController,
  VendorFeaturedListingsController,
  AdminFeaturedListingsController,
} from './featured-listings.controller';
import { FeaturedListingsService } from './featured-listings.service';
import { VendorCommissionsController, AdminCommissionsController } from './vendor-commissions.controller';
import { VendorCommissionsService } from './vendor-commissions.service';
import { PrismaModule } from '@/common/prisma/prisma.module';

@Module({
  imports: [PrismaModule, ConfigModule],
  controllers: [
    VendorsController,
    VendorAnalyticsController,
    BulkUploadController,
    VendorPayoutsController,
    AdminPayoutsController,
    FeaturedProductsController,
    VendorFeaturedListingsController,
    AdminFeaturedListingsController,
    VendorCommissionsController,
    AdminCommissionsController,
  ],
  providers: [
    VendorsService,
    VendorAnalyticsService,
    BulkUploadService,
    VendorPayoutsService,
    FeaturedListingsService,
    VendorCommissionsService,
  ],
  exports: [
    VendorsService,
    VendorAnalyticsService,
    BulkUploadService,
    VendorPayoutsService,
    FeaturedListingsService,
    VendorCommissionsService,
  ],
})
export class VendorsModule {}
