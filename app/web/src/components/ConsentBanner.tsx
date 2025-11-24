'use client';

/**
 * GDPR Cookie Consent Banner
 * Displays a banner asking for user consent for cookies and tracking
 */

import { useState, useEffect } from 'react';
import { getConsentService, type ConsentPreferences } from '@/lib/privacy/consent.service';

export function ConsentBanner() {
  const [showBanner, setShowBanner] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [preferences, setPreferences] = useState({
    analytics: true,
    marketing: true,
    personalization: true,
  });

  useEffect(() => {
    const consentService = getConsentService();

    // Check if user has already made a choice
    if (!consentService.hasConsentChoice()) {
      setShowBanner(true);
    }

    // Initialize consent mode
    consentService.initializeConsentMode();
  }, []);

  const handleAcceptAll = () => {
    const consentService = getConsentService();
    consentService.acceptAll();
    setShowBanner(false);
  };

  const handleRejectAll = () => {
    const consentService = getConsentService();
    consentService.rejectAll();
    setShowBanner(false);
  };

  const handleSavePreferences = () => {
    const consentService = getConsentService();
    consentService.setConsent(preferences);
    setShowBanner(false);
    setShowDetails(false);
  };

  const handleTogglePreference = (key: keyof typeof preferences) => {
    setPreferences(prev => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  if (!showBanner) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4 sm:items-center">
      <div className="w-full max-w-2xl rounded-lg bg-white shadow-xl dark:bg-gray-800">
        {!showDetails ? (
          // Simple consent view
          <div className="p-6">
            <h2 className="mb-4 text-xl font-bold text-gray-900 dark:text-white">
              🍪 We Value Your Privacy
            </h2>
            <p className="mb-6 text-sm text-gray-600 dark:text-gray-300">
              We use cookies and similar technologies to enhance your experience, analyze site
              traffic, and personalize content and ads. By clicking &quot;Accept All&quot;, you consent
              to our use of cookies.
            </p>
            <div className="flex flex-col gap-3 sm:flex-row">
              <button
                onClick={handleAcceptAll}
                className="flex-1 rounded-lg bg-blue-600 px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                Accept All
              </button>
              <button
                onClick={handleRejectAll}
                className="flex-1 rounded-lg border border-gray-300 bg-white px-6 py-3 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
              >
                Reject All
              </button>
              <button
                onClick={() => setShowDetails(true)}
                className="flex-1 rounded-lg border border-gray-300 bg-white px-6 py-3 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
              >
                Customize
              </button>
            </div>
            <p className="mt-4 text-xs text-gray-500 dark:text-gray-400">
              Learn more about how we use cookies in our{' '}
              <a href="/privacy" className="text-blue-600 underline hover:text-blue-700">
                Privacy Policy
              </a>{' '}
              and{' '}
              <a href="/cookies" className="text-blue-600 underline hover:text-blue-700">
                Cookie Policy
              </a>
              .
            </p>
          </div>
        ) : (
          // Detailed consent preferences
          <div className="p-6">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                Cookie Preferences
              </h2>
              <button
                onClick={() => setShowDetails(false)}
                className="text-gray-400 transition-colors hover:text-gray-600 dark:hover:text-gray-200"
                aria-label="Go back"
              >
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            <div className="space-y-4">
              {/* Necessary Cookies */}
              <div className="rounded-lg border border-gray-200 p-4 dark:border-gray-700">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900 dark:text-white">
                      Necessary Cookies
                    </h3>
                    <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
                      Required for the website to function properly. These cookies cannot be
                      disabled.
                    </p>
                  </div>
                  <div className="ml-4">
                    <input
                      type="checkbox"
                      checked={true}
                      disabled
                      className="h-5 w-5 rounded border-gray-300 text-blue-600 opacity-50"
                    />
                  </div>
                </div>
              </div>

              {/* Analytics Cookies */}
              <div className="rounded-lg border border-gray-200 p-4 dark:border-gray-700">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900 dark:text-white">
                      Analytics Cookies
                    </h3>
                    <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
                      Help us understand how visitors interact with our website by collecting and
                      reporting information anonymously.
                    </p>
                  </div>
                  <div className="ml-4">
                    <label className="relative inline-block h-6 w-11 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={preferences.analytics}
                        onChange={() => handleTogglePreference('analytics')}
                        className="peer sr-only"
                      />
                      <div className="peer h-6 w-11 rounded-full bg-gray-200 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-blue-600 peer-checked:after:translate-x-full peer-checked:after:border-white peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-300 dark:bg-gray-700"></div>
                    </label>
                  </div>
                </div>
              </div>

              {/* Marketing Cookies */}
              <div className="rounded-lg border border-gray-200 p-4 dark:border-gray-700">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900 dark:text-white">
                      Marketing Cookies
                    </h3>
                    <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
                      Used to track visitors across websites to display relevant advertisements
                      and measure campaign performance.
                    </p>
                  </div>
                  <div className="ml-4">
                    <label className="relative inline-block h-6 w-11 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={preferences.marketing}
                        onChange={() => handleTogglePreference('marketing')}
                        className="peer sr-only"
                      />
                      <div className="peer h-6 w-11 rounded-full bg-gray-200 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-blue-600 peer-checked:after:translate-x-full peer-checked:after:border-white peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-300 dark:bg-gray-700"></div>
                    </label>
                  </div>
                </div>
              </div>

              {/* Personalization Cookies */}
              <div className="rounded-lg border border-gray-200 p-4 dark:border-gray-700">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900 dark:text-white">
                      Personalization Cookies
                    </h3>
                    <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
                      Enable the website to remember your preferences and provide enhanced,
                      personalized features.
                    </p>
                  </div>
                  <div className="ml-4">
                    <label className="relative inline-block h-6 w-11 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={preferences.personalization}
                        onChange={() => handleTogglePreference('personalization')}
                        className="peer sr-only"
                      />
                      <div className="peer h-6 w-11 rounded-full bg-gray-200 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-blue-600 peer-checked:after:translate-x-full peer-checked:after:border-white peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-300 dark:bg-gray-700"></div>
                    </label>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <button
                onClick={handleSavePreferences}
                className="flex-1 rounded-lg bg-blue-600 px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                Save Preferences
              </button>
              <button
                onClick={handleAcceptAll}
                className="flex-1 rounded-lg border border-gray-300 bg-white px-6 py-3 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
              >
                Accept All
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
