'use client';

import { useState, useEffect } from 'react';
import {
  hasConsentChoice,
  acceptAllConsent,
  rejectAllConsent,
  saveConsent,
  getCurrentConsent,
  type ConsentSettings,
} from '../consent';
import { cn } from '@/lib/utils';

interface ConsentBannerProps {
  className?: string;
  position?: 'bottom' | 'top';
  showPreferences?: boolean;
}

export function ConsentBanner({
  className,
  position = 'bottom',
  showPreferences = true,
}: ConsentBannerProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [consent, setConsent] = useState<ConsentSettings>({
    necessary: true,
    analytics: false,
    marketing: false,
    personalization: false,
  });

  useEffect(() => {
    // Only show banner if user hasn't made a choice
    if (!hasConsentChoice()) {
      setIsVisible(true);
    }
    setConsent(getCurrentConsent());
  }, []);

  const handleAcceptAll = () => {
    acceptAllConsent();
    setIsVisible(false);
  };

  const handleRejectAll = () => {
    rejectAllConsent();
    setIsVisible(false);
  };

  const handleSavePreferences = () => {
    saveConsent(consent);
    setIsVisible(false);
  };

  const updateConsent = (key: keyof ConsentSettings, value: boolean) => {
    if (key === 'necessary') return; // Can't disable necessary
    setConsent((prev) => ({ ...prev, [key]: value }));
  };

  if (!isVisible) return null;

  return (
    <div
      className={cn(
        'fixed left-0 right-0 z-50 p-4 bg-background border shadow-lg',
        position === 'bottom' ? 'bottom-0 border-t' : 'top-0 border-b',
        className
      )}
      role="dialog"
      aria-modal="true"
      aria-labelledby="consent-title"
    >
      <div className="max-w-6xl mx-auto">
        {!showDetails ? (
          // Simple view
          <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
            <div className="flex-1">
              <h2 id="consent-title" className="text-lg font-semibold mb-1">
                We value your privacy
              </h2>
              <p className="text-sm text-muted-foreground">
                We use cookies to enhance your browsing experience, serve personalized ads or
                content, and analyze our traffic. By clicking &quot;Accept All&quot;, you consent to
                our use of cookies.{' '}
                <button
                  onClick={() => setShowDetails(true)}
                  className="text-primary hover:underline"
                >
                  Manage preferences
                </button>
              </p>
            </div>
            <div className="flex gap-2 shrink-0">
              <button
                onClick={handleRejectAll}
                className="px-4 py-2 text-sm border rounded-md hover:bg-muted transition-colors"
              >
                Reject All
              </button>
              <button
                onClick={handleAcceptAll}
                className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
              >
                Accept All
              </button>
            </div>
          </div>
        ) : (
          // Detailed preferences view
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 id="consent-title" className="text-lg font-semibold">
                Cookie Preferences
              </h2>
              <button
                onClick={() => setShowDetails(false)}
                className="text-muted-foreground hover:text-foreground"
                aria-label="Close preferences"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            <div className="space-y-4 mb-6">
              {/* Necessary Cookies */}
              <div className="flex items-start justify-between p-3 bg-muted/50 rounded-lg">
                <div className="flex-1 mr-4">
                  <h3 className="font-medium">Necessary Cookies</h3>
                  <p className="text-sm text-muted-foreground">
                    Essential for the website to function. Cannot be disabled.
                  </p>
                </div>
                <div className="shrink-0">
                  <input
                    type="checkbox"
                    checked={true}
                    disabled
                    className="w-5 h-5 rounded border-gray-300"
                    aria-label="Necessary cookies (always enabled)"
                  />
                </div>
              </div>

              {/* Analytics Cookies */}
              <div className="flex items-start justify-between p-3 bg-muted/50 rounded-lg">
                <div className="flex-1 mr-4">
                  <h3 className="font-medium">Analytics Cookies</h3>
                  <p className="text-sm text-muted-foreground">
                    Help us understand how visitors interact with our website.
                  </p>
                </div>
                <div className="shrink-0">
                  <input
                    type="checkbox"
                    checked={consent.analytics}
                    onChange={(e) => updateConsent('analytics', e.target.checked)}
                    className="w-5 h-5 rounded border-gray-300 text-primary focus:ring-primary"
                    aria-label="Analytics cookies"
                  />
                </div>
              </div>

              {/* Marketing Cookies */}
              <div className="flex items-start justify-between p-3 bg-muted/50 rounded-lg">
                <div className="flex-1 mr-4">
                  <h3 className="font-medium">Marketing Cookies</h3>
                  <p className="text-sm text-muted-foreground">
                    Used to track visitors across websites for advertising purposes.
                  </p>
                </div>
                <div className="shrink-0">
                  <input
                    type="checkbox"
                    checked={consent.marketing}
                    onChange={(e) => updateConsent('marketing', e.target.checked)}
                    className="w-5 h-5 rounded border-gray-300 text-primary focus:ring-primary"
                    aria-label="Marketing cookies"
                  />
                </div>
              </div>

              {/* Personalization Cookies */}
              <div className="flex items-start justify-between p-3 bg-muted/50 rounded-lg">
                <div className="flex-1 mr-4">
                  <h3 className="font-medium">Personalization Cookies</h3>
                  <p className="text-sm text-muted-foreground">
                    Allow us to personalize your experience based on your preferences.
                  </p>
                </div>
                <div className="shrink-0">
                  <input
                    type="checkbox"
                    checked={consent.personalization}
                    onChange={(e) => updateConsent('personalization', e.target.checked)}
                    className="w-5 h-5 rounded border-gray-300 text-primary focus:ring-primary"
                    aria-label="Personalization cookies"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <button
                onClick={handleRejectAll}
                className="px-4 py-2 text-sm border rounded-md hover:bg-muted transition-colors"
              >
                Reject All
              </button>
              <button
                onClick={handleSavePreferences}
                className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
              >
                Save Preferences
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Simple floating cookie settings button
export function CookieSettingsButton({ className }: { className?: string }) {
  const [isOpen, setIsOpen] = useState(false);

  if (isOpen) {
    return (
      <div
        className={cn(
          'fixed bottom-4 right-4 z-50 w-80 p-4 bg-background border rounded-lg shadow-lg',
          className
        )}
      >
        <ConsentBanner position="bottom" />
        <button
          onClick={() => setIsOpen(false)}
          className="absolute top-2 right-2 text-muted-foreground hover:text-foreground"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={() => setIsOpen(true)}
      className={cn(
        'fixed bottom-4 right-4 z-40 p-3 bg-background border rounded-full shadow-lg hover:shadow-xl transition-shadow',
        className
      )}
      aria-label="Cookie settings"
    >
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
        />
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
        />
      </svg>
    </button>
  );
}
