'use client';

/**
 * Shipping Badge Component
 * Shows shipping availability and delivery estimates for user's country
 */

import { useState, useEffect } from 'react';
import { Truck, Clock, AlertCircle, CheckCircle, XCircle, Globe } from 'lucide-react';
import { cn } from '@/lib/utils';

export type ShippingStatus = 'available' | 'limited' | 'unavailable' | 'unknown';

export interface ShippingInfo {
  status: ShippingStatus;
  countryCode: string;
  countryName: string;
  estimatedDays?: {
    min: number;
    max: number;
  };
  shippingCost?: {
    amount: number;
    currency: string;
    isFree?: boolean;
  };
  message?: string;
  restrictions?: string[];
}

export interface ShippingBadgeProps {
  /**
   * Product ID for fetching shipping info
   */
  productId?: string;
  /**
   * Pre-computed shipping info
   */
  shippingInfo?: ShippingInfo;
  /**
   * User's country code (ISO 3166-1 alpha-2)
   */
  countryCode?: string;
  /**
   * Vendor's shipping zones
   */
  shippingZones?: Array<{
    countries: string[];
    estimatedDays: { min: number; max: number };
    shippingCost?: number;
    currency?: string;
  }>;
  /**
   * Countries the product doesn't ship to
   */
  excludedCountries?: string[];
  /**
   * Show compact version
   */
  compact?: boolean;
  /**
   * Additional CSS classes
   */
  className?: string;
  /**
   * Show delivery estimate
   */
  showDeliveryEstimate?: boolean;
  /**
   * Show shipping cost
   */
  showShippingCost?: boolean;
}

// Country names mapping
const COUNTRY_NAMES: Record<string, string> = {
  US: 'United States',
  GB: 'United Kingdom',
  CA: 'Canada',
  AU: 'Australia',
  DE: 'Germany',
  FR: 'France',
  ES: 'Spain',
  IT: 'Italy',
  NL: 'Netherlands',
  BE: 'Belgium',
  AT: 'Austria',
  CH: 'Switzerland',
  SE: 'Sweden',
  NO: 'Norway',
  DK: 'Denmark',
  FI: 'Finland',
  PL: 'Poland',
  PT: 'Portugal',
  IE: 'Ireland',
  JP: 'Japan',
  KR: 'South Korea',
  CN: 'China',
  HK: 'Hong Kong',
  SG: 'Singapore',
  MY: 'Malaysia',
  TH: 'Thailand',
  ID: 'Indonesia',
  PH: 'Philippines',
  VN: 'Vietnam',
  IN: 'India',
  AE: 'United Arab Emirates',
  SA: 'Saudi Arabia',
  EG: 'Egypt',
  ZA: 'South Africa',
  NG: 'Nigeria',
  KE: 'Kenya',
  GH: 'Ghana',
  MA: 'Morocco',
  BR: 'Brazil',
  MX: 'Mexico',
  AR: 'Argentina',
  CL: 'Chile',
  CO: 'Colombia',
  PE: 'Peru',
  NZ: 'New Zealand',
};

/**
 * Get shipping status from shipping zones
 */
function getShippingStatus(
  countryCode: string,
  shippingZones?: ShippingBadgeProps['shippingZones'],
  excludedCountries?: string[]
): ShippingInfo {
  const countryName = COUNTRY_NAMES[countryCode] || countryCode;

  // Check if excluded
  if (excludedCountries?.includes(countryCode)) {
    return {
      status: 'unavailable',
      countryCode,
      countryName,
      message: `This product doesn't ship to ${countryName}`,
    };
  }

  // Find matching shipping zone
  if (shippingZones) {
    for (const zone of shippingZones) {
      if (zone.countries.includes(countryCode) || zone.countries.includes('*')) {
        const isFree = !zone.shippingCost || zone.shippingCost === 0;
        return {
          status: 'available',
          countryCode,
          countryName,
          estimatedDays: zone.estimatedDays,
          shippingCost: zone.shippingCost !== undefined
            ? {
                amount: zone.shippingCost,
                currency: zone.currency || 'USD',
                isFree,
              }
            : undefined,
          message: isFree
            ? `Free shipping to ${countryName}`
            : `Ships to ${countryName}`,
        };
      }
    }

    // Not in any zone - limited or unavailable
    return {
      status: 'limited',
      countryCode,
      countryName,
      message: `Limited shipping options to ${countryName}`,
    };
  }

  // No zones defined - unknown
  return {
    status: 'unknown',
    countryCode,
    countryName,
    message: 'Check shipping availability',
  };
}

