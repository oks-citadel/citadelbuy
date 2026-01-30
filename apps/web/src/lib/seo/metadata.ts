/**
 * Metadata Generation Utilities for Broxiva SEO
 * Generates Next.js 14+ compatible metadata objects
 */

import { Metadata, ResolvingMetadata } from 'next';
import { seoConfig, getLocaleConfig, buildLocalizedUrl, type SEOConfig } from './config';

export interface PageMetadataParams {
  title: string;
  description: string;
  locale?: string;
  path?: string;
  image?: string;
  noIndex?: boolean;
  noFollow?: boolean;
  keywords?: string[];
  author?: string;
  publishedTime?: string;
  modifiedTime?: string;
  category?: string;
  tags?: string[];
  alternateLocales?: string[];
}

export interface ProductMetadataParams {
  name: string;
  description: string;
  images: string[];
  price: number;
  currency: string;
  availability: 'in_stock' | 'out_of_stock' | 'preorder' | 'backorder';
  brand?: string;
  sku?: string;
  category?: string;
  locale?: string;
  path?: string;
  rating?: number;
  reviewCount?: number;
}

export interface CategoryMetadataParams {
  name: string;
  description: string;
  image?: string;
  productCount?: number;
  locale?: string;
  path?: string;
  parentCategory?: string;
}

/**
 * Generate page metadata
 */
export function generatePageMetadata(params: PageMetadataParams): Metadata {
  const {
    title,
    description,
    locale = seoConfig.defaultLocale,
    path = '',
    image,
    noIndex = false,
    noFollow = false,
    keywords = [],
    author,
    publishedTime,
    modifiedTime,
    category,
    tags = [],
    alternateLocales = [],
  } = params;

  const localeConfig = getLocaleConfig(locale);
  const canonicalUrl = buildLocalizedUrl(path, locale);
  const ogImage = image || `${seoConfig.siteUrl}${seoConfig.defaults.ogImage}`;

  // Build alternates for hreflang
  const languages: Record<string, string> = {};

  // Add x-default
  languages['x-default'] = buildLocalizedUrl(path);

  // Add all supported locales
  const localesToInclude = alternateLocales.length > 0
    ? alternateLocales
    : seoConfig.supportedLocales.map(l => l.code);

  for (const loc of localesToInclude) {
    const config = getLocaleConfig(loc);
    if (config) {
      languages[config.hreflang] = buildLocalizedUrl(path, loc);
    }
  }

  const alternates: Metadata['alternates'] = {
    canonical: canonicalUrl,
    languages: languages as Metadata['alternates'] extends { languages?: infer L } ? L : never,
  };

  const metadata: Metadata = {
    title: {
      template: seoConfig.defaults.titleTemplate,
      default: title,
    },
    description,
    keywords: [...seoConfig.defaults.keywords, ...keywords],
    authors: author ? [{ name: author }] : undefined,
    creator: seoConfig.organization.name,
    publisher: seoConfig.organization.name,
    alternates,
    openGraph: {
      type: 'website',
      locale: localeConfig?.hreflang.replace('-', '_') || 'en_US',
      url: canonicalUrl,
      siteName: seoConfig.siteName,
      title,
      description,
      images: [
        {
          url: ogImage,
          width: 1200,
          height: 630,
          alt: title,
        },
      ],
    },
    twitter: {
      card: seoConfig.defaults.twitterCard,
      site: seoConfig.social.twitter,
      creator: seoConfig.social.twitter,
      title,
      description,
      images: [ogImage],
    },
    robots: {
      index: !noIndex && seoConfig.robots.index,
      follow: !noFollow && seoConfig.robots.follow,
      googleBot: {
        index: !noIndex && seoConfig.robots.index,
        follow: !noFollow && seoConfig.robots.follow,
        'max-video-preview': seoConfig.robots.maxVideoPreview,
        'max-image-preview': seoConfig.robots.maxImagePreview,
        'max-snippet': seoConfig.robots.maxSnippet,
      },
    },
    category,
  };

  // Add article metadata if publishing dates are provided
  if (publishedTime || modifiedTime) {
    (metadata.openGraph as any).type = 'article';
    (metadata.openGraph as any).publishedTime = publishedTime;
    (metadata.openGraph as any).modifiedTime = modifiedTime;
    (metadata.openGraph as any).tags = tags;
  }

  return metadata;
}

