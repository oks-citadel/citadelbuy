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
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { VariantsService } from './variants.service';
import {
  CreateVariantOptionDto,
  UpdateVariantOptionDto,
} from './dto/create-variant-option.dto';
import {
  CreateVariantOptionValueDto,
  UpdateVariantOptionValueDto,
} from './dto/create-variant-option-value.dto';
import {
  CreateProductVariantDto,
  UpdateProductVariantDto,
  BulkCreateVariantsDto,
  BulkInventoryUpdateDto,
} from './dto/create-product-variant.dto';
import {
  AddVariantOptionToProductDto,
  RemoveVariantOptionFromProductDto,
  BulkAddVariantOptionsDto,
  GenerateVariantCombinationsDto,
} from './dto/product-variant-option.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@ApiTags('Product Variants')
@Controller('variants')
export class VariantsController {
  constructor(private readonly variantsService: VariantsService) {}

  // ==============================================
  // VARIANT OPTIONS
  // ==============================================

  @Post('options')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'VENDOR')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a variant option (e.g., Size, Color)' })
  @ApiResponse({ status: 201, description: 'Variant option created successfully' })
  @ApiResponse({ status: 409, description: 'Option with this name already exists' })
  async createVariantOption(@Body() dto: CreateVariantOptionDto) {
    return this.variantsService.createVariantOption(dto);
  }

  @Get('options')
  @ApiOperation({ summary: 'Get all variant options' })
  @ApiResponse({ status: 200, description: 'Variant options retrieved successfully' })
  async findAllVariantOptions() {
    return this.variantsService.findAllVariantOptions();
  }

  @Get('options/:id')
  @ApiOperation({ summary: 'Get variant option by ID' })
  @ApiResponse({ status: 200, description: 'Variant option retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Variant option not found' })
  async findVariantOptionById(@Param('id') id: string) {
    return this.variantsService.findVariantOptionById(id);
  }

  @Put('options/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'VENDOR')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a variant option' })
  @ApiResponse({ status: 200, description: 'Variant option updated successfully' })
  @ApiResponse({ status: 404, description: 'Variant option not found' })
  async updateVariantOption(
    @Param('id') id: string,
    @Body() dto: UpdateVariantOptionDto,
  ) {
    return this.variantsService.updateVariantOption(id, dto);
  }

  @Delete('options/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a variant option' })
  @ApiResponse({ status: 204, description: 'Variant option deleted successfully' })
  @ApiResponse({ status: 400, description: 'Option is in use and cannot be deleted' })
  @ApiResponse({ status: 404, description: 'Variant option not found' })
  async deleteVariantOption(@Param('id') id: string) {
    return this.variantsService.deleteVariantOption(id);
  }

  // ==============================================
  // VARIANT OPTION VALUES
  // ==============================================

  @Post('option-values')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'VENDOR')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a variant option value (e.g., Small, Red)' })
  @ApiResponse({ status: 201, description: 'Variant option value created successfully' })
  async createVariantOptionValue(@Body() dto: CreateVariantOptionValueDto) {
    return this.variantsService.createVariantOptionValue(dto);
  }

  @Get('option-values')
  @ApiOperation({ summary: 'Get all variant option values' })
  @ApiQuery({ name: 'optionId', required: false, description: 'Filter by option ID' })
  @ApiResponse({ status: 200, description: 'Variant option values retrieved successfully' })
  async findAllVariantOptionValues(@Query('optionId') optionId?: string) {
    return this.variantsService.findAllVariantOptionValues(optionId);
  }

  @Get('option-values/:id')
  @ApiOperation({ summary: 'Get variant option value by ID' })
  @ApiResponse({ status: 200, description: 'Variant option value retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Variant option value not found' })
  async findVariantOptionValueById(@Param('id') id: string) {
    return this.variantsService.findVariantOptionValueById(id);
  }

  @Put('option-values/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'VENDOR')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a variant option value' })
  @ApiResponse({ status: 200, description: 'Variant option value updated successfully' })
  @ApiResponse({ status: 404, description: 'Variant option value not found' })
  async updateVariantOptionValue(
    @Param('id') id: string,
    @Body() dto: UpdateVariantOptionValueDto,
  ) {
    return this.variantsService.updateVariantOptionValue(id, dto);
  }

  @Delete('option-values/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a variant option value' })
  @ApiResponse({ status: 204, description: 'Variant option value deleted successfully' })
  @ApiResponse({ status: 400, description: 'Value is in use and cannot be deleted' })
  @ApiResponse({ status: 404, description: 'Variant option value not found' })
  async deleteVariantOptionValue(@Param('id') id: string) {
    return this.variantsService.deleteVariantOptionValue(id);
  }

  // ==============================================
  // PRODUCT VARIANTS
  // ==============================================

  @Post('products/:productId/variants')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'VENDOR')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a product variant' })
  @ApiResponse({ status: 201, description: 'Product variant created successfully' })
  @ApiResponse({ status: 409, description: 'SKU or barcode already exists' })
  async createProductVariant(@Body() dto: CreateProductVariantDto) {
    return this.variantsService.createProductVariant(dto);
  }

  @Get('products/:productId/variants')
  @ApiOperation({ summary: 'Get all variants for a product' })
  @ApiResponse({ status: 200, description: 'Product variants retrieved successfully' })
  async findProductVariants(@Param('productId') productId: string) {
    return this.variantsService.findAllProductVariants(productId);
  }

  @Get('products/variants/all')
  @ApiOperation({ summary: 'Get all product variants' })
  @ApiResponse({ status: 200, description: 'All product variants retrieved successfully' })
  async findAllProductVariants() {
    return this.variantsService.findAllProductVariants();
  }

  @Get('products/variants/:id')
  @ApiOperation({ summary: 'Get product variant by ID' })
  @ApiResponse({ status: 200, description: 'Product variant retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Product variant not found' })
  async findProductVariantById(@Param('id') id: string) {
    return this.variantsService.findProductVariantById(id);
  }

  @Put('products/variants/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'VENDOR')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a product variant' })
  @ApiResponse({ status: 200, description: 'Product variant updated successfully' })
  @ApiResponse({ status: 404, description: 'Product variant not found' })
  @ApiResponse({ status: 409, description: 'SKU or barcode already exists' })
  async updateProductVariant(
    @Param('id') id: string,
    @Body() dto: UpdateProductVariantDto,
  ) {
    return this.variantsService.updateProductVariant(id, dto);
  }

  @Delete('products/variants/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'VENDOR')
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a product variant' })
  @ApiResponse({ status: 204, description: 'Product variant deleted successfully' })
  @ApiResponse({ status: 404, description: 'Product variant not found' })
  async deleteProductVariant(@Param('id') id: string) {
    return this.variantsService.deleteProductVariant(id);
  }

  @Post('products/:productId/variants/bulk')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'VENDOR')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Bulk create product variants' })
  @ApiResponse({ status: 201, description: 'Product variants created successfully' })
  async bulkCreateVariants(@Body() dto: BulkCreateVariantsDto) {
    return this.variantsService.bulkCreateVariants(dto);
  }

  @Post('inventory/bulk-update')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'VENDOR')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Bulk update variant inventory' })
  @ApiResponse({ status: 200, description: 'Inventory updated successfully' })
  async bulkUpdateInventory(@Body() dto: BulkInventoryUpdateDto) {
    return this.variantsService.bulkUpdateInventory(dto);
  }

  // ==============================================
  // PRODUCT-OPTION LINKING
  // ==============================================

  @Post('products/:productId/options')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'VENDOR')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Add a variant option to a product' })
  @ApiResponse({ status: 201, description: 'Option added to product successfully' })
  @ApiResponse({ status: 409, description: 'Option already linked to product' })
  async addVariantOptionToProduct(@Body() dto: AddVariantOptionToProductDto) {
    return this.variantsService.addVariantOptionToProduct(dto);
  }

  @Delete('products/:productId/options/:optionId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'VENDOR')
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove a variant option from a product' })
  @ApiResponse({ status: 204, description: 'Option removed from product successfully' })
  @ApiResponse({ status: 404, description: 'Option not linked to product' })
  async removeVariantOptionFromProduct(
    @Param('productId') productId: string,
    @Param('optionId') optionId: string,
  ) {
    return this.variantsService.removeVariantOptionFromProduct({
      productId,
      optionId,
    });
  }

  @Post('products/:productId/options/bulk')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'VENDOR')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Add multiple variant options to a product' })
  @ApiResponse({ status: 201, description: 'Options added to product successfully' })
  async bulkAddVariantOptions(@Body() dto: BulkAddVariantOptionsDto) {
    return this.variantsService.bulkAddVariantOptions(dto);
  }

  @Get('products/:productId/options')
  @ApiOperation({ summary: 'Get all variant options for a product' })
  @ApiResponse({ status: 200, description: 'Product variant options retrieved successfully' })
  async getProductVariantOptions(@Param('productId') productId: string) {
    return this.variantsService.getProductVariantOptions(productId);
  }

  // ==============================================
  // VARIANT COMBINATION GENERATION
  // ==============================================

  @Post('products/:productId/generate-combinations')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'VENDOR')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Auto-generate all variant combinations for a product',
    description:
      'Automatically creates variants for all combinations of the product\'s variant options',
  })
  @ApiResponse({
    status: 201,
    description: 'Variant combinations generated successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Product has no variant options configured',
  })
  async generateVariantCombinations(@Body() dto: GenerateVariantCombinationsDto) {
    return this.variantsService.generateVariantCombinations(dto);
  }
}
