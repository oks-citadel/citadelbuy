/**
 * Tenant Context
 *
 * Server-side utilities for tenant resolution and context
 */

import { headers } from 'next/headers';
import { I18N_HEADER_NAMES } from '../i18n-edge/config';

// ============================================================================
// Types
// ============================================================================

export interface TenantConfig {
  id: string;
  name: string;
  domain: string;
  defaultLocale: string;
  supportedLocales: string[];
  defaultCurrency: string;
  theme?: TenantTheme;
  features?: TenantFeatures;
  branding?: TenantBranding;
}

export interface TenantTheme {
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  fontFamily?: string;
  borderRadius?: string;
}

export interface TenantFeatures {
  enableAI?: boolean;
  enableARTryOn?: boolean;
  enableVoiceSearch?: boolean;
  enableChatbot?: boolean;
  enableLoyalty?: boolean;
  enableSubscriptions?: boolean;
  enableMultiCurrency?: boolean;
  enableGiftCards?: boolean;
}

export interface TenantBranding {
  logoUrl?: string;
  logoAlt?: string;
  faviconUrl?: string;
  ogImageUrl?: string;
  tagline?: string;
  socialLinks?: {
    facebook?: string;
    twitter?: string;
    instagram?: string;
    linkedin?: string;
    youtube?: string;
    tiktok?: string;
  };
}

export interface TenantContext {
  tenant: TenantConfig;
  locale: string;
  country: string;
  currency: string;
  traceId: string;
}

// ============================================================================
// Tenant Registry
// ============================================================================

const TENANT_REGISTRY: Record<string, TenantConfig> = {
  broxiva: {
    id: 'broxiva',
    name: 'Broxiva',
    domain: 'broxiva.com',
    defaultLocale: 'en-us',
    supportedLocales: [
      'en-us',
      'en-gb',
      'fr-fr',
      'fr-ca',
      'es-es',
      'es-mx',
      'de-de',
      'pt-br',
      'ar-ae',
      'zh-cn',
      'ja-jp',
      'yo-ng',
      'ha-ng',
    ],
    defaultCurrency: 'USD',
    theme: {
      primaryColor: '#2563eb',
      secondaryColor: '#1e40af',
      accentColor: '#f59e0b',
    },
    features: {
      enableAI: true,
      enableARTryOn: true,
      enableVoiceSearch: true,
      enableChatbot: true,
      enableLoyalty: true,
      enableSubscriptions: true,
      enableMultiCurrency: true,
      enableGiftCards: true,
    },
    branding: {
      logoUrl: '/logo.svg',
      logoAlt: 'Broxiva Logo',
      tagline: 'AI-Powered Shopping',
    },
  },
  'broxiva-ng': {
    id: 'broxiva-ng',
    name: 'Broxiva Nigeria',
    domain: 'ng.broxiva.com',
    defaultLocale: 'en-us',
    supportedLocales: ['en-us', 'yo-ng', 'ha-ng'],
    defaultCurrency: 'NGN',
    theme: {
      primaryColor: '#008751',
      secondaryColor: '#006847',
      accentColor: '#f59e0b',
    },
    features: {
      enableAI: true,
      enableChatbot: true,
      enableMultiCurrency: true,
    },
    branding: {
      logoUrl: '/logo-ng.svg',
      logoAlt: 'Broxiva Nigeria Logo',
      tagline: 'Shop Smart Nigeria',
    },
  },
  'broxiva-de': {
    id: 'broxiva-de',
    name: 'Broxiva Deutschland',
    domain: 'de.broxiva.com',
    defaultLocale: 'de-de',
    supportedLocales: ['de-de', 'en-us'],
    defaultCurrency: 'EUR',
    theme: {
      primaryColor: '#000000',
      secondaryColor: '#dd0000',
      accentColor: '#ffcc00',
    },
    features: {
      enableAI: true,
      enableARTryOn: true,
      enableVoiceSearch: true,
      enableChatbot: true,
      enableMultiCurrency: true,
    },
    branding: {
      logoUrl: '/logo-de.svg',
      logoAlt: 'Broxiva Deutschland Logo',
      tagline: 'Intelligentes Einkaufen',
    },
  },
};

// ============================================================================
// Server-Side Context Resolution
// ============================================================================

/**
 * Get tenant context from middleware headers (Server Components)
 */
export async function getTenantContext(): Promise<TenantContext> {
  const headerStore = await headers();

  const tenantId = headerStore.get(I18N_HEADER_NAMES.tenant) || 'broxiva';
  const locale = headerStore.get(I18N_HEADER_NAMES.locale) || 'en-us';
  const country = headerStore.get(I18N_HEADER_NAMES.country) || 'US';
  const currency = headerStore.get(I18N_HEADER_NAMES.currency) || 'USD';
  const traceId = headerStore.get(I18N_HEADER_NAMES.traceId) || '';

  const tenant = TENANT_REGISTRY[tenantId] || TENANT_REGISTRY.broxiva;

  return {
    tenant,
    locale,
    country,
    currency,
    traceId,
  };
}

/**
 * Get tenant by ID
 */
export function getTenantById(tenantId: string): TenantConfig | undefined {
  return TENANT_REGISTRY[tenantId];
}

/**
 * Get tenant by domain
 */
export function getTenantByDomain(domain: string): TenantConfig | undefined {
  return Object.values(TENANT_REGISTRY).find((tenant) => tenant.domain === domain);
}

/**
 * Get all tenants
 */
export function getAllTenants(): TenantConfig[] {
  return Object.values(TENANT_REGISTRY);
}

/**
 * Check if locale is supported by tenant
 */
export function isTenantLocaleSupported(tenantId: string, locale: string): boolean {
  const tenant = TENANT_REGISTRY[tenantId];
  if (!tenant) return false;
  return tenant.supportedLocales.includes(locale.toLowerCase());
}

/**
 * Get tenant's default locale
 */
export function getTenantDefaultLocale(tenantId: string): string {
  const tenant = TENANT_REGISTRY[tenantId];
  return tenant?.defaultLocale || 'en-us';
}

/**
 * Check if feature is enabled for tenant
 */
export function isTenantFeatureEnabled(
  tenantId: string,
  feature: keyof TenantFeatures
): boolean {
  const tenant = TENANT_REGISTRY[tenantId];
  if (!tenant?.features) return false;
  return tenant.features[feature] === true;
}
