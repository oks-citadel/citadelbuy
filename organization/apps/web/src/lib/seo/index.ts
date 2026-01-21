/**
 * SEO utilities for structured data (JSON-LD)
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
 */

// Type definitions
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

// Generator functions
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

// React components
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
