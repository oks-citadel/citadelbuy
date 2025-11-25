import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';
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

@Injectable()
export class I18nService {
  constructor(private prisma: PrismaService) {}

  // ============================================
  // LANGUAGE MANAGEMENT
  // ============================================

  /**
   * Create a new language
   */
  async createLanguage(dto: CreateLanguageDto) {
    // Check if language code already exists
    const existing = await this.prisma.language.findUnique({
      where: { code: dto.code },
    });

    if (existing) {
      throw new BadRequestException(`Language with code '${dto.code}' already exists`);
    }

    // If setting as default, unset other defaults
    if (dto.isDefault) {
      await this.prisma.language.updateMany({
        where: { isDefault: true },
        data: { isDefault: false },
      });
    }

    return this.prisma.language.create({
      data: dto,
    });
  }

  /**
   * Get all languages
   */
  async getAllLanguages(includeDisabled: boolean = false) {
    return this.prisma.language.findMany({
      where: includeDisabled ? {} : { isEnabled: true },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });
  }

  /**
   * Get language by code
   */
  async getLanguageByCode(code: string) {
    const language = await this.prisma.language.findUnique({
      where: { code },
    });

    if (!language) {
      throw new NotFoundException(`Language with code '${code}' not found`);
    }

    return language;
  }

  /**
   * Get default language
   */
  async getDefaultLanguage() {
    const language = await this.prisma.language.findFirst({
      where: { isDefault: true, isEnabled: true },
    });

    if (!language) {
      // Fallback to first enabled language
      return this.prisma.language.findFirst({
        where: { isEnabled: true },
        orderBy: { sortOrder: 'asc' },
      });
    }

    return language;
  }

  /**
   * Update language
   */
  async updateLanguage(code: string, dto: UpdateLanguageDto) {
    await this.getLanguageByCode(code);

    // If setting as default, unset other defaults
    if (dto.isDefault) {
      await this.prisma.language.updateMany({
        where: { code: { not: code }, isDefault: true },
        data: { isDefault: false },
      });
    }

    return this.prisma.language.update({
      where: { code },
      data: dto,
    });
  }

  /**
   * Delete language
   */
  async deleteLanguage(code: string) {
    const language = await this.getLanguageByCode(code);

    if (language.isDefault) {
      throw new BadRequestException('Cannot delete default language');
    }

    return this.prisma.language.delete({
      where: { code },
    });
  }

  // ============================================
  // TRANSLATION MANAGEMENT
  // ============================================

  /**
   * Create or update a translation
   */
  async upsertTranslation(dto: CreateTranslationDto) {
    await this.getLanguageByCode(dto.languageCode);

    return this.prisma.translation.upsert({
      where: {
        languageCode_key_namespace: {
          languageCode: dto.languageCode,
          key: dto.key,
          namespace: dto.namespace || 'common',
        },
      },
      create: {
        languageCode: dto.languageCode,
        key: dto.key,
        value: dto.value,
        namespace: dto.namespace || 'common',
      },
      update: {
        value: dto.value,
      },
    });
  }

  /**
   * Bulk create/update translations
   */
  async bulkUpsertTranslations(dto: BulkTranslationDto) {
    await this.getLanguageByCode(dto.languageCode);

    const namespace = dto.namespace || 'common';
    const operations = Object.entries(dto.translations).map(([key, value]) =>
      this.prisma.translation.upsert({
        where: {
          languageCode_key_namespace: {
            languageCode: dto.languageCode,
            key,
            namespace,
          },
        },
        create: {
          languageCode: dto.languageCode,
          key,
          value,
          namespace,
        },
        update: {
          value,
        },
      })
    );

    await this.prisma.$transaction(operations);

    return { success: true, count: operations.length };
  }

