'use client';

/**
 * Meta Tags Component for SEO
 * Generates Open Graph, Twitter Card, and other meta tags
 */

import Head from 'next/head';
import { seoConfig, getLocaleConfig } from '@/lib/seo/config';

export interface MetaTagsProps {
  /**
   * Page title
   */
  title: string;
  /**
   * Page description
   */
  description: string;
  /**
   * Current locale
   */
  locale?: string;
  /**
   * Page URL
   */
  url?: string;
  /**
   * Primary image for social sharing
   */
  image?: string;
  /**
   * Image alt text
   */
  imageAlt?: string;
  /**
   * Open Graph type
   */
  type?: 'website' | 'article' | 'product' | 'profile';
  /**
   * Twitter card type
   */
  twitterCard?: 'summary' | 'summary_large_image' | 'app' | 'player';
  /**
   * Site name override
   */
  siteName?: string;
  /**
   * Keywords
   */
  keywords?: string[];
  /**
   * Author name
   */
  author?: string;
  /**
   * Published date (for articles)
   */
  publishedTime?: string;
  /**
   * Modified date (for articles)
   */
  modifiedTime?: string;
  /**
   * Article section (for articles)
   */
  section?: string;
  /**
   * Article tags (for articles)
   */
  tags?: string[];
  /**
   * Product price (for products)
   */
  price?: {
    amount: number;
    currency: string;
  };
  /**
   * Product availability (for products)
   */
  availability?: 'in stock' | 'out of stock' | 'preorder';
  /**
   * Robots directives
   */
  robots?: {
    index?: boolean;
    follow?: boolean;
    noarchive?: boolean;
    nosnippet?: boolean;
    noimageindex?: boolean;
    maxSnippet?: number;
    maxImagePreview?: 'none' | 'standard' | 'large';
    maxVideoPreview?: number;
  };
  /**
   * Additional custom meta tags
   */
  customTags?: Array<{
    name?: string;
    property?: string;
    content: string;
  }>;
}

/**
 * MetaTags component for rendering social and SEO meta tags
 *
 * Note: In Next.js 14+, prefer using the Metadata API in page files.
 * This component is useful for client-side dynamic meta tags.
 *
 * @example
 * <MetaTags
 *   title="Premium Headphones"
 *   description="High-quality wireless headphones"
 *   image="/products/headphones.jpg"
 *   type="product"
 *   price={{ amount: 199.99, currency: 'USD' }}
 *   availability="in stock"
 * />
 */
export function MetaTags({
  title,
  description,
  locale = seoConfig.defaultLocale,
  url,
  image,
  imageAlt,
  type = 'website',
  twitterCard = 'summary_large_image',
  siteName = seoConfig.siteName,
  keywords = [],
  author,
  publishedTime,
  modifiedTime,
  section,
  tags = [],
  price,
  availability,
  robots,
  customTags = [],
}: MetaTagsProps) {
  const localeConfig = getLocaleConfig(locale);
  const ogLocale = localeConfig?.hreflang.replace('-', '_') || 'en_US';
  const fullImage = image
    ? image.startsWith('http')
      ? image
      : `${seoConfig.siteUrl}${image}`
    : `${seoConfig.siteUrl}${seoConfig.defaults.ogImage}`;
  const fullUrl = url || seoConfig.siteUrl;

  // Build robots content
  const robotsContent = robots
    ? [
        robots.index === false ? 'noindex' : 'index',
        robots.follow === false ? 'nofollow' : 'follow',
        robots.noarchive && 'noarchive',
        robots.nosnippet && 'nosnippet',
        robots.noimageindex && 'noimageindex',
        robots.maxSnippet !== undefined && `max-snippet:${robots.maxSnippet}`,
        robots.maxImagePreview && `max-image-preview:${robots.maxImagePreview}`,
        robots.maxVideoPreview !== undefined && `max-video-preview:${robots.maxVideoPreview}`,
      ]
        .filter(Boolean)
        .join(', ')
    : undefined;

  return (
    <>
      {/* Basic Meta Tags */}
      <meta name="description" content={description} />
      {keywords.length > 0 && (
        <meta name="keywords" content={keywords.join(', ')} />
      )}
      {author && <meta name="author" content={author} />}
      {robotsContent && <meta name="robots" content={robotsContent} />}

      {/* Open Graph Tags */}
      <meta property="og:type" content={type} />
      <meta property="og:site_name" content={siteName} />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={fullUrl} />
      <meta property="og:locale" content={ogLocale} />
      <meta property="og:image" content={fullImage} />
      <meta property="og:image:width" content="1200" />
      <meta property="og:image:height" content="630" />
      {imageAlt && <meta property="og:image:alt" content={imageAlt} />}

      {/* Article-specific Open Graph Tags */}
      {type === 'article' && (
        <>
          {publishedTime && (
            <meta property="article:published_time" content={publishedTime} />
          )}
          {modifiedTime && (
            <meta property="article:modified_time" content={modifiedTime} />
          )}
          {author && <meta property="article:author" content={author} />}
          {section && <meta property="article:section" content={section} />}
          {tags.map((tag, index) => (
            <meta key={index} property="article:tag" content={tag} />
          ))}
        </>
      )}

      {/* Product-specific Meta Tags */}
      {type === 'product' && price && (
        <>
          <meta property="product:price:amount" content={price.amount.toString()} />
          <meta property="product:price:currency" content={price.currency} />
          {availability && (
            <meta property="product:availability" content={availability} />
          )}
        </>
      )}

      {/* Twitter Card Tags */}
      <meta name="twitter:card" content={twitterCard} />
      <meta name="twitter:site" content={seoConfig.social.twitter} />
      <meta name="twitter:creator" content={seoConfig.social.twitter} />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={fullImage} />
      {imageAlt && <meta name="twitter:image:alt" content={imageAlt} />}

      {/* Additional locale alternates for Open Graph */}
      {seoConfig.supportedLocales
        .filter((l) => l.code !== locale)
        .map((l) => (
          <meta
            key={l.code}
            property="og:locale:alternate"
            content={l.hreflang.replace('-', '_')}
          />
        ))}

      {/* Custom Meta Tags */}
      {customTags.map((tag, index) => (
        <meta
          key={index}
          {...(tag.name && { name: tag.name })}
          {...(tag.property && { property: tag.property })}
          content={tag.content}
        />
      ))}
    </>
  );
}

