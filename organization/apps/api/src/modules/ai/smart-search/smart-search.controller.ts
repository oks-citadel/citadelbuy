import { Controller, Get, Post, Query, Body } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { SmartSearchService } from './smart-search.service';
import { AutocompleteService } from './autocomplete.service';

@ApiTags('AI - Smart Search')
@Controller('ai/smart-search')
export class SmartSearchController {
  constructor(
    private readonly smartSearchService: SmartSearchService,
    private readonly autocompleteService: AutocompleteService,
  ) {}

  @Get('search')
  @ApiOperation({ summary: 'Smart search with typo tolerance and semantic understanding' })
  async smartSearch(@Query('q') query: string, @Query('userId') userId?: string) {
    return this.smartSearchService.search(query, userId);
  }

  @Get('autocomplete')
  @ApiOperation({ summary: 'Intelligent autocomplete suggestions' })
  async autocomplete(@Query('q') query: string, @Query('userId') userId?: string) {
    return this.autocompleteService.getSuggestions(query, userId);
  }

  @Get('trending')
  @ApiOperation({ summary: 'Get trending search queries' })
  async getTrending() {
    return this.smartSearchService.getTrendingQueries();
  }

  @Post('track')
  @ApiOperation({ summary: 'Track search query for analytics' })
  async trackSearch(@Body() trackData: { query: string; userId?: string; results: number }) {
    return this.smartSearchService.trackQuery(trackData);
  }

  @Get('semantic')
  @ApiOperation({ summary: 'Semantic search understanding intent' })
  async semanticSearch(@Query('q') query: string) {
    return this.smartSearchService.semanticSearch(query);
  }

  @Get('suggestions/popular')
  @ApiOperation({ summary: 'Get popular search suggestions' })
  async getPopularSuggestions(@Query('category') category?: string) {
    return this.smartSearchService.getPopularSearches(category);
  }
}
