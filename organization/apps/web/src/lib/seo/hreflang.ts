/**
 * Hreflang Tag Generation for Multi-Locale SEO
 * Generates proper hreflang tags for international SEO
 */

import { seoConfig, SUPPORTED_LOCALES, getLocaleConfig, buildLocalizedUrl, type LocaleConfig } from './config';

export interface HreflangLink {
  hreflang: string;
  href: string;
}

export interface HreflangConfig {
  currentLocale: string;
  currentPath: string;
  availableLocales?: string[];
  tenantLocales?: string[];
  translatedSlugs?: Record<string, string>; // locale -> translated slug
}

/**
 * Generate hreflang links for a page
 */
export function generateHreflangLinks(config: HreflangConfig): HreflangLink[] {
  const {
    currentLocale,
    currentPath,
    availableLocales,
    tenantLocales,
    translatedSlugs = {},
  } = config;

  const links: HreflangLink[] = [];

  // Determine which locales to include
  let localesToInclude: LocaleConfig[];

  if (tenantLocales && tenantLocales.length > 0) {
    // Tenant-specific locales
    localesToInclude = SUPPORTED_LOCALES.filter((l) =>
      tenantLocales.includes(l.code)
    );
  } else if (availableLocales && availableLocales.length > 0) {
    // Page-specific available locales
    localesToInclude = SUPPORTED_LOCALES.filter((l) =>
      availableLocales.includes(l.code)
    );
  } else {
    // All supported locales
    localesToInclude = SUPPORTED_LOCALES;
  }

  // Generate links for each locale
  for (const locale of localesToInclude) {
    // Use translated slug if available, otherwise use current path
    const slug = translatedSlugs[locale.code] || currentPath;
    const href = buildLocalizedUrl(slug, locale.code);

    links.push({
      hreflang: locale.hreflang,
      href,
    });
  }

  // Add x-default (usually points to the default locale version)
  const defaultLocale = localesToInclude.find((l) => l.isDefault) || localesToInclude[0];
  if (defaultLocale) {
    const defaultSlug = translatedSlugs[defaultLocale.code] || currentPath;
    links.push({
      hreflang: 'x-default',
      href: buildLocalizedUrl(defaultSlug), // No locale prefix for default
    });
  }

  return links;
}

/**
 * Generate hreflang HTML tags string
 */
export function generateHreflangTags(config: HreflangConfig): string {
  const links = generateHreflangLinks(config);

  return links
    .map((link) => `<link rel="alternate" hreflang="${link.hreflang}" href="${link.href}" />`)
    .join('\n');
}

/**
 * Generate hreflang for product pages with translated slugs
 */
export function generateProductHreflang(params: {
  productSlug: string;
  translations?: Array<{ locale: string; slug: string }>;
  tenantLocales?: string[];
}): HreflangLink[] {
  const { productSlug, translations = [], tenantLocales } = params;

  // Build translated slugs map
  const translatedSlugs: Record<string, string> = {};
  for (const t of translations) {
    translatedSlugs[t.locale] = `/products/${t.slug}`;
  }

  // Add current slug as fallback for locales without translations
  const defaultPath = `/products/${productSlug}`;

  return generateHreflangLinks({
    currentLocale: seoConfig.defaultLocale,
    currentPath: defaultPath,
    tenantLocales,
    translatedSlugs,
  });
}

/**
 * Generate hreflang for category pages with translated names
 */
export function generateCategoryHreflang(params: {
  categorySlug: string;
  translations?: Array<{ locale: string; slug: string }>;
  tenantLocales?: string[];
}): HreflangLink[] {
  const { categorySlug, translations = [], tenantLocales } = params;

  const translatedSlugs: Record<string, string> = {};
  for (const t of translations) {
    translatedSlugs[t.locale] = `/categories/${t.slug}`;
  }

  return generateHreflangLinks({
    currentLocale: seoConfig.defaultLocale,
    currentPath: `/categories/${categorySlug}`,
    tenantLocales,
    translatedSlugs,
  });
}

/**
 * Get hreflang for country-specific landing pages
 */
export function generateCountryHreflang(params: {
  countryCode: string;
  availableLanguages: string[];
}): HreflangLink[] {
  const { countryCode, availableLanguages } = params;

  // Filter locales that match the country's available languages
  const relevantLocales = SUPPORTED_LOCALES.filter((l) =>
    availableLanguages.some(
      (lang) => l.code.startsWith(lang) || l.hreflang.startsWith(lang)
    )
  );

  const links: HreflangLink[] = relevantLocales.map((locale) => ({
    hreflang: locale.hreflang,
    href: buildLocalizedUrl(`/shop/${countryCode.toLowerCase()}`, locale.code),
  }));

  // Add x-default
  if (relevantLocales.length > 0) {
    links.push({
      hreflang: 'x-default',
      href: buildLocalizedUrl(`/shop/${countryCode.toLowerCase()}`),
    });
  }

  return links;
}

/**
 * Validate hreflang implementation
 * Returns issues found with hreflang configuration
 */
export function validateHreflang(links: HreflangLink[]): string[] {
  const issues: string[] = [];

  // Check for x-default
  const hasXDefault = links.some((l) => l.hreflang === 'x-default');
  if (!hasXDefault) {
    issues.push('Missing x-default hreflang tag');
  }

  // Check for duplicate hreflang values
  const hreflangValues = links.map((l) => l.hreflang);
  const duplicates = hreflangValues.filter(
    (v, i) => hreflangValues.indexOf(v) !== i
  );
  if (duplicates.length > 0) {
    issues.push(`Duplicate hreflang values: ${duplicates.join(', ')}`);
  }

  // Check for valid hreflang format
  const validHreflangPattern = /^(x-default|[a-z]{2}(-[a-z]{2})?)$/i;
  for (const link of links) {
    if (!validHreflangPattern.test(link.hreflang)) {
      issues.push(`Invalid hreflang format: ${link.hreflang}`);
    }
  }

  // Check for valid URLs
  for (const link of links) {
    try {
      new URL(link.href);
    } catch {
      issues.push(`Invalid URL for ${link.hreflang}: ${link.href}`);
    }
  }

  // Check for self-referential link (current page should be in the list)
  // This is a best practice check

  return issues;
}

/**
 * Get language and region from hreflang code
 */
export function parseHreflang(hreflang: string): { language: string; region?: string } {
  if (hreflang === 'x-default') {
    return { language: 'x-default' };
  }

  const parts = hreflang.toLowerCase().split('-');
  return {
    language: parts[0],
    region: parts[1]?.toUpperCase(),
  };
}

/**
 * Build hreflang from language and region
 */
export function buildHreflang(language: string, region?: string): string {
  if (!region) return language.toLowerCase();
  return `${language.toLowerCase()}-${region.toLowerCase()}`;
}

/**
 * Get content language header value from locale
 */
export function getContentLanguage(locale: string): string {
  const config = getLocaleConfig(locale);
  if (!config) return 'en';

  const { language, region } = parseHreflang(config.hreflang);
  return region ? `${language}-${region}` : language;
}

export default {
  generateHreflangLinks,
  generateHreflangTags,
  generateProductHreflang,
  generateCategoryHreflang,
  generateCountryHreflang,
  validateHreflang,
  parseHreflang,
  buildHreflang,
  getContentLanguage,
};
