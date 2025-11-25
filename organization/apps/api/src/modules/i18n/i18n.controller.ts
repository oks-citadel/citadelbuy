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
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { I18nService } from './i18n.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '@/common/guards/roles.guard';
import { Roles } from '@/common/decorators/roles.decorator';
import { UserRole } from '@prisma/client';
import {
  CreateLanguageDto,
  UpdateLanguageDto,
} from './dto/language.dto';
import {
  CreateTranslationDto,
  UpdateTranslationDto,
  BulkTranslationDto,
  ProductTranslationDto,
  CategoryTranslationDto,
} from './dto/translation.dto';

@ApiTags('i18n')
@Controller('i18n')
export class I18nController {
  constructor(private readonly i18nService: I18nService) {}

  // ============================================
  // LANGUAGE MANAGEMENT
  // ============================================

  @Post('languages')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new language' })
  @ApiResponse({ status: 201, description: 'Language created successfully' })
  @ApiResponse({ status: 400, description: 'Language code already exists' })
  async createLanguage(@Body() dto: CreateLanguageDto) {
    return this.i18nService.createLanguage(dto);
  }

  @Get('languages')
  @ApiOperation({ summary: 'Get all languages' })
  @ApiResponse({ status: 200, description: 'List of all languages' })
  async getAllLanguages(
    @Query('includeDisabled') includeDisabled?: string,
  ) {
    return this.i18nService.getAllLanguages(includeDisabled === 'true');
  }

  @Get('languages/default')
  @ApiOperation({ summary: 'Get default language' })
  @ApiResponse({ status: 200, description: 'Default language' })
  async getDefaultLanguage() {
    return this.i18nService.getDefaultLanguage();
  }

  @Get('languages/:code')
  @ApiOperation({ summary: 'Get language by code' })
  @ApiResponse({ status: 200, description: 'Language details' })
  @ApiResponse({ status: 404, description: 'Language not found' })
  async getLanguageByCode(@Param('code') code: string) {
    return this.i18nService.getLanguageByCode(code);
  }

  @Put('languages/:code')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update language' })
  @ApiResponse({ status: 200, description: 'Language updated successfully' })
  @ApiResponse({ status: 404, description: 'Language not found' })
  async updateLanguage(
    @Param('code') code: string,
    @Body() dto: UpdateLanguageDto,
  ) {
    return this.i18nService.updateLanguage(code, dto);
  }

  @Delete('languages/:code')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete language' })
  @ApiResponse({ status: 200, description: 'Language deleted successfully' })
  @ApiResponse({ status: 400, description: 'Cannot delete default language' })
  @ApiResponse({ status: 404, description: 'Language not found' })
  async deleteLanguage(@Param('code') code: string) {
    return this.i18nService.deleteLanguage(code);
  }

  @Post('languages/initialize')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Initialize default languages (en, es, fr, de, zh, ar)' })
  @ApiResponse({ status: 201, description: 'Languages initialized successfully' })
  async initializeDefaultLanguages() {
    return this.i18nService.initializeDefaultLanguages();
  }

  // ============================================
  // TRANSLATION MANAGEMENT
  // ============================================

  @Post('translations')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create or update a translation' })
  @ApiResponse({ status: 201, description: 'Translation created/updated successfully' })
  @ApiResponse({ status: 404, description: 'Language not found' })
  async upsertTranslation(@Body() dto: CreateTranslationDto) {
    return this.i18nService.upsertTranslation(dto);
  }

  @Post('translations/bulk')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Bulk create/update translations' })
  @ApiResponse({ status: 201, description: 'Translations imported successfully' })
  @ApiResponse({ status: 404, description: 'Language not found' })
  async bulkUpsertTranslations(@Body() dto: BulkTranslationDto) {
    return this.i18nService.bulkUpsertTranslations(dto);
  }

  @Get('translations/:languageCode')
  @ApiOperation({ summary: 'Get translations for a language' })
  @ApiResponse({ status: 200, description: 'Translations as key-value object' })
  @ApiResponse({ status: 404, description: 'Language not found' })
  async getTranslations(
    @Param('languageCode') languageCode: string,
    @Query('namespace') namespace?: string,
  ) {
    return this.i18nService.getTranslations(languageCode, namespace);
  }

  @Get('translations/:languageCode/all')
  @ApiOperation({ summary: 'Get all translations grouped by namespace' })
  @ApiResponse({ status: 200, description: 'Translations grouped by namespace' })
  @ApiResponse({ status: 404, description: 'Language not found' })
  async getAllTranslations(@Param('languageCode') languageCode: string) {
    return this.i18nService.getAllTranslations(languageCode);
  }

