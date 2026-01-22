/**
 * Consent Management for GDPR/CCPA compliance
 * Manages user consent preferences for analytics and marketing
 */

import { type ConsentSettings } from './config';

// Re-export ConsentSettings for other modules
export type { ConsentSettings };
import { updateConsent as updateGAConsent } from './google-analytics';
import { fbGrantConsent, fbRevokeConsent } from './facebook-pixel';

const CONSENT_STORAGE_KEY = 'broxiva_consent';
const CONSENT_TIMESTAMP_KEY = 'broxiva_consent_timestamp';
const CONSENT_VERSION = '1.0';

export interface StoredConsent {
  version: string;
  timestamp: number;
  settings: ConsentSettings;
  gpcEnabled?: boolean; // Global Privacy Control
}

// Get stored consent from localStorage
export function getStoredConsent(): StoredConsent | null {
  if (typeof window === 'undefined') return null;

  try {
    const stored = localStorage.getItem(CONSENT_STORAGE_KEY);
    if (!stored) return null;

    const consent = JSON.parse(stored) as StoredConsent;

    // Check if consent version matches
    if (consent.version !== CONSENT_VERSION) {
      return null; // Re-prompt on version change
    }

    return consent;
  } catch {
    return null;
  }
}

// Save consent to localStorage
export function saveConsent(settings: ConsentSettings): void {
  if (typeof window === 'undefined') return;

  const consent: StoredConsent = {
    version: CONSENT_VERSION,
    timestamp: Date.now(),
    settings,
    gpcEnabled: hasGlobalPrivacyControl(),
  };

  localStorage.setItem(CONSENT_STORAGE_KEY, JSON.stringify(consent));
  localStorage.setItem(CONSENT_TIMESTAMP_KEY, Date.now().toString());

  // Apply consent to all platforms
  applyConsentToAllPlatforms(settings);
}

// Check if user has made consent choice
export function hasConsentChoice(): boolean {
  return getStoredConsent() !== null;
}

// Check Global Privacy Control signal
export function hasGlobalPrivacyControl(): boolean {
  if (typeof navigator === 'undefined') return false;
  return (navigator as any).globalPrivacyControl === true;
}

// Check Do Not Track signal
export function hasDoNotTrack(): boolean {
  if (typeof navigator === 'undefined') return false;
  return navigator.doNotTrack === '1' || (window as any).doNotTrack === '1';
}

// Get default consent based on privacy signals
export function getDefaultConsent(): ConsentSettings {
  const gpc = hasGlobalPrivacyControl();
  const dnt = hasDoNotTrack();

  // If GPC or DNT is enabled, default to no consent for marketing
  if (gpc || dnt) {
    return {
      necessary: true,
      analytics: false,
      marketing: false,
      personalization: false,
    };
  }

  return {
    necessary: true,
    analytics: false,
    marketing: false,
    personalization: false,
  };
}

// Apply consent settings to all platforms
export function applyConsentToAllPlatforms(settings: ConsentSettings): void {
  // Google Analytics consent
  updateGAConsent(
    settings.analytics ? 'granted' : 'denied',
    settings.marketing ? 'granted' : 'denied'
  );

  // Facebook Pixel consent
  if (settings.marketing) {
    fbGrantConsent();
  } else {
    fbRevokeConsent();
  }

  // Dispatch custom event for other integrations
  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent('consentUpdated', { detail: settings })
    );
  }
}

// Accept all consent categories
export function acceptAllConsent(): ConsentSettings {
  const settings: ConsentSettings = {
    necessary: true,
    analytics: true,
    marketing: true,
    personalization: true,
  };

  saveConsent(settings);
  return settings;
}

// Reject all optional consent categories
export function rejectAllConsent(): ConsentSettings {
  const settings: ConsentSettings = {
    necessary: true,
    analytics: false,
    marketing: false,
    personalization: false,
  };

  saveConsent(settings);
  return settings;
}

// Update specific consent category
export function updateConsentCategory(
  category: keyof ConsentSettings,
  value: boolean
): ConsentSettings {
  const current = getStoredConsent()?.settings ?? getDefaultConsent();

  // Necessary consent cannot be disabled
  if (category === 'necessary') {
    return current;
  }

  const updated: ConsentSettings = {
    ...current,
    [category]: value,
  };

  saveConsent(updated);
  return updated;
}

// Get current consent settings
export function getCurrentConsent(): ConsentSettings {
  const stored = getStoredConsent();
  return stored?.settings ?? getDefaultConsent();
}

// Check if specific consent is granted
export function hasConsent(category: keyof ConsentSettings): boolean {
  const consent = getCurrentConsent();
  return consent[category];
}

// Check if analytics consent is granted
export function hasAnalyticsConsent(): boolean {
  return hasConsent('analytics');
}

// Check if marketing consent is granted
export function hasMarketingConsent(): boolean {
  return hasConsent('marketing');
}

// Check if personalization consent is granted
export function hasPersonalizationConsent(): boolean {
  return hasConsent('personalization');
}

// Clear all consent data
export function clearConsent(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(CONSENT_STORAGE_KEY);
  localStorage.removeItem(CONSENT_TIMESTAMP_KEY);
}

// Get consent age in days
export function getConsentAge(): number | null {
  const consent = getStoredConsent();
  if (!consent) return null;

  const now = Date.now();
  const age = now - consent.timestamp;
  return Math.floor(age / (1000 * 60 * 60 * 24));
}

// Check if consent should be refreshed (e.g., after 365 days)
export function shouldRefreshConsent(maxAgeDays: number = 365): boolean {
  const age = getConsentAge();
  if (age === null) return true;
  return age > maxAgeDays;
}

// Initialize consent on page load
export function initializeConsent(): ConsentSettings {
  const stored = getStoredConsent();

  if (stored && !shouldRefreshConsent()) {
    applyConsentToAllPlatforms(stored.settings);
    return stored.settings;
  }

  // Return default (no consent granted)
  const defaults = getDefaultConsent();
  applyConsentToAllPlatforms(defaults);
  return defaults;
}

// Export consent data for GDPR data export requests
export function exportConsentData(): {
  consent: StoredConsent | null;
  gpcEnabled: boolean;
  dntEnabled: boolean;
} {
  return {
    consent: getStoredConsent(),
    gpcEnabled: hasGlobalPrivacyControl(),
    dntEnabled: hasDoNotTrack(),
  };
}
