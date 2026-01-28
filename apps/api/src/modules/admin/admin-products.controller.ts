import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiResponse,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../auth/guards/admin.guard';
import { ProductsService } from '../products/products.service';
import { CreateProductDto } from '../products/dto/create-product.dto';
import { UpdateProductDto } from '../products/dto/update-product.dto';
import { PrismaService } from '../../common/prisma/prisma.service';

@ApiTags('admin/products')
@Controller('admin/products')
@UseGuards(JwtAuthGuard, AdminGuard)
@ApiBearerAuth()
export class AdminProductsController {
  constructor(
    private productsService: ProductsService,
    private prisma: PrismaService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Get all products (admin only)' })
  @ApiResponse({ status: 200, description: 'Returns all products' })
  async getAllProducts() {
    return this.productsService.findAll({});
  }

  @Post()
  @ApiOperation({ summary: 'Create product (admin only)' })
  @ApiResponse({ status: 201, description: 'Product created successfully' })
  @ApiResponse({ status: 403, description: 'Admin access required' })
  async createProduct(@Body() createProductDto: CreateProductDto) {
    return this.productsService.create(createProductDto);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update product (admin only)' })
  @ApiResponse({ status: 200, description: 'Product updated successfully' })
  @ApiResponse({ status: 403, description: 'Admin access required' })
  @ApiResponse({ status: 404, description: 'Product not found' })
  async updateProduct(
    @Param('id') id: string,
    @Body() updateProductDto: UpdateProductDto,
  ) {
    return this.productsService.update(id, updateProductDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete product (admin only)' })
  @ApiResponse({ status: 200, description: 'Product deleted successfully' })
  @ApiResponse({ status: 403, description: 'Admin access required' })
  @ApiResponse({ status: 404, description: 'Product not found' })
  async deleteProduct(@Param('id') id: string) {
    return this.productsService.delete(id);
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get product statistics (admin only)' })
  @ApiResponse({ status: 200, description: 'Returns product statistics' })
  async getProductStats() {
    return this.productsService.getProductStats();
  }

  @Get('categories')
  @ApiOperation({ summary: 'Get all categories (admin only)' })
  @ApiResponse({ status: 200, description: 'Returns all categories' })
  async getCategories() {
    return this.prisma.category.findMany({
      select: {
        id: true,
        name: true,
        slug: true,
      },
      orderBy: {
        name: 'asc',
      },
    });
  }

  @Get('vendors')
  @ApiOperation({ summary: 'Get all vendors (admin only)' })
  @ApiResponse({ status: 200, description: 'Returns all vendors' })
  async getVendors() {
    return this.prisma.user.findMany({
      where: {
        role: 'VENDOR',
      },
      select: {
        id: true,
        name: true,
        email: true,
      },
      orderBy: {
        name: 'asc',
      },
    });
  }
}