  @Put('translations/:languageCode/:namespace/:key')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a translation' })
  @ApiResponse({ status: 200, description: 'Translation updated successfully' })
  @ApiResponse({ status: 404, description: 'Translation not found' })
  async updateTranslation(
    @Param('languageCode') languageCode: string,
    @Param('key') key: string,
    @Param('namespace') namespace: string,
    @Body() dto: UpdateTranslationDto,
  ) {
    return this.i18nService.updateTranslation(languageCode, key, namespace, dto);
  }

  @Delete('translations/:languageCode/:namespace/:key')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete a translation' })
  @ApiResponse({ status: 200, description: 'Translation deleted successfully' })
  @ApiResponse({ status: 404, description: 'Translation not found' })
  async deleteTranslation(
    @Param('languageCode') languageCode: string,
    @Param('key') key: string,
    @Param('namespace') namespace: string,
  ) {
    return this.i18nService.deleteTranslation(languageCode, key, namespace);
  }

  // ============================================
  // PRODUCT TRANSLATIONS
  // ============================================

  @Post('products/:productId/translations')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.VENDOR, UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create/update product translation' })
  @ApiResponse({ status: 201, description: 'Product translation created/updated successfully' })
  @ApiResponse({ status: 404, description: 'Product or language not found' })
  async upsertProductTranslation(
    @Param('productId') productId: string,
    @Body() dto: ProductTranslationDto,
  ) {
    // Ensure productId from URL matches DTO
    return this.i18nService.upsertProductTranslation({
      ...dto,
      productId,
    });
  }

  @Get('products/:productId/translations')
  @ApiOperation({ summary: 'Get all translations for a product' })
  @ApiResponse({ status: 200, description: 'List of product translations' })
  async getProductTranslations(@Param('productId') productId: string) {
    return this.i18nService.getProductTranslations(productId);
  }

  @Get('products/:productId/translations/:languageCode')
  @ApiOperation({ summary: 'Get product translation for specific language' })
  @ApiResponse({ status: 200, description: 'Product translation details' })
  @ApiResponse({ status: 404, description: 'Product translation not found' })
  async getProductTranslation(
    @Param('productId') productId: string,
    @Param('languageCode') languageCode: string,
  ) {
    return this.i18nService.getProductTranslation(productId, languageCode);
  }

  @Delete('products/:productId/translations/:languageCode')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.VENDOR, UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete product translation' })
  @ApiResponse({ status: 200, description: 'Product translation deleted successfully' })
  @ApiResponse({ status: 404, description: 'Product translation not found' })
  async deleteProductTranslation(
    @Param('productId') productId: string,
    @Param('languageCode') languageCode: string,
  ) {
    return this.i18nService.deleteProductTranslation(productId, languageCode);
  }

  // ============================================
  // CATEGORY TRANSLATIONS
  // ============================================

  @Post('categories/:categoryId/translations')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create/update category translation' })
  @ApiResponse({ status: 201, description: 'Category translation created/updated successfully' })
  @ApiResponse({ status: 404, description: 'Category or language not found' })
  async upsertCategoryTranslation(
    @Param('categoryId') categoryId: string,
    @Body() dto: CategoryTranslationDto,
  ) {
    // Ensure categoryId from URL matches DTO
    return this.i18nService.upsertCategoryTranslation({
      ...dto,
      categoryId,
    });
  }

  @Get('categories/:categoryId/translations')
  @ApiOperation({ summary: 'Get all translations for a category' })
  @ApiResponse({ status: 200, description: 'List of category translations' })
  async getCategoryTranslations(@Param('categoryId') categoryId: string) {
    return this.i18nService.getCategoryTranslations(categoryId);
  }

  @Get('categories/:categoryId/translations/:languageCode')
  @ApiOperation({ summary: 'Get category translation for specific language' })
  @ApiResponse({ status: 200, description: 'Category translation details' })
  @ApiResponse({ status: 404, description: 'Category translation not found' })
  async getCategoryTranslation(
    @Param('categoryId') categoryId: string,
    @Param('languageCode') languageCode: string,
  ) {
    return this.i18nService.getCategoryTranslation(categoryId, languageCode);
  }

  @Delete('categories/:categoryId/translations/:languageCode')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete category translation' })
  @ApiResponse({ status: 200, description: 'Category translation deleted successfully' })
  @ApiResponse({ status: 404, description: 'Category translation not found' })
  async deleteCategoryTranslation(
    @Param('categoryId') categoryId: string,
    @Param('languageCode') languageCode: string,
  ) {
    return this.i18nService.deleteCategoryTranslation(categoryId, languageCode);
  }

  // ============================================
  // UTILITY ENDPOINTS
  // ============================================

  @Get('coverage/:languageCode')
  @ApiOperation({ summary: 'Get translation coverage statistics' })
  @ApiResponse({ status: 200, description: 'Translation coverage stats' })
  @ApiResponse({ status: 404, description: 'Language not found' })
  async getTranslationCoverage(@Param('languageCode') languageCode: string) {
    return this.i18nService.getTranslationCoverage(languageCode);
  }
}
