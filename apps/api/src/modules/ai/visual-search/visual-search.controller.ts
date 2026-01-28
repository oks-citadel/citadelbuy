import {
  Controller,
  Post,
  Get,
  UploadedFile,
  UseInterceptors,
  BadRequestException,
  Body,
  UseGuards,
  Query,
  Param,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiConsumes,
  ApiBody,
  ApiBearerAuth,
  ApiResponse,
  ApiQuery,
} from '@nestjs/swagger';
import { VisualSearchService, VisionProviderType } from './visual-search.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import {
  SearchByImageUrlDto,
  FindSimilarProductsDto,
  IndexProductImageDto,
  BatchIndexProductsDto,
  VisualSearchResultDto,
} from './dto/visual-search.dto';

@ApiTags('AI - Visual Search')
@Controller('ai/visual-search')
export class VisualSearchController {
  constructor(private readonly visualSearchService: VisualSearchService) {}

  @Post('search/upload')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Search products by image upload',
    description:
      'Upload an image to find visually similar products using AI-powered image recognition',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        image: {
          type: 'string',
          format: 'binary',
          description: 'Image file (JPEG, PNG, GIF, WebP, BMP)',
        },
      },
      required: ['image'],
    },
  })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Max results (1-50)' })
  @ApiQuery({
    name: 'minSimilarity',
    required: false,
    type: Number,
    description: 'Min similarity threshold (0-1)',
  })
  @ApiQuery({ name: 'categoryId', required: false, type: String, description: 'Filter by category' })
  @ApiQuery({
    name: 'provider',
    required: false,
    enum: ['google', 'aws', 'clarifai', 'mock'],
    description: 'Vision provider to use',
  })
  @ApiResponse({ status: 200, description: 'Search results', type: VisualSearchResultDto })
  @ApiResponse({ status: 400, description: 'Invalid image or parameters' })
  @UseInterceptors(FileInterceptor('image'))
  @HttpCode(HttpStatus.OK)
  async searchByImage(
    @UploadedFile() file: Express.Multer.File,
    @Query('limit') limit?: number,
    @Query('minSimilarity') minSimilarity?: number,
    @Query('categoryId') categoryId?: string,
    @Query('provider') provider?: VisionProviderType,
  ) {
    if (!file) {
      throw new BadRequestException('No image file provided');
    }

    return this.visualSearchService.searchByImage(file, {
      limit: limit ? Number(limit) : undefined,
      minSimilarity: minSimilarity ? Number(minSimilarity) : undefined,
      categoryId,
      useProvider: provider,
    });
  }

  @Post('search/url')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Search products by image URL',
    description: 'Provide an image URL to find visually similar products',
  })
  @ApiResponse({ status: 200, description: 'Search results', type: VisualSearchResultDto })
  @ApiResponse({ status: 400, description: 'Invalid URL or parameters' })
  @HttpCode(HttpStatus.OK)
  async searchByImageUrl(@Body() dto: SearchByImageUrlDto) {
    if (!dto.imageUrl) {
      throw new BadRequestException('No image URL provided');
    }

    return this.visualSearchService.searchByImageUrl(dto.imageUrl, {
      limit: dto.limit,
      minSimilarity: dto.minSimilarity,
      categoryId: dto.categoryId,
    });
  }

  @Post('similar/:productId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Find similar products by product ID',
    description: 'Find products that are visually similar to the specified product',
  })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Max results (1-50)' })
  @ApiQuery({
    name: 'sameCategoryOnly',
    required: false,
    type: Boolean,
    description: 'Only include products from the same category',
  })
  @ApiResponse({ status: 200, description: 'Similar products found' })
  @ApiResponse({ status: 404, description: 'Product not found' })
  @HttpCode(HttpStatus.OK)
  async findSimilarProducts(
    @Param('productId') productId: string,
    @Query('limit') limit?: number,
    @Query('sameCategoryOnly') sameCategoryOnly?: boolean,
  ) {
    if (!productId) {
      throw new BadRequestException('No product ID provided');
    }

    return this.visualSearchService.findSimilarByProductId(productId, {
      limit: limit ? Number(limit) : undefined,
      sameCategoryOnly: sameCategoryOnly === true || sameCategoryOnly === 'true' as any,
    });
  }

  @Post('analyze')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Analyze an image',
    description:
      'Get detailed analysis of an image including labels, objects, colors, and safety ratings',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        image: {
          type: 'string',
          format: 'binary',
          description: 'Image file to analyze',
        },
      },
      required: ['image'],
    },
  })
  @ApiResponse({ status: 200, description: 'Image analysis results' })
  @ApiResponse({ status: 400, description: 'Invalid image' })
  @UseInterceptors(FileInterceptor('image'))
  @HttpCode(HttpStatus.OK)
  async analyzeImage(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('No image file provided');
    }

    return this.visualSearchService.analyzeImage(file);
  }

  @Post('extract-features')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Extract features from an image',
    description: 'Extract perceptual hash, color histogram, and other features from an image',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        image: {
          type: 'string',
          format: 'binary',
          description: 'Image file to extract features from',
        },
      },
      required: ['image'],
    },
  })
  @ApiResponse({ status: 200, description: 'Extracted features' })
  @ApiResponse({ status: 400, description: 'Invalid image' })
  @UseInterceptors(FileInterceptor('image'))
  @HttpCode(HttpStatus.OK)
  async extractFeatures(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('No image file provided');
    }

    return this.visualSearchService.extractFeaturesFromBuffer(file.buffer);
  }

  @Post('extract-features/url')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Extract features from an image URL',
    description: 'Extract perceptual hash, color histogram, and other features from an image URL',
  })
  @ApiResponse({ status: 200, description: 'Extracted features' })
  @ApiResponse({ status: 400, description: 'Invalid URL' })
  @HttpCode(HttpStatus.OK)
  async extractFeaturesFromUrl(@Body('imageUrl') imageUrl: string) {
    if (!imageUrl) {
      throw new BadRequestException('No image URL provided');
    }

    return this.visualSearchService.extractFeaturesFromUrl(imageUrl);
  }

  // --- Index Management Endpoints ---

  @Post('index/product')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Index a product image',
    description: 'Index a product image for faster similarity searches',
  })
  @ApiResponse({ status: 200, description: 'Product indexed successfully' })
  @ApiResponse({ status: 400, description: 'Failed to index product' })
  @HttpCode(HttpStatus.OK)
  async indexProductImage(@Body() dto: IndexProductImageDto) {
    const success = await this.visualSearchService.indexProductImage(
      dto.productId,
      dto.forceReindex,
    );

    return {
      success,
      productId: dto.productId,
      message: success ? 'Product indexed successfully' : 'Failed to index product',
    };
  }

  @Post('index/batch')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Batch index products',
    description: 'Index multiple product images for faster similarity searches',
  })
  @ApiResponse({ status: 200, description: 'Batch indexing results' })
  @HttpCode(HttpStatus.OK)
  async batchIndexProducts(@Body() dto: BatchIndexProductsDto) {
    const result = await this.visualSearchService.batchIndexProducts({
      categoryId: dto.categoryId,
      limit: dto.limit,
    });

    return {
      success: true,
      ...result,
      message: `Indexed ${result.indexed} products, ${result.failed} failed out of ${result.total} total`,
    };
  }

  @Get('index/stats')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get index statistics',
    description: 'Get statistics about the visual search index',
  })
  @ApiResponse({ status: 200, description: 'Index statistics' })
  async getIndexStats() {
    return this.visualSearchService.getIndexStats();
  }

  @Post('index/clear')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Clear the index',
    description: 'Clear all indexed product images (use with caution)',
  })
  @ApiResponse({ status: 200, description: 'Index cleared' })
  @HttpCode(HttpStatus.OK)
  async clearIndex() {
    this.visualSearchService.clearIndex();
    return {
      success: true,
      message: 'Visual search index cleared',
    };
  }

  // --- Provider Management Endpoints ---

  @Get('providers')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get available vision providers',
    description: 'List all configured vision providers and their availability status',
  })
  @ApiResponse({ status: 200, description: 'List of available providers' })
  async getProviders() {
    return {
      activeProvider: this.visualSearchService.getActiveProvider(),
      availableProviders: this.visualSearchService.getAvailableProviders(),
    };
  }

  @Post('providers/switch/:provider')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Switch vision provider',
    description: 'Switch to a different vision provider',
  })
  @ApiResponse({ status: 200, description: 'Provider switched successfully' })
  @ApiResponse({ status: 400, description: 'Provider not available' })
  @HttpCode(HttpStatus.OK)
  async switchProvider(@Param('provider') provider: VisionProviderType) {
    const success = this.visualSearchService.switchProvider(provider);

    if (!success) {
      throw new BadRequestException(`Provider '${provider}' is not available`);
    }

    return {
      success: true,
      activeProvider: this.visualSearchService.getActiveProvider(),
      message: `Switched to provider: ${provider}`,
    };
  }

  // --- Health Check ---

  @Get('health')
  @ApiOperation({
    summary: 'Health check',
    description: 'Check if the visual search service is operational',
  })
  @ApiResponse({ status: 200, description: 'Service is healthy' })
  async healthCheck() {
    const activeProvider = this.visualSearchService.getActiveProvider();
    const availableProviders = this.visualSearchService.getAvailableProviders();
    const indexStats = this.visualSearchService.getIndexStats();

    return {
      status: 'healthy',
      activeProvider,
      providersAvailable: availableProviders.filter((p) => p.available).length,
      indexedProducts: indexStats.totalIndexed,
      timestamp: new Date().toISOString(),
    };
  }
}