/**
 * Format delivery estimate
 */
function formatDeliveryEstimate(days: { min: number; max: number }): string {
  if (days.min === days.max) {
    return `${days.min} day${days.min !== 1 ? 's' : ''}`;
  }
  return `${days.min}-${days.max} days`;
}

/**
 * Format shipping cost
 */
function formatShippingCost(cost: ShippingInfo['shippingCost']): string {
  if (!cost) return '';
  if (cost.isFree) return 'Free';

  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: cost.currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(cost.amount);
}

/**
 * ShippingBadge component
 *
 * @example
 * // With pre-computed shipping info
 * <ShippingBadge
 *   shippingInfo={{
 *     status: 'available',
 *     countryCode: 'US',
 *     countryName: 'United States',
 *     estimatedDays: { min: 5, max: 7 },
 *     shippingCost: { amount: 0, currency: 'USD', isFree: true }
 *   }}
 * />
 *
 * @example
 * // With shipping zones
 * <ShippingBadge
 *   countryCode="US"
 *   shippingZones={[
 *     { countries: ['US', 'CA'], estimatedDays: { min: 3, max: 5 }, shippingCost: 0 },
 *     { countries: ['GB', 'DE', 'FR'], estimatedDays: { min: 7, max: 14 }, shippingCost: 15 }
 *   ]}
 * />
 */