/**
 * Generate product metadata
 */
export function generateProductMetadata(params: ProductMetadataParams): Metadata {
  const {
    name,
    description,
    images,
    price,
    currency,
    availability,
    brand,
    sku,
    category,
    locale = seoConfig.defaultLocale,
    path = '',
    rating,
    reviewCount,
  } = params;

  const localeConfig = getLocaleConfig(locale);
  const canonicalUrl = buildLocalizedUrl(path, locale);

  const availabilityMap: Record<string, string> = {
    in_stock: 'instock',
    out_of_stock: 'oos',
    preorder: 'preorder',
    backorder: 'backorder',
  };

  // Build alternates
  const prodLanguages: Record<string, string> = {};
  prodLanguages['x-default'] = buildLocalizedUrl(path);
  for (const loc of seoConfig.supportedLocales) {
    prodLanguages[loc.hreflang] = buildLocalizedUrl(path, loc.code);
  }
  const alternates: Metadata['alternates'] = {
    canonical: canonicalUrl,
    languages: prodLanguages as Metadata['alternates'] extends { languages?: infer L } ? L : never,
  };

  const metadata: Metadata = {
    title: brand ? `${name} by ${brand}` : name,
    description,
    alternates,
    openGraph: {
      type: 'website',
      locale: localeConfig?.hreflang.replace('-', '_') || 'en_US',
      url: canonicalUrl,
      siteName: seoConfig.siteName,
      title: name,
      description,
      images: images.map((img, index) => ({
        url: img.startsWith('http') ? img : `${seoConfig.siteUrl}${img}`,
        width: 1200,
        height: 630,
        alt: `${name} - Image ${index + 1}`,
      })),
    },
    twitter: {
      card: 'summary_large_image',
      site: seoConfig.social.twitter,
      title: name,
      description,
      images: images[0] ? [images[0].startsWith('http') ? images[0] : `${seoConfig.siteUrl}${images[0]}`] : undefined,
    },
    other: {
      // Product meta tags
      'product:price:amount': price.toString(),
      'product:price:currency': currency,
      'product:availability': availabilityMap[availability] || 'instock',
      ...(brand && { 'product:brand': brand }),
      ...(sku && { 'product:retailer_item_id': sku }),
      ...(category && { 'product:category': category }),
      ...(rating && { 'product:rating:value': rating.toString() }),
      ...(reviewCount && { 'product:rating:count': reviewCount.toString() }),
    },
  };

  return metadata;
}

/**
 * Generate category metadata
 */
