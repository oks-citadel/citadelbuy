import { Module } from '@nestjs/common';
import { SearchService } from './search.service';
import { SearchController } from './search.controller';
import { PrismaModule } from '@/common/prisma/prisma.module';
import { SearchProviderFactory } from './providers/search-provider.factory';

@Module({
  imports: [PrismaModule],
  controllers: [SearchController],
  providers: [SearchService, SearchProviderFactory],
  exports: [SearchService, SearchProviderFactory],
})
export class SearchModule {}
