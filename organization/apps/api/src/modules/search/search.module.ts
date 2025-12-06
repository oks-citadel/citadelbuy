import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { SearchService } from './search.service';
import { SearchController } from './search.controller';
import { SearchAdminController } from './search-admin.controller';
import { PrismaModule } from '@/common/prisma/prisma.module';
import { SearchProviderFactory } from './providers/search-provider.factory';
import { ProductSearchListener } from './listeners/product-search.listener';

@Module({
  imports: [PrismaModule, ConfigModule],
  controllers: [SearchController, SearchAdminController],
  providers: [SearchService, SearchProviderFactory, ProductSearchListener],
  exports: [SearchService, SearchProviderFactory],
})
export class SearchModule {}