  /**
   * Get translations for a language
   */
  async getTranslations(languageCode: string, namespace?: string) {
    await this.getLanguageByCode(languageCode);

    const translations = await this.prisma.translation.findMany({
      where: {
        languageCode,
        ...(namespace && { namespace }),
      },
      orderBy: { key: 'asc' },
    });

    // Convert to key-value object
    const translationsObj: Record<string, string> = {};
    translations.forEach((t) => {
      translationsObj[t.key] = t.value;
    });

    return translationsObj;
  }

  /**
   * Get all translations grouped by namespace
   */
  async getAllTranslations(languageCode: string) {
    await this.getLanguageByCode(languageCode);

    const translations = await this.prisma.translation.findMany({
      where: { languageCode },
      orderBy: [{ namespace: 'asc' }, { key: 'asc' }],
    });

    // Group by namespace
    const grouped: Record<string, Record<string, string>> = {};
    translations.forEach((t) => {
      if (!grouped[t.namespace]) {
        grouped[t.namespace] = {};
      }
      grouped[t.namespace][t.key] = t.value;
    });

    return grouped;
  }

  /**
   * Update a translation
   */
  async updateTranslation(
    languageCode: string,
    key: string,
    namespace: string,
    dto: UpdateTranslationDto
  ) {
    const translation = await this.prisma.translation.findUnique({
      where: {
        languageCode_key_namespace: {
          languageCode,
          key,
          namespace,
        },
      },
    });

    if (!translation) {
      throw new NotFoundException('Translation not found');
    }

    return this.prisma.translation.update({
      where: {
        languageCode_key_namespace: {
          languageCode,
          key,
          namespace,
        },
      },
      data: {
        value: dto.value,
      },
    });
  }

  /**
   * Delete a translation
   */
  async deleteTranslation(languageCode: string, key: string, namespace: string) {
    return this.prisma.translation.delete({
      where: {
        languageCode_key_namespace: {
          languageCode,
          key,
          namespace,
        },
      },
    });
  }

  // ============================================
  // PRODUCT TRANSLATIONS
  // ============================================

