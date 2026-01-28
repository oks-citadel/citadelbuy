'use client';

import { useEffect, createContext, useContext, useState, ReactNode } from 'react';
import Script from 'next/script';
import { usePathname, useSearchParams } from 'next/navigation';
import { defaultMarketingConfig, type MarketingConfig } from '../config';
import { initGA, trackPageView } from '../google-analytics';
import { initFBPixel, fbTrackPageView } from '../facebook-pixel';
import {
  initTwitterPixel,
  initLinkedInInsight,
  initPinterestTag,
  initTikTokPixel,
} from '../ad-pixels';
import {
  initializeConsent,
  hasAnalyticsConsent,
  hasMarketingConsent,
  type ConsentSettings,
} from '../consent';

interface AnalyticsContextValue {
  config: MarketingConfig;
  consent: ConsentSettings;
  isInitialized: boolean;
}

const AnalyticsContext = createContext<AnalyticsContextValue | null>(null);

export function useAnalyticsContext() {
  const context = useContext(AnalyticsContext);
  if (!context) {
    throw new Error('useAnalyticsContext must be used within AnalyticsProvider');
  }
  return context;
}

interface AnalyticsProviderProps {
  children: ReactNode;
  config?: Partial<MarketingConfig>;
}

export function AnalyticsProvider({
  children,
  config: customConfig,
}: AnalyticsProviderProps) {
  const [isInitialized, setIsInitialized] = useState(false);
  const [consent, setConsent] = useState<ConsentSettings>({
    necessary: true,
    analytics: false,
    marketing: false,
    personalization: false,
  });

  const config: MarketingConfig = {
    ...defaultMarketingConfig,
    ...customConfig,
  };

  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Initialize consent and analytics on mount
  useEffect(() => {
    const initialConsent = initializeConsent();
    setConsent(initialConsent);

    // Initialize GA4
    if (config.googleAnalytics.enabled && initialConsent.analytics) {
      initGA(config.googleAnalytics.measurementId);
    }

    // Initialize Facebook Pixel
    if (config.facebookPixel.enabled && initialConsent.marketing) {
      initFBPixel(config.facebookPixel.pixelId);
    }

    // Initialize other pixels
    if (initialConsent.marketing) {
      if (config.twitterPixel.enabled) {
        initTwitterPixel(config.twitterPixel.pixelId);
      }
      if (config.linkedInInsight.enabled) {
        initLinkedInInsight(config.linkedInInsight.partnerId);
      }
      if (config.pinterestTag.enabled) {
        initPinterestTag(config.pinterestTag.tagId);
      }
      if (config.tiktokPixel.enabled) {
        initTikTokPixel(config.tiktokPixel.pixelId);
      }
    }

    setIsInitialized(true);

    // Listen for consent updates
    const handleConsentUpdate = (event: CustomEvent<ConsentSettings>) => {
      setConsent(event.detail);
    };

    window.addEventListener('consentUpdated', handleConsentUpdate as EventListener);
    return () => {
      window.removeEventListener('consentUpdated', handleConsentUpdate as EventListener);
    };
  }, [config]);

  // Track page views on route change
  useEffect(() => {
    if (!isInitialized) return;

    const url = pathname + (searchParams?.toString() ? `?${searchParams.toString()}` : '');

    if (hasAnalyticsConsent()) {
      trackPageView(url);
    }

    if (hasMarketingConsent()) {
      fbTrackPageView();
    }
  }, [pathname, searchParams, isInitialized]);

  return (
    <AnalyticsContext.Provider value={{ config, consent, isInitialized }}>
      {/* Google Analytics Script */}
      {config.googleAnalytics.enabled && (
        <Script
          src={`https://www.googletagmanager.com/gtag/js?id=${config.googleAnalytics.measurementId}`}
          strategy="afterInteractive"
        />
      )}

      {/* Google Tag Manager Script */}
      {config.googleTagManager.enabled && (
        <>
          <Script
            id="gtm-script"
            strategy="afterInteractive"
            dangerouslySetInnerHTML={{
              __html: `
                (function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
                new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
                j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
                'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
                })(window,document,'script','dataLayer','${config.googleTagManager.containerId}');
              `,
            }}
          />
          <noscript>
            <iframe
              src={`https://www.googletagmanager.com/ns.html?id=${config.googleTagManager.containerId}`}
              height="0"
              width="0"
              style={{ display: 'none', visibility: 'hidden' }}
            />
          </noscript>
        </>
      )}

      {/* Facebook Pixel Script */}
      {config.facebookPixel.enabled && consent.marketing && (
        <Script
          id="fb-pixel"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{
            __html: `
              !function(f,b,e,v,n,t,s)
              {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
              n.callMethod.apply(n,arguments):n.queue.push(arguments)};
              if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
              n.queue=[];t=b.createElement(e);t.async=!0;
              t.src=v;s=b.getElementsByTagName(e)[0];
              s.parentNode.insertBefore(t,s)}(window, document,'script',
              'https://connect.facebook.net/en_US/fbevents.js');
              fbq('init', '${config.facebookPixel.pixelId}');
              fbq('track', 'PageView');
            `,
          }}
        />
      )}

      {/* Twitter Pixel Script */}
      {config.twitterPixel.enabled && consent.marketing && (
        <Script
          id="twitter-pixel"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{
            __html: `
              !function(e,t,n,s,u,a){e.twq||(s=e.twq=function(){s.exe?s.exe.apply(s,arguments):s.queue.push(arguments);
              },s.version='1.1',s.queue=[],u=t.createElement(n),u.async=!0,u.src='https://static.ads-twitter.com/uwt.js',
              a=t.getElementsByTagName(n)[0],a.parentNode.insertBefore(u,a))}(window,document,'script');
              twq('config','${config.twitterPixel.pixelId}');
            `,
          }}
        />
      )}

      {/* LinkedIn Insight Tag */}
      {config.linkedInInsight.enabled && consent.marketing && (
        <Script
          id="linkedin-insight"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{
            __html: `
              _linkedin_partner_id = "${config.linkedInInsight.partnerId}";
              window._linkedin_data_partner_ids = window._linkedin_data_partner_ids || [];
              window._linkedin_data_partner_ids.push(_linkedin_partner_id);
              (function(l) {
                if (!l){window.lintrk = function(a,b){window.lintrk.q.push([a,b])};
                window.lintrk.q=[]}
                var s = document.getElementsByTagName("script")[0];
                var b = document.createElement("script");
                b.type = "text/javascript";b.async = true;
                b.src = "https://snap.licdn.com/li.lms-analytics/insight.min.js";
                s.parentNode.insertBefore(b, s);
              })(window.lintrk);
            `,
          }}
        />
      )}

      {/* Pinterest Tag */}
      {config.pinterestTag.enabled && consent.marketing && (
        <Script
          id="pinterest-tag"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{
            __html: `
              !function(e){if(!window.pintrk){window.pintrk=function(){
              window.pintrk.queue.push(Array.prototype.slice.call(arguments))};var
              n=window.pintrk;n.queue=[],n.version="3.0";var
              t=document.createElement("script");t.async=!0,t.src=e;var
              r=document.getElementsByTagName("script")[0];
              r.parentNode.insertBefore(t,r)}}("https://s.pinimg.com/ct/core.js");
              pintrk('load', '${config.pinterestTag.tagId}');
              pintrk('page');
            `,
          }}
        />
      )}

      {/* TikTok Pixel */}
      {config.tiktokPixel.enabled && consent.marketing && (
        <Script
          id="tiktok-pixel"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{
            __html: `
              !function (w, d, t) {
                w.TiktokAnalyticsObject=t;var ttq=w[t]=w[t]||[];ttq.methods=["page","track","identify","instances","debug","on","off","once","ready","alias","group","enableCookie","disableCookie"],ttq.setAndDefer=function(t,e){t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}};for(var i=0;i<ttq.methods.length;i++)ttq.setAndDefer(ttq,ttq.methods[i]);ttq.instance=function(t){for(var e=ttq._i[t]||[],n=0;n<ttq.methods.length;n++)ttq.setAndDefer(e,ttq.methods[n]);return e},ttq.load=function(e,n){var i="https://analytics.tiktok.com/i18n/pixel/events.js";ttq._i=ttq._i||{},ttq._i[e]=[],ttq._i[e]._u=i,ttq._t=ttq._t||{},ttq._t[e]=+new Date,ttq._o=ttq._o||{},ttq._o[e]=n||{};var o=document.createElement("script");o.type="text/javascript",o.async=!0,o.src=i+"?sdkid="+e+"&lib="+t;var a=document.getElementsByTagName("script")[0];a.parentNode.insertBefore(o,a)};
                ttq.load('${config.tiktokPixel.pixelId}');
                ttq.page();
              }(window, document, 'ttq');
            `,
          }}
        />
      )}

      {/* Hotjar */}
      {config.hotjar.enabled && consent.analytics && (
        <Script
          id="hotjar"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{
            __html: `
              (function(h,o,t,j,a,r){
                h.hj=h.hj||function(){(h.hj.q=h.hj.q||[]).push(arguments)};
                h._hjSettings={hjid:${config.hotjar.siteId},hjsv:${config.hotjar.version}};
                a=o.getElementsByTagName('head')[0];
                r=o.createElement('script');r.async=1;
                r.src=t+h._hjSettings.hjid+j+h._hjSettings.hjsv;
                a.appendChild(r);
              })(window,document,'https://static.hotjar.com/c/hotjar-','.js?sv=');
            `,
          }}
        />
      )}

      {children}
    </AnalyticsContext.Provider>
  );
}
