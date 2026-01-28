# SEO & Growth Strategy Documentation

## Overview

This document outlines the comprehensive SEO and growth infrastructure implemented for Broxiva Global Marketplace. The system is designed to maximize discoverability, conversion optimization, and international reach through multi-locale support.

## Table of Contents

1. [SEO Configuration](#seo-configuration)
2. [Hreflang Implementation](#hreflang-implementation)
3. [Structured Data (JSON-LD)](#structured-data-json-ld)
4. [Canonical URLs](#canonical-urls)
5. [Sitemap Strategy](#sitemap-strategy)
6. [Affiliate Program](#affiliate-program)
7. [Vendor Visibility Score](#vendor-visibility-score)
8. [Country Landing Pages](#country-landing-pages)
9. [SEO Checklist](#seo-checklist)

---

## SEO Configuration

### Base Configuration

Located at: `apps/web/src/lib/seo/config.ts`

```typescript
import { seoConfig, SUPPORTED_LOCALES, getLocaleConfig } from '@/lib/seo';

// Access configuration
const baseUrl = seoConfig.siteUrl;
const defaultLocale = seoConfig.defaultLocale;
const supportedLocales = SUPPORTED_LOCALES;
```

### Supported Locales

| Code | Name | Region | Currency | Hreflang |
|------|------|--------|----------|----------|
| en | English | US | USD | en-us |
| en-GB | English (UK) | GB | GBP | en-gb |
| fr | French | FR | EUR | fr-fr |
| fr-CA | French (Canada) | CA | CAD | fr-ca |
| es | Spanish | ES | EUR | es-es |
| es-MX | Spanish (Mexico) | MX | MXN | es-mx |
| de | German | DE | EUR | de-de |
| pt | Portuguese | BR | BRL | pt-br |
| ar | Arabic | AE | AED | ar-ae |
| zh | Chinese | CN | CNY | zh-cn |
| ja | Japanese | JP | JPY | ja-jp |
| ko | Korean | KR | KRW | ko-kr |

### Tenant-Specific Configuration

```typescript
import { mergeTenantConfig, seoConfig } from '@/lib/seo';

const tenantConfig = {
  tenantId: 'tenant-123',
  siteName: 'TenantShop',
  siteUrl: 'https://tenant.broxiva.com',
  supportedLocales: ['en', 'fr', 'es'],
};

const mergedConfig = mergeTenantConfig(seoConfig, tenantConfig);
```

---

## Hreflang Implementation

### Overview

Hreflang tags tell search engines which language and regional URL to show in search results. Critical for international SEO.

### Component Usage

```tsx
import { Hreflang, ProductHreflang, CategoryHreflang } from '@/components/seo';

// Basic usage
<Hreflang locale="en" />

// Product pages with translations
<ProductHreflang
  productSlug="wireless-headphones"
  translations={[
    { locale: 'fr', slug: 'ecouteurs-sans-fil' },
    { locale: 'es', slug: 'auriculares-inalambricos' },
  ]}
/>

// Category pages
<CategoryHreflang
  categorySlug="electronics"
  translations={[
    { locale: 'fr', slug: 'electronique' },
    { locale: 'de', slug: 'elektronik' },
  ]}
/>
```

### Generated Output

```html
<link rel="alternate" hreflang="en-us" href="https://broxiva.com/en/products/wireless-headphones" />
<link rel="alternate" hreflang="fr-fr" href="https://broxiva.com/fr/products/ecouteurs-sans-fil" />
<link rel="alternate" hreflang="es-es" href="https://broxiva.com/es/products/auriculares-inalambricos" />
<link rel="alternate" hreflang="x-default" href="https://broxiva.com/products/wireless-headphones" />
```

### Validation

```typescript
import { validateHreflang, generateHreflangLinks } from '@/lib/seo';

const links = generateHreflangLinks({ currentLocale: 'en', currentPath: '/products/shoe' });
const issues = validateHreflang(links);

if (issues.length > 0) {
  console.error('Hreflang issues:', issues);
}
```

---

## Structured Data (JSON-LD)

### Product Schema

```tsx
import { ProductSchema } from '@/components/seo';

<ProductSchema
  name="Premium Wireless Headphones"
  description="High-quality wireless headphones with noise cancellation"
  images={['/images/headphones-1.jpg', '/images/headphones-2.jpg']}
  price={199.99}
  priceCurrency="USD"
  availability="InStock"
  brand="AudioTech"
  sku="AT-WH-001"
  url="https://broxiva.com/products/premium-wireless-headphones"
  rating={{ value: 4.5, count: 128, bestRating: 5 }}
  reviews={[
    {
      author: 'John D.',
      datePublished: '2024-01-15',
      reviewBody: 'Excellent sound quality!',
      rating: 5,
    },
  ]}
  seller={{
    name: 'TechMart',
    url: 'https://broxiva.com/vendor/techmart',
  }}
/>
```

### Breadcrumb Schema

```tsx
import { BreadcrumbSchema, generateProductBreadcrumbs } from '@/components/seo';

// Manual breadcrumbs
<BreadcrumbSchema
  items={[
    { name: 'Home', url: '/' },
    { name: 'Electronics', url: '/categories/electronics' },
    { name: 'Headphones', url: '/categories/electronics/headphones' },
    { name: 'Premium Wireless Headphones' },
  ]}
/>

// Auto-generated from product data
const breadcrumbs = generateProductBreadcrumbs({
  productName: 'Premium Wireless Headphones',
  categoryName: 'Headphones',
  categorySlug: 'headphones',
  parentCategories: [{ name: 'Electronics', slug: 'electronics' }],
});

<BreadcrumbSchema items={breadcrumbs} />
```

### Organization Schema

```tsx
import { OrganizationSchema, BroxivaOrganization } from '@/components/seo';

// Default Broxiva organization
<BroxivaOrganization />

// Custom organization
<OrganizationSchema
  name="Custom Marketplace"
  url="https://custom.example.com"
  email="contact@custom.example.com"
  contactPoints={[
    {
      type: 'CustomerService',
      email: 'support@custom.example.com',
      availableLanguage: ['English', 'French'],
    },
  ]}
/>
```

### Local Business Schema (for Vendors)

```tsx
import { VendorStoreSchema } from '@/components/seo';

<VendorStoreSchema
  vendorName="TechMart Electronics"
  vendorSlug="techmart"
  description="Your one-stop shop for electronics"
  address={{
    streetAddress: '123 Market Street',
    addressLocality: 'Lagos',
    postalCode: '100001',
    addressCountry: 'NG',
  }}
  rating={{ value: 4.5, count: 234 }}
  shipsTo={['Nigeria', 'Ghana', 'Kenya']}
/>
```

### FAQ Schema

```tsx
import { FAQSchema, ShippingFAQSchema, PaymentFAQSchema } from '@/components/seo';

// Custom FAQs
<FAQSchema
  items={[
    { question: 'What is the return policy?', answer: 'Returns are accepted within 30 days...' },
    { question: 'How long does shipping take?', answer: 'Standard shipping takes 5-10 days...' },
  ]}
/>

// Pre-built FAQ schemas
<ShippingFAQSchema country="Nigeria" />
<PaymentFAQSchema />
```

---

## Canonical URLs

### Basic Usage

```tsx
import { Canonical, PaginationCanonical, FilterCanonical } from '@/components/seo';

// Automatic canonical
<Canonical />

// With specific URL
<Canonical url="https://broxiva.com/products/specific-product" />

// With locale
<Canonical locale="fr" />

// Paginated content
<PaginationCanonical
  currentPage={3}
  totalPages={10}
  basePath="/products"
  locale="en"
/>

// Filter pages (canonicalize to unfiltered)
<FilterCanonical basePath="/products" locale="en" />
```

### Query Parameter Handling

By default, the following parameters are excluded from canonical URLs:
- Tracking: `utm_source`, `utm_medium`, `utm_campaign`, `fbclid`, `gclid`
- Filters: `sort`, `order`, `filter`, `view`
- Session: `session`, `token`

Allowed parameters (included in canonical):
- `category`, `brand`, `q` (search query), `sku`, `variant`

---

## Sitemap Strategy

### Per-Locale Sitemaps

The system generates separate sitemaps for each locale:

```
/api/seo/sitemap.xml           # Sitemap index
/api/seo/sitemap/en.xml        # English sitemap
/api/seo/sitemap/fr.xml        # French sitemap
/api/seo/sitemap/es.xml        # Spanish sitemap
/api/seo/sitemap/products.xml  # All products
/api/seo/sitemap/categories.xml # All categories
/api/seo/sitemap/vendors.xml   # All vendors
```

### Chunked Sitemaps

For sites with >50,000 products:

```
/api/seo/sitemap/products-1.xml  # Products 1-50000
/api/seo/sitemap/products-2.xml  # Products 50001-100000
```

### Sitemap Features

- **lastmod**: Updated timestamps from database
- **changefreq**: Appropriate frequency per content type
- **priority**: Based on content importance
- **hreflang alternates**: All locale variants included
- **Image sitemaps**: Product images included

---

## Affiliate Program

### Generating Affiliate Links

```typescript
// POST /api/affiliate/links
{
  "productId": "product-123",
  "utmSource": "affiliate",
  "utmMedium": "referral",
  "utmCampaign": "summer-sale"
}

// Response
{
  "shortUrl": "https://broxiva.com/go/ABC123XY/product-slug",
  "fullUrl": "https://broxiva.com/products/product-slug?utm_source=affiliate&...",
  "affiliateCode": "ABC123XY"
}
```

### Link Format

```
https://broxiva.com/go/{affiliate_code}/{product_slug}?utm_source=...
```

### Tracking

- **Clicks**: Tracked on redirect
- **Conversions**: Tracked on order completion
- **Attribution Window**: 30 days (configurable)

### Commission Structure

| Tier | Revenue | Commission Rate |
|------|---------|-----------------|
| Standard | $0 - $1,000 | 5% |
| Silver | $1,000 - $5,000 | 7% |
| Gold | $5,000 - $20,000 | 10% |
| Platinum | $20,000+ | 12% |

### API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/affiliate/links` | POST | Create affiliate link |
| `/api/affiliate/links` | GET | List affiliate's links |
| `/api/affiliate/stats` | GET | Get affiliate statistics |
| `/api/affiliate/go/:code/:slug` | GET | Redirect endpoint |
| `/api/affiliate/track/click` | POST | Track click (client-side) |
| `/api/affiliate/track/conversion` | POST | Track conversion (webhook) |

---

## Vendor Visibility Score

### Score Components

| Component | Weight | Description |
|-----------|--------|-------------|
| Product Listing Completeness | 20% | Images, descriptions, specs |
| Translation Coverage | 15% | Multi-language listings |
| Response Time | 15% | Average response to inquiries |
| Review Rating | 20% | Average product ratings |
| Order Fulfillment Rate | 20% | On-time delivery percentage |
| Return Rate (Inverse) | 10% | Lower returns = higher score |

### Tier Thresholds

| Tier | Score Range | Benefits |
|------|-------------|----------|
| Platinum | 90-100 | Featured placement, lowest fees |
| Gold | 75-89 | Priority search ranking |
| Silver | 50-74 | Standard visibility |
| Bronze | 0-49 | Basic listing |

### API Usage

```typescript
// GET /api/vendors/:id/visibility-score
{
  "overallScore": 85,
  "tier": "gold",
  "components": {
    "productListingCompleteness": 90,
    "translationCoverage": 75,
    "responseTime": 95,
    "reviewRating": 82,
    "orderFulfillmentRate": 88,
    "returnRateInverse": 92
  },
  "recommendations": [
    "Translate product listings to reach more international customers"
  ]
}
```

---

## Country Landing Pages

### URL Structure

```
/{locale}/shop/{country-code}

Examples:
/en/shop/us    - United States landing page
/en/shop/ng    - Nigeria landing page
/fr/shop/fr    - France landing page
```

### Page Features

1. **Localized Currency Display**: Prices in local currency
2. **Local Shipping Info**: Country-specific shipping options
3. **Popular Products**: Trending items in that country
4. **Local Testimonials**: Reviews from local customers
5. **Trust Badges**: Local payment and delivery partners

### Supported Countries

| Code | Country | Currency | Languages |
|------|---------|----------|-----------|
| US | United States | USD | en |
| GB | United Kingdom | GBP | en |
| NG | Nigeria | NGN | en, yo, ha |
| KE | Kenya | KES | en, sw |
| ZA | South Africa | ZAR | en, af, zu |
| DE | Germany | EUR | de |
| FR | France | EUR | fr |
| AE | UAE | AED | ar, en |
| BR | Brazil | BRL | pt |

---

## SEO Checklist

### Page-Level Requirements

- [ ] Unique title per page per locale (50-60 characters)
- [ ] Meta description per page per locale (150-160 characters)
- [ ] Canonical URL set correctly
- [ ] Hreflang tags for all available locales
- [ ] x-default hreflang present
- [ ] JSON-LD structured data appropriate for page type
- [ ] Open Graph tags (og:title, og:description, og:image)
- [ ] Twitter Card tags
- [ ] Proper heading hierarchy (H1 -> H2 -> H3)

### Technical SEO

- [ ] XML sitemaps submitted to search consoles
- [ ] Per-locale sitemaps generated
- [ ] robots.txt configured correctly
- [ ] 301 redirects for locale changes
- [ ] SSL/HTTPS enabled
- [ ] Mobile-friendly responsive design
- [ ] Core Web Vitals optimized
- [ ] Image alt text provided
- [ ] Internal linking structure

### Content SEO

- [ ] Unique product descriptions
- [ ] Translated content (not auto-translated)
- [ ] Category page descriptions
- [ ] FAQ content on relevant pages
- [ ] Blog/help center content

### Monitoring

- [ ] Google Search Console configured
- [ ] Bing Webmaster Tools configured
- [ ] Structured data testing passed
- [ ] Mobile usability testing passed
- [ ] Regular crawl error monitoring

---

## Implementation Files

| File | Purpose |
|------|---------|
| `apps/web/src/lib/seo/config.ts` | Base SEO configuration |
| `apps/web/src/lib/seo/metadata.ts` | Metadata generation utilities |
| `apps/web/src/lib/seo/hreflang.ts` | Hreflang tag generation |
| `apps/web/src/components/seo/Hreflang.tsx` | Hreflang component |
| `apps/web/src/components/seo/Canonical.tsx` | Canonical URL component |
| `apps/web/src/components/seo/ProductSchema.tsx` | Product JSON-LD |
| `apps/web/src/components/seo/BreadcrumbSchema.tsx` | Breadcrumb JSON-LD |
| `apps/web/src/components/seo/OrganizationSchema.tsx` | Organization JSON-LD |
| `apps/web/src/components/seo/LocalBusinessSchema.tsx` | Local business JSON-LD |
| `apps/web/src/components/seo/FAQSchema.tsx` | FAQ page JSON-LD |
| `apps/web/src/components/seo/MetaTags.tsx` | Social meta tags |
| `apps/web/src/components/product/ShippingBadge.tsx` | Shipping availability badge |
| `apps/api/src/modules/vendors/visibility-score.service.ts` | Vendor scoring |
| `apps/api/src/modules/marketing/affiliate-links.service.ts` | Affiliate system |
| `apps/api/src/modules/seo/sitemap/locale-sitemap.service.ts` | Locale sitemaps |

---

## Best Practices

1. **Content Localization**: Use professional translation, not machine translation
2. **Currency Display**: Always show prices in local currency with proper formatting
3. **Shipping Information**: Clear, localized shipping info on product pages
4. **Trust Signals**: Display local payment methods and delivery partners
5. **Mobile First**: Ensure all SEO elements work on mobile devices
6. **Performance**: Keep JSON-LD scripts minimal and efficient
7. **Testing**: Regularly test structured data with Google's testing tool
8. **Monitoring**: Set up alerts for crawl errors and indexing issues
