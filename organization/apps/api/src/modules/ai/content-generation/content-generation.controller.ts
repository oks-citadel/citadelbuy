import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  UploadedFile,
  UseInterceptors,
  UseGuards,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiConsumes } from '@nestjs/swagger';
import { ContentGenerationService } from './content-generation.service';
import { ImageEnhancementService } from './image-enhancement.service';
import { SeoOptimizationService } from './seo-optimization.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';

@ApiTags('AI - Content Generation')
@Controller('ai/content-generation')
export class ContentGenerationController {
  constructor(
    private readonly contentGenerationService: ContentGenerationService,
    private readonly imageEnhancementService: ImageEnhancementService,
    private readonly seoOptimizationService: SeoOptimizationService,
  ) {}

  @Post('product-description')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Generate SEO-optimized product description' })
  async generateProductDescription(@Body() data: {
    productName: string;
    category: string;
    features?: string[];
    specifications?: Record<string, any>;
    targetAudience?: string;
    tone?: 'professional' | 'casual' | 'luxury' | 'technical';
  }) {
    return this.contentGenerationService.generateProductDescription(data);
  }

  @Post('variant-descriptions')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Generate multiple description variants' })
  async generateVariantDescriptions(@Body() data: {
    productName: string;
    baseDescription: string;
    variantCount: number;
    style?: 'short' | 'medium' | 'long';
  }) {
    return this.contentGenerationService.generateVariantDescriptions(data);
  }

  @Post('enhance-image')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Enhance product image quality' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('image'))
  async enhanceImage(
    @UploadedFile() file: Express.Multer.File,
    @Body() options?: { removeBackground?: boolean; upscale?: boolean },
  ) {
    return this.imageEnhancementService.enhanceImage(file, options);
  }

  @Post('remove-background')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Remove background from product image' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('image'))
  async removeBackground(@UploadedFile() file: Express.Multer.File) {
    return this.imageEnhancementService.removeBackground(file);
  }

  @Post('summarize-reviews')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Generate summary from product reviews' })
  async summarizeReviews(@Body() data: {
    productId: string;
    reviews: Array<{
      rating: number;
      content: string;
      helpful: number;
    }>;
  }) {
    return this.contentGenerationService.summarizeReviews(data);
  }

  @Post('social-media-content')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Generate social media post content' })
  async generateSocialContent(@Body() data: {
    productId: string;
    productName: string;
    platform: 'facebook' | 'instagram' | 'twitter' | 'pinterest' | 'tiktok';
    campaignType?: 'launch' | 'sale' | 'feature' | 'testimonial';
  }) {
    return this.contentGenerationService.generateSocialContent(data);
  }

  @Post('email-content')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Generate email marketing content' })
  async generateEmailContent(@Body() data: {
    emailType: 'welcome' | 'abandoned_cart' | 'promotion' | 'restock' | 'recommendation';
    recipientData: {
      name?: string;
      cartItems?: any[];
      recommendedProducts?: any[];
      discountAmount?: number;
    };
  }) {
    return this.contentGenerationService.generateEmailContent(data);
  }

  @Post('seo-optimize')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Optimize content for SEO' })
  async optimizeForSEO(@Body() data: {
    content: string;
    targetKeywords: string[];
    contentType: 'product' | 'category' | 'blog' | 'landing';
  }) {
    return this.seoOptimizationService.optimizeContent(data);
  }

  @Post('generate-meta-tags')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Generate SEO meta tags' })
  async generateMetaTags(@Body() data: {
    productName: string;
    category: string;
    description?: string;
    price?: number;
  }) {
    return this.seoOptimizationService.generateMetaTags(data);
  }

  @Post('category-description')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Generate category page description' })
  async generateCategoryDescription(@Body() data: {
    categoryName: string;
    subcategories?: string[];
    topProducts?: Array<{ name: string; price: number }>;
  }) {
    return this.contentGenerationService.generateCategoryDescription(data);
  }
}
