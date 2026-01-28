'use client';

/**
 * Product JSON-LD Schema Component
 * Generates structured data for product pages
 */

import { JsonLd } from '@/lib/seo/json-ld';
import { seoConfig } from '@/lib/seo/config';

export interface ProductSchemaProps {
  name: string;
  description: string;
  images: string[];
  sku?: string;
  gtin?: string;
  mpn?: string;
  brand?: string;
  price: number;
  priceCurrency: string;
  originalPrice?: number;
  availability: 'InStock' | 'OutOfStock' | 'PreOrder' | 'BackOrder' | 'Discontinued' | 'LimitedAvailability';
  condition?: 'NewCondition' | 'UsedCondition' | 'RefurbishedCondition' | 'DamagedCondition';
  url: string;
  category?: string;
  rating?: {
    value: number;
    count: number;
    bestRating?: number;
    worstRating?: number;
  };
  reviews?: Array<{
    author: string;
    datePublished: string;
    reviewBody: string;
    rating: number;
  }>;
  seller?: {
    name: string;
    url?: string;
    image?: string;
  };
  offers?: Array<{
    price: number;
    priceCurrency: string;
    availability: string;
    seller?: string;
    shippingDetails?: {
      shippingRate: number;
      shippingCurrency: string;
      deliveryTime: {
        minDays: number;
        maxDays: number;
      };
    };
  }>;
  weight?: {
    value: number;
    unit: 'kg' | 'lb' | 'g' | 'oz';
  };
  dimensions?: {
    height?: number;
    width?: number;
    depth?: number;
    unit: 'cm' | 'in' | 'm';
  };
  color?: string;
  material?: string;
  pattern?: string;
  itemGroupId?: string; // For product variants
  priceValidUntil?: string;
  returnPolicy?: {
    returnPolicyCategory: 'MerchantReturnFiniteReturnWindow' | 'MerchantReturnNotPermitted' | 'MerchantReturnUnlimitedWindow';
    returnDays?: number;
    returnFees?: 'FreeReturn' | 'ReturnShippingFees';
  };
}

/**
 * Generate the availability schema URL
 */
function getAvailabilitySchema(availability: ProductSchemaProps['availability']): string {
  const availabilityMap: Record<string, string> = {
    InStock: 'https://schema.org/InStock',
    OutOfStock: 'https://schema.org/OutOfStock',
    PreOrder: 'https://schema.org/PreOrder',
    BackOrder: 'https://schema.org/BackOrder',
    Discontinued: 'https://schema.org/Discontinued',
    LimitedAvailability: 'https://schema.org/LimitedAvailability',
  };
  return availabilityMap[availability] || 'https://schema.org/InStock';
}

/**
 * Generate the condition schema URL
 */
function getConditionSchema(condition?: ProductSchemaProps['condition']): string | undefined {
  if (!condition) return undefined;
  const conditionMap: Record<string, string> = {
    NewCondition: 'https://schema.org/NewCondition',
    UsedCondition: 'https://schema.org/UsedCondition',
    RefurbishedCondition: 'https://schema.org/RefurbishedCondition',
    DamagedCondition: 'https://schema.org/DamagedCondition',
  };
  return conditionMap[condition];
}

/**
 * ProductSchema component
 *
 * @example
 * <ProductSchema
 *   name="Premium Wireless Headphones"
 *   description="High-quality wireless headphones with noise cancellation"
 *   images={['/images/headphones-1.jpg', '/images/headphones-2.jpg']}
 *   price={199.99}
 *   priceCurrency="USD"
 *   availability="InStock"
 *   brand="AudioTech"
 *   sku="AT-WH-001"
 *   url="https://broxiva.com/products/premium-wireless-headphones"
 *   rating={{ value: 4.5, count: 128 }}
 * />
 */
