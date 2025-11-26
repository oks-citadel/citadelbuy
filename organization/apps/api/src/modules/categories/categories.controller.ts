import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  Request,
  ParseBoolPipe,
  DefaultValuePipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
  ApiParam,
} from '@nestjs/swagger';
import { CategoriesService } from './categories.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import {
  QueryCategoriesDto,
  CategoryTreeQueryDto,
  CategorySearchDto,
  TrendingCategoriesDto,
  CategoryViewDto,
  BulkCategoriesDto,
  MoveCategoryDto,
  ReorderCategoryDto,
} from './dto/query-category.dto';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { RolesGuard } from '@/common/guards/roles.guard';
import { Roles } from '@/common/decorators/roles.decorator';
import { UserRole, CategoryStatus } from '@prisma/client';
import { AuthRequest } from '@/common/types/auth-request.types';

@ApiTags('categories')
@Controller('categories')
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  // ==================== PUBLIC ENDPOINTS ====================

  @Get()
  @ApiOperation({ summary: 'Get list of categories with filtering and pagination' })
  @ApiResponse({ status: 200, description: 'List of categories' })
  findAll(@Query() query: QueryCategoriesDto) {
    return this.categoriesService.findAll(query);
  }

  @Get('tree')
  @ApiOperation({ summary: 'Get hierarchical category tree' })
  @ApiResponse({ status: 200, description: 'Category tree structure' })
  getTree(@Query() query: CategoryTreeQueryDto) {
    return this.categoriesService.getTree(query);
  }

  @Get('featured')
  @ApiOperation({ summary: 'Get featured categories for homepage' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Number of categories (default: 10)' })
  @ApiResponse({ status: 200, description: 'Featured categories' })
  getFeatured(@Query('limit', new DefaultValuePipe(10)) limit: number) {
    return this.categoriesService.getFeatured(limit);
  }

  @Get('trending')
  @ApiOperation({ summary: 'Get trending categories by views/sales' })
  @ApiResponse({ status: 200, description: 'Trending categories' })
  getTrending(@Query() query: TrendingCategoriesDto) {
    return this.categoriesService.getTrending(query);
  }

  @Get('search')
  @ApiOperation({ summary: 'Search categories with autocomplete' })
  @ApiResponse({ status: 200, description: 'Search results' })
  search(@Query() query: CategorySearchDto) {
    return this.categoriesService.search(query);
  }

  @Get('top-level')
  @ApiOperation({ summary: 'Get top-level categories (root categories)' })
  @ApiResponse({ status: 200, description: 'List of top-level categories' })
  getTopLevelCategories() {
    return this.categoriesService.getTopLevelCategories();
  }

  @Get('slug/:slug')
  @ApiOperation({ summary: 'Get a category by slug' })
  @ApiParam({ name: 'slug', description: 'Category slug' })
  @ApiQuery({ name: 'includeBreadcrumb', required: false, type: Boolean })
  @ApiQuery({ name: 'includeChildren', required: false, type: Boolean })
  @ApiResponse({ status: 200, description: 'Category found' })
  @ApiResponse({ status: 404, description: 'Category not found' })
  findBySlug(
    @Param('slug') slug: string,
    @Query('includeBreadcrumb', new DefaultValuePipe(false), ParseBoolPipe) includeBreadcrumb: boolean,
    @Query('includeChildren', new DefaultValuePipe(false), ParseBoolPipe) includeChildren: boolean,
  ) {
    return this.categoriesService.findBySlug(slug, { includeBreadcrumb, includeChildren });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a category by ID' })
  @ApiParam({ name: 'id', description: 'Category ID' })
  @ApiQuery({ name: 'includeBreadcrumb', required: false, type: Boolean })
  @ApiQuery({ name: 'includeChildren', required: false, type: Boolean })
  @ApiQuery({ name: 'includeSiblings', required: false, type: Boolean })
  @ApiQuery({ name: 'includeFilters', required: false, type: Boolean })
  @ApiResponse({ status: 200, description: 'Category found' })
  @ApiResponse({ status: 404, description: 'Category not found' })
  findOne(
    @Param('id') id: string,
    @Query('includeBreadcrumb', new DefaultValuePipe(false), ParseBoolPipe) includeBreadcrumb: boolean,
    @Query('includeChildren', new DefaultValuePipe(false), ParseBoolPipe) includeChildren: boolean,
    @Query('includeSiblings', new DefaultValuePipe(false), ParseBoolPipe) includeSiblings: boolean,
    @Query('includeFilters', new DefaultValuePipe(false), ParseBoolPipe) includeFilters: boolean,
  ) {
    return this.categoriesService.findOne(id, {
      includeBreadcrumb,
      includeChildren,
      includeSiblings,
      includeFilters,
    });
  }

  @Get(':id/products')
  @ApiOperation({ summary: 'Get products in a category with filtering' })
  @ApiParam({ name: 'id', description: 'Category ID' })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Page number (default: 1)' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Items per page (default: 24)' })
  @ApiQuery({ name: 'sort', required: false, type: String, description: 'Sort by: price_asc, price_desc, newest, popular' })
  @ApiQuery({ name: 'priceMin', required: false, type: Number })
  @ApiQuery({ name: 'priceMax', required: false, type: Number })
  @ApiQuery({ name: 'inStock', required: false, type: Boolean })
  @ApiResponse({ status: 200, description: 'Products in the category' })
  @ApiResponse({ status: 404, description: 'Category not found' })
  getProductsByCategory(
    @Param('id') id: string,
    @Query('page', new DefaultValuePipe(1)) page: number,
    @Query('limit', new DefaultValuePipe(24)) limit: number,
    @Query('sort') sort?: string,
    @Query('priceMin') priceMin?: number,
    @Query('priceMax') priceMax?: number,
    @Query('inStock') inStock?: boolean,
  ) {
    return this.categoriesService.getProductsByCategory(id, page, limit, {
      sort,
      priceMin,
      priceMax,
      inStock,
    });
  }

  @Get(':id/filters')
  @ApiOperation({ summary: 'Get available filters for a category' })
  @ApiParam({ name: 'id', description: 'Category ID' })
  @ApiResponse({ status: 200, description: 'Category filters' })
  getFilters(@Param('id') id: string) {
    return this.categoriesService.getFilters(id);
  }

  @Get(':id/breadcrumb')
  @ApiOperation({ summary: 'Get breadcrumb path for a category' })
  @ApiParam({ name: 'id', description: 'Category ID' })
  @ApiResponse({ status: 200, description: 'Breadcrumb path' })
  getBreadcrumb(@Param('id') id: string) {
    return this.categoriesService.getBreadcrumb(id);
  }

  @Post(':id/view')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Track category view for analytics' })
  @ApiParam({ name: 'id', description: 'Category ID' })
  @ApiResponse({ status: 200, description: 'View tracked' })
  trackView(
    @Param('id') id: string,
    @Body() viewDto: CategoryViewDto,
    @Request() req: any,
  ) {
    return this.categoriesService.trackView(id, {
      userId: viewDto.userId,
      sessionId: viewDto.sessionId,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      referer: req.headers['referer'],
    });
  }

  // ==================== ADMIN ENDPOINTS ====================

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new category (Admin only)' })
  @ApiResponse({ status: 201, description: 'Category created successfully' })
  @ApiResponse({ status: 409, description: 'Category with this slug already exists' })
  create(@Body() createCategoryDto: CreateCategoryDto, @Request() req: AuthRequest) {
    return this.categoriesService.create(createCategoryDto, req.user?.id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a category (Admin only)' })
  @ApiParam({ name: 'id', description: 'Category ID' })
  @ApiResponse({ status: 200, description: 'Category updated successfully' })
  @ApiResponse({ status: 404, description: 'Category not found' })
  update(
    @Param('id') id: string,
    @Body() updateCategoryDto: UpdateCategoryDto,
    @Request() req: AuthRequest,
  ) {
    return this.categoriesService.update(id, updateCategoryDto, req.user?.id);
  }

  @Patch(':id/status')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update category status (Admin only)' })
  @ApiParam({ name: 'id', description: 'Category ID' })
  @ApiResponse({ status: 200, description: 'Status updated' })
  updateStatus(
    @Param('id') id: string,
    @Body('status') status: CategoryStatus,
    @Request() req: AuthRequest,
  ) {
    return this.categoriesService.updateStatus(id, status, req.user?.id);
  }

  @Post(':id/move')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Move category to different parent (Admin only)' })
  @ApiParam({ name: 'id', description: 'Category ID' })
  @ApiResponse({ status: 200, description: 'Category moved' })
  move(
    @Param('id') id: string,
    @Body() moveDto: MoveCategoryDto,
    @Request() req: AuthRequest,
  ) {
    return this.categoriesService.move(id, moveDto, req.user?.id);
  }

  @Patch(':id/reorder')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Reorder category (Admin only)' })
  @ApiParam({ name: 'id', description: 'Category ID' })
  @ApiResponse({ status: 200, description: 'Category reordered' })
  reorder(
    @Param('id') id: string,
    @Body() reorderDto: ReorderCategoryDto,
    @Request() req: AuthRequest,
  ) {
    return this.categoriesService.reorder(id, reorderDto, req.user?.id);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete a category (Admin only)' })
  @ApiParam({ name: 'id', description: 'Category ID' })
  @ApiQuery({ name: 'force', required: false, type: Boolean, description: 'Force permanent delete' })
  @ApiResponse({ status: 200, description: 'Category deleted successfully' })
  @ApiResponse({ status: 400, description: 'Cannot delete category with products or children' })
  @ApiResponse({ status: 404, description: 'Category not found' })
  remove(
    @Param('id') id: string,
    @Query('force', new DefaultValuePipe(false), ParseBoolPipe) force: boolean,
  ) {
    return this.categoriesService.remove(id, force);
  }

  @Post(':id/restore')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Restore soft-deleted category (Admin only)' })
  @ApiParam({ name: 'id', description: 'Category ID' })
  @ApiResponse({ status: 200, description: 'Category restored' })
  restore(@Param('id') id: string) {
    return this.categoriesService.restore(id);
  }

  @Post('bulk')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Bulk create/update/delete categories (Admin only)' })
  @ApiResponse({ status: 200, description: 'Bulk operation completed' })
  bulkOperation(@Body() bulkDto: BulkCategoriesDto, @Request() req: AuthRequest) {
    return this.categoriesService.bulkOperation(bulkDto, req.user?.id);
  }
}
