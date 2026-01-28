import { Controller, Get, Post, Body, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { ContentSeoService } from './content-seo.service';
import {
  KeywordResearchDto,
  KeywordResearchResultDto,
  ContentOptimizationDto,
  ContentOptimizationResultDto,
  InternalLinkingAnalysisDto,
  ContentFreshnessReportDto,
  QueryContentFreshnessDto,
  ContentFreshnessStatus,
} from '../dto/content-seo.dto';

@ApiTags('SEO - Content')
@Controller('seo')
export class ContentSeoController {
  constructor(private readonly contentSeoService: ContentSeoService) {}

  @Post('keywords/research')
  @Throttle({ default: { limit: 10, ttl: 60000 } }) // 10 requests per minute
  @ApiOperation({
    summary: 'Perform keyword research',
    description: 'Analyzes a seed keyword and returns related keywords, long-tail variations, and search intent.',
  })
  @ApiResponse({ status: 200, description: 'Keyword research results', type: KeywordResearchResultDto })
  async researchKeywords(@Body() dto: KeywordResearchDto): Promise<KeywordResearchResultDto> {
    return this.contentSeoService.researchKeywords(dto);
  }

  @Post('content/optimize')
  @Throttle({ default: { limit: 20, ttl: 60000 } }) // 20 requests per minute
  @ApiOperation({
    summary: 'Get content optimization suggestions',
    description: 'Analyzes content and provides SEO optimization recommendations.',
  })
  @ApiResponse({ status: 200, description: 'Content optimization results', type: ContentOptimizationResultDto })
  async optimizeContent(@Body() dto: ContentOptimizationDto): Promise<ContentOptimizationResultDto> {
    return this.contentSeoService.optimizeContent(dto);
  }

  @Get('links/internal')
  @ApiOperation({
    summary: 'Get internal linking analysis',
    description: 'Analyzes internal link structure and provides recommendations for improvement.',
  })
  @ApiResponse({ status: 200, description: 'Internal linking analysis', type: InternalLinkingAnalysisDto })
  async analyzeInternalLinks(): Promise<InternalLinkingAnalysisDto> {
    return this.contentSeoService.analyzeInternalLinks();
  }

  @Get('content/freshness')
  @ApiOperation({
    summary: 'Get content freshness report',
    description: 'Identifies stale content that needs updating based on last modification date.',
  })
  @ApiQuery({ name: 'status', enum: ContentFreshnessStatus, required: false })
  @ApiQuery({ name: 'minDaysSinceUpdate', type: Number, required: false })
  @ApiQuery({ name: 'maxDaysSinceUpdate', type: Number, required: false })
  @ApiQuery({ name: 'contentType', type: String, required: false })
  @ApiQuery({ name: 'page', type: Number, required: false })
  @ApiQuery({ name: 'limit', type: Number, required: false })
  @ApiQuery({ name: 'sortBy', type: String, required: false })
  @ApiQuery({ name: 'sortOrder', enum: ['asc', 'desc'], required: false })
  @ApiResponse({ status: 200, description: 'Content freshness report', type: ContentFreshnessReportDto })
  async getContentFreshness(@Query() query: QueryContentFreshnessDto): Promise<ContentFreshnessReportDto> {
    return this.contentSeoService.getContentFreshness(query);
  }

  @Get('content/tips')
  @ApiOperation({
    summary: 'Get SEO content tips',
    description: 'Returns general SEO content optimization tips and best practices.',
  })
  @ApiResponse({
    status: 200,
    description: 'SEO content tips',
  })
  getContentTips() {
    return {
      titleOptimization: {
        tips: [
          'Keep titles between 50-60 characters',
          'Include primary keyword near the beginning',
          'Make titles compelling and click-worthy',
          'Use numbers for listicles (e.g., "10 Best...")',
          'Avoid keyword stuffing',
        ],
        examples: {
          good: 'Best Running Shoes 2024: Top 10 Picks for Every Budget',
          bad: 'Running Shoes - Buy Running Shoes - Best Running Shoes Online',
        },
      },
      metaDescriptions: {
        tips: [
          'Keep descriptions between 150-160 characters',
          'Include a call-to-action',
          'Use primary and secondary keywords naturally',
          'Highlight unique selling points',
          'Match search intent',
        ],
        examples: {
          good: 'Discover the top-rated running shoes of 2024. Compare features, prices, and expert reviews. Free shipping on orders over $50. Shop now!',
          bad: 'We sell running shoes. Buy running shoes here.',
        },
      },
      contentStructure: {
        tips: [
          'Use one H1 tag per page',
          'Structure content with H2 and H3 headings',
          'Include target keyword in H1 and at least one H2',
          'Keep paragraphs short (2-3 sentences)',
          'Use bullet points and numbered lists',
          'Add images with descriptive alt text',
        ],
      },
      keywordUsage: {
        tips: [
          'Target one primary keyword per page',
          'Include 2-5 secondary keywords',
          'Aim for 1-2% keyword density',
          'Use LSI (related) keywords naturally',
          'Avoid keyword stuffing',
          'Include keywords in first 100 words',
        ],
      },
      contentLength: {
        tips: [
          'Product pages: 300+ words',
          'Category pages: 500+ words',
          'Blog posts: 1000+ words for comprehensive topics',
          'Prioritize quality over quantity',
          'Cover topics comprehensively',
        ],
      },
      internalLinking: {
        tips: [
          'Link to related products/categories',
          'Use descriptive anchor text',
          'Limit to 100-150 internal links per page',
          'Avoid orphan pages',
          'Create topic clusters with pillar pages',
        ],
      },
    };
  }

  @Get('keywords/intent')
  @ApiOperation({
    summary: 'Get search intent definitions',
    description: 'Returns definitions and examples of different search intent types.',
  })
  @ApiResponse({
    status: 200,
    description: 'Search intent definitions',
  })
  getSearchIntentDefinitions() {
    return {
      informational: {
        description: 'User is looking for information or answers to questions',
        examples: ['how to clean running shoes', 'what is the best material for running shoes', 'running shoe care tips'],
        contentType: 'Blog posts, guides, how-to articles, FAQ pages',
      },
      navigational: {
        description: 'User is looking for a specific website or page',
        examples: ['nike running shoes', 'amazon running shoes', 'adidas ultraboost'],
        contentType: 'Brand pages, product pages, homepage',
      },
      transactional: {
        description: 'User is ready to make a purchase or take action',
        examples: ['buy running shoes online', 'running shoes free shipping', 'running shoes coupon code'],
        contentType: 'Product pages, checkout pages, pricing pages',
      },
      commercial: {
        description: 'User is researching before making a purchase decision',
        examples: ['best running shoes 2024', 'nike vs adidas running shoes', 'running shoe reviews'],
        contentType: 'Comparison pages, review articles, buying guides',
      },
    };
  }
}
