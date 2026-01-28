'use client';

/**
 * Breadcrumb JSON-LD Schema Component
 * Generates structured data for breadcrumb navigation
 */

import { JsonLd } from '@/lib/seo/json-ld';
import { seoConfig } from '@/lib/seo/config';

export interface BreadcrumbItem {
  name: string;
  url?: string;
  slug?: string;
}

export interface BreadcrumbSchemaProps {
  items: BreadcrumbItem[];
  /**
   * Base URL override
   */
  baseUrl?: string;
  /**
   * Current locale for URL generation
   */
  locale?: string;
}

/**
 * Build full URL from slug or url
 */
function buildItemUrl(item: BreadcrumbItem, baseUrl: string, locale?: string): string {
  if (item.url) {
    return item.url.startsWith('http') ? item.url : `${baseUrl}${item.url}`;
  }
  if (item.slug) {
    const prefix = locale && locale !== seoConfig.defaultLocale ? `/${locale}` : '';
    return `${baseUrl}${prefix}${item.slug}`;
  }
  return baseUrl;
}

/**
 * BreadcrumbSchema component
 *
 * @example
 * <BreadcrumbSchema
 *   items={[
 *     { name: 'Home', url: '/' },
 *     { name: 'Electronics', url: '/categories/electronics' },
 *     { name: 'Headphones', url: '/categories/electronics/headphones' },
 *     { name: 'Product Name' } // Current page - no URL
 *   ]}
 * />
 */
export function BreadcrumbSchema({
  items,
  baseUrl = seoConfig.siteUrl,
  locale,
}: BreadcrumbSchemaProps) {
  if (!items || items.length === 0) {
    return null;
  }

  const schema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      // Only include item URL if not the last item (current page)
      ...(index < items.length - 1 && (item.url || item.slug) && {
        item: buildItemUrl(item, baseUrl, locale),
      }),
    })),
  };

  return <JsonLd data={schema} />;
}

/**
 * Generate breadcrumb items from category path
 */
export function generateCategoryBreadcrumbs(
  categoryPath: Array<{ name: string; slug: string }>,
  productName?: string
): BreadcrumbItem[] {
  const items: BreadcrumbItem[] = [
    { name: 'Home', url: '/' },
    { name: 'Categories', url: '/categories' },
  ];

  // Add each category in the path
  let path = '/categories';
  for (const category of categoryPath) {
    path += `/${category.slug}`;
    items.push({
      name: category.name,
      url: path,
    });
  }

  // Add product name if provided (no URL as it's the current page)
  if (productName) {
    items.push({ name: productName });
  }

  return items;
}

/**
 * Generate breadcrumb items for product page
 */
export function generateProductBreadcrumbs(params: {
  productName: string;
  categoryName?: string;
  categorySlug?: string;
  parentCategories?: Array<{ name: string; slug: string }>;
}): BreadcrumbItem[] {
  const { productName, categoryName, categorySlug, parentCategories = [] } = params;

  const items: BreadcrumbItem[] = [
    { name: 'Home', url: '/' },
  ];

  // Add parent categories
  let path = '/categories';
  for (const parent of parentCategories) {
    path += `/${parent.slug}`;
    items.push({
      name: parent.name,
      url: path,
    });
  }

  // Add direct category
  if (categoryName && categorySlug) {
    items.push({
      name: categoryName,
      url: `${path}/${categorySlug}`,
    });
  }

  // Add product (current page - no URL)
  items.push({ name: productName });

  return items;
}

/**
 * Generate breadcrumb items for vendor/store page
 */
export function generateVendorBreadcrumbs(params: {
  vendorName: string;
  productName?: string;
  categoryName?: string;
}): BreadcrumbItem[] {
  const { vendorName, productName, categoryName } = params;

  const items: BreadcrumbItem[] = [
    { name: 'Home', url: '/' },
    { name: 'Vendors', url: '/vendors' },
    { name: vendorName, url: productName ? `/vendor/${vendorName.toLowerCase().replace(/\s+/g, '-')}` : undefined },
  ];

  if (categoryName && productName) {
    items.push({ name: categoryName });
  }

  if (productName) {
    items.push({ name: productName });
  }

  return items;
}

/**
 * Generate breadcrumb items for search results
 */
export function generateSearchBreadcrumbs(query: string): BreadcrumbItem[] {
  return [
    { name: 'Home', url: '/' },
    { name: 'Search', url: '/search' },
    { name: `Results for "${query}"` },
  ];
}

/**
 * Generate breadcrumb items for account pages
 */
export function generateAccountBreadcrumbs(pageName: string): BreadcrumbItem[] {
  return [
    { name: 'Home', url: '/' },
    { name: 'My Account', url: '/account' },
    { name: pageName },
  ];
}

/**
 * Generate breadcrumb items for help/support pages
 */
export function generateHelpBreadcrumbs(params: {
  sectionName?: string;
  articleTitle?: string;
}): BreadcrumbItem[] {
  const { sectionName, articleTitle } = params;

  const items: BreadcrumbItem[] = [
    { name: 'Home', url: '/' },
    { name: 'Help Center', url: '/help' },
  ];

  if (sectionName) {
    items.push({
      name: sectionName,
      url: articleTitle ? `/help/${sectionName.toLowerCase().replace(/\s+/g, '-')}` : undefined,
    });
  }

  if (articleTitle) {
    items.push({ name: articleTitle });
  }

  return items;
}

/**
 * Generate breadcrumb items for blog pages
 */
export function generateBlogBreadcrumbs(params: {
  categoryName?: string;
  categorySlug?: string;
  articleTitle?: string;
}): BreadcrumbItem[] {
  const { categoryName, categorySlug, articleTitle } = params;

  const items: BreadcrumbItem[] = [
    { name: 'Home', url: '/' },
    { name: 'Blog', url: '/blog' },
  ];

  if (categoryName && categorySlug) {
    items.push({
      name: categoryName,
      url: articleTitle ? `/blog/category/${categorySlug}` : undefined,
    });
  }

  if (articleTitle) {
    items.push({ name: articleTitle });
  }

  return items;
}

export default BreadcrumbSchema;
