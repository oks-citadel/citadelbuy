/**
 * SEO Structured Data (JSON-LD) generators for Schema.org types
 * @see https://schema.org
 * @see https://developers.google.com/search/docs/appearance/structured-data
 */

// ============================================================================
// Type Definitions
// ============================================================================

export interface Organization {
  name: string;
  url: string;
  logo?: string;
  description?: string;
  sameAs?: string[];
  contactPoint?: {
    type: 'CustomerService' | 'TechnicalSupport' | 'Sales';
    telephone?: string;
    email?: string;
    availableLanguage?: string[];
  };
}

export interface LocalBusiness extends Organization {
  address: {
    streetAddress: string;
    addressLocality: string;
    addressRegion?: string;
    postalCode: string;
    addressCountry: string;
  };
  geo?: {
    latitude: number;
    longitude: number;
  };
  telephone?: string;
  openingHours?: string[];
  priceRange?: string;
}

export interface WebPage {
  name: string;
  description: string;
  url: string;
  breadcrumb?: BreadcrumbItem[];
  datePublished?: string;
  dateModified?: string;
  author?: PersonData;
  publisher?: Organization;
}

export interface BreadcrumbItem {
  name: string;
  url: string;
}

export interface PersonData {
  name: string;
  url?: string;
  image?: string;
  jobTitle?: string;
  sameAs?: string[];
}

export interface Review {
  author: string | PersonData;
  datePublished: string;
  reviewBody: string;
  reviewRating: {
    ratingValue: number;
    bestRating?: number;
    worstRating?: number;
  };
  itemReviewed?: {
    type: 'Product' | 'Organization' | 'LocalBusiness';
    name: string;
  };
}

export interface AggregateRating {
  ratingValue: number;
  reviewCount: number;
  bestRating?: number;
  worstRating?: number;
}

export interface Offer {
  price: number | string;
  priceCurrency: string;
  availability: 'InStock' | 'OutOfStock' | 'PreOrder' | 'BackOrder' | 'Discontinued';
  url?: string;
  priceValidUntil?: string;
  itemCondition?: 'NewCondition' | 'UsedCondition' | 'RefurbishedCondition';
  seller?: Organization;
}

export interface Product {
  name: string;
  description: string;
  image: string | string[];
  sku?: string;
  brand?: string;
  offers?: Offer | Offer[];
  aggregateRating?: AggregateRating;
  review?: Review[];
  category?: string;
  gtin?: string;
  mpn?: string;
}

export interface ItemListItem {
  name: string;
  url: string;
  image?: string;
  position: number;
}

export interface ItemList {
  name?: string;
  description?: string;
  itemListElement: ItemListItem[];
  numberOfItems?: number;
}

export interface HowToStep {
  name: string;
  text: string;
  image?: string;
  url?: string;
}

export interface HowTo {
  name: string;
  description: string;
  image?: string;
  totalTime?: string; // ISO 8601 duration format (e.g., "PT30M")
  estimatedCost?: {
    currency: string;
    value: number | string;
  };
  supply?: string[];
  tool?: string[];
  step: HowToStep[];
}

export interface Event {
  name: string;
  description?: string;
  startDate: string;
  endDate?: string;
  location: {
    name: string;
    address: string;
  } | {
    type: 'VirtualLocation';
    url: string;
  };
  image?: string;
  performer?: PersonData | Organization;
  organizer?: PersonData | Organization;
  offers?: Offer[];
  eventStatus?: 'EventScheduled' | 'EventCancelled' | 'EventPostponed' | 'EventRescheduled';
  eventAttendanceMode?: 'OfflineEventAttendanceMode' | 'OnlineEventAttendanceMode' | 'MixedEventAttendanceMode';
}

export interface VideoObject {
  name: string;
  description: string;
  thumbnailUrl: string | string[];
  uploadDate: string;
  contentUrl?: string;
  embedUrl?: string;
  duration?: string; // ISO 8601 duration format
  interactionStatistic?: {
    watchCount?: number;
    likeCount?: number;
  };
  author?: PersonData;
  publisher?: Organization;
}

export interface ImageObject {
  url: string;
  width?: number;
  height?: number;
  caption?: string;
  author?: PersonData;
  copyrightHolder?: PersonData | Organization;
  license?: string;
}

export interface CollectionPage {
  name: string;
  description: string;
  url: string;
  mainEntity?: ItemList;
  breadcrumb?: BreadcrumbItem[];
}

export interface FAQItem {
  question: string;
  answer: string;
}

