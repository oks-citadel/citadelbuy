'use client';

import { motion, useReducedMotion, useInView } from 'framer-motion';
import { useRef } from 'react';
import {
  Search,
  ShoppingCart,
  CreditCard,
  Package,
  Store,
  Upload,
  DollarSign,
  TrendingUp,
} from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * HowItWorks Component (Split Flow)
 *
 * Two columns showing parallel flows:
 * - For Customers (4 steps)
 * - For Vendors (4 steps)
 */

interface Step {
  icon: React.ReactNode;
  title: string;
  description: string;
}

const customerSteps: Step[] = [
  {
    icon: <Search className="w-6 h-6" />,
    title: 'Browse & Discover',
    description: 'Explore thousands of products from verified vendors worldwide.',
  },
  {
    icon: <ShoppingCart className="w-6 h-6" />,
    title: 'Add to Cart',
    description: 'Select your items and customize options as needed.',
  },
  {
    icon: <CreditCard className="w-6 h-6" />,
    title: 'Secure Checkout',
    description: 'Pay safely with buyer protection on every purchase.',
  },
  {
    icon: <Package className="w-6 h-6" />,
    title: 'Track & Receive',
    description: 'Follow your order in real-time until it arrives.',
  },
];

const vendorSteps: Step[] = [
  {
    icon: <Store className="w-6 h-6" />,
    title: 'Create Your Store',
    description: 'Sign up and set up your storefront in minutes.',
  },
  {
    icon: <Upload className="w-6 h-6" />,
    title: 'List Products',
    description: 'Add your products with photos, descriptions, and pricing.',
  },
  {
    icon: <TrendingUp className="w-6 h-6" />,
    title: 'Start Selling',
    description: 'Reach customers globally with built-in traffic.',
  },
  {
    icon: <DollarSign className="w-6 h-6" />,
    title: 'Get Paid',
    description: 'Receive secure payouts directly to your account.',
  },
];

interface StepCardProps {
  step: Step;
  index: number;
  type: 'customer' | 'vendor';
  reducedMotion: boolean | null;
  inView: boolean;
}

const StepCard: React.FC<StepCardProps> = ({ step, index, type, reducedMotion, inView }) => {
  const isCustomer = type === 'customer';

  return (
    <motion.div
      className={cn(
        'relative flex items-start gap-4 p-4 rounded-xl',
        'bg-white border border-neutral-100',
        'shadow-sm hover:shadow-md transition-shadow duration-300',
        'group'
      )}
      initial={reducedMotion ? {} : { opacity: 0, x: isCustomer ? -20 : 20 }}
      animate={inView ? { opacity: 1, x: 0 } : {}}
      transition={{ duration: 0.5, delay: index * 0.1 + 0.2 }}
    >
      {/* Step number */}
      <div
        className={cn(
          'absolute -top-2 -left-2 w-6 h-6 rounded-full',
          'flex items-center justify-center text-xs font-bold',
          isCustomer
            ? 'bg-accent-500 text-primary-900'
            : 'bg-primary-600 text-white'
        )}
      >
        {index + 1}
      </div>

      {/* Icon */}
      <div
        className={cn(
          'flex-shrink-0 w-12 h-12 rounded-lg',
          'flex items-center justify-center',
          isCustomer
            ? 'bg-accent-50 text-accent-600 group-hover:bg-accent-100'
            : 'bg-primary-50 text-primary-600 group-hover:bg-primary-100',
          'transition-colors duration-300'
        )}
      >
        {step.icon}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <h4 className="font-semibold text-neutral-900 mb-1">{step.title}</h4>
        <p className="text-sm text-neutral-600 leading-relaxed">{step.description}</p>
      </div>
    </motion.div>
  );
};

interface HowItWorksProps {
  className?: string;
}

export const HowItWorks: React.FC<HowItWorksProps> = ({ className }) => {
  const prefersReducedMotion = useReducedMotion();
  const sectionRef = useRef<HTMLElement>(null);
  const isInView = useInView(sectionRef, { once: true, margin: '-100px' });

  return (
    <section
      ref={sectionRef}
      className={cn('py-16 lg:py-24 bg-neutral-50', className)}
      aria-labelledby="how-it-works-title"
    >
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <motion.div
          className="text-center mb-12 lg:mb-16"
          initial={prefersReducedMotion ? {} : { opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5 }}
        >
          <h2
            id="how-it-works-title"
            className="text-3xl sm:text-4xl font-bold text-neutral-900 mb-4"
          >
            How It Works
          </h2>
          <p className="text-lg text-neutral-600 max-w-2xl mx-auto">
            Whether you&apos;re here to shop or sell, getting started is easy.
          </p>
        </motion.div>

        {/* Two Column Grid */}
        <div className="grid lg:grid-cols-2 gap-8 lg:gap-12">
          {/* Customer Column */}
          <div>
            <motion.div
              className={cn(
                'flex items-center gap-3 mb-6',
                'pb-4 border-b-2 border-accent-500'
              )}
              initial={prefersReducedMotion ? {} : { opacity: 0, x: -20 }}
              animate={isInView ? { opacity: 1, x: 0 } : {}}
              transition={{ duration: 0.5, delay: 0.1 }}
            >
              <div className="w-10 h-10 rounded-full bg-accent-100 flex items-center justify-center">
                <ShoppingCart className="w-5 h-5 text-accent-600" />
              </div>
              <h3 className="text-xl font-bold text-neutral-900">For Customers</h3>
            </motion.div>

            <div className="space-y-4">
              {customerSteps.map((step, index) => (
                <StepCard
                  key={index}
                  step={step}
                  index={index}
                  type="customer"
                  reducedMotion={prefersReducedMotion}
                  inView={isInView}
                />
              ))}
            </div>
          </div>

          {/* Vendor Column */}
          <div>
            <motion.div
              className={cn(
                'flex items-center gap-3 mb-6',
                'pb-4 border-b-2 border-primary-600'
              )}
              initial={prefersReducedMotion ? {} : { opacity: 0, x: 20 }}
              animate={isInView ? { opacity: 1, x: 0 } : {}}
              transition={{ duration: 0.5, delay: 0.1 }}
            >
              <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center">
                <Store className="w-5 h-5 text-primary-600" />
              </div>
              <h3 className="text-xl font-bold text-neutral-900">For Vendors</h3>
            </motion.div>

            <div className="space-y-4">
              {vendorSteps.map((step, index) => (
                <StepCard
                  key={index}
                  step={step}
                  index={index}
                  type="vendor"
                  reducedMotion={prefersReducedMotion}
                  inView={isInView}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Connecting line (desktop only) */}
        <div
          className="hidden lg:block absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 h-[calc(100%-200px)] w-px gradient-marketplace-divider"
          aria-hidden="true"
        />
      </div>
    </section>
  );
};

export default HowItWorks;
