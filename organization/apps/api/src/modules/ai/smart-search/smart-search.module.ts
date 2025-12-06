import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { SmartSearchController } from './smart-search.controller';
import { SmartSearchService } from './smart-search.service';
import { AutocompleteService } from './autocomplete.service';
import { PrismaModule } from '@/common/prisma/prisma.module';

@Module({
  imports: [PrismaModule, ConfigModule],
  controllers: [SmartSearchController],
  providers: [SmartSearchService, AutocompleteService],
  exports: [SmartSearchService, AutocompleteService],
})
export class SmartSearchModule {}
