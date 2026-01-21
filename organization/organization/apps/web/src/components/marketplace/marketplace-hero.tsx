'use client';

import { motion, useReducedMotion } from 'framer-motion';
import Link from 'next/link';
import { ShoppingBag, Store, Shield, CreditCard, Truck, CheckCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { AnimationAvatar } from './animation-avatar';

/**
 * MarketplaceHero Component
 *
 * Features:
 * - Dual CTAs with equal visual weight (Shop + Sell)
 * - High-gradient background with spotlight effect
 * - Animated avatar with reduced motion support
 * - Trust chips below CTAs
 * - Fully accessible and responsive
 */

interface TrustChip {
  icon: React.ReactNode;
  label: string;
}

const trustChips: TrustChip[] = [
  { icon: <Shield className="w-3.5 h-3.5" />, label: 'Verified Vendors' },
  { icon: <CreditCard className="w-3.5 h-3.5" />, label: 'Secure Payments' },
  { icon: <CheckCircle className="w-3.5 h-3.5" />, label: 'Buyer Protection' },
  { icon: <Truck className="w-3.5 h-3.5" />, label: 'Global Shipping' },
];

interface MarketplaceHeroProps {
  headline?: string;
  subheadline?: string;
  shopCtaText?: string;
  shopCtaHref?: string;
  vendorCtaText?: string;
  vendorCtaHref?: string;
  className?: string;
}

export const MarketplaceHero: React.FC<MarketplaceHeroProps> = ({
  headline = 'Buy & Sell with Confidence',
  subheadline = 'Join thousands of verified vendors and happy customers. Shop quality products or grow your business on our trusted marketplace.',
  shopCtaText = 'Shop Products',
  shopCtaHref = '/products',
  vendorCtaText = 'Become a Vendor',
  vendorCtaHref = '/vendor/register',
  className,
}) => {
  const prefersReducedMotion = useReducedMotion();

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.2,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.5, ease: [0.34, 1.56, 0.64, 1] },
    },
  };

  // Analytics event handlers
  const trackCtaClick = (ctaType: 'shop' | 'vendor') => {
    if (typeof window !== 'undefined' && 'gtag' in window) {
      (window as any).gtag('event', ctaType === 'shop' ? 'hero_shop_click' : 'hero_vendor_click', {
        event_category: 'CTA',
        event_label: `Hero ${ctaType} CTA`,
      });
    }
  };

  return (
    <section
      className={cn(
        'relative min-h-[600px] lg:min-h-[700px] overflow-hidden',
        'gradient-marketplace-hero',
        className
      )}
      aria-labelledby="hero-headline"
    >
      {/* Background decorative elements */}
      <div className="absolute inset-0 overflow-hidden" aria-hidden="true">
        {/* Radial gradient spotlight */}
        <div
          className={cn(
            'absolute top-0 right-0 w-[600px] h-[600px]',
            'bg-gradient-radial from-accent-500/10 via-transparent to-transparent',
            'rounded-full blur-3xl',
            !prefersReducedMotion && 'animate-pulse-soft'
          )}
          style={{ transform: 'translate(20%, -30%)' }}
        />

        {/* Grid pattern overlay */}
        <div
          className="absolute inset-0 opacity-[0.02]"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          }}
        />
      </div>

      <div className="relative z-10 container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col lg:flex-row items-center justify-between gap-8 lg:gap-12 py-16 lg:py-24">
          {/* Left Content */}
          <motion.div
            className="flex-1 max-w-2xl text-center lg:text-left"
            variants={prefersReducedMotion ? {} : containerVariants}
            initial="hidden"
            animate="visible"
          >
            {/* Headline */}
            <motion.h1
              id="hero-headline"
              className={cn(
                'text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight',
                'text-white mb-6'
              )}
              variants={prefersReducedMotion ? {} : itemVariants}
            >
              <span className="block">{headline.split(' ').slice(0, 2).join(' ')}</span>
              <span className="block text-gradient-gold mt-2">
                {headline.split(' ').slice(2).join(' ') || 'Confidence'}
              </span>
            </motion.h1>

            {/* Subheadline */}
            <motion.p
              className="text-lg sm:text-xl text-neutral-300 mb-8 max-w-xl mx-auto lg:mx-0"
              variants={prefersReducedMotion ? {} : itemVariants}
            >
              {subheadline}
            </motion.p>

            {/* Dual CTAs - Equal Visual Weight */}
            <motion.div
              className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start mb-8"
              variants={prefersReducedMotion ? {} : itemVariants}
            >
              {/* Shop Products CTA */}
              <Link
                href={shopCtaHref}
                onClick={() => trackCtaClick('shop')}
                className={cn(
                  'group inline-flex items-center justify-center gap-2',
                  'px-8 py-4 rounded-xl font-semibold text-lg',
                  'gradient-marketplace-cta text-primary-900',
                  'shadow-lg shadow-accent-500/30',
                  'transform transition-all duration-300',
                  'hover:shadow-xl hover:shadow-accent-500/40 hover:scale-[1.02]',
                  'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-accent-400/50',
                  'active:scale-[0.98]'
                )}
              >
                <ShoppingBag
                  className={cn(
                    'w-5 h-5 transition-transform duration-300',
                    !prefersReducedMotion && 'group-hover:scale-110'
                  )}
                />
                {shopCtaText}
              </Link>

              {/* Become a Vendor CTA */}
              <Link
                href={vendorCtaHref}
                onClick={() => trackCtaClick('vendor')}
                className={cn(
                  'group inline-flex items-center justify-center gap-2',
                  'px-8 py-4 rounded-xl font-semibold text-lg',
                  'bg-white/10 backdrop-blur-sm text-white',
                  'border-2 border-white/30',
                  'shadow-lg shadow-primary-900/20',
                  'transform transition-all duration-300',
                  'hover:bg-white/20 hover:border-white/50 hover:scale-[1.02]',
                  'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-white/30',
                  'active:scale-[0.98]'
                )}
              >
                <Store
                  className={cn(
                    'w-5 h-5 transition-transform duration-300',
                    !prefersReducedMotion && 'group-hover:scale-110'
                  )}
                />
                {vendorCtaText}
              </Link>
            </motion.div>

            {/* Trust Chips */}
            <motion.div
              className="flex flex-wrap gap-3 justify-center lg:justify-start"
              variants={prefersReducedMotion ? {} : itemVariants}
            >
              {trustChips.map((chip, index) => (
                <div
                  key={index}
                  className={cn(
                    'inline-flex items-center gap-1.5 px-3 py-1.5',
                    'rounded-full text-sm',
                    'bg-white/10 backdrop-blur-sm text-white/90',
                    'border border-white/10'
                  )}
                >
                  {chip.icon}
                  <span>{chip.label}</span>
                </div>
              ))}
            </motion.div>
          </motion.div>

          {/* Right Content - Animation Avatar */}
          <motion.div
            className="flex-shrink-0 relative"
            initial={prefersReducedMotion ? {} : { opacity: 0, scale: 0.9 }}
            animate={prefersReducedMotion ? {} : { opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, delay: 0.3, ease: [0.34, 1.56, 0.64, 1] }}
          >
            {/* Spotlight effect behind avatar */}
            <div
              className={cn(
                'absolute inset-0 -m-12',
                'bg-gradient-radial from-accent-500/20 via-accent-500/5 to-transparent',
                'rounded-full blur-2xl'
              )}
              aria-hidden="true"
            />

            <AnimationAvatar
              variant="hero"
              size="xl"
              priority
              ariaLabel="Marketplace shopping illustration"
              className="relative z-10"
            />

            {/* Floating stat badges */}
            <motion.div
              className={cn(
                'absolute -top-4 -left-4 px-4 py-2 rounded-lg',
                'bg-white/95 backdrop-blur-sm shadow-lg',
                'text-sm font-semibold text-primary-900'
              )}
              animate={
                prefersReducedMotion
                  ? {}
                  : {
                      y: [0, -5, 0],
                    }
              }
              transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
            >
              <span className="text-accent-600">10,000+</span> Products
            </motion.div>

            <motion.div
              className={cn(
                'absolute -bottom-4 -right-4 px-4 py-2 rounded-lg',
                'bg-white/95 backdrop-blur-sm shadow-lg',
                'text-sm font-semibold text-primary-900'
              )}
              animate={
                prefersReducedMotion
                  ? {}
                  : {
                      y: [0, -5, 0],
                    }
              }
              transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut', delay: 1.5 }}
            >
              <span className="text-green-600">500+</span> Verified Vendors
            </motion.div>
          </motion.div>
        </div>
      </div>

      {/* Bottom gradient fade */}
      <div
        className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-background to-transparent"
        aria-hidden="true"
      />
    </section>
  );
};

export default MarketplaceHero;
