'use client';

/**
 * Tenant Provider
 *
 * React context provider for tenant configuration
 * and related state management
 */

import React, { createContext, useContext, useMemo, useCallback, useState } from 'react';
import type { TenantConfig, TenantFeatures } from './tenant-context';

// ============================================================================
// Types
// ============================================================================

export interface TenantContextValue {
  tenant: TenantConfig;
  locale: string;
  country: string;
  currency: string;
  traceId: string;
  direction: 'ltr' | 'rtl';
  isFeatureEnabled: (feature: keyof TenantFeatures) => boolean;
  setLocale: (locale: string) => void;
  setCurrency: (currency: string) => void;
  setCountry: (country: string) => void;
}

export interface TenantProviderProps {
  children: React.ReactNode;
  initialTenant: TenantConfig;
  initialLocale: string;
  initialCountry: string;
  initialCurrency: string;
  initialTraceId?: string;
  initialDirection?: 'ltr' | 'rtl';
}

// ============================================================================
// Context
// ============================================================================

const TenantContext = createContext<TenantContextValue | null>(null);

// ============================================================================
// Cookie Helpers
// ============================================================================

function setCookie(name: string, value: string, days: number = 365): void {
  if (typeof document === 'undefined') return;

  const expires = new Date();
  expires.setTime(expires.getTime() + days * 24 * 60 * 60 * 1000);

  document.cookie = `${name}=${value};expires=${expires.toUTCString()};path=/;SameSite=Lax`;
}

// ============================================================================
// Provider Component
// ============================================================================

export function TenantProvider({
  children,
  initialTenant,
  initialLocale,
  initialCountry,
  initialCurrency,
  initialTraceId = '',
  initialDirection = 'ltr',
}: TenantProviderProps) {
  const [locale, setLocaleState] = useState(initialLocale);
  const [country, setCountryState] = useState(initialCountry);
  const [currency, setCurrencyState] = useState(initialCurrency);

  // ============================================================================
  // Setters with Cookie Sync
  // ============================================================================

  const setLocale = useCallback((newLocale: string) => {
    setLocaleState(newLocale);
    setCookie('bx_lang', newLocale);

    // Redirect to new locale URL
    if (typeof window !== 'undefined') {
      const currentPath = window.location.pathname;
      const segments = currentPath.split('/').filter(Boolean);

      // Remove existing locale if present
      if (segments[0] && isValidLocale(segments[0])) {
        segments.shift();
      }

      // Build new URL with locale
      const newPath = `/${newLocale}/${segments.join('/')}`;
      window.location.href = newPath;
    }
  }, []);

  const setCurrency = useCallback((newCurrency: string) => {
    setCurrencyState(newCurrency);
    setCookie('bx_currency', newCurrency);
  }, []);

  const setCountry = useCallback((newCountry: string) => {
    setCountryState(newCountry);
    setCookie('bx_country', newCountry);
  }, []);

  // ============================================================================
  // Feature Check
  // ============================================================================

  const isFeatureEnabled = useCallback(
    (feature: keyof TenantFeatures): boolean => {
      return initialTenant.features?.[feature] === true;
    },
    [initialTenant.features]
  );

  // ============================================================================
  // Context Value
  // ============================================================================

  const contextValue = useMemo<TenantContextValue>(
    () => ({
      tenant: initialTenant,
      locale,
      country,
      currency,
      traceId: initialTraceId,
      direction: initialDirection,
      isFeatureEnabled,
      setLocale,
      setCurrency,
      setCountry,
    }),
    [
      initialTenant,
      locale,
      country,
      currency,
      initialTraceId,
      initialDirection,
      isFeatureEnabled,
      setLocale,
      setCurrency,
      setCountry,
    ]
  );

  return <TenantContext.Provider value={contextValue}>{children}</TenantContext.Provider>;
}

// ============================================================================
// Hook
// ============================================================================

export function useTenantContext(): TenantContextValue {
  const context = useContext(TenantContext);

  if (!context) {
    throw new Error('useTenantContext must be used within a TenantProvider');
  }

  return context;
}

// ============================================================================
// Utilities
// ============================================================================

const VALID_LOCALES = [
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
];

function isValidLocale(locale: string): boolean {
  return VALID_LOCALES.includes(locale.toLowerCase());
}

// ============================================================================
// Export Types
// ============================================================================

export type { TenantConfig, TenantFeatures } from './tenant-context';
