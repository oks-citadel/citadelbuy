/**
 * Type augmentations for Facebook Business SDK
 *
 * The official @types/facebook-nodejs-business-sdk package may be outdated
 * compared to the actual SDK version. This module provides type-safe wrappers
 * and extensions for methods that exist in the SDK but not in the type definitions.
 *
 * @see https://developers.facebook.com/docs/marketing-api/conversions-api/
 */

import { UserData, CustomData } from 'facebook-nodejs-business-sdk';

/**
 * Extended UserData interface with additional methods available in SDK v24+
 * These methods exist at runtime but may not be present in older type definitions.
 */
export interface ExtendedUserData {
  setZipCode?(zipCodes: string[]): unknown;
  setZipCodes?(zipCodes: string[]): unknown;
  setCountry?(countries: string[]): unknown;
  setCountries?(countries: string[]): unknown;
}

/**
 * Extended CustomData interface with additional methods available in SDK v24+
 */
export interface ExtendedCustomData {
  setCustomProperties?(key: string, value: unknown): unknown;
}

/**
 * Type-safe wrapper to set zip code on UserData
 * Handles both the singular and plural method names that have existed across SDK versions
 */
export function setUserDataZipCode(userData: UserData, hashedZipCodes: string[]): void {
  const extendedUserData = userData as unknown as ExtendedUserData;
  if (typeof extendedUserData.setZipCodes === 'function') {
    extendedUserData.setZipCodes(hashedZipCodes);
  } else if (typeof extendedUserData.setZipCode === 'function') {
    extendedUserData.setZipCode(hashedZipCodes);
  } else {
    // Fallback: directly set the property if method doesn't exist
    // The SDK will serialize this correctly in the API request
    (userData as unknown as Record<string, unknown>)['zp'] = hashedZipCodes;
  }
}

/**
 * Type-safe wrapper to set country on UserData
 * Handles both the singular and plural method names that have existed across SDK versions
 */
export function setUserDataCountry(userData: UserData, hashedCountries: string[]): void {
  const extendedUserData = userData as unknown as ExtendedUserData;
  if (typeof extendedUserData.setCountries === 'function') {
    extendedUserData.setCountries(hashedCountries);
  } else if (typeof extendedUserData.setCountry === 'function') {
    extendedUserData.setCountry(hashedCountries);
  } else {
    // Fallback: directly set the property if method doesn't exist
    (userData as unknown as Record<string, unknown>)['country'] = hashedCountries;
  }
}

/**
 * Type-safe wrapper to set custom properties on CustomData
 */
export function setCustomDataProperty(customData: CustomData, key: string, value: unknown): void {
  const extendedCustomData = customData as unknown as ExtendedCustomData;
  if (typeof extendedCustomData.setCustomProperties === 'function') {
    extendedCustomData.setCustomProperties(key, value);
  } else {
    // Fallback: add to custom_data object directly
    const customDataAny = customData as unknown as Record<string, unknown>;
    if (!customDataAny['custom_data']) {
      customDataAny['custom_data'] = {};
    }
    (customDataAny['custom_data'] as Record<string, unknown>)[key] = value;
  }
}
