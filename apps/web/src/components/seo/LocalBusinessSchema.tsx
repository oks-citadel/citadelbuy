'use client';

/**
 * Local Business JSON-LD Schema Component
 * Generates structured data for vendor/store local business listings
 */

import { JsonLd } from '@/lib/seo/json-ld';
import { seoConfig } from '@/lib/seo/config';

export interface LocalBusinessSchemaProps {
  name: string;
  url: string;
  description?: string;
  image?: string | string[];
  logo?: string;
  telephone?: string;
  email?: string;
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
  openingHours?: Array<{
    dayOfWeek: string | string[];
    opens: string;
    closes: string;
  }>;
  priceRange?: '$' | '$$' | '$$$' | '$$$$';
  servesCuisine?: string; // For restaurants
  menu?: string; // For restaurants
  acceptsReservations?: boolean; // For restaurants
  paymentAccepted?: string[];
  currenciesAccepted?: string[];
  rating?: {
    value: number;
    count: number;
    bestRating?: number;
  };
  reviews?: Array<{
    author: string;
    datePublished: string;
    reviewBody: string;
    rating: number;
  }>;
  /**
   * Business type
   * @default 'LocalBusiness'
   */
  type?:
    | 'LocalBusiness'
    | 'Store'
    | 'ElectronicsStore'
    | 'ClothingStore'
    | 'FurnitureStore'
    | 'HardwareStore'
    | 'HomeGoodsStore'
    | 'JewelryStore'
    | 'ShoeStore'
    | 'SportingGoodsStore'
    | 'ToyStore'
    | 'WholesaleStore'
    | 'Restaurant'
    | 'Bakery'
    | 'CafeOrCoffeeShop';
  sameAs?: string[];
  areaServed?: Array<{
    type: 'City' | 'State' | 'Country' | 'GeoCircle';
    name?: string;
    latitude?: number;
    longitude?: number;
    radius?: string;
  }>;
  hasMap?: string;
  isAccessibleForFree?: boolean;
  publicAccess?: boolean;
}

/**
 * LocalBusinessSchema component for vendor storefronts
 *
 * @example
 * <LocalBusinessSchema
 *   name="TechMart Electronics"
 *   url="https://broxiva.com/vendor/techmart"
 *   description="Your one-stop shop for electronics and gadgets"
 *   type="ElectronicsStore"
 *   address={{
 *     streetAddress: "123 Market Street",
 *     addressLocality: "Lagos",
 *     addressRegion: "Lagos",
 *     postalCode: "100001",
 *     addressCountry: "NG"
 *   }}
 *   geo={{ latitude: 6.5244, longitude: 3.3792 }}
 *   openingHours={[
 *     { dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'], opens: '09:00', closes: '18:00' },
 *     { dayOfWeek: 'Saturday', opens: '10:00', closes: '16:00' }
 *   ]}
 *   priceRange="$$"
 *   telephone="+234-800-123-4567"
 *   rating={{ value: 4.5, count: 234 }}
 * />
 */
