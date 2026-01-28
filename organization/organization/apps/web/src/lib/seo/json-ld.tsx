/**
 * React components for rendering JSON-LD structured data
 */

import * as React from 'react';
import {
  type Organization,
  type LocalBusiness,
  type WebPage,
  type Product,
  type Review,
  type ItemList,
  type HowTo,
  type Event,
  type VideoObject,
  type ImageObject,
  type CollectionPage,
  type FAQItem,
  type Article,
  type WebSite,
  type BreadcrumbItem,
  generateOrganization,
  generateLocalBusiness,
  generateWebPage,
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
  combineSchemas,
} from './structured-data';

interface JsonLdProps {
  data: object;
}

export function JsonLd({ data }: JsonLdProps) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}

export function OrganizationJsonLd({ data }: { data: Organization }) {
  return <JsonLd data={generateOrganization(data)} />;
}

export function LocalBusinessJsonLd({ data }: { data: LocalBusiness }) {
  return <JsonLd data={generateLocalBusiness(data)} />;
}

export function WebPageJsonLd({ data }: { data: WebPage }) {
  return <JsonLd data={generateWebPage(data)} />;
}

export function ProductJsonLd({ data }: { data: Product }) {
  return <JsonLd data={generateProduct(data)} />;
}

export function ItemListJsonLd({ data }: { data: ItemList }) {
  return <JsonLd data={generateItemList(data)} />;
}

export function BreadcrumbJsonLd({ items }: { items: BreadcrumbItem[] }) {
  return <JsonLd data={{ '@context': 'https://schema.org', ...generateBreadcrumbList(items) }} />;
}

export function HowToJsonLd({ data }: { data: HowTo }) {
  return <JsonLd data={generateHowTo(data)} />;
}

export function EventJsonLd({ data }: { data: Event }) {
  return <JsonLd data={generateEvent(data)} />;
}

export function VideoJsonLd({ data }: { data: VideoObject }) {
  return <JsonLd data={generateVideoObject(data)} />;
}

export function ImageJsonLd({ data }: { data: ImageObject }) {
  return <JsonLd data={generateImageObject(data)} />;
}

export function CollectionPageJsonLd({ data }: { data: CollectionPage }) {
  return <JsonLd data={generateCollectionPage(data)} />;
}

export function FAQPageJsonLd({ items }: { items: FAQItem[] }) {
  return <JsonLd data={generateFAQPage(items)} />;
}

export function ArticleJsonLd({ data }: { data: Article }) {
  return <JsonLd data={generateArticle(data)} />;
}

export function WebSiteJsonLd({ data }: { data: WebSite }) {
  return <JsonLd data={generateWebSite(data)} />;
}

export function CombinedJsonLd({ schemas }: { schemas: object[] }) {
  return <JsonLd data={combineSchemas(...schemas)} />;
}

// Pre-configured Broxiva organization schema
export function BroxivaOrganizationJsonLd({ baseUrl }: { baseUrl: string }) {
  return (
    <OrganizationJsonLd
      data={{
        name: 'Broxiva',
        url: baseUrl,
        logo: `${baseUrl}/logo.png`,
        description: 'Africa\'s leading B2B e-commerce marketplace connecting buyers and sellers across the continent.',
        sameAs: [
          'https://twitter.com/broxiva',
          'https://linkedin.com/company/broxiva',
          'https://facebook.com/broxiva',
        ],
        contactPoint: {
          type: 'CustomerService',
          email: 'support@broxiva.com',
          availableLanguage: ['English', 'French'],
        },
      }}
    />
  );
}

// Pre-configured Broxiva website schema with search
export function BroxivaWebSiteJsonLd({ baseUrl }: { baseUrl: string }) {
  return (
    <WebSiteJsonLd
      data={{
        name: 'Broxiva',
        url: baseUrl,
        description: 'Africa\'s leading B2B e-commerce marketplace',
        potentialAction: {
          queryInput: 'required name=search_term_string',
          targetUrl: `${baseUrl}/search?q={search_term_string}`,
        },
      }}
    />
  );
}