export function ShippingBadge({
  productId,
  shippingInfo: providedInfo,
  countryCode = 'US',
  shippingZones,
  excludedCountries,
  compact = false,
  className,
  showDeliveryEstimate = true,
  showShippingCost = true,
}: ShippingBadgeProps) {
  const [shippingInfo, setShippingInfo] = useState<ShippingInfo | null>(
    providedInfo || null
  );
  const [isLoading, setIsLoading] = useState(!providedInfo);

  useEffect(() => {
    if (providedInfo) {
      setShippingInfo(providedInfo);
      setIsLoading(false);
      return;
    }

    // Calculate from zones if provided
    if (shippingZones || excludedCountries) {
      const info = getShippingStatus(countryCode, shippingZones, excludedCountries);
      setShippingInfo(info);
      setIsLoading(false);
      return;
    }

    // Fetch from API if product ID provided
    if (productId) {
      setIsLoading(true);
      // Simulate API call - replace with actual API
      const fetchShippingInfo = async () => {
        try {
          // const response = await fetch(`/api/products/${productId}/shipping?country=${countryCode}`);
          // const data = await response.json();
          // setShippingInfo(data);

          // Simulated response
          setShippingInfo({
            status: 'available',
            countryCode,
            countryName: COUNTRY_NAMES[countryCode] || countryCode,
            estimatedDays: { min: 5, max: 10 },
            shippingCost: { amount: 0, currency: 'USD', isFree: true },
          });
        } catch (error) {
          setShippingInfo({
            status: 'unknown',
            countryCode,
            countryName: COUNTRY_NAMES[countryCode] || countryCode,
            message: 'Unable to check shipping',
          });
        } finally {
          setIsLoading(false);
        }
      };
      fetchShippingInfo();
    } else {
      // Default to unknown
      setShippingInfo({
        status: 'unknown',
        countryCode,
        countryName: COUNTRY_NAMES[countryCode] || countryCode,
        message: 'Shipping info unavailable',
      });
      setIsLoading(false);
    }
  }, [productId, countryCode, providedInfo, shippingZones, excludedCountries]);

  if (isLoading) {
    return (
      <div className={cn('animate-pulse flex items-center gap-2', className)}>
        <div className="w-4 h-4 bg-gray-200 rounded" />
        <div className="h-4 bg-gray-200 rounded w-24" />
      </div>
    );
  }

  if (!shippingInfo) {
    return null;
  }

  // Status-specific styles and icons
  const statusConfig = {
    available: {
      bgColor: 'bg-green-50',
      borderColor: 'border-green-200',
      textColor: 'text-green-700',
      iconColor: 'text-green-500',
      Icon: CheckCircle,
    },
    limited: {
      bgColor: 'bg-yellow-50',
      borderColor: 'border-yellow-200',
      textColor: 'text-yellow-700',
      iconColor: 'text-yellow-500',
      Icon: AlertCircle,
    },
    unavailable: {
      bgColor: 'bg-gray-50',
      borderColor: 'border-gray-200',
      textColor: 'text-gray-500',
      iconColor: 'text-gray-400',
      Icon: XCircle,
    },
    unknown: {
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-200',
      textColor: 'text-blue-700',
      iconColor: 'text-blue-500',
      Icon: Globe,
    },
  };

  const config = statusConfig[shippingInfo.status];
  const { Icon } = config;

  // Compact version
  if (compact) {
    return (
      <div
        className={cn(
          'inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium',
          config.bgColor,
          config.textColor,
          className
        )}
      >
        <Icon className={cn('w-3 h-3', config.iconColor)} />
        <span>
          {shippingInfo.status === 'available' && 'Ships to '}
          {shippingInfo.status === 'limited' && 'Limited to '}
          {shippingInfo.status === 'unavailable' && 'No shipping to '}
          {shippingInfo.countryName}
        </span>
      </div>
    );
  }

  // Full version
  return (
    <div
      className={cn(
        'rounded-lg border p-3',
        config.bgColor,
        config.borderColor,
        className
      )}
    >
      <div className="flex items-start gap-3">
        <div className={cn('mt-0.5', config.iconColor)}>
          <Truck className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <Icon className={cn('w-4 h-4', config.iconColor)} />
            <span className={cn('font-medium text-sm', config.textColor)}>
              {shippingInfo.status === 'available' && `Ships to ${shippingInfo.countryName}`}
              {shippingInfo.status === 'limited' && `Limited shipping to ${shippingInfo.countryName}`}
              {shippingInfo.status === 'unavailable' && `Doesn't ship to ${shippingInfo.countryName}`}
              {shippingInfo.status === 'unknown' && 'Check shipping availability'}
            </span>
          </div>

          {/* Delivery estimate */}
          {showDeliveryEstimate && shippingInfo.estimatedDays && (
            <div className="flex items-center gap-1.5 mt-1.5 text-sm text-gray-600">
              <Clock className="w-4 h-4" />
              <span>
                Estimated delivery: {formatDeliveryEstimate(shippingInfo.estimatedDays)}
              </span>
            </div>
          )}

          {/* Shipping cost */}
          {showShippingCost && shippingInfo.shippingCost && (
            <div className="mt-1.5 text-sm">
              {shippingInfo.shippingCost.isFree ? (
                <span className="text-green-600 font-medium">Free Shipping</span>
              ) : (
                <span className="text-gray-600">
                  Shipping: {formatShippingCost(shippingInfo.shippingCost)}
                </span>
              )}
            </div>
          )}

          {/* Restrictions */}
          {shippingInfo.restrictions && shippingInfo.restrictions.length > 0 && (
            <div className="mt-2 text-xs text-gray-500">
              <span className="font-medium">Note: </span>
              {shippingInfo.restrictions.join('. ')}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Shipping availability indicator for product cards
 */
export function ShippingIndicator({
  status,
  countryName,
  className,
}: {
  status: ShippingStatus;
  countryName?: string;
  className?: string;
}) {
  const statusConfig = {
    available: { color: 'bg-green-500', title: `Ships to ${countryName || 'your country'}` },
    limited: { color: 'bg-yellow-500', title: `Limited shipping to ${countryName || 'your country'}` },
    unavailable: { color: 'bg-gray-300', title: `Doesn't ship to ${countryName || 'your country'}` },
    unknown: { color: 'bg-blue-400', title: 'Shipping availability unknown' },
  };

  const config = statusConfig[status];

  return (
    <div
      className={cn('w-2.5 h-2.5 rounded-full', config.color, className)}
      title={config.title}
    />
  );
}

/**
 * Hook for getting user's country from geolocation or IP
 */
export function useUserCountry(): { countryCode: string | null; isLoading: boolean } {
  const [countryCode, setCountryCode] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const detectCountry = async () => {
      try {
        // Try to get from stored preference first
        const stored = localStorage.getItem('user_country');
        if (stored) {
          setCountryCode(stored);
          setIsLoading(false);
          return;
        }

        // Fall back to IP-based detection
        // const response = await fetch('https://ipapi.co/json/');
        // const data = await response.json();
        // setCountryCode(data.country_code);
        // localStorage.setItem('user_country', data.country_code);

        // Default fallback
        setCountryCode('US');
      } catch {
        setCountryCode('US'); // Default to US
      } finally {
        setIsLoading(false);
      }
    };

    detectCountry();
  }, []);

  return { countryCode, isLoading };
}

export default ShippingBadge;
