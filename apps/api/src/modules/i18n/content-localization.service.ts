import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';

/**
 * Content Localization Service
 *
 * Handles dynamic content localization for:
 * - Products
 * - Categories
 * - Pages
 * - Email templates
 * - Push notifications
 */
@Injectable()
export class ContentLocalizationService {
  constructor(private prisma: PrismaService) {}

  /**
   * Localize product data
   */
  async localizeProduct(productId: string, locale: string) {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      include: {
        translations: {
          where: { languageCode: locale },
        },
      },
    });

    if (!product) return null;

    // If translation exists, merge it with product data
    if (product.translations && product.translations.length > 0) {
      const translation = product.translations[0];
      return {
        ...product,
        name: translation.name || product.name,
        description: translation.description || product.description,
        slug: translation.slug || product.slug,
        metaTitle: translation.metaTitle || product.metaTitle,
        metaDescription: translation.metaDescription || product.metaDescription,
      };
    }

    // Return original product if no translation
    return product;
  }

  /**
   * Localize multiple products
   */
  async localizeProducts(productIds: string[], locale: string) {
    const products = await this.prisma.product.findMany({
      where: { id: { in: productIds } },
      include: {
        translations: {
          where: { languageCode: locale },
        },
      },
    });

    return products.map(product => {
      if (product.translations && product.translations.length > 0) {
        const translation = product.translations[0];
        return {
          ...product,
          name: translation.name || product.name,
          description: translation.description || product.description,
          slug: translation.slug || product.slug,
          metaTitle: translation.metaTitle || product.metaTitle,
          metaDescription: translation.metaDescription || product.metaDescription,
        };
      }
      return product;
    });
  }

  /**
   * Localize category data
   */
  async localizeCategory(categoryId: string, locale: string) {
    const category = await this.prisma.category.findUnique({
      where: { id: categoryId },
      include: {
        translations: {
          where: { languageCode: locale },
        },
      },
    });

    if (!category) return null;

    if (category.translations && category.translations.length > 0) {
      const translation = category.translations[0];
      return {
        ...category,
        name: translation.name || category.name,
        description: translation.description || category.description,
        slug: translation.slug || category.slug,
      };
    }

    return category;
  }

  /**
   * Localize multiple categories
   */
  async localizeCategories(categoryIds: string[], locale: string) {
    const categories = await this.prisma.category.findMany({
      where: { id: { in: categoryIds } },
      include: {
        translations: {
          where: { languageCode: locale },
        },
      },
    });

    return categories.map(category => {
      if (category.translations && category.translations.length > 0) {
        const translation = category.translations[0];
        return {
          ...category,
          name: translation.name || category.name,
          description: translation.description || category.description,
          slug: translation.slug || category.slug,
        };
      }
      return category;
    });
  }

  /**
   * Localize email template
   */
  async localizeEmailTemplate(templateKey: string, locale: string, variables?: Record<string, any>) {
    // Fetch email template from database or static files
    const translation = await this.prisma.translation.findUnique({
      where: {
        languageCode_key_namespace: {
          languageCode: locale,
          key: templateKey,
          namespace: 'email',
        },
      },
    });

    let content = translation?.value || templateKey;

    // Replace variables in template
    if (variables) {
      Object.entries(variables).forEach(([key, value]) => {
        const regex = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
        content = content.replace(regex, String(value));
      });
    }

    return content;
  }

  /**
   * Localize notification message
   */
  async localizeNotification(notificationKey: string, locale: string, variables?: Record<string, any>) {
    const translation = await this.prisma.translation.findUnique({
      where: {
        languageCode_key_namespace: {
          languageCode: locale,
          key: notificationKey,
          namespace: 'notifications',
        },
      },
    });

    let message = translation?.value || notificationKey;

    // Replace variables
    if (variables) {
      Object.entries(variables).forEach(([key, value]) => {
        const regex = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
        message = message.replace(regex, String(value));
      });
    }

    return message;
  }

  /**
   * Localize currency format
   */
  formatCurrency(amount: number, locale: string, currency: string = 'USD'): string {
    try {
      return new Intl.NumberFormat(this.getIntlLocale(locale), {
        style: 'currency',
        currency: currency,
      }).format(amount);
    } catch (error) {
      // Fallback to simple format
      return `${currency} ${amount.toFixed(2)}`;
    }
  }

  /**
   * Localize date format
   */
  formatDate(date: Date, locale: string, options?: Intl.DateTimeFormatOptions): string {
    try {
      const defaultOptions: Intl.DateTimeFormatOptions = {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        ...options,
      };

      return new Intl.DateTimeFormat(this.getIntlLocale(locale), defaultOptions).format(date);
    } catch (error) {
      // Fallback to ISO string
      return date.toISOString().split('T')[0];
    }
  }

  /**
   * Localize number format
   */
  formatNumber(number: number, locale: string, options?: Intl.NumberFormatOptions): string {
    try {
      return new Intl.NumberFormat(this.getIntlLocale(locale), options).format(number);
    } catch (error) {
      // Fallback to simple format
      return number.toString();
    }
  }

  /**
   * Get translation fallback chain
   * Priority: requested locale -> English -> raw key
   */
  async getTranslationWithFallback(
    key: string,
    locale: string,
    namespace: string = 'common',
    variables?: Record<string, any>
  ): Promise<string> {
    // Try requested locale
    let translation = await this.prisma.translation.findUnique({
      where: {
        languageCode_key_namespace: {
          languageCode: locale,
          key,
          namespace,
        },
      },
    });

    // Fallback to English if not found
    if (!translation && locale !== 'en') {
      translation = await this.prisma.translation.findUnique({
        where: {
          languageCode_key_namespace: {
            languageCode: 'en',
            key,
            namespace,
          },
        },
      });
    }

    let content = translation?.value || key;

    // Replace variables
    if (variables) {
      Object.entries(variables).forEach(([varKey, varValue]) => {
        const regex = new RegExp(`{{\\s*${varKey}\\s*}}`, 'g');
        content = content.replace(regex, String(varValue));
      });
    }

    return content;
  }

  /**
   * Convert locale code to Intl.Locale format
   */
  private getIntlLocale(locale: string): string {
    const localeMap: Record<string, string> = {
      'en': 'en-US',
      'fr': 'fr-FR',
      'ar': 'ar-SA',
      'pt': 'pt-PT',
      'es': 'es-ES',
      'sw': 'sw-KE',
      'zh': 'zh-CN',
      'ha': 'ha-NG',
      'yo': 'yo-NG',
      'ig': 'ig-NG',
      'de': 'de-DE',
      'nl': 'nl-NL',
      'it': 'it-IT',
      'ru': 'ru-RU',
      'ja': 'ja-JP',
    };

    return localeMap[locale] || locale;
  }

  /**
   * Pluralize based on locale rules
   */
  pluralize(key: string, count: number, locale: string): string {
    // Simple pluralization rules (can be extended)
    const pluralRules = new Intl.PluralRules(this.getIntlLocale(locale));
    const rule = pluralRules.select(count);

    // Map to translation keys (e.g., 'item_one', 'item_other')
    return `${key}_${rule}`;
  }
}
