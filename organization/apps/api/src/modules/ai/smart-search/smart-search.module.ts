import { Module } from '@nestjs/common';
import { SmartSearchController } from './smart-search.controller';
import { SmartSearchService } from './smart-search.service';
import { AutocompleteService } from './autocomplete.service';

@Module({
  controllers: [SmartSearchController],
  providers: [SmartSearchService, AutocompleteService],
  exports: [SmartSearchService, AutocompleteService],
})
export class SmartSearchModule {}
