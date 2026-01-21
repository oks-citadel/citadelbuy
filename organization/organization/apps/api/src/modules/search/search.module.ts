import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { SearchService } from './search.service';
import { SearchController } from './search.controller';
import { SearchAdminController } from './search-admin.controller';
import { PrismaModule } from '@/common/prisma/prisma.module';
import { SearchProviderFactory } from './providers/search-provider.factory';
import { ProductSearchListener } from './listeners/product-search.listener';
import { SearchIndexingService } from './services/search-indexing.service';
import { CategoryVendorIndexingService } from './services/category-vendor-indexing.service';

@Module({
  imports: [PrismaModule, ConfigModule],
  controllers: [SearchController, SearchAdminController],
  providers: [
    SearchService,
    SearchProviderFactory,
    ProductSearchListener,
    SearchIndexingService,
    CategoryVendorIndexingService,
  ],
  exports: [
    SearchService,
    SearchProviderFactory,
    SearchIndexingService,
    CategoryVendorIndexingService,
  ],
})
export class SearchModule {}
