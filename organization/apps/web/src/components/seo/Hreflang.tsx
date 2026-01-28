'use client';

/**
 * Hreflang Component for Multi-Locale SEO
 * Generates proper hreflang link tags for international SEO
 */

import { usePathname } from 'next/navigation';
import {
  generateHreflangLinks,
  generateProductHreflang,
  generateCategoryHreflang,
  type HreflangLink,
} from '@/lib/seo/hreflang';
import { seoConfig } from '@/lib/seo/config';

export interface HreflangProps {
  /**
   * Current locale code
   */
  locale?: string;
  /**
   * Override path (useful for dynamic routes)
   */
  path?: string;
  /**
   * Available locales for this page (if limited)
   */
  availableLocales?: string[];
  /**
   * Tenant-specific locales
   */
  tenantLocales?: string[];
  /**
   * Translated slugs for each locale
   */
  translatedSlugs?: Record<string, string>;
  /**
   * Pre-computed hreflang links
   */
  links?: HreflangLink[];
}

/**
 * Renders hreflang link tags in the head
 *
 * @example
 * // Basic usage - uses current path
 * <Hreflang locale="en" />
 *
 * @example
 * // With translated slugs for product pages
 * <Hreflang
 *   locale="en"
 *   translatedSlugs={{
 *     'en': '/products/shoe',
 *     'fr-ca': '/products/chaussure',
 *     'es': '/products/zapato'
 *   }}
 * />
 *
 * @example
 * // Tenant-specific locales
 * <Hreflang
 *   locale="en"
 *   tenantLocales={['en', 'fr', 'es']}
 * />
 */
export function Hreflang({
  locale = seoConfig.defaultLocale,
  path,
  availableLocales,
  tenantLocales,
  translatedSlugs,
  links: precomputedLinks,
}: HreflangProps) {
  const pathname = usePathname();
  const currentPath = path || pathname || '/';

  // Use precomputed links if provided
  const links = precomputedLinks || generateHreflangLinks({
    currentLocale: locale,
    currentPath,
    availableLocales,
    tenantLocales,
    translatedSlugs,
  });

  if (links.length === 0) {
    return null;
  }

  return (
    <>
      {links.map((link) => (
        <link
          key={link.hreflang}
          rel="alternate"
          hrefLang={link.hreflang}
          href={link.href}
        />
      ))}
    </>
  );
}

/**
 * Hreflang component specifically for product pages
 */
export interface ProductHreflangProps {
  productSlug: string;
  translations?: Array<{ locale: string; slug: string }>;
  tenantLocales?: string[];
}

export function ProductHreflang({
  productSlug,
  translations,
  tenantLocales,
}: ProductHreflangProps) {
  const links = generateProductHreflang({
    productSlug,
    translations,
    tenantLocales,
  });

  return <Hreflang links={links} />;
}

/**
 * Hreflang component specifically for category pages
 */
export interface CategoryHreflangProps {
  categorySlug: string;
  translations?: Array<{ locale: string; slug: string }>;
  tenantLocales?: string[];
}

export function CategoryHreflang({
  categorySlug,
  translations,
  tenantLocales,
}: CategoryHreflangProps) {
  const links = generateCategoryHreflang({
    categorySlug,
    translations,
    tenantLocales,
  });

  return <Hreflang links={links} />;
}

/**
 * Server component version for static generation
 */
export function HreflangServer({
  links,
}: {
  links: HreflangLink[];
}) {
  return (
    <>
      {links.map((link) => (
        <link
          key={link.hreflang}
          rel="alternate"
          hrefLang={link.hreflang}
          href={link.href}
        />
      ))}
    </>
  );
}

/**
 * Hook for getting hreflang links
 */
export function useHreflang(config: {
  locale?: string;
  path?: string;
  availableLocales?: string[];
  tenantLocales?: string[];
  translatedSlugs?: Record<string, string>;
}): HreflangLink[] {
  const pathname = usePathname();

  return generateHreflangLinks({
    currentLocale: config.locale || seoConfig.defaultLocale,
    currentPath: config.path || pathname || '/',
    availableLocales: config.availableLocales,
    tenantLocales: config.tenantLocales,
    translatedSlugs: config.translatedSlugs,
  });
}

export default Hreflang;
