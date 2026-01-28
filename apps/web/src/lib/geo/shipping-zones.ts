/**
 * Shipping Zones
 *
 * Regional shipping availability and zone configuration
 */

// ============================================================================
// Types
// ============================================================================

export interface ShippingZone {
  id: string;
  name: string;
  countries: string[];
  region: string;
  estimatedDays: {
    min: number;
    max: number;
  };
  shippingMethods: ShippingMethod[];
  restrictions?: ShippingRestriction[];
}

export interface ShippingMethod {
  id: string;
  name: string;
  carrier: string;
  estimatedDays: {
    min: number;
    max: number;
  };
  basePrice: number;
  currency: string;
  freeThreshold?: number;
  maxWeight?: number; // in kg
  maxDimensions?: {
    length: number;
    width: number;
    height: number;
  }; // in cm
  tracking: boolean;
  insurance: boolean;
}

export interface ShippingRestriction {
  type: 'category' | 'product' | 'weight' | 'value';
  value: string | number;
  message: string;
}

export interface ShippingAvailability {
  available: boolean;
  zone: ShippingZone | null;
  methods: ShippingMethod[];
  restrictions: ShippingRestriction[];
  estimatedDelivery: {
    min: number;
    max: number;
  } | null;
}

// ============================================================================
// Shipping Zones Configuration
// ============================================================================

