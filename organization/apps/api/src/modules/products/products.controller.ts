import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ProductsService } from './products.service';
import { QueryProductsDto } from './dto/query-products.dto';
import { CreateProductDto } from './dto/create-product.dto';

@ApiTags('Products')
@Controller('products')
export class ProductsController {
  constructor(private productsService: ProductsService) {}

  @Get()
  @ApiOperation({
    summary: 'Get all products with filtering and pagination',
    description: 'Retrieves a paginated list of products with optional filtering by category, price range, and search term.',
  })
  @ApiResponse({
    status: 200,
    description: 'Successfully retrieved paginated products',
    schema: {
      example: {
        products: [
          {
            id: '123e4567-e89b-12d3-a456-426614174000',
            name: 'Wireless Bluetooth Headphones',
            description: 'Premium wireless headphones with active noise cancellation',
            price: 149.99,
            images: ['https://cdn.broxiva.com/products/headphones-main.jpg'],
            stock: 150,
            category: { id: '...', name: 'Electronics' },
            vendor: { id: '...', name: 'AudioTech Pro' },
          },
        ],
        total: 100,
        page: 1,
        limit: 12,
        totalPages: 9,
      },
    },
  })
  async findAll(@Query() query: QueryProductsDto) {
    return this.productsService.findAll(query);
  }

  @Get('search')
  @ApiOperation({ summary: 'Search products with filters' })
  @ApiQuery({ name: 'q', required: false, description: 'Search query (product name or description)' })
  @ApiQuery({ name: 'category', required: false, description: 'Category ID to filter by' })
  @ApiQuery({ name: 'minPrice', required: false, type: Number, description: 'Minimum price' })
  @ApiQuery({ name: 'maxPrice', required: false, type: Number, description: 'Maximum price' })
  @ApiQuery({ name: 'sort', required: false, description: 'Sort by: price-asc, price-desc, name-asc, name-desc, date-desc (default: relevance)' })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Page number (default: 1)' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Items per page (default: 20)' })
  @ApiResponse({ status: 200, description: 'Returns search results with pagination' })
  async search(
    @Query('q') query?: string,
    @Query('category') category?: string,
    @Query('minPrice') minPrice?: string,
    @Query('maxPrice') maxPrice?: string,
    @Query('sort') sort?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.productsService.search({
      query,
      category,
      minPrice: minPrice ? parseFloat(minPrice) : undefined,
      maxPrice: maxPrice ? parseFloat(maxPrice) : undefined,
      sort,
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 20,
    });
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get product by ID',
    description: 'Retrieves detailed information about a specific product including inventory, reviews, and vendor details.',
  })
  @ApiResponse({
    status: 200,
    description: 'Successfully retrieved product details',
    schema: {
      example: {
        id: '123e4567-e89b-12d3-a456-426614174000',
        name: 'Wireless Bluetooth Headphones',
        description: 'Premium wireless headphones with active noise cancellation, 30-hour battery life',
        price: 149.99,
        images: [
          'https://cdn.broxiva.com/products/headphones-main.jpg',
          'https://cdn.broxiva.com/products/headphones-side.jpg',
        ],
        stock: 150,
        sku: 'WBH-2024-BLK',
        weight: 0.25,
        dimensions: '20 x 15 x 8',
        brand: 'AudioTech Pro',
        category: {
          id: '123e4567-e89b-12d3-a456-426614174001',
          name: 'Electronics',
          slug: 'electronics',
        },
        vendor: {
          id: '123e4567-e89b-12d3-a456-426614174002',
          name: 'AudioTech Pro',
          rating: 4.8,
        },
        averageRating: 4.5,
        reviewCount: 128,
        createdAt: '2024-01-15T10:30:00Z',
        updatedAt: '2024-02-20T14:45:00Z',
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Product not found' })
  async findOne(@Param('id') id: string) {
    return this.productsService.findOne(id);
  }

  @Get(':id/related')
  @ApiOperation({ summary: 'Get related products' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Number of related products (default: 4)' })
  @ApiResponse({ status: 200, description: 'Returns related products' })
  async getRelatedProducts(
    @Param('id') id: string,
    @Query('limit') limit?: string,
  ) {
    const limitNum = limit ? parseInt(limit, 10) : 4;
    return this.productsService.getRelatedProducts(id, limitNum);
  }

  @UseGuards(JwtAuthGuard)
  @Post()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create new product' })
  @ApiResponse({ status: 201, description: 'Product created successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async create(@Body() data: CreateProductDto) {
    return this.productsService.create(data);
  }

  @UseGuards(JwtAuthGuard)
  @Put(':id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update product' })
  @ApiResponse({ status: 200, description: 'Product updated successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Product not found' })
  async update(@Param('id') id: string, @Body() data: Partial<CreateProductDto>) {
    return this.productsService.update(id, data);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete product' })
  @ApiResponse({ status: 204, description: 'Product deleted successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Product not found' })
  async delete(@Param('id') id: string) {
    await this.productsService.delete(id);
  }
}