export function generateCategoryMetadata(params: CategoryMetadataParams): Metadata {
  const {
    name,
    description,
    image,
    productCount,
    locale = seoConfig.defaultLocale,
    path = '',
    parentCategory,
  } = params;

  const localeConfig = getLocaleConfig(locale);
  const canonicalUrl = buildLocalizedUrl(path, locale);
  const ogImage = image || `${seoConfig.siteUrl}${seoConfig.defaults.ogImage}`;

  const fullTitle = parentCategory
    ? `${name} - ${parentCategory}`
    : name;

  const fullDescription = productCount
    ? `${description} Browse ${productCount.toLocaleString()} products in ${name}.`
    : description;

  const catLanguages: Record<string, string> = {};
  catLanguages['x-default'] = buildLocalizedUrl(path);
  for (const loc of seoConfig.supportedLocales) {
    catLanguages[loc.hreflang] = buildLocalizedUrl(path, loc.code);
  }
  const alternates: Metadata['alternates'] = {
    canonical: canonicalUrl,
    languages: catLanguages as Metadata['alternates'] extends { languages?: infer L } ? L : never,
  };

  return {
    title: fullTitle,
    description: fullDescription,
    alternates,
    openGraph: {
      type: 'website',
      locale: localeConfig?.hreflang.replace('-', '_') || 'en_US',
      url: canonicalUrl,
      siteName: seoConfig.siteName,
      title: fullTitle,
      description: fullDescription,
      images: [
        {
          url: ogImage,
          width: 1200,
          height: 630,
          alt: name,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      site: seoConfig.social.twitter,
      title: fullTitle,
      description: fullDescription,
      images: [ogImage],
    },
  };
}

/**
 * Generate vendor/store metadata
 */
export function generateVendorMetadata(params: {
  name: string;
  description: string;
  logo?: string;
  rating?: number;
  productCount?: number;
  location?: string;
  locale?: string;
  path?: string;
}): Metadata {
  const {
    name,
    description,
    logo,
    rating,
    productCount,
    location,
    locale = seoConfig.defaultLocale,
    path = '',
  } = params;

  const canonicalUrl = buildLocalizedUrl(path, locale);
  const localeConfig = getLocaleConfig(locale);

  let fullDescription = description;
  if (location) fullDescription += ` Based in ${location}.`;
  if (productCount) fullDescription += ` ${productCount.toLocaleString()} products available.`;
  if (rating) fullDescription += ` Rated ${rating.toFixed(1)} out of 5.`;

  return {
    title: `${name} - Vendor Store`,
    description: fullDescription,
    alternates: {
      canonical: canonicalUrl,
    },
    openGraph: {
      type: 'profile',
      locale: localeConfig?.hreflang.replace('-', '_') || 'en_US',
      url: canonicalUrl,
      siteName: seoConfig.siteName,
      title: name,
      description: fullDescription,
      images: logo ? [{ url: logo, width: 400, height: 400, alt: `${name} logo` }] : undefined,
    },
    twitter: {
      card: 'summary',
      site: seoConfig.social.twitter,
      title: name,
      description: fullDescription,
      images: logo ? [logo] : undefined,
    },
  };
}

/**
 * Generate country landing page metadata
 */
export function generateCountryMetadata(params: {
  country: string;
  countryCode: string;
  currency: string;
  locale: string;
  path: string;
  popularCategories?: string[];
}): Metadata {
  const { country, countryCode, currency, locale, path, popularCategories = [] } = params;

  const canonicalUrl = buildLocalizedUrl(path, locale);
  const localeConfig = getLocaleConfig(locale);

  const categoriesText = popularCategories.length > 0
    ? ` Popular categories: ${popularCategories.slice(0, 3).join(', ')}.`
    : '';

  const description = `Shop products that ship to ${country}. Browse thousands of items with ${currency} pricing and local shipping options.${categoriesText}`;

  return {
    title: `Shop in ${country} - ${currency} Prices`,
    description,
    alternates: {
      canonical: canonicalUrl,
    },
    openGraph: {
      type: 'website',
      locale: localeConfig?.hreflang.replace('-', '_') || 'en_US',
      url: canonicalUrl,
      siteName: seoConfig.siteName,
      title: `Shop in ${country}`,
      description,
    },
    twitter: {
      card: 'summary_large_image',
      site: seoConfig.social.twitter,
      title: `Shop in ${country}`,
      description,
    },
    other: {
      'geo.region': countryCode,
      'geo.placename': country,
    },
  };
}

/**
 * Generate search results metadata
 */
export function generateSearchMetadata(params: {
  query: string;
  resultsCount: number;
  locale?: string;
  filters?: Record<string, string>;
}): Metadata {
  const { query, resultsCount, locale = seoConfig.defaultLocale, filters = {} } = params;

  const filterText = Object.entries(filters)
    .map(([key, value]) => `${key}: ${value}`)
    .join(', ');

  const description = resultsCount > 0
    ? `Found ${resultsCount.toLocaleString()} results for "${query}"${filterText ? ` (${filterText})` : ''} on Broxiva.`
    : `No results found for "${query}". Try a different search term.`;

  return {
    title: `Search: ${query}`,
    description,
    robots: {
      index: false, // Don't index search pages
      follow: true,
    },
  };
}

export default {
  generatePageMetadata,
  generateProductMetadata,
  generateCategoryMetadata,
  generateVendorMetadata,
  generateCountryMetadata,
  generateSearchMetadata,
};
