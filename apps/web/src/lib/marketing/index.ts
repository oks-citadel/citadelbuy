/**
 * Marketing & Analytics Module
 *
 * Comprehensive marketing toolkit including:
 * - Google Analytics 4
 * - Facebook/Meta Pixel
 * - Twitter, LinkedIn, Pinterest, TikTok ad pixels
 * - GDPR/CCPA consent management
 * - A/B testing framework
 * - E-commerce tracking
 *
 * @example
 * // In your app layout or providers
 * import { AnalyticsProvider, ConsentBanner } from '@/lib/marketing';
 *
 * function Layout({ children }) {
 *   return (
 *     <AnalyticsProvider>
 *       {children}
 *       <ConsentBanner />
 *     </AnalyticsProvider>
 *   );
 * }
 *
 * @example
 * // Track e-commerce events
 * import { useAnalytics } from '@/lib/marketing';
 *
 * function ProductPage({ product }) {
 *   const { trackProductView, trackCartAdd } = useAnalytics();
 *
 *   useEffect(() => {
 *     trackProductView(product);
 *   }, [product]);
 *
 *   return (
 *     <button onClick={() => trackCartAdd(product, 1)}>
 *       Add to Cart
 *     </button>
 *   );
 * }
 *
 * @example
 * // A/B Testing
 * import { useExperiment, useFeatureFlag } from '@/lib/marketing';
 *
 * function CheckoutButton() {
 *   const { variant, trackConversion } = useExperiment({
 *     id: 'checkout_button_color',
 *     name: 'Checkout Button Color Test',
 *     variants: [
 *       { id: 'control', name: 'Blue', weight: 50, isControl: true },
 *       { id: 'treatment', name: 'Green', weight: 50 },
 *     ],
 *     trafficAllocation: 100,
 *     status: 'running',
 *   });
 *
 *   const buttonColor = variant?.id === 'treatment' ? 'bg-green-500' : 'bg-blue-500';
 *
 *   return (
 *     <button
 *       className={buttonColor}
 *       onClick={() => trackConversion('checkout_click')}
 *     >
 *       Checkout
 *     </button>
 *   );
 * }
 */

// Configuration
export {
  defaultMarketingConfig,
  CURRENCY,
  type MarketingConfig,
  type ConsentSettings,
  type EcommerceEventType,
  type EcommerceEventData,
  type EcommerceItem,
} from './config';

// Google Analytics
export {
  initGA,
  setUserProperties,
  setUserId,
  trackPageView,
  trackEvent,
  trackViewItem,
  trackViewItemList,
  trackSelectItem,
  trackAddToCart,
  trackRemoveFromCart,
  trackViewCart,
  trackBeginCheckout,
  trackAddShippingInfo,
  trackAddPaymentInfo,
  trackPurchase,
  trackRefund,
  trackAddToWishlist,
  trackSearch,
  trackViewPromotion,
  trackSelectPromotion,
  trackSignUp,
  trackLogin,
  trackShare,
  trackGenerateLead,
  trackConversion,
  updateConsent as updateGAConsent,
  createEcommerceItem,
} from './google-analytics';

// Facebook Pixel
export {
  initFBPixel,
  fbTrackPageView,
  fbTrackCustom,
  fbTrackEvent,
  fbTrackViewContent,
  fbTrackAddToCart,
  fbTrackAddToWishlist,
  fbTrackInitiateCheckout,
  fbTrackAddPaymentInfo,
  fbTrackPurchase,
  fbTrackSearch,
  fbTrackLead,
  fbTrackCompleteRegistration,
  fbTrackContact,
  fbTrackSubscribe,
  fbTrackStartTrial,
  fbSetUserData,
  fbGrantConsent,
  fbRevokeConsent,
  createFBContentItem,
  type FBContentItem,
  type FBPurchaseData,
  type FBAddToCartData,
  type FBViewContentData,
} from './facebook-pixel';

// Ad Pixels (Twitter, LinkedIn, Pinterest, TikTok)
export {
  // Twitter
  initTwitterPixel,
  twTrackPageView,
  twTrackPurchase,
  twTrackAddToCart,
  twTrackSignUp,
  // LinkedIn
  initLinkedInInsight,
  liTrackConversion,
  // Pinterest
  initPinterestTag,
  pinTrackPageVisit,
  pinTrackViewCategory,
  pinTrackSearch,
  pinTrackAddToCart,
  pinTrackCheckout,
  pinTrackPurchase,
  pinTrackSignup,
  pinTrackLead,
  // TikTok
  initTikTokPixel,
  ttqTrackPageView,
  ttqTrackViewContent,
  ttqTrackAddToCart,
  ttqTrackInitiateCheckout,
  ttqTrackCompletePayment,
  ttqTrackCompleteRegistration,
  ttqTrackSearch,
  ttqIdentifyUser,
  // Unified tracking
  trackAcrossAllPlatforms,
  type UnifiedTrackingData,
} from './ad-pixels';

// Consent Management
export {
  getStoredConsent,
  saveConsent,
  hasConsentChoice,
  hasGlobalPrivacyControl,
  hasDoNotTrack,
  getDefaultConsent,
  applyConsentToAllPlatforms,
  acceptAllConsent,
  rejectAllConsent,
  updateConsentCategory,
  getCurrentConsent,
  hasConsent,
  hasAnalyticsConsent,
  hasMarketingConsent,
  hasPersonalizationConsent,
  clearConsent,
  getConsentAge,
  shouldRefreshConsent,
  initializeConsent,
  exportConsentData,
  type StoredConsent,
} from './consent';

// A/B Testing
export {
  assignVariant,
  trackExposure,
  trackConversion as trackExperimentConversion,
  getAllAssignments,
  getAssignment,
  clearExperimentData,
  forceVariant,
  isFeatureEnabled,
  getVariation,
  createABExperiment,
  exportExperimentData,
  type Experiment,
  type Variant,
  type TargetingRule,
  type ExperimentAssignment,
  type ExperimentExposure,
} from './ab-testing';

// React Hooks
export {
  usePageTracking,
  useProductTracking,
  useCartTracking,
  useCheckoutTracking,
  useSearchTracking,
  useWishlistTracking,
  useUserIdentification,
  useExperiment,
  useFeatureFlag,
  useExperimentAssignment,
  useAnalytics,
  type ProductData,
} from './hooks';

// React Components
export { AnalyticsProvider, useAnalyticsContext } from './components/analytics-provider';
export { ConsentBanner, CookieSettingsButton } from './components/consent-banner';

// SEO JSON-LD (re-exported for convenience)
export { BroxivaOrganizationJsonLd, BroxivaWebSiteJsonLd } from '../seo/json-ld';
