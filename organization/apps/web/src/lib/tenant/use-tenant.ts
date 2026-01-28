'use client';

/**
 * Tenant Hooks
 *
 * React hooks for accessing tenant context and related utilities
 */

import { useMemo } from 'react';
import { useTenantContext, type TenantContextValue } from './tenant-provider';
import type { TenantConfig, TenantFeatures } from './tenant-context';

// ============================================================================
// Main Hook
// ============================================================================

/**
 * Primary hook for accessing tenant context
 */
export function useTenant(): TenantContextValue {
  return useTenantContext();
}

// ============================================================================
// Derived Hooks
// ============================================================================

/**
 * Get tenant configuration only
 */
export function useTenantConfig(): TenantConfig {
  const { tenant } = useTenantContext();
  return tenant;
}

/**
 * Get current locale
 */
export function useLocale(): string {
  const { locale } = useTenantContext();
  return locale;
}

/**
 * Get current country
 */
export function useCountry(): string {
  const { country } = useTenantContext();
  return country;
}

/**
 * Get current currency
 */
export function useCurrency(): string {
  const { currency } = useTenantContext();
  return currency;
}

/**
 * Get text direction (ltr/rtl)
 */
export function useDirection(): 'ltr' | 'rtl' {
  const { direction } = useTenantContext();
  return direction;
}

/**
 * Check if a feature is enabled
 */
export function useFeatureEnabled(feature: keyof TenantFeatures): boolean {
  const { isFeatureEnabled } = useTenantContext();
  return isFeatureEnabled(feature);
}

/**
 * Get all enabled features
 */
export function useEnabledFeatures(): Partial<TenantFeatures> {
  const { tenant } = useTenantContext();

  return useMemo(() => {
    const features: Partial<TenantFeatures> = {};

    if (tenant.features) {
      Object.entries(tenant.features).forEach(([key, value]) => {
        if (value === true) {
          features[key as keyof TenantFeatures] = true;
        }
      });
    }

    return features;
  }, [tenant.features]);
}

/**
 * Get locale setter function
 */
export function useSetLocale(): (locale: string) => void {
  const { setLocale } = useTenantContext();
  return setLocale;
}

/**
 * Get currency setter function
 */
export function useSetCurrency(): (currency: string) => void {
  const { setCurrency } = useTenantContext();
  return setCurrency;
}

/**
 * Get country setter function
 */
export function useSetCountry(): (country: string) => void {
  const { setCountry } = useTenantContext();
  return setCountry;
}

/**
 * Get trace ID for request tracking
 */
export function useTraceId(): string {
  const { traceId } = useTenantContext();
  return traceId;
}

/**
 * Get tenant branding information
 */
export function useTenantBranding(): TenantConfig['branding'] {
  const { tenant } = useTenantContext();
  return tenant.branding;
}

/**
 * Get tenant theme configuration
 */
export function useTenantTheme(): TenantConfig['theme'] {
  const { tenant } = useTenantContext();
  return tenant.theme;
}

/**
 * Get supported locales for current tenant
 */
export function useSupportedLocales(): string[] {
  const { tenant } = useTenantContext();
  return tenant.supportedLocales;
}

/**
 * Check if a locale is supported by current tenant
 */
export function useIsLocaleSupported(locale: string): boolean {
  const supportedLocales = useSupportedLocales();
  return supportedLocales.includes(locale.toLowerCase());
}

// ============================================================================
// Composite Hooks
// ============================================================================

/**
 * Get all locale-related values at once
 */
export function useLocaleContext() {
  const context = useTenantContext();

  return useMemo(
    () => ({
      locale: context.locale,
      country: context.country,
      currency: context.currency,
      direction: context.direction,
      supportedLocales: context.tenant.supportedLocales,
      setLocale: context.setLocale,
      setCountry: context.setCountry,
      setCurrency: context.setCurrency,
    }),
    [context]
  );
}

/**
 * Get regional settings (country, currency, locale)
 */
export function useRegionalSettings() {
  const context = useTenantContext();

  return useMemo(
    () => ({
      country: context.country,
      currency: context.currency,
      locale: context.locale,
      direction: context.direction,
      setCountry: context.setCountry,
      setCurrency: context.setCurrency,
      setLocale: context.setLocale,
    }),
    [context]
  );
}
