'use client';

import { motion, useReducedMotion, useInView } from 'framer-motion';
import { useRef } from 'react';
import { Shield, Star, Lock, Scale } from 'lucide-react';
import { cn } from '@/lib/utils';
import { AnimationAvatar } from './animation-avatar';

/**
 * BuyerTrust Component
 *
 * Presents 4 trust pillars for customers:
 * - Verified sellers
 * - Transparent reviews
 * - Secure checkout
 * - Dispute resolution
 */

interface TrustPillar {
  icon: React.ReactNode;
  title: string;
  description: string;
}

const trustPillars: TrustPillar[] = [
  {
    icon: <Shield className="w-6 h-6" />,
    title: 'Verified Sellers',
    description: 'Every vendor goes through our rigorous verification process before listing products.',
  },
  {
    icon: <Star className="w-6 h-6" />,
    title: 'Transparent Reviews',
    description: 'Authentic reviews from real customers help you make informed decisions.',
  },
  {
    icon: <Lock className="w-6 h-6" />,
    title: 'Secure Checkout',
    description: 'Your payment information is protected with bank-level encryption.',
  },
  {
    icon: <Scale className="w-6 h-6" />,
    title: 'Dispute Resolution',
    description: 'Our dedicated team helps resolve any issues fairly and quickly.',
  },
];

interface BuyerTrustProps {
  className?: string;
}

export const BuyerTrust: React.FC<BuyerTrustProps> = ({ className }) => {
  const prefersReducedMotion = useReducedMotion();
  const sectionRef = useRef<HTMLElement>(null);
  const isInView = useInView(sectionRef, { once: true, margin: '-100px' });

  return (
    <section
      ref={sectionRef}
      className={cn(
        'py-16 lg:py-24',
        'gradient-marketplace-neutral',
        className
      )}
      aria-labelledby="buyer-trust-title"
    >
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Left Content */}
          <motion.div
            initial={prefersReducedMotion ? {} : { opacity: 0, x: -20 }}
            animate={isInView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.5 }}
          >
            {/* Section badge */}
            <div className="inline-flex items-center gap-2 badge-gradient-success px-3 py-1.5 rounded-full text-sm font-medium mb-6">
              <Shield className="w-4 h-4" />
              Buyer Protection
            </div>

            <h2
              id="buyer-trust-title"
              className="text-3xl sm:text-4xl font-bold text-neutral-900 mb-4"
            >
              Shop with{' '}
              <span className="text-gradient-navy">Confidence</span>
            </h2>

            <p className="text-lg text-neutral-600 mb-8 max-w-lg">
              We&apos;ve built multiple layers of protection to ensure every purchase is safe
              and every customer is satisfied.
            </p>

            {/* Trust Pillars Grid */}
            <div className="grid sm:grid-cols-2 gap-4">
              {trustPillars.map((pillar, index) => (
                <motion.div
                  key={index}
                  className={cn(
                    'p-4 rounded-xl bg-white',
                    'border border-neutral-100 shadow-sm',
                    'hover:shadow-md hover:border-green-200',
                    'transition-all duration-300'
                  )}
                  initial={prefersReducedMotion ? {} : { opacity: 0, y: 20 }}
                  animate={isInView ? { opacity: 1, y: 0 } : {}}
                  transition={{ duration: 0.5, delay: index * 0.1 + 0.2 }}
                >
                  <div className="w-10 h-10 rounded-lg bg-green-50 flex items-center justify-center text-green-600 mb-3">
                    {pillar.icon}
                  </div>
                  <h3 className="font-semibold text-neutral-900 mb-1">{pillar.title}</h3>
                  <p className="text-sm text-neutral-600 leading-relaxed">
                    {pillar.description}
                  </p>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* Right Content - Trust Avatar */}
          <motion.div
            className="relative flex justify-center lg:justify-end"
            initial={prefersReducedMotion ? {} : { opacity: 0, scale: 0.9 }}
            animate={isInView ? { opacity: 1, scale: 1 } : {}}
            transition={{ duration: 0.6, delay: 0.3 }}
          >
            {/* Background decoration */}
            <div
              className="absolute inset-0 -m-8 bg-gradient-radial from-green-500/10 via-transparent to-transparent rounded-full blur-2xl"
              aria-hidden="true"
            />

            <AnimationAvatar
              variant="trust"
              size="lg"
              ariaLabel="Trust and security illustration"
              className="relative z-10"
            />

            {/* Trust stats */}
            <motion.div
              className={cn(
                'absolute -top-2 right-0 lg:right-8 px-4 py-2 rounded-lg',
                'bg-white shadow-lg border border-green-100',
                'text-sm font-medium text-neutral-900'
              )}
              animate={
                prefersReducedMotion
                  ? {}
                  : { y: [0, -5, 0] }
              }
              transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
            >
              <span className="text-green-600 font-bold">99.8%</span> Satisfaction Rate
            </motion.div>

            <motion.div
              className={cn(
                'absolute bottom-4 -left-2 lg:left-8 px-4 py-2 rounded-lg',
                'bg-white shadow-lg border border-green-100',
                'text-sm font-medium text-neutral-900'
              )}
              animate={
                prefersReducedMotion
                  ? {}
                  : { y: [0, -5, 0] }
              }
              transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut', delay: 1.5 }}
            >
              <span className="text-green-600 font-bold">24/7</span> Support Available
            </motion.div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default BuyerTrust;