/**
 * Product-specific meta tags
 */
export function ProductMetaTags({
  name,
  description,
  images,
  price,
  currency,
  availability,
  brand,
  sku,
  url,
  rating,
  locale,
}: {
  name: string;
  description: string;
  images: string[];
  price: number;
  currency: string;
  availability: 'in stock' | 'out of stock' | 'preorder';
  brand?: string;
  sku?: string;
  url: string;
  rating?: number;
  locale?: string;
}) {
  const fullTitle = brand ? `${name} by ${brand}` : name;

  return (
    <MetaTags
      title={fullTitle}
      description={description}
      image={images[0]}
      imageAlt={name}
      type="product"
      url={url}
      locale={locale}
      price={{ amount: price, currency }}
      availability={availability}
      customTags={[
        ...(brand ? [{ property: 'product:brand', content: brand }] : []),
        ...(sku ? [{ property: 'product:retailer_item_id', content: sku }] : []),
        ...(rating ? [{ property: 'product:rating', content: rating.toString() }] : []),
      ]}
    />
  );
}

/**
 * Article/Blog post meta tags
 */
export function ArticleMetaTags({
  title,
  description,
  image,
  author,
  publishedTime,
  modifiedTime,
  section,
  tags,
  url,
  locale,
}: {
  title: string;
  description: string;
  image?: string;
  author: string;
  publishedTime: string;
  modifiedTime?: string;
  section?: string;
  tags?: string[];
  url: string;
  locale?: string;
}) {
  return (
    <MetaTags
      title={title}
      description={description}
      image={image}
      imageAlt={title}
      type="article"
      url={url}
      locale={locale}
      author={author}
      publishedTime={publishedTime}
      modifiedTime={modifiedTime}
      section={section}
      tags={tags}
    />
  );
}

/**
 * Vendor profile meta tags
 */
export function VendorMetaTags({
  name,
  description,
  logo,
  url,
  locale,
  productCount,
  rating,
}: {
  name: string;
  description: string;
  logo?: string;
  url: string;
  locale?: string;
  productCount?: number;
  rating?: number;
}) {
  const enhancedDescription = [
    description,
    productCount && `${productCount.toLocaleString()} products available`,
    rating && `Rated ${rating.toFixed(1)} out of 5`,
  ]
    .filter(Boolean)
    .join('. ');

  return (
    <MetaTags
      title={`${name} - Vendor Store`}
      description={enhancedDescription}
      image={logo}
      imageAlt={`${name} logo`}
      type="profile"
      twitterCard="summary"
      url={url}
      locale={locale}
    />
  );
}

/**
 * Category page meta tags
 */
export function CategoryMetaTags({
  name,
  description,
  image,
  productCount,
  url,
  locale,
}: {
  name: string;
  description: string;
  image?: string;
  productCount?: number;
  url: string;
  locale?: string;
}) {
  const enhancedDescription = productCount
    ? `${description} Browse ${productCount.toLocaleString()} products in ${name}.`
    : description;

  return (
    <MetaTags
      title={`${name} - Shop Category`}
      description={enhancedDescription}
      image={image}
      imageAlt={name}
      type="website"
      url={url}
      locale={locale}
    />
  );
}

export default MetaTags;