export function LocalBusinessSchema({
  name,
  url,
  description,
  image,
  logo,
  telephone,
  email,
  address,
  geo,
  openingHours,
  priceRange,
  servesCuisine,
  menu,
  acceptsReservations,
  paymentAccepted,
  currenciesAccepted,
  rating,
  reviews,
  type = 'LocalBusiness',
  sameAs,
  areaServed,
  hasMap,
  isAccessibleForFree,
  publicAccess,
}: LocalBusinessSchemaProps) {
  const schema: Record<string, any> = {
    '@context': 'https://schema.org',
    '@type': type,
    name,
    url,
    ...(description && { description }),
  };

  // Add images
  if (image) {
    schema.image = Array.isArray(image)
      ? image.map((img) => (img.startsWith('http') ? img : `${seoConfig.siteUrl}${img}`))
      : image.startsWith('http')
        ? image
        : `${seoConfig.siteUrl}${image}`;
  }

  // Add logo
  if (logo) {
    schema.logo = {
      '@type': 'ImageObject',
      url: logo.startsWith('http') ? logo : `${seoConfig.siteUrl}${logo}`,
    };
  }

  // Add contact info
  if (telephone) schema.telephone = telephone;
  if (email) schema.email = email;

  // Add address
  schema.address = {
    '@type': 'PostalAddress',
    streetAddress: address.streetAddress,
    addressLocality: address.addressLocality,
    ...(address.addressRegion && { addressRegion: address.addressRegion }),
    postalCode: address.postalCode,
    addressCountry: address.addressCountry,
  };

  // Add geolocation
  if (geo) {
    schema.geo = {
      '@type': 'GeoCoordinates',
      latitude: geo.latitude,
      longitude: geo.longitude,
    };
  }

  // Add opening hours
  if (openingHours && openingHours.length > 0) {
    schema.openingHoursSpecification = openingHours.map((hours) => ({
      '@type': 'OpeningHoursSpecification',
      dayOfWeek: hours.dayOfWeek,
      opens: hours.opens,
      closes: hours.closes,
    }));
  }

  // Add price range
  if (priceRange) schema.priceRange = priceRange;

  // Restaurant-specific fields
  if (servesCuisine) schema.servesCuisine = servesCuisine;
  if (menu) schema.hasMenu = menu;
  if (acceptsReservations !== undefined) schema.acceptsReservations = acceptsReservations;

  // Payment options
  if (paymentAccepted && paymentAccepted.length > 0) {
    schema.paymentAccepted = paymentAccepted.join(', ');
  }
  if (currenciesAccepted && currenciesAccepted.length > 0) {
    schema.currenciesAccepted = currenciesAccepted.join(', ');
  }

  // Add aggregate rating
  if (rating && rating.count > 0) {
    schema.aggregateRating = {
      '@type': 'AggregateRating',
      ratingValue: rating.value,
      reviewCount: rating.count,
      bestRating: rating.bestRating || 5,
      worstRating: 1,
    };
  }

  // Add reviews
  if (reviews && reviews.length > 0) {
    schema.review = reviews.map((review) => ({
      '@type': 'Review',
      author: {
        '@type': 'Person',
        name: review.author,
      },
      datePublished: review.datePublished,
      reviewBody: review.reviewBody,
      reviewRating: {
        '@type': 'Rating',
        ratingValue: review.rating,
        bestRating: 5,
        worstRating: 1,
      },
    }));
  }

  // Add social links
  if (sameAs && sameAs.length > 0) {
    schema.sameAs = sameAs;
  }

  // Add service area
  if (areaServed && areaServed.length > 0) {
    schema.areaServed = areaServed.map((area) => {
      if (area.type === 'GeoCircle') {
        return {
          '@type': 'GeoCircle',
          geoMidpoint: {
            '@type': 'GeoCoordinates',
            latitude: area.latitude,
            longitude: area.longitude,
          },
          geoRadius: area.radius,
        };
      }
      return {
        '@type': area.type,
        name: area.name,
      };
    });
  }

  // Add map link
  if (hasMap) schema.hasMap = hasMap;

  // Accessibility
  if (isAccessibleForFree !== undefined) schema.isAccessibleForFree = isAccessibleForFree;
  if (publicAccess !== undefined) schema.publicAccess = publicAccess;

  return <JsonLd data={schema} />;
}

/**
 * Vendor store schema with marketplace context
 */
export function VendorStoreSchema({
  vendorName,
  vendorSlug,
  description,
  logo,
  address,
  telephone,
  email,
  rating,
  productCategories,
  shipsTo,
}: {
  vendorName: string;
  vendorSlug: string;
  description?: string;
  logo?: string;
  address?: LocalBusinessSchemaProps['address'];
  telephone?: string;
  email?: string;
  rating?: { value: number; count: number };
  productCategories?: string[];
  shipsTo?: string[];
}) {
  const vendorUrl = `${seoConfig.siteUrl}/vendor/${vendorSlug}`;

  // Determine store type based on categories
  let storeType: LocalBusinessSchemaProps['type'] = 'Store';
  if (productCategories) {
    const categoryStr = productCategories.join(' ').toLowerCase();
    if (categoryStr.includes('electronic')) storeType = 'ElectronicsStore';
    else if (categoryStr.includes('cloth') || categoryStr.includes('fashion')) storeType = 'ClothingStore';
    else if (categoryStr.includes('furniture')) storeType = 'FurnitureStore';
    else if (categoryStr.includes('jewelry')) storeType = 'JewelryStore';
    else if (categoryStr.includes('shoe')) storeType = 'ShoeStore';
    else if (categoryStr.includes('sport')) storeType = 'SportingGoodsStore';
    else if (categoryStr.includes('toy')) storeType = 'ToyStore';
    else if (categoryStr.includes('wholesale') || categoryStr.includes('bulk')) storeType = 'WholesaleStore';
  }

  // Only render if we have minimum required data
  if (!address) {
    // Return minimal schema without address
    const minimalSchema = {
      '@context': 'https://schema.org',
      '@type': storeType,
      name: vendorName,
      url: vendorUrl,
      ...(description && { description }),
      ...(logo && { logo: logo.startsWith('http') ? logo : `${seoConfig.siteUrl}${logo}` }),
      ...(telephone && { telephone }),
      ...(email && { email }),
      ...(rating && rating.count > 0 && {
        aggregateRating: {
          '@type': 'AggregateRating',
          ratingValue: rating.value,
          reviewCount: rating.count,
          bestRating: 5,
        },
      }),
      ...(shipsTo && shipsTo.length > 0 && {
        areaServed: shipsTo.map((country) => ({
          '@type': 'Country',
          name: country,
        })),
      }),
    };
    return <JsonLd data={minimalSchema} />;
  }

  return (
    <LocalBusinessSchema
      name={vendorName}
      url={vendorUrl}
      description={description}
      logo={logo}
      type={storeType}
      address={address}
      telephone={telephone}
      email={email}
      rating={rating}
      areaServed={shipsTo?.map((country) => ({ type: 'Country', name: country }))}
    />
  );
}

export default LocalBusinessSchema;
