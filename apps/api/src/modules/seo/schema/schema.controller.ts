import { Controller, Get, Post, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { RolesGuard } from '@/common/guards/roles.guard';
import { Roles } from '@/common/decorators/roles.decorator';
import { UserRole } from '@prisma/client';
import { SchemaService } from './schema.service';
import {
  GenerateSchemaDto,
  GenerateProductSchemaDto,
  GenerateOrganizationSchemaDto,
  GenerateBreadcrumbSchemaDto,
  GenerateFAQSchemaDto,
  GenerateArticleSchemaDto,
  ValidateSchemaDto,
  SchemaValidationResultDto,
  SchemaType,
} from '../dto/schema.dto';

@ApiTags('SEO - Schema.org')
@Controller('seo/schema')
export class SchemaController {
  constructor(private readonly schemaService: SchemaService) {}

  @Post('generate')
  @ApiOperation({
    summary: 'Generate JSON-LD schema',
    description: 'Generates JSON-LD structured data based on the specified schema type and data.',
  })
  @ApiResponse({
    status: 200,
    description: 'Generated JSON-LD schema',
    schema: {
      type: 'object',
      properties: {
        '@context': { type: 'string', example: 'https://schema.org' },
        '@type': { type: 'string', example: 'Product' },
      },
    },
  })
  async generateSchema(@Body() dto: GenerateSchemaDto) {
    return this.schemaService.generateSchema(dto);
  }

  @Post('product')
  @ApiOperation({
    summary: 'Generate Product schema',
    description: 'Generates a Product JSON-LD schema with offers, ratings, and reviews.',
  })
  @ApiResponse({ status: 200, description: 'Product schema generated' })
  async generateProductSchema(@Body() dto: GenerateProductSchemaDto) {
    return this.schemaService.generateProductSchema(dto);
  }

  @Get('product/:productId')
  @ApiOperation({
    summary: 'Generate Product schema from database',
    description: 'Generates a Product JSON-LD schema from an existing product in the database.',
  })
  @ApiParam({ name: 'productId', description: 'Product ID' })
  @ApiResponse({ status: 200, description: 'Product schema generated' })
  @ApiResponse({ status: 404, description: 'Product not found' })
  async getProductSchema(@Param('productId') productId: string) {
    const schema = await this.schemaService.generateProductSchemaFromId(productId);
    if (!schema) {
      return { error: 'Product not found' };
    }
    return schema;
  }

  @Post('organization')
  @ApiOperation({
    summary: 'Generate Organization schema',
    description: 'Generates an Organization JSON-LD schema.',
  })
  @ApiResponse({ status: 200, description: 'Organization schema generated' })
  async generateOrganizationSchema(@Body() dto: GenerateOrganizationSchemaDto) {
    return this.schemaService.generateOrganizationSchema(dto);
  }

  @Get('organization')
  @ApiOperation({
    summary: 'Get default Organization schema',
    description: 'Returns the default Organization JSON-LD schema using platform settings.',
  })
  @ApiResponse({ status: 200, description: 'Default organization schema' })
  async getDefaultOrganizationSchema() {
    return this.schemaService.generateOrganizationSchema();
  }

  @Post('breadcrumb')
  @ApiOperation({
    summary: 'Generate BreadcrumbList schema',
    description: 'Generates a BreadcrumbList JSON-LD schema for navigation.',
  })
  @ApiResponse({ status: 200, description: 'Breadcrumb schema generated' })
  async generateBreadcrumbSchema(@Body() dto: GenerateBreadcrumbSchemaDto) {
    return this.schemaService.generateBreadcrumbSchema(dto);
  }

  @Get('breadcrumb/category/:categoryId')
  @ApiOperation({
    summary: 'Generate category breadcrumb schema',
    description: 'Generates a BreadcrumbList schema for a category hierarchy.',
  })
  @ApiParam({ name: 'categoryId', description: 'Category ID' })
  @ApiResponse({ status: 200, description: 'Category breadcrumb schema generated' })
  async getCategoryBreadcrumbSchema(@Param('categoryId') categoryId: string) {
    const schema = await this.schemaService.generateCategoryBreadcrumbSchema(categoryId);
    if (!schema) {
      return { error: 'Category not found' };
    }
    return schema;
  }

  @Post('faq')
  @ApiOperation({
    summary: 'Generate FAQPage schema',
    description: 'Generates a FAQPage JSON-LD schema for FAQ content.',
  })
  @ApiResponse({ status: 200, description: 'FAQ schema generated' })
  async generateFAQSchema(@Body() dto: GenerateFAQSchemaDto) {
    return this.schemaService.generateFAQSchema(dto);
  }

  @Post('article')
  @ApiOperation({
    summary: 'Generate Article schema',
    description: 'Generates an Article, BlogPosting, or NewsArticle JSON-LD schema.',
  })
  @ApiResponse({ status: 200, description: 'Article schema generated' })
  async generateArticleSchema(@Body() dto: GenerateArticleSchemaDto) {
    return this.schemaService.generateArticleSchema(dto);
  }

  @Get('website')
  @ApiOperation({
    summary: 'Get WebSite schema',
    description: 'Returns the WebSite JSON-LD schema with search action.',
  })
  @ApiResponse({ status: 200, description: 'WebSite schema' })
  async getWebsiteSchema() {
    return this.schemaService.generateWebsiteSchema();
  }

  @Get('search-action')
  @ApiOperation({
    summary: 'Get SearchAction schema',
    description: 'Returns the SearchAction JSON-LD schema for site search.',
  })
  @ApiResponse({ status: 200, description: 'SearchAction schema' })
  async getSearchActionSchema() {
    return this.schemaService.generateSearchActionSchema();
  }

  @Post('validate')
  @ApiOperation({
    summary: 'Validate JSON-LD schema',
    description: 'Validates a JSON-LD schema for errors and warnings.',
  })
  @ApiResponse({ status: 200, description: 'Validation result', type: SchemaValidationResultDto })
  async validateSchema(@Body() dto: ValidateSchemaDto): Promise<SchemaValidationResultDto> {
    return this.schemaService.validateSchema(dto);
  }

  @Post('page-bundle')
  @ApiOperation({
    summary: 'Generate page schema bundle',
    description: 'Generates multiple schemas for a page (organization, website, product, etc.).',
  })
  @ApiResponse({
    status: 200,
    description: 'Array of schemas for the page',
    schema: {
      type: 'array',
      items: {
        type: 'object',
      },
    },
  })
  async generatePageBundle(
    @Body() options: {
      includeOrganization?: boolean;
      includeWebsite?: boolean;
      product?: GenerateProductSchemaDto;
      breadcrumbs?: GenerateBreadcrumbSchemaDto;
      faq?: GenerateFAQSchemaDto;
      article?: GenerateArticleSchemaDto;
    },
  ) {
    return this.schemaService.generatePageSchemas(options);
  }

  @Post('to-script')
  @ApiOperation({
    summary: 'Convert schema to script tag',
    description: 'Converts a JSON-LD schema to an HTML script tag.',
  })
  @ApiResponse({
    status: 200,
    description: 'HTML script tag',
    schema: {
      type: 'object',
      properties: {
        scriptTag: { type: 'string' },
      },
    },
  })
  async toScriptTag(@Body() schema: Record<string, any>) {
    const scriptTag = this.schemaService.toScriptTag(schema as any);
    return { scriptTag };
  }

  @Get('types')
  @ApiOperation({
    summary: 'Get supported schema types',
    description: 'Returns a list of supported JSON-LD schema types.',
  })
  @ApiResponse({
    status: 200,
    description: 'List of supported schema types',
    schema: {
      type: 'array',
      items: { type: 'string' },
    },
  })
  getSupportedTypes() {
    return Object.values(SchemaType);
  }
}
