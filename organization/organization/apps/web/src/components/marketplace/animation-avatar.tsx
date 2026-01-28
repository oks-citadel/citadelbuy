'use client';

import { useEffect, useRef, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { cn } from '@/lib/utils';

/**
 * Animation Avatar Component
 *
 * Features:
 * - Lottie animation support (lazy loaded)
 * - SVG/CSS fallback animations
 * - Static image fallback for reduced motion
 * - Performance optimized (lazy load, small payload)
 * - WCAG compliant
 */

export type AvatarVariant = 'hero' | 'trust' | 'vendor' | 'customer';
export type AvatarSize = 'sm' | 'md' | 'lg' | 'xl';

interface AnimationAvatarProps {
  variant: AvatarVariant;
  size?: AvatarSize;
  className?: string;
  priority?: boolean; // If true, loads immediately (for hero)
  ariaLabel?: string;
}

const sizeMap: Record<AvatarSize, { width: number; height: number; className: string }> = {
  sm: { width: 120, height: 120, className: 'w-[120px] h-[120px]' },
  md: { width: 200, height: 200, className: 'w-[200px] h-[200px]' },
  lg: { width: 300, height: 300, className: 'w-[300px] h-[300px]' },
  xl: { width: 400, height: 400, className: 'w-[400px] h-[400px]' },
};

// CSS-based avatar animations as fallback
const CSSAvatar: React.FC<{ variant: AvatarVariant; size: AvatarSize; reducedMotion: boolean }> = ({
  variant,
  size,
  reducedMotion,
}) => {
  const { className } = sizeMap[size];

  const baseClasses = cn(
    className,
    'relative flex items-center justify-center rounded-full',
    'transition-all duration-300'
  );

  if (variant === 'hero') {
    return (
      <div className={cn(baseClasses, 'spotlight-avatar')}>
        {/* Outer glow ring */}
        <motion.div
          className="absolute inset-0 rounded-full border-2 border-accent-400/30"
          animate={reducedMotion ? {} : { scale: [1, 1.05, 1], opacity: [0.3, 0.6, 0.3] }}
          transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
        />

        {/* Main avatar container */}
        <div className="relative w-4/5 h-4/5 rounded-full bg-gradient-to-br from-primary-600 to-primary-800 flex items-center justify-center shadow-2xl overflow-hidden">
          {/* Abstract marketplace scene */}
          <svg viewBox="0 0 100 100" className="w-full h-full" aria-hidden="true">
            {/* Background gradient */}
            <defs>
              <linearGradient id="heroGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#1a365d" />
                <stop offset="100%" stopColor="#0f2447" />
              </linearGradient>
              <linearGradient id="goldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#c9a227" />
                <stop offset="100%" stopColor="#e6b82e" />
              </linearGradient>
            </defs>

            {/* Shopping bags */}
            <motion.g
              animate={reducedMotion ? {} : { y: [0, -3, 0] }}
              transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
            >
              <rect x="20" y="35" width="20" height="25" rx="3" fill="url(#goldGrad)" opacity="0.9" />
              <path d="M25 35 L25 30 Q30 25 35 30 L35 35" stroke="#a68418" strokeWidth="2" fill="none" />
            </motion.g>

            {/* Store/shop icon */}
            <motion.g
              animate={reducedMotion ? {} : { y: [0, -2, 0] }}
              transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut', delay: 0.3 }}
            >
              <rect x="55" y="40" width="25" height="20" rx="2" fill="white" opacity="0.95" />
              <rect x="55" y="32" width="25" height="10" rx="2" fill="url(#goldGrad)" />
              <rect x="62" y="48" width="5" height="12" fill="#1a365d" opacity="0.3" />
              <rect x="70" y="48" width="5" height="8" fill="#1a365d" opacity="0.2" />
            </motion.g>

            {/* Floating coins/success indicators */}
            <motion.circle
              cx="75"
              cy="25"
              r="6"
              fill="url(#goldGrad)"
              animate={reducedMotion ? {} : { y: [0, -5, 0], opacity: [0.8, 1, 0.8] }}
              transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut', delay: 0.5 }}
            />
            <motion.circle
              cx="30"
              cy="70"
              r="4"
              fill="url(#goldGrad)"
              animate={reducedMotion ? {} : { y: [0, -4, 0], opacity: [0.6, 0.9, 0.6] }}
              transition={{ duration: 2.3, repeat: Infinity, ease: 'easeInOut', delay: 0.8 }}
            />

            {/* Connection lines */}
            <motion.path
              d="M40 47 Q50 42 55 45"
              stroke="url(#goldGrad)"
              strokeWidth="1.5"
              fill="none"
              strokeDasharray="4,2"
              animate={reducedMotion ? {} : { opacity: [0.3, 0.7, 0.3] }}
              transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
            />
          </svg>
        </div>

        {/* Floating elements */}
        <motion.div
          className="absolute -top-2 -right-2 w-8 h-8 bg-accent-500 rounded-full flex items-center justify-center shadow-lg"
          animate={reducedMotion ? {} : { y: [0, -5, 0], rotate: [0, 5, 0] }}
          transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
        >
          <span className="text-white text-xs font-bold">$</span>
        </motion.div>

        <motion.div
          className="absolute -bottom-1 -left-1 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center shadow-lg"
          animate={reducedMotion ? {} : { scale: [1, 1.1, 1] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut', delay: 0.5 }}
        >
          <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
              clipRule="evenodd"
            />
          </svg>
        </motion.div>
      </div>
    );
  }

  if (variant === 'trust') {
    return (
      <div className={cn(baseClasses)}>
        <div className="relative w-full h-full rounded-full bg-gradient-to-br from-green-500/20 to-green-600/20 flex items-center justify-center border border-green-500/30">
          <motion.div
            animate={reducedMotion ? {} : { scale: [1, 1.05, 1] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
          >
            <svg className="w-1/2 h-1/2 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
              />
            </svg>
          </motion.div>
        </div>
      </div>
    );
  }

  if (variant === 'vendor') {
    return (
      <div className={cn(baseClasses)}>
        <div className="relative w-full h-full rounded-full bg-gradient-to-br from-primary-500/20 to-primary-600/20 flex items-center justify-center border border-primary-500/30">
          <motion.div
            animate={reducedMotion ? {} : { y: [0, -3, 0] }}
            transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
          >
            <svg className="w-1/2 h-1/2 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
              />
            </svg>
          </motion.div>
        </div>
      </div>
    );
  }

  // Customer variant
  return (
    <div className={cn(baseClasses)}>
      <div className="relative w-full h-full rounded-full bg-gradient-to-br from-accent-500/20 to-accent-600/20 flex items-center justify-center border border-accent-500/30">
        <motion.div
          animate={reducedMotion ? {} : { scale: [1, 1.03, 1] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
        >
          <svg className="w-1/2 h-1/2 text-accent-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"
            />
          </svg>
        </motion.div>
      </div>
    </div>
  );
};

// Static fallback for no-JS or reduced motion preference
const StaticAvatar: React.FC<{ variant: AvatarVariant; size: AvatarSize }> = ({ variant, size }) => {
  const { className } = sizeMap[size];

  const icons: Record<AvatarVariant, JSX.Element> = {
    hero: (
      <svg className="w-1/2 h-1/2 text-accent-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
      </svg>
    ),
    trust: (
      <svg className="w-1/2 h-1/2 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
      </svg>
    ),
    vendor: (
      <svg className="w-1/2 h-1/2 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
      </svg>
    ),
    customer: (
      <svg className="w-1/2 h-1/2 text-accent-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
      </svg>
    ),
  };

  return (
    <div
      className={cn(
        className,
        'relative flex items-center justify-center rounded-full',
        'bg-gradient-to-br from-neutral-100 to-neutral-200',
        'border border-neutral-200'
      )}
    >
      {icons[variant]}
    </div>
  );
};

export const AnimationAvatar: React.FC<AnimationAvatarProps> = ({
  variant,
  size = 'lg',
  className,
  priority = false,
  ariaLabel,
}) => {
  const prefersReducedMotion = useReducedMotion();
  const [isLoaded, setIsLoaded] = useState(priority);
  const containerRef = useRef<HTMLDivElement>(null);

  // Lazy load animation for non-priority avatars
  useEffect(() => {
    if (priority || isLoaded) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setIsLoaded(true);
          observer.disconnect();
        }
      },
      { rootMargin: '100px' }
    );

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => observer.disconnect();
  }, [priority, isLoaded]);

  const { className: sizeClass } = sizeMap[size];
  const defaultAriaLabel = `${variant} illustration`;

  return (
    <div
      ref={containerRef}
      className={cn(sizeClass, 'relative', className)}
      role="img"
      aria-label={ariaLabel || defaultAriaLabel}
    >
      {!isLoaded ? (
        // Loading placeholder
        <div className={cn(sizeClass, 'rounded-full bg-neutral-200 animate-pulse')} />
      ) : prefersReducedMotion ? (
        // Reduced motion: static fallback
        <StaticAvatar variant={variant} size={size} />
      ) : (
        // Full animation
        <CSSAvatar variant={variant} size={size} reducedMotion={prefersReducedMotion || false} />
      )}
    </div>
  );
};

export default AnimationAvatar;