export interface Article {
  headline: string;
  description: string;
  image: string | string[];
  datePublished: string;
  dateModified?: string;
  author: PersonData | PersonData[];
  publisher: Organization;
  mainEntityOfPage?: string;
}

export interface WebSite {
  name: string;
  url: string;
  description?: string;
  potentialAction?: {
    queryInput: string;
    targetUrl: string;
  };
}

// ============================================================================
// Generator Functions
// ============================================================================

const BASE_CONTEXT = 'https://schema.org';

export function generateOrganization(data: Organization): object {
  return {
    '@context': BASE_CONTEXT,
    '@type': 'Organization',
    name: data.name,
    url: data.url,
    ...(data.logo && { logo: data.logo }),
    ...(data.description && { description: data.description }),
    ...(data.sameAs && { sameAs: data.sameAs }),
    ...(data.contactPoint && {
      contactPoint: {
        '@type': 'ContactPoint',
        contactType: data.contactPoint.type.toLowerCase(),
        ...(data.contactPoint.telephone && { telephone: data.contactPoint.telephone }),
        ...(data.contactPoint.email && { email: data.contactPoint.email }),
        ...(data.contactPoint.availableLanguage && { availableLanguage: data.contactPoint.availableLanguage }),
      },
    }),
  };
}

export function generateLocalBusiness(data: LocalBusiness): object {
  return {
    '@context': BASE_CONTEXT,
    '@type': 'LocalBusiness',
    name: data.name,
    url: data.url,
    ...(data.logo && { logo: data.logo }),
    ...(data.description && { description: data.description }),
    address: {
      '@type': 'PostalAddress',
      streetAddress: data.address.streetAddress,
      addressLocality: data.address.addressLocality,
      ...(data.address.addressRegion && { addressRegion: data.address.addressRegion }),
      postalCode: data.address.postalCode,
      addressCountry: data.address.addressCountry,
    },
    ...(data.geo && {
      geo: {
        '@type': 'GeoCoordinates',
        latitude: data.geo.latitude,
        longitude: data.geo.longitude,
      },
    }),
    ...(data.telephone && { telephone: data.telephone }),
    ...(data.openingHours && { openingHoursSpecification: data.openingHours }),
    ...(data.priceRange && { priceRange: data.priceRange }),
    ...(data.sameAs && { sameAs: data.sameAs }),
  };
}

export function generateWebPage(data: WebPage): object {
  return {
    '@context': BASE_CONTEXT,
    '@type': 'WebPage',
    name: data.name,
    description: data.description,
    url: data.url,
    ...(data.datePublished && { datePublished: data.datePublished }),
    ...(data.dateModified && { dateModified: data.dateModified }),
    ...(data.author && { author: generatePerson(data.author) }),
    ...(data.publisher && { publisher: generateOrganization(data.publisher) }),
    ...(data.breadcrumb && { breadcrumb: generateBreadcrumbList(data.breadcrumb) }),
  };
}

export function generatePerson(data: PersonData): object {
  return {
    '@type': 'Person',
    name: data.name,
    ...(data.url && { url: data.url }),
    ...(data.image && { image: data.image }),
    ...(data.jobTitle && { jobTitle: data.jobTitle }),
    ...(data.sameAs && { sameAs: data.sameAs }),
  };
}

export function generateReview(data: Review): object {
  const author = typeof data.author === 'string'
    ? { '@type': 'Person', name: data.author }
    : generatePerson(data.author);

  return {
    '@type': 'Review',
    author,
    datePublished: data.datePublished,
    reviewBody: data.reviewBody,
    reviewRating: {
      '@type': 'Rating',
      ratingValue: data.reviewRating.ratingValue,
      bestRating: data.reviewRating.bestRating ?? 5,
      worstRating: data.reviewRating.worstRating ?? 1,
    },
    ...(data.itemReviewed && {
      itemReviewed: {
        '@type': data.itemReviewed.type,
        name: data.itemReviewed.name,
      },
    }),
  };
}

export function generateAggregateRating(data: AggregateRating): object {
  return {
    '@type': 'AggregateRating',
    ratingValue: data.ratingValue,
    reviewCount: data.reviewCount,
    bestRating: data.bestRating ?? 5,
    worstRating: data.worstRating ?? 1,
  };
}

