'use client';

import { motion, useReducedMotion, useInView } from 'framer-motion';
import { useRef } from 'react';
import Link from 'next/link';
import { ShoppingBag, Store, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * FinalDualCTA Component
 *
 * Decision point with two equal CTAs:
 * - Shop Products
 * - Become a Vendor
 * Strong gradient background with contrast compliance
 */

interface FinalDualCTAProps {
  className?: string;
  shopCtaText?: string;
  shopCtaHref?: string;
  vendorCtaText?: string;
  vendorCtaHref?: string;
}

export const FinalDualCTA: React.FC<FinalDualCTAProps> = ({
  className,
  shopCtaText = 'Start Shopping',
  shopCtaHref = '/products',
  vendorCtaText = 'Become a Vendor',
  vendorCtaHref = '/vendor/register',
}) => {
  const prefersReducedMotion = useReducedMotion();
  const sectionRef = useRef<HTMLElement>(null);
  const isInView = useInView(sectionRef, { once: true, margin: '-100px' });

  // Analytics event handlers
  const trackCtaClick = (ctaType: 'shop' | 'vendor') => {
    if (typeof window !== 'undefined' && 'gtag' in window) {
      (window as any).gtag('event', ctaType === 'shop' ? 'final_shop_click' : 'final_vendor_click', {
        event_category: 'CTA',
        event_label: `Final ${ctaType} CTA`,
      });
    }
  };

  return (
    <section
      ref={sectionRef}
      className={cn('py-16 lg:py-24', className)}
      aria-labelledby="final-cta-title"
    >
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          className={cn(
            'relative overflow-hidden rounded-3xl',
            'gradient-marketplace-hero',
            'p-8 sm:p-12 lg:p-16'
          )}
          initial={prefersReducedMotion ? {} : { opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5 }}
        >
          {/* Background decorations */}
          <div className="absolute inset-0 overflow-hidden" aria-hidden="true">
            {/* Gradient orbs */}
            <div
              className={cn(
                'absolute -top-24 -right-24 w-96 h-96',
                'bg-gradient-radial from-accent-500/20 via-transparent to-transparent',
                'rounded-full blur-3xl'
              )}
            />
            <div
              className={cn(
                'absolute -bottom-24 -left-24 w-72 h-72',
                'bg-gradient-radial from-primary-400/20 via-transparent to-transparent',
                'rounded-full blur-3xl'
              )}
            />

            {/* Grid pattern */}
            <div
              className="absolute inset-0 opacity-[0.03]"
              style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
              }}
            />
          </div>

          {/* Content */}
          <div className="relative z-10 text-center">
            <motion.h2
              id="final-cta-title"
              className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-4"
              initial={prefersReducedMotion ? {} : { opacity: 0, y: 20 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5, delay: 0.1 }}
            >
              Ready to Get{' '}
              <span className="text-gradient-gold">Started</span>?
            </motion.h2>

            <motion.p
              className="text-lg sm:text-xl text-neutral-300 mb-10 max-w-2xl mx-auto"
              initial={prefersReducedMotion ? {} : { opacity: 0, y: 20 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              Join our thriving marketplace community today.
              Whether you&apos;re here to shop or sell, we&apos;ve got you covered.
            </motion.p>

            {/* Dual CTAs */}
            <motion.div
              className="flex flex-col sm:flex-row gap-4 justify-center"
              initial={prefersReducedMotion ? {} : { opacity: 0, y: 20 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5, delay: 0.3 }}
            >
              {/* Shop CTA */}
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
                <ArrowRight
                  className={cn(
                    'w-4 h-4 transition-transform duration-300',
                    !prefersReducedMotion && 'group-hover:translate-x-1'
                  )}
                />
              </Link>

              {/* Vendor CTA */}
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
                <ArrowRight
                  className={cn(
                    'w-4 h-4 transition-transform duration-300',
                    !prefersReducedMotion && 'group-hover:translate-x-1'
                  )}
                />
              </Link>
            </motion.div>

            {/* Trust indicators */}
            <motion.div
              className="flex flex-wrap items-center justify-center gap-6 mt-8 text-sm text-neutral-400"
              initial={prefersReducedMotion ? {} : { opacity: 0 }}
              animate={isInView ? { opacity: 1 } : {}}
              transition={{ duration: 0.5, delay: 0.4 }}
            >
              <span className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-green-500" />
                Free to join
              </span>
              <span className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-accent-500" />
                No hidden fees
              </span>
              <span className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-blue-500" />
                24/7 Support
              </span>
            </motion.div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default FinalDualCTA;
