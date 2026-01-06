import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Query,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { SearchService } from './search.service';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { AdminGuard } from '../auth/guards/admin.guard';
import { SearchProductsDto } from './dto/search-products.dto';
import { TrackSearchDto } from './dto/track-search.dto';
import { AutocompleteDto } from './dto/autocomplete.dto';
import { CreateSavedSearchDto, UpdateSavedSearchDto } from './dto/saved-search.dto';
import { TrackViewDto } from './dto/track-view.dto';
import { AuthRequest } from '../../common/types/auth-request.types';

@ApiTags('Search')
@Controller('search')
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Get('products')
  @ApiOperation({ summary: 'Search products with filters' })
  @ApiResponse({ status: 200, description: 'Search results returned successfully' })
  async searchProducts(@Query() searchDto: SearchProductsDto) {
    return this.searchService.searchProducts(searchDto);
  }

  @Get('autocomplete')
  @ApiOperation({ summary: 'Get autocomplete suggestions' })
  @ApiResponse({ status: 200, description: 'Autocomplete suggestions returned successfully' })
  async autocomplete(@Query() dto: AutocompleteDto) {
    return this.searchService.getAutocomplete(dto);
  }

  @Post('track')
  @ApiOperation({ summary: 'Track search query' })
  @ApiResponse({ status: 201, description: 'Search tracked successfully' })
  async trackSearch(@Body() dto: TrackSearchDto) {
    return this.searchService.trackSearch(dto);
  }

  @Put('track/:searchId/click')
  @ApiOperation({ summary: 'Update search with clicked item' })
  @ApiResponse({ status: 200, description: 'Search click tracked successfully' })
  async trackClick(
    @Param('searchId') searchId: string,
    @Body('productId') productId: string,
  ) {
    return this.searchService.updateSearchClick(searchId, productId);
  }

  @Put('track/:searchId/convert')
  @ApiOperation({ summary: 'Mark search as converted' })
  @ApiResponse({ status: 200, description: 'Search marked as converted' })
  async markConverted(@Param('searchId') searchId: string) {
    return this.searchService.markSearchConverted(searchId);
  }

  @Post('track-view')
  @ApiOperation({ summary: 'Track product view' })
  @ApiResponse({ status: 201, description: 'Product view tracked successfully' })
  async trackView(@Body() dto: TrackViewDto) {
    return this.searchService.trackProductView(dto);
  }

  @Get('popular')
  @ApiOperation({ summary: 'Get popular searches' })
  @ApiResponse({ status: 200, description: 'Popular searches returned successfully' })
  async getPopularSearches(
    @Query('limit') limit?: number,
    @Query('categoryId') categoryId?: string,
  ) {
    return this.searchService.getPopularSearches(limit ? Number(limit) : 10, categoryId);
  }

  @Get('trending')
  @ApiOperation({ summary: 'Get trending searches (last 7 days)' })
  @ApiResponse({ status: 200, description: 'Trending searches returned successfully' })
  async getTrendingSearches(@Query('limit') limit?: number) {
    return this.searchService.getTrendingSearches(limit ? Number(limit) : 10);
  }

  @Get('history')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get user search history' })
  @ApiResponse({ status: 200, description: 'Search history returned successfully' })
  async getSearchHistory(@Request() req: AuthRequest, @Query('limit') limit?: number) {
    return this.searchService.getUserSearchHistory(req.user.id, limit ? Number(limit) : 20);
  }

  @Delete('history')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Clear user search history' })
  @ApiResponse({ status: 200, description: 'Search history cleared successfully' })
  async clearHistory(@Request() req: AuthRequest) {
    return this.searchService.clearSearchHistory(req.user.id);
  }

  @Post('saved')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create saved search' })
  @ApiResponse({ status: 201, description: 'Saved search created successfully' })
  async createSavedSearch(@Request() req: AuthRequest, @Body() dto: CreateSavedSearchDto) {
    return this.searchService.createSavedSearch(req.user.id, dto);
  }

  @Get('saved')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get user saved searches' })
  @ApiResponse({ status: 200, description: 'Saved searches returned successfully' })
  async getSavedSearches(@Request() req: AuthRequest) {
    return this.searchService.getSavedSearches(req.user.id);
  }

  @Put('saved/:searchId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update saved search' })
  @ApiResponse({ status: 200, description: 'Saved search updated successfully' })
  async updateSavedSearch(
    @Request() req: AuthRequest,
    @Param('searchId') searchId: string,
    @Body() dto: UpdateSavedSearchDto,
  ) {
    return this.searchService.updateSavedSearch(req.user.id, searchId, dto);
  }

  @Delete('saved/:searchId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete saved search' })
  @ApiResponse({ status: 200, description: 'Saved search deleted successfully' })
  async deleteSavedSearch(@Request() req: AuthRequest, @Param('searchId') searchId: string) {
    return this.searchService.deleteSavedSearch(req.user.id, searchId);
  }

  @Get('analytics')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get search analytics' })
  @ApiResponse({ status: 200, description: 'Search analytics returned successfully' })
  async getAnalytics(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.searchService.getSearchAnalytics(
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate) : undefined,
    );
  }

  @Get('most-viewed')
  @ApiOperation({ summary: 'Get most viewed products' })
  @ApiResponse({ status: 200, description: 'Most viewed products returned successfully' })
  async getMostViewed(@Query('limit') limit?: number, @Query('days') days?: number) {
    return this.searchService.getMostViewedProducts(
      limit ? Number(limit) : 10,
      days ? Number(days) : 30,
    );
  }

  @Get('facets')
  @ApiOperation({ summary: 'Get search facets for filtering' })
  @ApiResponse({ status: 200, description: 'Search facets returned successfully' })
  async getSearchFacets(
    @Query('query') query?: string,
    @Query('filters') filters?: string,
  ) {
    const parsedFilters = filters ? JSON.parse(filters) : undefined;
    return this.searchService.getSearchFacets(query, parsedFilters);
  }

  @Get('provider')
  @ApiOperation({ summary: 'Get current search provider information' })
  @ApiResponse({ status: 200, description: 'Provider information returned successfully' })
  async getCurrentProvider() {
    return this.searchService.getCurrentProvider();
  }

  @Get('providers')
  @ApiOperation({ summary: 'Get all available search providers' })
  @ApiResponse({ status: 200, description: 'Available providers returned successfully' })
  async getAvailableProviders() {
    return this.searchService.getAvailableProviders();
  }

  @Post('index/product/:productId')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Index a product for search (Admin only)' })
  @ApiResponse({ status: 201, description: 'Product indexed successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin access required' })
  async indexProduct(@Param('productId') productId: string) {
    await this.searchService.indexProduct(productId);
    return { message: 'Product indexed successfully', productId };
  }

  @Post('index/bulk')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Bulk index products for search (Admin only)' })
  @ApiResponse({ status: 201, description: 'Products indexed successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin access required' })
  async bulkIndexProducts(@Body('productIds') productIds?: string[]) {
    return this.searchService.bulkIndexProducts(productIds);
  }

  @Delete('index/product/:productId')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete product from search index (Admin only)' })
  @ApiResponse({ status: 200, description: 'Product deleted from index successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin access required' })
  async deleteProductFromIndex(@Param('productId') productId: string) {
    await this.searchService.deleteProductFromIndex(productId);
    return { message: 'Product deleted from index successfully', productId };
  }

  @Put('index/product/:productId')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update product in search index (Admin only)' })
  @ApiResponse({ status: 200, description: 'Product updated in index successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin access required' })
  async updateProductInIndex(@Param('productId') productId: string) {
    await this.searchService.updateProductInIndex(productId);
    return { message: 'Product updated in index successfully', productId };
  }
}
