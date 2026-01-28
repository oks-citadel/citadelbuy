/**
 * Base SEO Configuration for Broxiva Global Marketplace
 * Comprehensive configuration for multi-locale, multi-tenant SEO
 */

export interface LocaleConfig {
  code: string;
  name: string;
  region: string;
  currency: string;
  hreflang: string;
  isDefault?: boolean;
}

export interface SEOConfig {
  siteName: string;
  siteUrl: string;
  defaultLocale: string;
  supportedLocales: LocaleConfig[];
  social: {
    twitter: string;
    facebook: string;
    linkedin: string;
    instagram: string;
  };
  organization: {
    name: string;
    logo: string;
    email: string;
    phone?: string;
    address?: {
      streetAddress: string;
      addressLocality: string;
      addressRegion: string;
      postalCode: string;
      addressCountry: string;
    };
  };
  defaults: {
    titleTemplate: string;
    description: string;
    keywords: string[];
    ogImage: string;
    twitterCard: 'summary' | 'summary_large_image' | 'app' | 'player';
  };
  robots: {
    index: boolean;
    follow: boolean;
    noarchive?: boolean;
    nosnippet?: boolean;
    noimageindex?: boolean;
    maxSnippet?: number;
    maxImagePreview?: 'none' | 'standard' | 'large';
    maxVideoPreview?: number;
  };
}

// Supported locales for multi-region marketplace
export const SUPPORTED_LOCALES: LocaleConfig[] = [
  { code: 'en', name: 'English', region: 'US', currency: 'USD', hreflang: 'en-us', isDefault: true },
  { code: 'en-GB', name: 'English (UK)', region: 'GB', currency: 'GBP', hreflang: 'en-gb' },
  { code: 'fr', name: 'French', region: 'FR', currency: 'EUR', hreflang: 'fr-fr' },
  { code: 'fr-CA', name: 'French (Canada)', region: 'CA', currency: 'CAD', hreflang: 'fr-ca' },
  { code: 'es', name: 'Spanish', region: 'ES', currency: 'EUR', hreflang: 'es-es' },
  { code: 'es-MX', name: 'Spanish (Mexico)', region: 'MX', currency: 'MXN', hreflang: 'es-mx' },
  { code: 'de', name: 'German', region: 'DE', currency: 'EUR', hreflang: 'de-de' },
  { code: 'pt', name: 'Portuguese', region: 'BR', currency: 'BRL', hreflang: 'pt-br' },
  { code: 'ar', name: 'Arabic', region: 'AE', currency: 'AED', hreflang: 'ar-ae' },
  { code: 'zh', name: 'Chinese', region: 'CN', currency: 'CNY', hreflang: 'zh-cn' },
  { code: 'ja', name: 'Japanese', region: 'JP', currency: 'JPY', hreflang: 'ja-jp' },
  { code: 'ko', name: 'Korean', region: 'KR', currency: 'KRW', hreflang: 'ko-kr' },
  { code: 'hi', name: 'Hindi', region: 'IN', currency: 'INR', hreflang: 'hi-in' },
  { code: 'sw', name: 'Swahili', region: 'KE', currency: 'KES', hreflang: 'sw-ke' },
  { code: 'yo', name: 'Yoruba', region: 'NG', currency: 'NGN', hreflang: 'yo-ng' },
  { code: 'ha', name: 'Hausa', region: 'NG', currency: 'NGN', hreflang: 'ha-ng' },
];

