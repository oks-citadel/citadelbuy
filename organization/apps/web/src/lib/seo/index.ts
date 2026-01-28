/**
 * Comprehensive SEO utilities for Broxiva Global Marketplace
 *
 * @example
 * // Using React components
 * import { ProductJsonLd, FAQPageJsonLd } from '@/lib/seo';
 *
 * function ProductPage({ product }) {
 *   return (
 *     <>
 *       <ProductJsonLd data={{
 *         name: product.name,
 *         description: product.description,
 *         image: product.images,
 *         offers: {
 *           price: product.price,
 *           priceCurrency: 'USD',
 *           availability: 'InStock',
 *         },
 *       }} />
 *       <h1>{product.name}</h1>
 *     </>
 *   );
 * }
 *
 * @example
 * // Using generator functions directly
 * import { generateProduct, toJsonLdString } from '@/lib/seo';
 *
 * const schema = generateProduct({ ... });
 * const jsonString = toJsonLdString(schema);
 *
 * @example
 * // Using metadata generators
 * import { generateProductMetadata, generatePageMetadata } from '@/lib/seo';
 *
 * export async function generateMetadata({ params }) {
 *   return generateProductMetadata({ name: 'Product', ... });
 * }
 */

// ============================================================================
// Configuration
// ============================================================================
export {
  seoConfig,
  SUPPORTED_LOCALES,
  getLocaleConfig,
  getDefaultLocale,
  getSupportedHreflangCodes,
  getCurrencyForLocale,
  getRegionForLocale,
  buildLocalizedUrl,
  mergeTenantConfig,
  type SEOConfig,
  type LocaleConfig,
  type TenantSEOConfig,
} from './config';

// ============================================================================
// Metadata Generators
// ============================================================================
export {
  generatePageMetadata,
  generateProductMetadata,
  generateCategoryMetadata,
  generateVendorMetadata,
  generateCountryMetadata,
  generateSearchMetadata,
  type PageMetadataParams,
  type ProductMetadataParams,
  type CategoryMetadataParams,
} from './metadata';

// ============================================================================
// Hreflang Utilities
// ============================================================================
export {
  generateHreflangLinks,
  generateHreflangTags,
  generateProductHreflang,
  generateCategoryHreflang,
  generateCountryHreflang,
  validateHreflang,
  parseHreflang,
  buildHreflang,
  getContentLanguage,
  type HreflangLink,
  type HreflangConfig,
} from './hreflang';

// ============================================================================
// Structured Data Types
// ============================================================================
export type {
  Organization,
  LocalBusiness,
  WebPage,
  BreadcrumbItem,
  PersonData,
  Review,
  AggregateRating,
  Offer,
  Product,
  ItemListItem,
  ItemList,
  HowToStep,
  HowTo,
  Event,
  VideoObject,
  ImageObject,
  CollectionPage,
  FAQItem,
  Article,
  WebSite,
} from './structured-data';

// ============================================================================
// Structured Data Generators
// ============================================================================
export {
  generateOrganization,
  generateLocalBusiness,
  generateWebPage,
  generatePerson,
  generateReview,
  generateAggregateRating,
  generateOffer,
  generateProduct,
  generateItemList,
  generateBreadcrumbList,
  generateHowTo,
  generateEvent,
  generateVideoObject,
  generateImageObject,
  generateCollectionPage,
  generateFAQPage,
  generateArticle,
  generateWebSite,
  toJsonLdString,
  combineSchemas,
} from './structured-data';

// ============================================================================
// React JSON-LD Components
// ============================================================================
export {
  JsonLd,
  OrganizationJsonLd,
  LocalBusinessJsonLd,
  WebPageJsonLd,
  ProductJsonLd,
  ItemListJsonLd,
  BreadcrumbJsonLd,
  HowToJsonLd,
  EventJsonLd,
  VideoJsonLd,
  ImageJsonLd,
  CollectionPageJsonLd,
  FAQPageJsonLd,
  ArticleJsonLd,
  WebSiteJsonLd,
  CombinedJsonLd,
  BroxivaOrganizationJsonLd,
  BroxivaWebSiteJsonLd,
} from './json-ld';
