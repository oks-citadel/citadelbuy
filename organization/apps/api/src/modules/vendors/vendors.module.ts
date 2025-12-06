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
  ],
  providers: [
    VendorsService,
    VendorAnalyticsService,
    BulkUploadService,
    VendorPayoutsService,
    FeaturedListingsService,
  ],
  exports: [
    VendorsService,
    VendorAnalyticsService,
    BulkUploadService,
    VendorPayoutsService,
    FeaturedListingsService,
  ],
})
export class VendorsModule {}
