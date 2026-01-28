/**
 * Tenant Module Exports
 */

// Server-side context
export {
  getTenantContext,
  getTenantById,
  getTenantByDomain,
  getAllTenants,
  isTenantLocaleSupported,
  getTenantDefaultLocale,
  isTenantFeatureEnabled,
  type TenantConfig,
  type TenantTheme,
  type TenantFeatures,
  type TenantBranding,
  type TenantContext,
} from './tenant-context';

// Client-side provider
export { TenantProvider, useTenantContext, type TenantContextValue, type TenantProviderProps } from './tenant-provider';

// Client-side hooks
export {
  useTenant,
  useTenantConfig,
  useLocale,
  useCountry,
  useCurrency,
  useDirection,
  useFeatureEnabled,
  useEnabledFeatures,
  useSetLocale,
  useSetCurrency,
  useSetCountry,
  useTraceId,
  useTenantBranding,
  useTenantTheme,
  useSupportedLocales,
  useIsLocaleSupported,
  useLocaleContext,
  useRegionalSettings,
} from './use-tenant';
