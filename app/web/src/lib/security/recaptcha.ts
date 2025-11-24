/**
 * Google reCAPTCHA v3 Service
 * Invisible bot protection with risk scoring
 */

declare global {
  interface Window {
    grecaptcha?: {
      ready: (callback: () => void) => void;
      execute: (siteKey: string, options: { action: string }) => Promise<string>;
    };
  }
}

export class RecaptchaService {
  private siteKey: string;
  private loaded: boolean = false;
  private loadingPromise: Promise<void> | null = null;

  constructor(siteKey?: string) {
    this.siteKey = siteKey || process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY || '';
  }

  /**
   * Load the reCAPTCHA script
   */
  async loadScript(): Promise<void> {
    if (this.loaded) {
      return;
    }

    if (this.loadingPromise) {
      return this.loadingPromise;
    }

    this.loadingPromise = new Promise((resolve, reject) => {
      if (typeof window === 'undefined') {
        reject(new Error('reCAPTCHA can only be loaded in browser environment'));
        return;
      }

      // Check if already loaded
      if (window.grecaptcha) {
        this.loaded = true;
        resolve();
        return;
      }

      // Create script element
      const script = document.createElement('script');
      script.src = `https://www.google.com/recaptcha/api.js?render=${this.siteKey}`;
      script.async = true;
      script.defer = true;

      script.onload = () => {
        this.loaded = true;
        if (process.env.NODE_ENV === 'development') {
          console.log('[reCAPTCHA] Script loaded successfully');
        }
        resolve();
      };

      script.onerror = (error) => {
        console.error('[reCAPTCHA] Failed to load script:', error);
        reject(new Error('Failed to load reCAPTCHA script'));
      };

      document.head.appendChild(script);
    });

    return this.loadingPromise;
  }

  /**
   * Execute reCAPTCHA for a specific action
   * @param action - Action name (e.g., 'register', 'login', 'purchase')
   * @returns reCAPTCHA token
   */
  async executeAction(action: string): Promise<string> {
    try {
      // Load script if not already loaded
      if (!this.loaded) {
        await this.loadScript();
      }

      // Wait for grecaptcha to be ready
      return new Promise((resolve, reject) => {
        if (!window.grecaptcha) {
          reject(new Error('reCAPTCHA not loaded'));
          return;
        }

        window.grecaptcha.ready(() => {
          window.grecaptcha!
            .execute(this.siteKey, { action })
            .then((token: string) => {
              if (process.env.NODE_ENV === 'development') {
                console.log(`[reCAPTCHA] Token generated for action: ${action}`);
              }
              resolve(token);
            })
            .catch((error: Error) => {
              console.error('[reCAPTCHA] Execution failed:', error);
              reject(error);
            });
        });
      });
    } catch (error) {
      console.error('[reCAPTCHA] Error executing action:', error);
      throw error;
    }
  }

  /**
   * Execute reCAPTCHA for registration
   */
  async executeRegistration(): Promise<string> {
    return this.executeAction('register');
  }

  /**
   * Execute reCAPTCHA for login
   */
  async executeLogin(): Promise<string> {
    return this.executeAction('login');
  }

  /**
   * Execute reCAPTCHA for form submission
   */
  async executeFormSubmit(formName: string = 'submit'): Promise<string> {
    return this.executeAction(formName);
  }

  /**
   * Execute reCAPTCHA for checkout
   */
  async executeCheckout(): Promise<string> {
    return this.executeAction('checkout');
  }

  /**
   * Check if reCAPTCHA is loaded
   */
  isLoaded(): boolean {
    return this.loaded;
  }

  /**
   * Get the site key
   */
  getSiteKey(): string {
    return this.siteKey;
  }
}

// Singleton instance
let recaptchaInstance: RecaptchaService | null = null;

/**
 * Get the global reCAPTCHA instance
 */
export const getRecaptchaService = (): RecaptchaService => {
  if (!recaptchaInstance) {
    recaptchaInstance = new RecaptchaService();
  }
  return recaptchaInstance;
};

/**
 * Execute reCAPTCHA for a specific action (convenience function)
 * @param action - Action name
 * @returns reCAPTCHA token
 */
export const executeRecaptcha = async (action: string): Promise<string> => {
  const service = getRecaptchaService();
  return service.executeAction(action);
};

/**
 * Verify reCAPTCHA token on the server
 * This should be called from your API route
 * @param token - reCAPTCHA token from client
 * @param expectedAction - Expected action name
 * @param secretKey - reCAPTCHA secret key
 * @returns Verification result with score
 */
export interface RecaptchaVerificationResult {
  success: boolean;
  score: number;
  action: string;
  challenge_ts: string;
  hostname: string;
  'error-codes'?: string[];
}

/**
 * Verify reCAPTCHA token (server-side)
 * NOTE: This should be called from your backend API, not directly from the client
 */
export async function verifyRecaptchaToken(
  token: string,
  secretKey: string,
  expectedAction?: string
): Promise<RecaptchaVerificationResult> {
  const response = await fetch('https://www.google.com/recaptcha/api/siteverify', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: `secret=${secretKey}&response=${token}`,
  });

  const result: RecaptchaVerificationResult = await response.json();

  // Verify action matches
  if (expectedAction && result.action !== expectedAction) {
    throw new Error(
      `reCAPTCHA action mismatch. Expected: ${expectedAction}, Got: ${result.action}`
    );
  }

  // Check score (0.0 = bot, 1.0 = human)
  // Threshold: 0.5 is recommended
  if (result.score < 0.5) {
    console.warn(`[reCAPTCHA] Low score detected: ${result.score}`);
  }

  return result;
}
