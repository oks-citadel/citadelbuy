'use client';

import { motion, useReducedMotion, useInView } from 'framer-motion';
import { useRef } from 'react';
import Link from 'next/link';
import { Globe, Zap, Users, Wallet, ArrowRight, ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';
import { AnimationAvatar } from './animation-avatar';

/**
 * VendorValue Component
 *
 * Presents 4 vendor pillars:
 * - Global reach
 * - Low barrier to entry
 * - Built-in traffic
 * - Simple payouts
 */

interface VendorPillar {
  icon: React.ReactNode;
  title: string;
  description: string;
  stat?: string;
}

const vendorPillars: VendorPillar[] = [
  {
    icon: <Globe className="w-6 h-6" />,
    title: 'Global Reach',
    description: 'Access customers in 180+ countries without any extra setup.',
    stat: '180+ Countries',
  },
  {
    icon: <Zap className="w-6 h-6" />,
    title: 'Quick Setup',
    description: 'Create your store and list products in under 15 minutes.',
    stat: '< 15 min setup',
  },
  {
    icon: <Users className="w-6 h-6" />,
    title: 'Built-in Traffic',
    description: 'Tap into our existing customer base from day one.',
    stat: '2M+ Monthly Visitors',
  },
  {
    icon: <Wallet className="w-6 h-6" />,
    title: 'Simple Payouts',
    description: 'Get paid weekly with transparent fees and no hidden charges.',
    stat: 'Weekly Payouts',
  },
];

interface VendorValueProps {
  className?: string;
}

export const VendorValue: React.FC<VendorValueProps> = ({ className }) => {
  const prefersReducedMotion = useReducedMotion();
  const sectionRef = useRef<HTMLElement>(null);
  const isInView = useInView(sectionRef, { once: true, margin: '-100px' });

  return (
    <section
      ref={sectionRef}
      className={cn('py-16 lg:py-24 bg-white', className)}
      aria-labelledby="vendor-value-title"
    >
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Left Content - Vendor Avatar */}
          <motion.div
            className="relative flex justify-center lg:justify-start order-2 lg:order-1"
            initial={prefersReducedMotion ? {} : { opacity: 0, scale: 0.9 }}
            animate={isInView ? { opacity: 1, scale: 1 } : {}}
            transition={{ duration: 0.6, delay: 0.3 }}
          >
            {/* Background decoration */}
            <div
              className="absolute inset-0 -m-8 bg-gradient-radial from-primary-500/10 via-transparent to-transparent rounded-full blur-2xl"
              aria-hidden="true"
            />

            <AnimationAvatar
              variant="vendor"
              size="lg"
              ariaLabel="Vendor growth illustration"
              className="relative z-10"
            />

            {/* Vendor stats */}
            <motion.div
              className={cn(
                'absolute -top-2 left-0 lg:left-8 px-4 py-2 rounded-lg',
                'bg-white shadow-lg border border-primary-100',
                'text-sm font-medium text-neutral-900'
              )}
              animate={
                prefersReducedMotion
                  ? {}
                  : { y: [0, -5, 0] }
              }
              transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
            >
              <span className="text-primary-600 font-bold">$2.5M+</span> Vendor Payouts
            </motion.div>

            <motion.div
              className={cn(
                'absolute bottom-4 -right-2 lg:right-8 px-4 py-2 rounded-lg',
                'bg-white shadow-lg border border-accent-100',
                'text-sm font-medium text-neutral-900'
              )}
              animate={
                prefersReducedMotion
                  ? {}
                  : { y: [0, -5, 0] }
              }
              transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut', delay: 1.5 }}
            >
              <span className="text-accent-600 font-bold">15%</span> Commission Only
            </motion.div>
          </motion.div>

          {/* Right Content */}
          <motion.div
            className="order-1 lg:order-2"
            initial={prefersReducedMotion ? {} : { opacity: 0, x: 20 }}
            animate={isInView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.5 }}
          >
            {/* Section badge */}
            <div className="inline-flex items-center gap-2 badge-gradient-navy px-3 py-1.5 rounded-full text-sm font-medium mb-6">
              <Globe className="w-4 h-4" />
              Vendor Benefits
            </div>

            <h2
              id="vendor-value-title"
              className="text-3xl sm:text-4xl font-bold text-neutral-900 mb-4"
            >
              Grow Your{' '}
              <span className="text-gradient-gold">Business</span>
            </h2>

            <p className="text-lg text-neutral-600 mb-8 max-w-lg">
              Join thousands of successful vendors who&apos;ve scaled their business with our
              marketplace platform.
            </p>

            {/* Vendor Pillars Grid */}
            <div className="grid sm:grid-cols-2 gap-4 mb-8">
              {vendorPillars.map((pillar, index) => (
                <motion.div
                  key={index}
                  className={cn(
                    'p-4 rounded-xl bg-neutral-50',
                    'border border-neutral-100',
                    'hover:border-primary-200 hover:bg-white',
                    'transition-all duration-300'
                  )}
                  initial={prefersReducedMotion ? {} : { opacity: 0, y: 20 }}
                  animate={isInView ? { opacity: 1, y: 0 } : {}}
                  transition={{ duration: 0.5, delay: index * 0.1 + 0.2 }}
                >
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-lg bg-primary-100 flex items-center justify-center text-primary-600 flex-shrink-0">
                      {pillar.icon}
                    </div>
                    <div>
                      <h3 className="font-semibold text-neutral-900 mb-1">{pillar.title}</h3>
                      <p className="text-sm text-neutral-600 leading-relaxed mb-2">
                        {pillar.description}
                      </p>
                      {pillar.stat && (
                        <span className="inline-block text-xs font-medium text-accent-600 bg-accent-50 px-2 py-0.5 rounded">
                          {pillar.stat}
                        </span>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>

            {/* CTA and transparency note */}
            <div className="space-y-4">
              <Link
                href="/vendor/register"
                className={cn(
                  'inline-flex items-center gap-2',
                  'px-6 py-3 rounded-xl font-semibold text-base',
                  'gradient-marketplace-cta-alt text-white',
                  'shadow-lg shadow-primary-500/20',
                  'transform transition-all duration-300',
                  'hover:shadow-xl hover:shadow-primary-500/30 hover:scale-[1.02]',
                  'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary-400/50',
                  'active:scale-[0.98]'
                )}
              >
                Start Selling
                <ArrowRight className="w-4 h-4" />
              </Link>

              <p className="flex items-center gap-2 text-sm text-neutral-500">
                <ExternalLink className="w-4 h-4" />
                <span>
                  Fees &amp; Payouts are transparent.{' '}
                  <Link
                    href="/vendor/pricing"
                    className="text-primary-600 hover:text-primary-700 underline underline-offset-2"
                  >
                    View vendor terms
                  </Link>
                </span>
              </p>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default VendorValue;