export const SHIPPING_ZONES: ShippingZone[] = [
  {
    id: 'domestic-us',
    name: 'United States (Domestic)',
    countries: ['US'],
    region: 'North America',
    estimatedDays: { min: 2, max: 7 },
    shippingMethods: [
      {
        id: 'us-standard',
        name: 'Standard Shipping',
        carrier: 'USPS',
        estimatedDays: { min: 5, max: 7 },
        basePrice: 5.99,
        currency: 'USD',
        freeThreshold: 50,
        maxWeight: 30,
        tracking: true,
        insurance: false,
      },
      {
        id: 'us-express',
        name: 'Express Shipping',
        carrier: 'UPS',
        estimatedDays: { min: 2, max: 3 },
        basePrice: 12.99,
        currency: 'USD',
        freeThreshold: 100,
        maxWeight: 30,
        tracking: true,
        insurance: true,
      },
      {
        id: 'us-overnight',
        name: 'Overnight Delivery',
        carrier: 'FedEx',
        estimatedDays: { min: 1, max: 1 },
        basePrice: 24.99,
        currency: 'USD',
        maxWeight: 20,
        tracking: true,
        insurance: true,
      },
    ],
  },
  {
    id: 'domestic-uk',
    name: 'United Kingdom (Domestic)',
    countries: ['GB'],
    region: 'Europe',
    estimatedDays: { min: 1, max: 5 },
    shippingMethods: [
      {
        id: 'uk-standard',
        name: 'Royal Mail Standard',
        carrier: 'Royal Mail',
        estimatedDays: { min: 3, max: 5 },
        basePrice: 3.99,
        currency: 'GBP',
        freeThreshold: 35,
        maxWeight: 25,
        tracking: true,
        insurance: false,
      },
      {
        id: 'uk-express',
        name: 'Royal Mail Tracked 24',
        carrier: 'Royal Mail',
        estimatedDays: { min: 1, max: 2 },
        basePrice: 7.99,
        currency: 'GBP',
        freeThreshold: 75,
        maxWeight: 25,
        tracking: true,
        insurance: true,
      },
    ],
  },
  {
    id: 'europe',
    name: 'Europe',
    countries: [
      'DE',
      'FR',
      'IT',
      'ES',
      'NL',
      'BE',
      'AT',
      'PT',
      'IE',
      'FI',
      'GR',
      'SE',
      'NO',
      'DK',
      'PL',
      'CZ',
      'CH',
    ],
    region: 'Europe',
    estimatedDays: { min: 5, max: 14 },
    shippingMethods: [
      {
        id: 'eu-standard',
        name: 'Standard International',
        carrier: 'DHL',
        estimatedDays: { min: 7, max: 14 },
        basePrice: 14.99,
        currency: 'EUR',
        freeThreshold: 100,
        maxWeight: 30,
        tracking: true,
        insurance: false,
      },
      {
        id: 'eu-express',
        name: 'Express International',
        carrier: 'DHL Express',
        estimatedDays: { min: 3, max: 5 },
        basePrice: 29.99,
        currency: 'EUR',
        freeThreshold: 200,
        maxWeight: 30,
        tracking: true,
        insurance: true,
      },
    ],
    restrictions: [
      {
        type: 'category',
        value: 'electronics-batteries',
        message: 'Lithium batteries require special handling and may incur additional fees',
      },
    ],
  },
  {
    id: 'africa-west',
    name: 'West Africa',
    countries: ['NG', 'GH', 'CI', 'SN', 'CM'],
    region: 'Africa',
    estimatedDays: { min: 10, max: 21 },
    shippingMethods: [
      {
        id: 'africa-west-standard',
        name: 'Standard Shipping',
        carrier: 'DHL',
        estimatedDays: { min: 14, max: 21 },
        basePrice: 29.99,
        currency: 'USD',
        maxWeight: 30,
        tracking: true,
        insurance: false,
      },
      {
        id: 'africa-west-express',
        name: 'Express Shipping',
        carrier: 'DHL Express',
        estimatedDays: { min: 5, max: 10 },
        basePrice: 59.99,
        currency: 'USD',
        maxWeight: 30,
        tracking: true,
        insurance: true,
      },
    ],
    restrictions: [
      {
        type: 'value',
        value: 500,
        message: 'Orders over $500 may require customs documentation',
      },
    ],
  },
  {
    id: 'africa-east',
    name: 'East Africa',
    countries: ['KE', 'TZ', 'UG', 'RW', 'ET'],
    region: 'Africa',
    estimatedDays: { min: 10, max: 21 },
    shippingMethods: [
      {
        id: 'africa-east-standard',
        name: 'Standard Shipping',
        carrier: 'DHL',
        estimatedDays: { min: 14, max: 21 },
        basePrice: 34.99,
        currency: 'USD',
        maxWeight: 30,
        tracking: true,
        insurance: false,
      },
      {
        id: 'africa-east-express',
        name: 'Express Shipping',
        carrier: 'DHL Express',
        estimatedDays: { min: 5, max: 10 },
        basePrice: 64.99,
        currency: 'USD',
        maxWeight: 30,
        tracking: true,
        insurance: true,
      },
    ],
  },
  {
    id: 'africa-south',
    name: 'Southern Africa',
    countries: ['ZA', 'NA', 'BW', 'ZM', 'ZW'],
    region: 'Africa',
    estimatedDays: { min: 7, max: 14 },
    shippingMethods: [
      {
        id: 'africa-south-standard',
        name: 'Standard Shipping',
        carrier: 'FedEx',
        estimatedDays: { min: 10, max: 14 },
        basePrice: 24.99,
        currency: 'USD',
        maxWeight: 30,
        tracking: true,
        insurance: false,
      },
      {
        id: 'africa-south-express',
        name: 'Express Shipping',
        carrier: 'FedEx Express',
        estimatedDays: { min: 3, max: 7 },
        basePrice: 49.99,
        currency: 'USD',
        maxWeight: 30,
        tracking: true,
        insurance: true,
      },
    ],
  },
  {
    id: 'asia-east',
    name: 'East Asia',
    countries: ['JP', 'CN', 'KR', 'HK', 'TW'],
    region: 'Asia',
    estimatedDays: { min: 5, max: 14 },
    shippingMethods: [
      {
        id: 'asia-east-standard',
        name: 'Standard Shipping',
        carrier: 'SF Express',
        estimatedDays: { min: 10, max: 14 },
        basePrice: 19.99,
        currency: 'USD',
        maxWeight: 30,
        tracking: true,
        insurance: false,
      },
      {
        id: 'asia-east-express',
        name: 'Express Shipping',
        carrier: 'DHL Express',
        estimatedDays: { min: 3, max: 5 },
        basePrice: 39.99,
        currency: 'USD',
        maxWeight: 30,
        tracking: true,
        insurance: true,
      },
    ],
  },
  {
    id: 'middle-east',
    name: 'Middle East',
    countries: ['AE', 'SA', 'QA', 'KW', 'BH', 'OM', 'JO'],
    region: 'Middle East',
    estimatedDays: { min: 5, max: 10 },
    shippingMethods: [
      {
        id: 'me-standard',
        name: 'Standard Shipping',
        carrier: 'Aramex',
        estimatedDays: { min: 7, max: 10 },
        basePrice: 19.99,
        currency: 'USD',
        maxWeight: 30,
        tracking: true,
        insurance: false,
      },
      {
        id: 'me-express',
        name: 'Express Shipping',
        carrier: 'DHL Express',
        estimatedDays: { min: 3, max: 5 },
        basePrice: 34.99,
        currency: 'USD',
        maxWeight: 30,
        tracking: true,
        insurance: true,
      },
    ],
  },
  {
    id: 'south-america',
    name: 'South America',
    countries: ['BR', 'AR', 'CO', 'CL', 'PE', 'VE', 'EC'],
    region: 'South America',
    estimatedDays: { min: 10, max: 21 },
    shippingMethods: [
      {
        id: 'sa-standard',
        name: 'Standard Shipping',
        carrier: 'Correios',
        estimatedDays: { min: 14, max: 21 },
        basePrice: 24.99,
        currency: 'USD',
        maxWeight: 30,
        tracking: true,
        insurance: false,
      },
      {
        id: 'sa-express',
        name: 'Express Shipping',
        carrier: 'FedEx',
        estimatedDays: { min: 5, max: 10 },
        basePrice: 49.99,
        currency: 'USD',
        maxWeight: 30,
        tracking: true,
        insurance: true,
      },
    ],
    restrictions: [
      {
        type: 'value',
        value: 200,
        message: 'Orders over $200 may be subject to import duties',
      },
    ],
  },
  {
    id: 'oceania',
    name: 'Oceania',
    countries: ['AU', 'NZ', 'FJ'],
    region: 'Oceania',
    estimatedDays: { min: 7, max: 14 },
    shippingMethods: [
      {
        id: 'oceania-standard',
        name: 'Standard Shipping',
        carrier: 'Australia Post',
        estimatedDays: { min: 10, max: 14 },
        basePrice: 19.99,
        currency: 'USD',
        freeThreshold: 100,
        maxWeight: 30,
        tracking: true,
        insurance: false,
      },
      {
        id: 'oceania-express',
        name: 'Express Shipping',
        carrier: 'DHL Express',
        estimatedDays: { min: 3, max: 7 },
        basePrice: 39.99,
        currency: 'USD',
        maxWeight: 30,
        tracking: true,
        insurance: true,
      },
    ],
  },
];

