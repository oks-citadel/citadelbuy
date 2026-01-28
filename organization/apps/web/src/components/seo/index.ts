/**
 * SEO Components for Broxiva Global Marketplace
 * Comprehensive SEO infrastructure for multi-locale e-commerce
 */

// Hreflang components
export {
  Hreflang,
  ProductHreflang,
  CategoryHreflang,
  HreflangServer,
  useHreflang,
  type HreflangProps,
  type ProductHreflangProps,
  type CategoryHreflangProps,
} from './Hreflang';

// Canonical URL components
export {
  Canonical,
  CanonicalServer,
  useCanonical,
  getCanonicalUrl,
  PaginationCanonical,
  VariantCanonical,
  FilterCanonical,
  type CanonicalProps,
  type PaginationCanonicalProps,
  type VariantCanonicalProps,
  type FilterCanonicalProps,
} from './Canonical';

// Structured data components
export {
  ProductSchema,
  ProductCardSchema,
  type ProductSchemaProps,
} from './ProductSchema';

export {
  BreadcrumbSchema,
  generateCategoryBreadcrumbs,
  generateProductBreadcrumbs,
  generateVendorBreadcrumbs,
  generateSearchBreadcrumbs,
  generateAccountBreadcrumbs,
  generateHelpBreadcrumbs,
  generateBlogBreadcrumbs,
  type BreadcrumbItem,
  type BreadcrumbSchemaProps,
} from './BreadcrumbSchema';

export {
  OrganizationSchema,
  BroxivaOrganization,
  type OrganizationSchemaProps,
} from './OrganizationSchema';

export {
  LocalBusinessSchema,
  VendorStoreSchema,
  type LocalBusinessSchemaProps,
} from './LocalBusinessSchema';

export {
  FAQSchema,
  ProductFAQSchema,
  CategoryFAQSchema,
  ShippingFAQSchema,
  ReturnsFAQSchema,
  SellerFAQSchema,
  PaymentFAQSchema,
  type FAQItem,
  type FAQSchemaProps,
} from './FAQSchema';

export {
  MetaTags,
  ProductMetaTags,
  ArticleMetaTags,
  VendorMetaTags,
  CategoryMetaTags,
  type MetaTagsProps,
} from './MetaTags';

// Re-export from lib/seo for convenience
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
} from '@/lib/seo/config';

export {
  generatePageMetadata,
  generateProductMetadata,
  generateCategoryMetadata,
  generateVendorMetadata,
  generateCountryMetadata,
  generateSearchMetadata,
} from '@/lib/seo/metadata';

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
} from '@/lib/seo/hreflang';