export function generateOffer(data: Offer): object {
  const availabilityMap: Record<string, string> = {
    InStock: 'https://schema.org/InStock',
    OutOfStock: 'https://schema.org/OutOfStock',
    PreOrder: 'https://schema.org/PreOrder',
    BackOrder: 'https://schema.org/BackOrder',
    Discontinued: 'https://schema.org/Discontinued',
  };

  const conditionMap: Record<string, string> = {
    NewCondition: 'https://schema.org/NewCondition',
    UsedCondition: 'https://schema.org/UsedCondition',
    RefurbishedCondition: 'https://schema.org/RefurbishedCondition',
  };

  return {
    '@type': 'Offer',
    price: data.price,
    priceCurrency: data.priceCurrency,
    availability: availabilityMap[data.availability],
    ...(data.url && { url: data.url }),
    ...(data.priceValidUntil && { priceValidUntil: data.priceValidUntil }),
    ...(data.itemCondition && { itemCondition: conditionMap[data.itemCondition] }),
    ...(data.seller && { seller: generateOrganization(data.seller) }),
  };
}

export function generateProduct(data: Product): object {
  return {
    '@context': BASE_CONTEXT,
    '@type': 'Product',
    name: data.name,
    description: data.description,
    image: data.image,
    ...(data.sku && { sku: data.sku }),
    ...(data.brand && { brand: { '@type': 'Brand', name: data.brand } }),
    ...(data.category && { category: data.category }),
    ...(data.gtin && { gtin: data.gtin }),
    ...(data.mpn && { mpn: data.mpn }),
    ...(data.offers && {
      offers: Array.isArray(data.offers)
        ? data.offers.map(generateOffer)
        : generateOffer(data.offers),
    }),
    ...(data.aggregateRating && { aggregateRating: generateAggregateRating(data.aggregateRating) }),
    ...(data.review && { review: data.review.map(generateReview) }),
  };
}

export function generateItemList(data: ItemList): object {
  return {
    '@context': BASE_CONTEXT,
    '@type': 'ItemList',
    ...(data.name && { name: data.name }),
    ...(data.description && { description: data.description }),
    ...(data.numberOfItems && { numberOfItems: data.numberOfItems }),
    itemListElement: data.itemListElement.map((item) => ({
      '@type': 'ListItem',
      position: item.position,
      name: item.name,
      url: item.url,
      ...(item.image && { image: item.image }),
    })),
  };
}

export function generateBreadcrumbList(items: BreadcrumbItem[]): object {
  return {
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  };
}

export function generateHowTo(data: HowTo): object {
  return {
    '@context': BASE_CONTEXT,
    '@type': 'HowTo',
    name: data.name,
    description: data.description,
    ...(data.image && { image: data.image }),
    ...(data.totalTime && { totalTime: data.totalTime }),
    ...(data.estimatedCost && {
      estimatedCost: {
        '@type': 'MonetaryAmount',
        currency: data.estimatedCost.currency,
        value: data.estimatedCost.value,
      },
    }),
    ...(data.supply && {
      supply: data.supply.map((s) => ({ '@type': 'HowToSupply', name: s })),
    }),
    ...(data.tool && {
      tool: data.tool.map((t) => ({ '@type': 'HowToTool', name: t })),
    }),
    step: data.step.map((step, index) => ({
      '@type': 'HowToStep',
      position: index + 1,
      name: step.name,
      text: step.text,
      ...(step.image && { image: step.image }),
      ...(step.url && { url: step.url }),
    })),
  };
}

export function generateEvent(data: Event): object {
  const isVirtualLocation = 'type' in data.location && data.location.type === 'VirtualLocation';

  return {
    '@context': BASE_CONTEXT,
    '@type': 'Event',
    name: data.name,
    ...(data.description && { description: data.description }),
    startDate: data.startDate,
    ...(data.endDate && { endDate: data.endDate }),
    location: isVirtualLocation
      ? {
          '@type': 'VirtualLocation',
          url: (data.location as { type: 'VirtualLocation'; url: string }).url,
        }
      : {
          '@type': 'Place',
          name: (data.location as { name: string; address: string }).name,
          address: (data.location as { name: string; address: string }).address,
        },
    ...(data.image && { image: data.image }),
    ...(data.performer && {
      performer: 'name' in data.performer && !('url' in data.performer && data.performer.url?.includes('org'))
        ? generatePerson(data.performer as PersonData)
        : generateOrganization(data.performer as Organization),
    }),
    ...(data.organizer && {
      organizer: 'name' in data.organizer && !('url' in data.organizer && data.organizer.url?.includes('org'))
        ? generatePerson(data.organizer as PersonData)
        : generateOrganization(data.organizer as Organization),
    }),
    ...(data.offers && {
      offers: Array.isArray(data.offers)
        ? data.offers.map(generateOffer)
        : generateOffer(data.offers),
    }),
    ...(data.eventStatus && { eventStatus: `https://schema.org/${data.eventStatus}` }),
    ...(data.eventAttendanceMode && { eventAttendanceMode: `https://schema.org/${data.eventAttendanceMode}` }),
  };
}