// ============================================================================
// Shipping Zone Functions
// ============================================================================

/**
 * Get shipping zone for a country
 */
export function getShippingZone(countryCode: string): ShippingZone | null {
  const normalizedCode = countryCode.toUpperCase();

  for (const zone of SHIPPING_ZONES) {
    if (zone.countries.includes(normalizedCode)) {
      return zone;
    }
  }

  return null;
}

/**
 * Check shipping availability for a country
 */
export function checkShippingAvailability(countryCode: string): ShippingAvailability {
  const zone = getShippingZone(countryCode);

  if (!zone) {
    return {
      available: false,
      zone: null,
      methods: [],
      restrictions: [],
      estimatedDelivery: null,
    };
  }

  return {
    available: true,
    zone,
    methods: zone.shippingMethods,
    restrictions: zone.restrictions || [],
    estimatedDelivery: zone.estimatedDays,
  };
}

/**
 * Get shipping methods for a country
 */
export function getShippingMethods(countryCode: string): ShippingMethod[] {
  const zone = getShippingZone(countryCode);
  return zone?.shippingMethods || [];
}

/**
 * Get cheapest shipping method for a country
 */
export function getCheapestShippingMethod(countryCode: string): ShippingMethod | null {
  const methods = getShippingMethods(countryCode);
  if (methods.length === 0) return null;

  return methods.reduce((cheapest, method) =>
    method.basePrice < cheapest.basePrice ? method : cheapest
  );
}