// Base SEO configuration
export const seoConfig: SEOConfig = {
  siteName: 'Broxiva',
  siteUrl: process.env.NEXT_PUBLIC_BASE_URL || 'https://broxiva.com',
  defaultLocale: 'en',
  supportedLocales: SUPPORTED_LOCALES,
  social: {
    twitter: '@broxiva',
    facebook: 'https://facebook.com/broxiva',
    linkedin: 'https://linkedin.com/company/broxiva',
    instagram: 'https://instagram.com/broxiva',
  },
  organization: {
    name: 'Broxiva Global Marketplace',
    logo: '/logo.png',
    email: 'support@broxiva.com',
    phone: '+1-800-BROXIVA',
    address: {
      streetAddress: '100 Commerce Boulevard',
      addressLocality: 'Lagos',
      addressRegion: 'Lagos',
      postalCode: '100001',
      addressCountry: 'NG',
    },
  },
  defaults: {
    titleTemplate: '%s | Broxiva - Global B2B Marketplace',
    description: 'Discover millions of products from trusted vendors worldwide. Broxiva connects buyers and sellers across Africa and beyond with competitive pricing and secure transactions.',
    keywords: [
      'B2B marketplace',
      'wholesale',
      'global trade',
      'Africa marketplace',
      'cross-border commerce',
      'verified vendors',
      'bulk ordering',
      'trade assurance',
    ],
    ogImage: '/og-image.jpg',
    twitterCard: 'summary_large_image',
  },
  robots: {
    index: true,
    follow: true,
    maxSnippet: -1,
    maxImagePreview: 'large',
    maxVideoPreview: -1,
  },
};

// Get locale configuration by code
export function getLocaleConfig(localeCode: string): LocaleConfig | undefined {
  return SUPPORTED_LOCALES.find(
    (l) => l.code === localeCode || l.hreflang === localeCode.toLowerCase()
  );
}

// Get default locale configuration
export function getDefaultLocale(): LocaleConfig {
  return SUPPORTED_LOCALES.find((l) => l.isDefault) || SUPPORTED_LOCALES[0];
}

// Get all supported hreflang codes
export function getSupportedHreflangCodes(): string[] {
  return SUPPORTED_LOCALES.map((l) => l.hreflang);
}

// Get currency for locale
export function getCurrencyForLocale(localeCode: string): string {
  const locale = getLocaleConfig(localeCode);
  return locale?.currency || 'USD';
}

// Get region for locale
export function getRegionForLocale(localeCode: string): string {
  const locale = getLocaleConfig(localeCode);
  return locale?.region || 'US';
}

// Build full URL with locale
export function buildLocalizedUrl(path: string, locale?: string): string {
  const baseUrl = seoConfig.siteUrl;
  const cleanPath = path.startsWith('/') ? path : `/${path}`;

  if (!locale || locale === seoConfig.defaultLocale) {
    return `${baseUrl}${cleanPath}`;
  }

  return `${baseUrl}/${locale}${cleanPath}`;
}

// Tenant-specific SEO configuration override
export interface TenantSEOConfig {
  tenantId: string;
  siteName?: string;
  siteUrl?: string;
  logo?: string;
  supportedLocales?: string[];
  defaultLocale?: string;
  socialLinks?: Partial<SEOConfig['social']>;
  customMetaTags?: Array<{ name: string; content: string }>;
}

// Merge tenant config with base config
export function mergeTenantConfig(
  baseConfig: SEOConfig,
  tenantConfig?: TenantSEOConfig
): SEOConfig {
  if (!tenantConfig) return baseConfig;

  return {
    ...baseConfig,
    siteName: tenantConfig.siteName || baseConfig.siteName,
    siteUrl: tenantConfig.siteUrl || baseConfig.siteUrl,
    defaultLocale: tenantConfig.defaultLocale || baseConfig.defaultLocale,
    supportedLocales: tenantConfig.supportedLocales
      ? baseConfig.supportedLocales.filter((l) =>
          tenantConfig.supportedLocales!.includes(l.code)
        )
      : baseConfig.supportedLocales,
    organization: {
      ...baseConfig.organization,
      logo: tenantConfig.logo || baseConfig.organization.logo,
    },
    social: {
      ...baseConfig.social,
      ...tenantConfig.socialLinks,
    },
  };
}

export default seoConfig;
