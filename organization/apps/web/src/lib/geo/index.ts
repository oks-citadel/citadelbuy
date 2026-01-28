/**
 * Geo Module Exports
 */

// Country Detection
export {
  COUNTRIES,
  getGeoContext,
  getCountryCode,
  getCountryInfo,
  getCountryByCode,
  getAllCountries,
  getCountriesByContinent,
  getCountriesByRegion,
  getCountriesByLanguage,
  isValidCountry,
  getCountryCallingCode,
  getCountryFlag,
  getPopularCountries,
  searchCountries,
  type CountryInfo,
  type GeoContext,
} from './country-detection';

// Currency Resolver
export {
  getCurrencyContext,
  getCurrencyCode,
  getCurrencyInfo,
  isValidCurrency,
  getCurrencyForCountry,
  getCurrencyByCode,
  getAllCurrencies,
  getPopularCurrencies,
  getCurrenciesByRegion,
  formatPrice,
  formatPriceRange,
  calculateDiscount,
  formatDiscount,
  getCachedExchangeRates,
  convertCurrency,
  getExchangeRate,
  type CurrencyContext,
  type ExchangeRate,
} from './currency-resolver';

// Shipping Zones
export {
  SHIPPING_ZONES,
  getShippingZone,
  checkShippingAvailability,
  getShippingMethods,
  getCheapestShippingMethod,
  getFastestShippingMethod,
  isFreeShippingAvailable,
  getAllShippingZones,
  getZonesByRegion,
  getShippingCountries,
  isCountryShippable,
  calculateShippingCost,
  getEstimatedDeliveryRange,
  formatDeliveryEstimate,
  type ShippingZone,
  type ShippingMethod,
  type ShippingRestriction,
  type ShippingAvailability,
} from './shipping-zones';
