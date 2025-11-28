import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { SearchService } from './search.service';
import { SearchController } from './search.controller';
import { PrismaModule } from '@/common/prisma/prisma.module';
import { SearchProviderFactory } from './providers/search-provider.factory';

@Module({
  imports: [PrismaModule, ConfigModule],
  controllers: [SearchController],
  providers: [SearchService, SearchProviderFactory],
  exports: [SearchService, SearchProviderFactory],
})
export class SearchModule {}