export function ProductSchema({
  name,
  description,
  images,
  sku,
  gtin,
  mpn,
  brand,
  price,
  priceCurrency,
  originalPrice,
  availability,
  condition,
  url,
  category,
  rating,
  reviews,
  seller,
  offers,
  weight,
  dimensions,
  color,
  material,
  pattern,
  itemGroupId,
  priceValidUntil,
  returnPolicy,
}: ProductSchemaProps) {
  // Build image URLs
  const imageUrls = images.map((img) =>
    img.startsWith('http') ? img : `${seoConfig.siteUrl}${img}`
  );

  // Build main offer
  const mainOffer: Record<string, any> = {
    '@type': 'Offer',
    price: price.toFixed(2),
    priceCurrency,
    availability: getAvailabilitySchema(availability),
    url,
    ...(priceValidUntil && { priceValidUntil }),
    ...(condition && { itemCondition: getConditionSchema(condition) }),
    ...(seller && {
      seller: {
        '@type': 'Organization',
        name: seller.name,
        ...(seller.url && { url: seller.url }),
        ...(seller.image && { image: seller.image }),
      },
    }),
  };

  // Add shipping details if available
  if (offers?.[0]?.shippingDetails) {
    const shipping = offers[0].shippingDetails;
    mainOffer.shippingDetails = {
      '@type': 'OfferShippingDetails',
      shippingRate: {
        '@type': 'MonetaryAmount',
        value: shipping.shippingRate,
        currency: shipping.shippingCurrency,
      },
      deliveryTime: {
        '@type': 'ShippingDeliveryTime',
        handlingTime: {
          '@type': 'QuantitativeValue',
          minValue: 0,
          maxValue: 1,
          unitCode: 'd',
        },
        transitTime: {
          '@type': 'QuantitativeValue',
          minValue: shipping.deliveryTime.minDays,
          maxValue: shipping.deliveryTime.maxDays,
          unitCode: 'd',
        },
      },
    };
  }

  // Add return policy if available
  if (returnPolicy) {
    mainOffer.hasMerchantReturnPolicy = {
      '@type': 'MerchantReturnPolicy',
      returnPolicyCategory: `https://schema.org/${returnPolicy.returnPolicyCategory}`,
      ...(returnPolicy.returnDays && {
        merchantReturnDays: returnPolicy.returnDays,
      }),
      ...(returnPolicy.returnFees && {
        returnFees: `https://schema.org/${returnPolicy.returnFees}`,
      }),
    };
  }

  // Build the schema
  const schema: Record<string, any> = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name,
    description,
    image: imageUrls,
    url,
    ...(sku && { sku }),
    ...(gtin && { gtin }),
    ...(mpn && { mpn }),
    ...(brand && {
      brand: {
        '@type': 'Brand',
        name: brand,
      },
    }),
    ...(category && { category }),
    ...(color && { color }),
    ...(material && { material }),
    ...(pattern && { pattern }),
    ...(itemGroupId && { isVariantOf: { '@type': 'ProductGroup', productGroupID: itemGroupId } }),
    offers: offers && offers.length > 1
      ? offers.map((offer) => ({
          '@type': 'Offer',
          price: offer.price.toFixed(2),
          priceCurrency: offer.priceCurrency,
          availability: getAvailabilitySchema(offer.availability as any),
          ...(offer.seller && {
            seller: { '@type': 'Organization', name: offer.seller },
          }),
        }))
      : mainOffer,
  };

  // Add aggregate rating
  if (rating && rating.count > 0) {
    schema.aggregateRating = {
      '@type': 'AggregateRating',
      ratingValue: rating.value,
      reviewCount: rating.count,
      bestRating: rating.bestRating || 5,
      worstRating: rating.worstRating || 1,
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

  // Add weight
  if (weight) {
    schema.weight = {
      '@type': 'QuantitativeValue',
      value: weight.value,
      unitCode: weight.unit.toUpperCase(),
    };
  }

  // Add dimensions
  if (dimensions) {
    schema.depth = dimensions.depth && {
      '@type': 'QuantitativeValue',
      value: dimensions.depth,
      unitCode: dimensions.unit.toUpperCase(),
    };
    schema.height = dimensions.height && {
      '@type': 'QuantitativeValue',
      value: dimensions.height,
      unitCode: dimensions.unit.toUpperCase(),
    };
    schema.width = dimensions.width && {
      '@type': 'QuantitativeValue',
      value: dimensions.width,
      unitCode: dimensions.unit.toUpperCase(),
    };
  }

  return <JsonLd data={schema} />;
}

/**
 * Simplified product schema for product cards/listings
 */
export function ProductCardSchema({
  name,
  image,
  price,
  priceCurrency,
  availability,
  url,
  brand,
}: {
  name: string;
  image: string;
  price: number;
  priceCurrency: string;
  availability: 'InStock' | 'OutOfStock';
  url: string;
  brand?: string;
}) {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name,
    image: image.startsWith('http') ? image : `${seoConfig.siteUrl}${image}`,
    url,
    ...(brand && { brand: { '@type': 'Brand', name: brand } }),
    offers: {
      '@type': 'Offer',
      price: price.toFixed(2),
      priceCurrency,
      availability: getAvailabilitySchema(availability),
    },
  };

  return <JsonLd data={schema} />;
}

export default ProductSchema;
