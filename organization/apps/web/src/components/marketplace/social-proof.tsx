'use client';

import { motion, useReducedMotion, useInView } from 'framer-motion';
import { useRef } from 'react';
import Image from 'next/image';
import { Star, Quote, ShoppingBag, Store } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * SocialProof Component
 *
 * Two testimonial cards:
 * - Customer testimonial
 * - Vendor testimonial
 * With star ratings and gradient accents
 */

interface Testimonial {
  type: 'customer' | 'vendor';
  name: string;
  role: string;
  avatar: string;
  content: string;
  rating: number;
  highlight?: string;
}

const testimonials: Testimonial[] = [
  {
    type: 'customer',
    name: 'Sarah Johnson',
    role: 'Verified Buyer',
    avatar: '/images/avatars/customer-1.svg',
    content:
      'I was hesitant about buying from online marketplaces, but Broxiva changed my mind. The buyer protection gave me confidence, and every order arrived exactly as described. The quality from verified vendors is consistently excellent.',
    rating: 5,
    highlight: 'Buyer protection changed everything',
  },
  {
    type: 'vendor',
    name: 'Michael Chen',
    role: 'Store Owner',
    avatar: '/images/avatars/vendor-1.svg',
    content:
      'Within 3 months of joining, my sales tripled. The built-in traffic from Broxiva meant I didn\'t have to spend thousands on marketing. The weekly payouts and transparent fees make financial planning so much easier.',
    rating: 5,
    highlight: 'Sales tripled in 3 months',
  },
];

interface TestimonialCardProps {
  testimonial: Testimonial;
  index: number;
  reducedMotion: boolean | null;
  inView: boolean;
}

const TestimonialCard: React.FC<TestimonialCardProps> = ({
  testimonial,
  index,
  reducedMotion,
  inView,
}) => {
  const isCustomer = testimonial.type === 'customer';

  return (
    <motion.div
      className={cn(
        'relative p-6 lg:p-8 rounded-2xl',
        'bg-white border',
        isCustomer ? 'border-accent-200' : 'border-primary-200',
        'shadow-sm hover:shadow-lg transition-shadow duration-300'
      )}
      initial={reducedMotion ? {} : { opacity: 0, y: 30 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.5, delay: index * 0.2 }}
    >
      {/* Gradient accent top border */}
      <div
        className={cn(
          'absolute top-0 left-0 right-0 h-1 rounded-t-2xl',
          isCustomer
            ? 'bg-gradient-to-r from-accent-400 via-accent-500 to-accent-400'
            : 'bg-gradient-to-r from-primary-500 via-primary-600 to-primary-500'
        )}
        aria-hidden="true"
      />

      {/* Type badge */}
      <div
        className={cn(
          'inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium mb-4',
          isCustomer ? 'badge-gradient-gold' : 'badge-gradient-navy'
        )}
      >
        {isCustomer ? (
          <>
            <ShoppingBag className="w-3 h-3" />
            Customer Review
          </>
        ) : (
          <>
            <Store className="w-3 h-3" />
            Vendor Review
          </>
        )}
      </div>

      {/* Quote icon */}
      <Quote
        className={cn(
          'w-8 h-8 mb-4',
          isCustomer ? 'text-accent-200' : 'text-primary-200'
        )}
        aria-hidden="true"
      />

      {/* Highlight */}
      {testimonial.highlight && (
        <p
          className={cn(
            'text-lg font-semibold mb-2',
            isCustomer ? 'text-accent-700' : 'text-primary-700'
          )}
        >
          &ldquo;{testimonial.highlight}&rdquo;
        </p>
      )}

      {/* Content */}
      <p className="text-neutral-600 leading-relaxed mb-6">{testimonial.content}</p>

      {/* Rating */}
      <div className="flex items-center gap-1 mb-4" role="img" aria-label={`${testimonial.rating} out of 5 stars`}>
        {Array.from({ length: 5 }).map((_, i) => (
          <Star
            key={i}
            className={cn(
              'w-4 h-4',
              i < testimonial.rating
                ? 'fill-accent-500 text-accent-500'
                : 'fill-neutral-200 text-neutral-200'
            )}
          />
        ))}
      </div>

      {/* Author */}
      <div className="flex items-center gap-3">
        <div className="relative w-12 h-12 rounded-full overflow-hidden border-2 border-neutral-100">
          <Image
            src={testimonial.avatar}
            alt={testimonial.name}
            fill
            className="object-cover"
            sizes="48px"
          />
        </div>
        <div>
          <p className="font-semibold text-neutral-900">{testimonial.name}</p>
          <p className="text-sm text-neutral-500">{testimonial.role}</p>
        </div>
      </div>
    </motion.div>
  );
};

interface SocialProofProps {
  className?: string;
  showRatingSummary?: boolean;
  averageRating?: number;
  totalReviews?: number;
}

export const SocialProof: React.FC<SocialProofProps> = ({
  className,
  showRatingSummary = true,
  averageRating = 4.9,
  totalReviews = 12500,
}) => {
  const prefersReducedMotion = useReducedMotion();
  const sectionRef = useRef<HTMLElement>(null);
  const isInView = useInView(sectionRef, { once: true, margin: '-100px' });

  return (
    <section
      ref={sectionRef}
      className={cn('py-16 lg:py-24 gradient-marketplace-neutral', className)}
      aria-labelledby="social-proof-title"
    >
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <motion.div
          className="text-center mb-12"
          initial={prefersReducedMotion ? {} : { opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5 }}
        >
          <h2
            id="social-proof-title"
            className="text-3xl sm:text-4xl font-bold text-neutral-900 mb-4"
          >
            Trusted by{' '}
            <span className="text-gradient-dual">Thousands</span>
          </h2>
          <p className="text-lg text-neutral-600 max-w-2xl mx-auto">
            Hear what our community of buyers and sellers have to say
          </p>

          {/* Rating Summary */}
          {showRatingSummary && (
            <div className="flex items-center justify-center gap-4 mt-6">
              <div className="flex items-center gap-1">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star
                    key={i}
                    className={cn(
                      'w-5 h-5',
                      i < Math.floor(averageRating)
                        ? 'fill-accent-500 text-accent-500'
                        : 'fill-neutral-200 text-neutral-200'
                    )}
                  />
                ))}
              </div>
              <span className="font-semibold text-neutral-900">{averageRating}</span>
              <span className="text-neutral-500">
                ({totalReviews.toLocaleString()} reviews)
              </span>
            </div>
          )}
        </motion.div>

        {/* Testimonials Grid */}
        <div className="grid md:grid-cols-2 gap-6 lg:gap-8 max-w-5xl mx-auto">
          {testimonials.map((testimonial, index) => (
            <TestimonialCard
              key={testimonial.type}
              testimonial={testimonial}
              index={index}
              reducedMotion={prefersReducedMotion}
              inView={isInView}
            />
          ))}
        </div>
      </div>
    </section>
  );
};

export default SocialProof;