  /**
   * Create/update product translation
   */
  async upsertProductTranslation(dto: ProductTranslationDto) {
    await this.getLanguageByCode(dto.languageCode);

    // Verify product exists
    const product = await this.prisma.product.findUnique({
      where: { id: dto.productId },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    return this.prisma.productTranslation.upsert({
      where: {
        productId_languageCode: {
          productId: dto.productId,
          languageCode: dto.languageCode,
        },
      },
      create: dto,
      update: {
        name: dto.name,
        description: dto.description,
        metaTitle: dto.metaTitle,
        metaDescription: dto.metaDescription,
        slug: dto.slug,
      },
    });
  }

  /**
   * Get product translations
   */
  async getProductTranslations(productId: string) {
    return this.prisma.productTranslation.findMany({
      where: { productId },
      include: {
        language: true,
      },
    });
  }

  /**
   * Get product translation for specific language
   */
  async getProductTranslation(productId: string, languageCode: string) {
    const translation = await this.prisma.productTranslation.findUnique({
      where: {
        productId_languageCode: {
          productId,
          languageCode,
        },
      },
      include: {
        language: true,
      },
    });

    if (!translation) {
      throw new NotFoundException('Product translation not found');
    }

    return translation;
  }

  /**
   * Delete product translation
   */
  async deleteProductTranslation(productId: string, languageCode: string) {
    return this.prisma.productTranslation.delete({
      where: {
        productId_languageCode: {
          productId,
          languageCode,
        },
      },
    });
  }

  // ============================================
  // CATEGORY TRANSLATIONS
  // ============================================

  /**
   * Create/update category translation
   */
  async upsertCategoryTranslation(dto: CategoryTranslationDto) {
    await this.getLanguageByCode(dto.languageCode);

    // Verify category exists
    const category = await this.prisma.category.findUnique({
      where: { id: dto.categoryId },
    });

    if (!category) {
      throw new NotFoundException('Category not found');
    }

    return this.prisma.categoryTranslation.upsert({
      where: {
        categoryId_languageCode: {
          categoryId: dto.categoryId,
          languageCode: dto.languageCode,
        },
      },
      create: dto,
      update: {
        name: dto.name,
        description: dto.description,
        slug: dto.slug,
      },
    });
  }

  /**
   * Get category translations
   */
  async getCategoryTranslations(categoryId: string) {
    return this.prisma.categoryTranslation.findMany({
      where: { categoryId },
      include: {
        language: true,
      },
    });
  }

  /**
   * Get category translation for specific language
   */
  async getCategoryTranslation(categoryId: string, languageCode: string) {
    const translation = await this.prisma.categoryTranslation.findUnique({
      where: {
        categoryId_languageCode: {
          categoryId,
          languageCode,
        },
      },
      include: {
        language: true,
      },
    });

    if (!translation) {
      throw new NotFoundException('Category translation not found');
    }

    return translation;
  }

  /**
   * Delete category translation
   */
  async deleteCategoryTranslation(categoryId: string, languageCode: string) {
    return this.prisma.categoryTranslation.delete({
      where: {
        categoryId_languageCode: {
          categoryId,
          languageCode,
        },
      },
    });
  }

  // ============================================
  // UTILITY METHODS
  // ============================================

  /**
   * Get translation coverage stats
   */
  async getTranslationCoverage(languageCode: string) {
    const [totalKeys, translatedKeys, products, translatedProducts, categories, translatedCategories] = await Promise.all([
      this.prisma.translation.groupBy({
        by: ['key', 'namespace'],
        where: {
          language: { isDefault: true },
        },
      }),
      this.prisma.translation.count({
        where: { languageCode },
      }),
      this.prisma.product.count(),
      this.prisma.productTranslation.count({
        where: { languageCode },
      }),
      this.prisma.category.count(),
      this.prisma.categoryTranslation.count({
        where: { languageCode },
      }),
    ]);

    return {
      ui: {
        total: totalKeys.length,
        translated: translatedKeys,
        percentage: totalKeys.length > 0 ? (translatedKeys / totalKeys.length) * 100 : 0,
      },
      products: {
        total: products,
        translated: translatedProducts,
        percentage: products > 0 ? (translatedProducts / products) * 100 : 0,
      },
      categories: {
        total: categories,
        translated: translatedCategories,
        percentage: categories > 0 ? (translatedCategories / categories) * 100 : 0,
      },
    };
  }

  /**
   * Initialize default languages
   */
  async initializeDefaultLanguages() {
    const languages = [
      {
        code: 'en',
        name: 'English',
        nativeName: 'English',
        isDefault: true,
        flag: '🇺🇸',
        sortOrder: 0,
      },
      {
        code: 'es',
        name: 'Spanish',
        nativeName: 'Español',
        flag: '🇪🇸',
        sortOrder: 1,
      },
      {
        code: 'fr',
        name: 'French',
        nativeName: 'Français',
        flag: '🇫🇷',
        sortOrder: 2,
      },
      {
        code: 'de',
        name: 'German',
        nativeName: 'Deutsch',
        flag: '🇩🇪',
        sortOrder: 3,
      },
      {
        code: 'zh',
        name: 'Chinese',
        nativeName: '中文',
        flag: '🇨🇳',
        sortOrder: 4,
      },
      {
        code: 'ar',
        name: 'Arabic',
        nativeName: 'العربية',
        isRTL: true,
        flag: '🇸🇦',
        sortOrder: 5,
      },
    ];

    const created = [];
    for (const lang of languages) {
      const existing = await this.prisma.language.findUnique({
        where: { code: lang.code },
      });

      if (!existing) {
        const created_lang = await this.prisma.language.create({
          data: lang,
        });
        created.push(created_lang);
      }
    }

    return { message: 'Languages initialized', created: created.length };
  }
}
