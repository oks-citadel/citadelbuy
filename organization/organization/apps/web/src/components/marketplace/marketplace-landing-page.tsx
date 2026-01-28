'use client';

import { Suspense } from 'react';
import { cn } from '@/lib/utils';

// Import marketplace gradient styles
import '@/styles/marketplace-gradients.css';

// Import all section components
import { MarketplaceHero } from './marketplace-hero';
import { HowItWorks } from './how-it-works';
import { FeaturedCategories } from './featured-categories';
import { BuyerTrust } from './buyer-trust';
import { VendorValue } from './vendor-value';
import { SocialProof } from './social-proof';
import { EmailCapture } from './email-capture';
import { FinalDualCTA } from './final-dual-cta';
import { MarketplaceFooter } from './marketplace-footer';

/**
 * MarketplaceLandingPage Component
 *
 * Complete landing page assembling all sections in the optimal order
 * for conversion and user experience.
 *
 * Section Order:
 * 1. Hero (Dual CTA + Avatar)
 * 2. How It Works (Split Flow)
 * 3. Featured Categories (Activity Proof)
 * 4. Buyer Trust (Customer Focus)
 * 5. Vendor Value (Seller Focus)
 * 6. Social Proof (Dual Testimonials)
 * 7. Email Capture
 * 8. Final Dual CTA (Decision Point)
 * 9. Footer (Marketplace-grade)
 */

// Loading skeleton for lazy-loaded sections
const SectionSkeleton: React.FC<{ height?: string }> = ({ height = 'h-96' }) => (
  <div className={cn('animate-pulse bg-neutral-100', height)} />
);

interface MarketplaceLandingPageProps {
  className?: string;
}

export const MarketplaceLandingPage: React.FC<MarketplaceLandingPageProps> = ({
  className,
}) => {
  return (
    <div className={cn('min-h-screen flex flex-col', className)}>
      {/* Skip to main content link for accessibility */}
      <a
        href="#main-content"
        className={cn(
          'sr-only focus:not-sr-only',
          'fixed top-4 left-4 z-50',
          'px-4 py-2 bg-primary-600 text-white rounded-lg',
          'focus:outline-none focus:ring-4 focus:ring-primary-400'
        )}
      >
        Skip to main content
      </a>

      <main id="main-content" className="flex-1">
        {/* 1. HERO - Dual-Sided with Gradient and Avatar */}
        <MarketplaceHero />

        {/* 2. HOW IT WORKS - Split Flow */}
        <HowItWorks />

        {/* 3. FEATURED CATEGORIES - Activity Proof */}
        <Suspense fallback={<SectionSkeleton height="h-[600px]" />}>
          <FeaturedCategories />
        </Suspense>

        {/* 4. BUYER TRUST - Customer Focus */}
        <BuyerTrust />

        {/* 5. VENDOR VALUE - Seller Focus */}
        <VendorValue />

        {/* 6. SOCIAL PROOF - Dual Testimonials */}
        <SocialProof />

        {/* 7. EMAIL CAPTURE */}
        <EmailCapture />

        {/* 8. FINAL DUAL CTA - Decision Point */}
        <FinalDualCTA />
      </main>

      {/* 9. FOOTER - Marketplace-grade */}
      <MarketplaceFooter />
    </div>
  );
};

export default MarketplaceLandingPage;
