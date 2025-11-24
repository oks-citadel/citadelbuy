/**
 * GDPR Consent Management Service
 * Manages user consent for cookies and tracking
 */

export type ConsentCategory = 'necessary' | 'analytics' | 'marketing' | 'personalization';

export interface ConsentPreferences {
  necessary: boolean; // Always true, cannot be disabled
  analytics: boolean;
  marketing: boolean;
  personalization: boolean;
  timestamp?: string;
  version?: string; // Consent policy version
}

const CONSENT_COOKIE_NAME = 'user_consent';
const CONSENT_VERSION = '1.0';
const CONSENT_EXPIRY_DAYS = 365;

class ConsentService {
  /**
   * Get user's consent preferences from cookie
   */
  getConsent(): ConsentPreferences | null {
    if (typeof document === 'undefined') return null;

    const cookie = document.cookie
      .split('; ')
      .find(row => row.startsWith(`${CONSENT_COOKIE_NAME}=`));

    if (!cookie) return null;

    try {
      const value = decodeURIComponent(cookie.split('=')[1]);
      return JSON.parse(value);
    } catch (error) {
      console.error('[Consent] Error parsing consent cookie:', error);
      return null;
    }
  }

  /**
   * Set user's consent preferences
   */
  setConsent(preferences: Omit<ConsentPreferences, 'necessary' | 'timestamp' | 'version'>): void {
    const consent: ConsentPreferences = {
      necessary: true, // Always true
      analytics: preferences.analytics,
      marketing: preferences.marketing,
      personalization: preferences.personalization,
      timestamp: new Date().toISOString(),
      version: CONSENT_VERSION,
    };

    // Set cookie
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + CONSENT_EXPIRY_DAYS);

    document.cookie = `${CONSENT_COOKIE_NAME}=${encodeURIComponent(
      JSON.stringify(consent)
    )}; expires=${expiryDate.toUTCString()}; path=/; secure; samesite=lax`;

    // Apply consent immediately
    this.applyConsent(consent);