export function generateVideoObject(data: VideoObject): object {
  return {
    '@context': BASE_CONTEXT,
    '@type': 'VideoObject',
    name: data.name,
    description: data.description,
    thumbnailUrl: data.thumbnailUrl,
    uploadDate: data.uploadDate,
    ...(data.contentUrl && { contentUrl: data.contentUrl }),
    ...(data.embedUrl && { embedUrl: data.embedUrl }),
    ...(data.duration && { duration: data.duration }),
    ...(data.interactionStatistic && {
      interactionStatistic: [
        ...(data.interactionStatistic.watchCount
          ? [{
              '@type': 'InteractionCounter',
              interactionType: { '@type': 'WatchAction' },
              userInteractionCount: data.interactionStatistic.watchCount,
            }]
          : []),
        ...(data.interactionStatistic.likeCount
          ? [{
              '@type': 'InteractionCounter',
              interactionType: { '@type': 'LikeAction' },
              userInteractionCount: data.interactionStatistic.likeCount,
            }]
          : []),
      ],
    }),
    ...(data.author && { author: generatePerson(data.author) }),
    ...(data.publisher && { publisher: generateOrganization(data.publisher) }),
  };
}

export function generateImageObject(data: ImageObject): object {
  return {
    '@context': BASE_CONTEXT,
    '@type': 'ImageObject',
    url: data.url,
    ...(data.width && { width: data.width }),
    ...(data.height && { height: data.height }),
    ...(data.caption && { caption: data.caption }),
    ...(data.author && { author: generatePerson(data.author) }),
    ...(data.copyrightHolder && {
      copyrightHolder: 'logo' in (data.copyrightHolder as Organization)
        ? generateOrganization(data.copyrightHolder as Organization)
        : generatePerson(data.copyrightHolder as PersonData),
    }),
    ...(data.license && { license: data.license }),
  };
}

export function generateCollectionPage(data: CollectionPage): object {
  return {
    '@context': BASE_CONTEXT,
    '@type': 'CollectionPage',
    name: data.name,
    description: data.description,
    url: data.url,
    ...(data.mainEntity && { mainEntity: generateItemList(data.mainEntity) }),
    ...(data.breadcrumb && { breadcrumb: generateBreadcrumbList(data.breadcrumb) }),
  };
}

export function generateFAQPage(items: FAQItem[]): object {
  return {
    '@context': BASE_CONTEXT,
    '@type': 'FAQPage',
    mainEntity: items.map((item) => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: item.answer,
      },
    })),
  };
}

export function generateArticle(data: Article): object {
  const authors = Array.isArray(data.author) ? data.author : [data.author];

  return {
    '@context': BASE_CONTEXT,
    '@type': 'Article',
    headline: data.headline,
    description: data.description,
    image: data.image,
    datePublished: data.datePublished,
    ...(data.dateModified && { dateModified: data.dateModified }),
    author: authors.map(generatePerson),
    publisher: generateOrganization(data.publisher),
    ...(data.mainEntityOfPage && { mainEntityOfPage: data.mainEntityOfPage }),
  };
}

export function generateWebSite(data: WebSite): object {
  return {
    '@context': BASE_CONTEXT,
    '@type': 'WebSite',
    name: data.name,
    url: data.url,
    ...(data.description && { description: data.description }),
    ...(data.potentialAction && {
      potentialAction: {
        '@type': 'SearchAction',
        target: {
          '@type': 'EntryPoint',
          urlTemplate: data.potentialAction.targetUrl,
        },
        'query-input': data.potentialAction.queryInput,
      },
    }),
  };
}

// ============================================================================
// Utility Functions
// ============================================================================

export function toJsonLdString(schema: object): string {
  return JSON.stringify(schema, null, 0);
}

export function combineSchemas(...schemas: object[]): object {
  return {
    '@context': BASE_CONTEXT,
    '@graph': schemas.map((schema) => {
      const { '@context': _, ...rest } = schema as Record<string, unknown>;
      return rest;
    }),
  };
}
