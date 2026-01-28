'use client';

/**
 * Canonical Tag Component for SEO
 * Generates proper canonical URLs to prevent duplicate content issues
 */

import { usePathname, useSearchParams } from 'next/navigation';
import { seoConfig, buildLocalizedUrl } from '@/lib/seo/config';

export interface CanonicalProps {
  /**
   * Override the canonical URL
   */
  url?: string;
  /**
   * Current locale
   */
  locale?: string;
  /**
   * Override path
   */
  path?: string;
  /**
   * Whether to include pagination in canonical
   * Default: false (pagination pages point to page 1)
   */
  includePagination?: boolean;
  /**
   * Allowed query parameters to include in canonical
   * Default: none (all query params stripped)
   */
  allowedQueryParams?: string[];
  /**
   * Query parameters to always exclude
   */
  excludedQueryParams?: string[];
}

// Default excluded query parameters (tracking, filters, sorting)
const DEFAULT_EXCLUDED_PARAMS = [
  // Tracking parameters
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'utm_term',
  'utm_content',
  'fbclid',
  'gclid',
  'msclkid',
  'ref',
  'affiliate',
  // Filter/sort parameters (usually not canonical)
  'sort',
  'order',
  'filter',
  'view',
  // Session/state parameters
  'session',
  'token',
  '_t',
];

// Allowed query parameters that affect content
const DEFAULT_ALLOWED_PARAMS = [
  'category',
  'brand',
  'q', // search query
  'sku',
  'variant',
];

/**
 * Determines the canonical URL for the current page
 */
export function getCanonicalUrl(config: {
  currentPath: string;
  locale?: string;
  searchParams?: URLSearchParams;
  includePagination?: boolean;
  allowedQueryParams?: string[];
  excludedQueryParams?: string[];
}): string {
  const {
    currentPath,
    locale,
    searchParams,
    includePagination = false,
    allowedQueryParams = [],
    excludedQueryParams = DEFAULT_EXCLUDED_PARAMS,
  } = config;

  // Remove locale prefix from path if present
  let cleanPath = currentPath;
  for (const loc of seoConfig.supportedLocales) {
    if (cleanPath.startsWith(`/${loc.code}/`)) {
      cleanPath = cleanPath.replace(`/${loc.code}`, '');
      break;
    }
  }

  // Handle pagination
  if (!includePagination) {
    // Remove page parameter or /page/X from path
    cleanPath = cleanPath.replace(/\/page\/\d+/, '');
  }

  // Build base URL
  let canonicalUrl = buildLocalizedUrl(cleanPath, locale);

  // Process query parameters if present
  if (searchParams && searchParams.toString()) {
    const canonicalParams = new URLSearchParams();
    const allAllowed = [...DEFAULT_ALLOWED_PARAMS, ...allowedQueryParams];

    searchParams.forEach((value, key) => {
      // Include if in allowed list and not in excluded list
      if (allAllowed.includes(key) && !excludedQueryParams.includes(key)) {
        canonicalParams.set(key, value);
      }
    });

    // Handle pagination parameter
    if (includePagination) {
      const page = searchParams.get('page');
      if (page && page !== '1') {
        canonicalParams.set('page', page);
      }
    }

    const queryString = canonicalParams.toString();
    if (queryString) {
      canonicalUrl += `?${queryString}`;
    }
  }

  return canonicalUrl;
}

/**
 * Canonical link component
 *
 * @example
 * // Basic usage
 * <Canonical />
 *
 * @example
 * // With specific URL
 * <Canonical url="https://broxiva.com/products/specific-product" />
 *
 * @example
 * // With locale
 * <Canonical locale="fr" />
 *
 * @example
 * // With pagination
 * <Canonical includePagination />
 *
 * @example
 * // With allowed query params
 * <Canonical allowedQueryParams={['color', 'size']} />
 */
export function Canonical({
  url,
  locale,
  path,
  includePagination = false,
  allowedQueryParams = [],
  excludedQueryParams = DEFAULT_EXCLUDED_PARAMS,
}: CanonicalProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Use provided URL or compute canonical
  const canonicalUrl = url || getCanonicalUrl({
    currentPath: path || pathname || '/',
    locale,
    searchParams: searchParams || undefined,
    includePagination,
    allowedQueryParams,
    excludedQueryParams,
  });

  return <link rel="canonical" href={canonicalUrl} />;
}

/**
 * Server component version for static/server rendering
 */
export function CanonicalServer({
  url,
  locale,
  path,
}: {
  url?: string;
  locale?: string;
  path: string;
}) {
  const canonicalUrl = url || buildLocalizedUrl(path, locale);
  return <link rel="canonical" href={canonicalUrl} />;
}

/**
 * Hook for getting canonical URL
 */
export function useCanonical(config?: {
  locale?: string;
  path?: string;
  includePagination?: boolean;
  allowedQueryParams?: string[];
}): string {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  return getCanonicalUrl({
    currentPath: config?.path || pathname || '/',
    locale: config?.locale,
    searchParams: searchParams || undefined,
    includePagination: config?.includePagination,
    allowedQueryParams: config?.allowedQueryParams,
  });
}

/**
 * Component for handling paginated content canonical URLs
 */
export interface PaginationCanonicalProps {
  currentPage: number;
  totalPages: number;
  basePath: string;
  locale?: string;
}

export function PaginationCanonical({
  currentPage,
  totalPages,
  basePath,
  locale,
}: PaginationCanonicalProps) {
  // Canonical should point to page 1 for most cases
  // Unless this is a paginated series where each page has unique content
  const canonicalUrl = buildLocalizedUrl(basePath, locale);

  return (
    <>
      <link rel="canonical" href={canonicalUrl} />
      {/* Add prev/next for pagination */}
      {currentPage > 1 && (
        <link
          rel="prev"
          href={buildLocalizedUrl(
            currentPage === 2 ? basePath : `${basePath}?page=${currentPage - 1}`,
            locale
          )}
        />
      )}
      {currentPage < totalPages && (
        <link
          rel="next"
          href={buildLocalizedUrl(`${basePath}?page=${currentPage + 1}`, locale)}
        />
      )}
    </>
  );
}

/**
 * Component for handling variant canonical URLs
 * (e.g., different product colors pointing to main product)
 */
export interface VariantCanonicalProps {
  masterProductUrl: string;
  variantId?: string;
  locale?: string;
}

export function VariantCanonical({
  masterProductUrl,
  variantId,
  locale,
}: VariantCanonicalProps) {
  // Variants should canonicalize to the master product
  // unless they have significantly different content
  const canonicalUrl = buildLocalizedUrl(masterProductUrl, locale);

  return <link rel="canonical" href={canonicalUrl} />;
}

/**
 * Component for filter pages
 * Filter pages typically canonicalize to the unfiltered page
 */
export interface FilterCanonicalProps {
  basePath: string;
  locale?: string;
  /**
   * If true, includes category filter in canonical
   * (useful when category pages have unique content)
   */
  includeCategory?: boolean;
  category?: string;
}

export function FilterCanonical({
  basePath,
  locale,
  includeCategory = false,
  category,
}: FilterCanonicalProps) {
  let path = basePath;

  if (includeCategory && category) {
    path = `${basePath}?category=${encodeURIComponent(category)}`;
  }

  const canonicalUrl = buildLocalizedUrl(path, locale);

  return <link rel="canonical" href={canonicalUrl} />;
}

export default Canonical;
