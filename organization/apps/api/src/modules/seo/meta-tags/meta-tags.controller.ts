import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { RolesGuard } from '@/common/guards/roles.guard';
import { Roles } from '@/common/decorators/roles.decorator';
import { MetaTagsService } from './meta-tags.service';
import {
  MetaTagDto,
  CreateMetaTagDto,
  UpdateMetaTagDto,
  MetaTagQueryDto,
  BulkUpdateMetaTagsDto,
  MetaTagTemplateDto,
  MetaTagAnalysisDto,
  MetaTagSuggestionDto,
  ApplyTemplateDto,
  AnalyzeContentDto,
} from '../dto/meta-tags.dto';

@ApiTags('SEO - Meta Tags')
@Controller('seo/meta-tags')
export class MetaTagsController {
  constructor(private readonly metaTagsService: MetaTagsService) {}

  @Get()
  @ApiOperation({ summary: 'Get all meta tags with filtering' })
  @ApiResponse({ status: 200, description: 'List of meta tags', type: [MetaTagDto] })
  async getMetaTags(@Query() query: MetaTagQueryDto) {
    return this.metaTagsService.getMetaTags(query);
  }

  @Get('templates')
  @ApiOperation({ summary: 'Get all meta tag templates' })
  @ApiResponse({ status: 200, description: 'List of templates', type: [MetaTagTemplateDto] })
  async getTemplates() {
    return this.metaTagsService.getTemplates();
  }

  @Get('templates/:id')
  @ApiOperation({ summary: 'Get a specific template' })
  @ApiParam({ name: 'id', description: 'Template ID' })
  @ApiResponse({ status: 200, description: 'Template details', type: MetaTagTemplateDto })
  async getTemplate(@Param('id') id: string) {
    return this.metaTagsService.getTemplate(id);
  }

  @Get('url')
  @ApiOperation({ summary: 'Get meta tags for a specific URL' })
  @ApiQuery({ name: 'url', required: true, description: 'URL to lookup' })
  @ApiResponse({ status: 200, description: 'Meta tags for URL', type: MetaTagDto })
  async getMetaTagsByUrl(@Query('url') url: string) {
    return this.metaTagsService.getMetaTagsByUrl(url);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get meta tags by ID' })
  @ApiParam({ name: 'id', description: 'Meta tag ID' })
  @ApiResponse({ status: 200, description: 'Meta tag details', type: MetaTagDto })
  async getMetaTag(@Param('id') id: string) {
    const metaTags = await this.metaTagsService.getMetaTags({ limit: 1000 });
    const tag = metaTags.metaTags.find(t => t.id === id);
    if (!tag) {
      return { error: 'Not found' };
    }
    return tag;
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.MARKETING)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create or update meta tags for a URL' })
  @ApiResponse({ status: 201, description: 'Meta tags created/updated', type: MetaTagDto })
  async upsertMetaTags(@Body() dto: CreateMetaTagDto) {
    return this.metaTagsService.upsertMetaTags(dto);
  }

  @Post('bulk')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.MARKETING)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Bulk update meta tags' })
  @ApiResponse({ status: 200, description: 'Bulk update results' })
  async bulkUpdate(@Body() dto: BulkUpdateMetaTagsDto) {
    return this.metaTagsService.bulkUpdateMetaTags(dto);
  }

  @Post('apply-template')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.MARKETING)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Apply a template to generate meta tags' })
  @ApiResponse({ status: 200, description: 'Generated meta tags', type: MetaTagDto })
  async applyTemplate(@Body() dto: ApplyTemplateDto) {
    return this.metaTagsService.applyTemplate(dto.templateId, dto.variables, dto.url);
  }

  @Post('analyze')
  @ApiOperation({ summary: 'Analyze meta tags for SEO issues' })
  @ApiResponse({ status: 200, description: 'Analysis results', type: MetaTagAnalysisDto })
  async analyze(@Body() dto: CreateMetaTagDto) {
    return this.metaTagsService.analyzeMetaTags(dto);
  }

  @Post('suggestions')
  @ApiOperation({ summary: 'Get SEO suggestions for content' })
  @ApiResponse({ status: 200, description: 'SEO suggestions', type: MetaTagSuggestionDto })
  async getSuggestions(@Body() dto: AnalyzeContentDto) {
    return this.metaTagsService.getSuggestions(dto.content, dto.targetKeywords);
  }

  @Post('generate/product/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.MARKETING)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Generate meta tags for a product' })
  @ApiParam({ name: 'id', description: 'Product ID' })
  @ApiResponse({ status: 200, description: 'Generated meta tags', type: MetaTagDto })
  async generateProductMeta(@Param('id') id: string) {
    return this.metaTagsService.generateProductMeta(id);
  }

  @Post('generate/category/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.MARKETING)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Generate meta tags for a category' })
  @ApiParam({ name: 'id', description: 'Category ID' })
  @ApiResponse({ status: 200, description: 'Generated meta tags', type: MetaTagDto })
  async generateCategoryMeta(@Param('id') id: string) {
    return this.metaTagsService.generateCategoryMeta(id);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.MARKETING)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update meta tags' })
  @ApiParam({ name: 'id', description: 'Meta tag ID' })
  @ApiResponse({ status: 200, description: 'Updated meta tags', type: MetaTagDto })
  async updateMetaTags(@Param('id') id: string, @Body() dto: UpdateMetaTagDto) {
    return this.metaTagsService.updateMetaTags(id, dto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.MARKETING)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete meta tags' })
  @ApiParam({ name: 'id', description: 'Meta tag ID' })
  @ApiResponse({ status: 204, description: 'Meta tags deleted' })
  async deleteMetaTags(@Param('id') id: string) {
    return this.metaTagsService.deleteMetaTags(id);
  }
}