/**
 * Get fastest shipping method for a country
 */
export function getFastestShippingMethod(countryCode: string): ShippingMethod | null {
  const methods = getShippingMethods(countryCode);
  if (methods.length === 0) return null;

  return methods.reduce((fastest, method) =>
    method.estimatedDays.max < fastest.estimatedDays.max ? method : fastest
  );
}

/**
 * Check if free shipping is available
 */
export function isFreeShippingAvailable(
  countryCode: string,
  orderTotal: number
): { available: boolean; method: ShippingMethod | null } {
  const methods = getShippingMethods(countryCode);

  for (const method of methods) {
    if (method.freeThreshold && orderTotal >= method.freeThreshold) {
      return { available: true, method };
    }
  }

  return { available: false, method: null };
}

/**
 * Get all shipping zones
 */
export function getAllShippingZones(): ShippingZone[] {
  return SHIPPING_ZONES;
}

/**
 * Get zones by region
 */
export function getZonesByRegion(region: string): ShippingZone[] {
  return SHIPPING_ZONES.filter(
    (zone) => zone.region.toLowerCase() === region.toLowerCase()
  );
}

/**
 * Get all countries with shipping
 */
export function getShippingCountries(): string[] {
  const countries = new Set<string>();
  for (const zone of SHIPPING_ZONES) {
    for (const country of zone.countries) {
      countries.add(country);
    }
  }
  return Array.from(countries);
}

/**
 * Check if country is shippable
 */
export function isCountryShippable(countryCode: string): boolean {
  return getShippingZone(countryCode) !== null;
}

/**
 * Calculate shipping cost
 */
export function calculateShippingCost(
  method: ShippingMethod,
  orderTotal: number,
  weight?: number
): number {
  // Check for free shipping
  if (method.freeThreshold && orderTotal >= method.freeThreshold) {
    return 0;
  }

  // Base price calculation
  let cost = method.basePrice;

  // Weight-based surcharge (example: $2 per kg over 5kg)
  if (weight && weight > 5 && method.maxWeight) {
    const overweight = Math.min(weight - 5, method.maxWeight - 5);
    cost += overweight * 2;
  }

  return cost;
}

/**
 * Get estimated delivery date range
 */
export function getEstimatedDeliveryRange(
  method: ShippingMethod,
  orderDate: Date = new Date()
): { earliest: Date; latest: Date } {
  const earliest = new Date(orderDate);
  earliest.setDate(earliest.getDate() + method.estimatedDays.min);

  const latest = new Date(orderDate);
  latest.setDate(latest.getDate() + method.estimatedDays.max);

  return { earliest, latest };
}

/**
 * Format delivery estimate as string
 */
export function formatDeliveryEstimate(
  method: ShippingMethod,
  locale: string = 'en-US'
): string {
  const range = getEstimatedDeliveryRange(method);

  const formatter = new Intl.DateTimeFormat(locale, {
    month: 'short',
    day: 'numeric',
  });

  if (method.estimatedDays.min === method.estimatedDays.max) {
    return formatter.format(range.earliest);
  }

  return `${formatter.format(range.earliest)} - ${formatter.format(range.latest)}`;
}