    // Dispatch custom event for other parts of the app
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('consentUpdated', {
          detail: consent,
        })
      );
    }

    if (process.env.NODE_ENV === 'development') {
      console.log('[Consent] Preferences saved:', consent);
    }
  }

  /**
   * Check if user has given consent for a specific category
   */
  hasConsent(category: ConsentCategory): boolean {
    const consent = this.getConsent();
    if (!consent) return false;
    return consent[category] === true;
  }

  /**
   * Check if user has made a consent choice
   */
  hasConsentChoice(): boolean {
    return this.getConsent() !== null;
  }

  /**
   * Accept all consent categories
   */
  acceptAll(): void {
    this.setConsent({
      analytics: true,
      marketing: true,
      personalization: true,
    });
  }

  /**
   * Reject all optional consent categories
   */
  rejectAll(): void {
    this.setConsent({
      analytics: false,
      marketing: false,
      personalization: false,
    });
  }

  /**
   * Withdraw consent (reset to no consent)
   */
  withdrawConsent(): void {
    if (typeof document === 'undefined') return;

    // Delete consent cookie
    document.cookie = `${CONSENT_COOKIE_NAME}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;

    // Disable all tracking
    this.disableAllTracking();

    // Dispatch custom event
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('consentWithdrawn'));
    }

    if (process.env.NODE_ENV === 'development') {
      console.log('[Consent] Consent withdrawn');
    }
  }

  /**
   * Apply consent preferences to tracking scripts
   */
  private applyConsent(consent: ConsentPreferences): void {
    if (typeof window === 'undefined') return;

    // Google Analytics
    if (consent.analytics && (window as any).gtag) {
      (window as any).gtag('consent', 'update', {
        analytics_storage: 'granted',
      });
    } else if ((window as any).gtag) {
      (window as any).gtag('consent', 'update', {
        analytics_storage: 'denied',
      });
    }

    // Marketing (Meta Pixel, TikTok, etc.)
    if (consent.marketing) {
      // Enable marketing pixels
      this.enableMarketingPixels();
    } else {
      // Disable marketing pixels
      this.disableMarketingPixels();
    }

    // Personalization
    if ((window as any).gtag) {
      (window as any).gtag('consent', 'update', {
        personalization_storage: consent.personalization ? 'granted' : 'denied',
      });
    }
  }

  /**
   * Enable marketing pixels (Meta, TikTok, etc.)
   */
  private enableMarketingPixels(): void {
    if (typeof window === 'undefined') return;

    // Update GTM consent for ads
    if ((window as any).gtag) {
      (window as any).gtag('consent', 'update', {
        ad_storage: 'granted',
        ad_user_data: 'granted',
        ad_personalization: 'granted',
      });
    }
  }

  /**
   * Disable marketing pixels
   */
  private disableMarketingPixels(): void {
    if (typeof window === 'undefined') return;

    // Update GTM consent for ads
    if ((window as any).gtag) {
      (window as any).gtag('consent', 'update', {
        ad_storage: 'denied',
        ad_user_data: 'denied',
        ad_personalization: 'denied',
      });
    }
  }

  /**
   * Disable all tracking
   */
  private disableAllTracking(): void {
    if (typeof window === 'undefined') return;

    if ((window as any).gtag) {
      (window as any).gtag('consent', 'update', {
        analytics_storage: 'denied',
        ad_storage: 'denied',
        ad_user_data: 'denied',
        ad_personalization: 'denied',
        personalization_storage: 'denied',
      });
    }
  }

  /**
   * Initialize consent mode with default values
   * This should be called before any tracking scripts load
   */
  initializeConsentMode(): void {
    if (typeof window === 'undefined') return;

    const consent = this.getConsent();

    if ((window as any).gtag) {
      if (consent) {
        // User has made a choice, apply it
        (window as any).gtag('consent', 'default', {
          analytics_storage: consent.analytics ? 'granted' : 'denied',
          ad_storage: consent.marketing ? 'granted' : 'denied',
          ad_user_data: consent.marketing ? 'granted' : 'denied',
          ad_personalization: consent.marketing ? 'granted' : 'denied',
          personalization_storage: consent.personalization ? 'granted' : 'denied',
        });
      } else {
        // No consent yet, default to denied
        (window as any).gtag('consent', 'default', {
          analytics_storage: 'denied',
          ad_storage: 'denied',
          ad_user_data: 'denied',
          ad_personalization: 'denied',
          personalization_storage: 'denied',
        });
      }
    }

    if (process.env.NODE_ENV === 'development') {
      console.log('[Consent] Consent mode initialized');
    }
  }

  /**
   * Get all consent categories with descriptions
   */
  getConsentCategories(): Array<{
    id: ConsentCategory;
    name: string;
    description: string;
    required: boolean;
  }> {
    return [
      {
        id: 'necessary',
        name: 'Necessary',
        description:
          'Required for the website to function properly. These cookies cannot be disabled.',
        required: true,
      },
      {
        id: 'analytics',
        name: 'Analytics',
        description:
          'Help us understand how visitors interact with our website by collecting and reporting information anonymously.',
        required: false,
      },
      {
        id: 'marketing',
        name: 'Marketing',
        description:
          'Used to track visitors across websites to display relevant advertisements and measure campaign performance.',
        required: false,
      },
      {
        id: 'personalization',
        name: 'Personalization',
        description:
          'Enable the website to remember your preferences and provide enhanced, personalized features.',
        required: false,
      },
    ];
  }
}

// Singleton instance
let consentInstance: ConsentService | null = null;

/**
 * Get the global consent service instance
 */
export const getConsentService = (): ConsentService => {
  if (!consentInstance) {
    consentInstance = new ConsentService();
  }
  return consentInstance;
};

/**
 * Hook to listen for consent updates
 */
export const onConsentUpdate = (callback: (consent: ConsentPreferences) => void): (() => void) => {
  const handler = (event: Event) => {
    const customEvent = event as CustomEvent<ConsentPreferences>;
    callback(customEvent.detail);
  };

  if (typeof window !== 'undefined') {
    window.addEventListener('consentUpdated', handler);
  }

  // Return cleanup function
  return () => {
    if (typeof window !== 'undefined') {
      window.removeEventListener('consentUpdated', handler);
    }
  };
};

export default ConsentService;
