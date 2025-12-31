'use client';

import { useState } from 'react';
import { motion, useReducedMotion, useInView } from 'framer-motion';
import { useRef } from 'react';
import { Mail, Shield, CheckCircle, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * EmailCapture Component
 *
 * Clean email capture with:
 * - Single email field
 * - Privacy reassurance
 * - Success state
 */

interface EmailCaptureProps {
  className?: string;
  heading?: string;
  description?: string;
  privacyNote?: string;
}

export const EmailCapture: React.FC<EmailCaptureProps> = ({
  className,
  heading = 'Stay in the Loop',
  description = 'Get updates, new vendors, and featured deals delivered to your inbox.',
  privacyNote = 'We respect your privacy. Unsubscribe anytime.',
}) => {
  const prefersReducedMotion = useReducedMotion();
  const sectionRef = useRef<HTMLElement>(null);
  const isInView = useInView(sectionRef, { once: true, margin: '-100px' });

  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Basic validation
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setStatus('error');
      setErrorMessage('Please enter a valid email address');
      return;
    }

    setStatus('loading');
    setErrorMessage('');

    try {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // In production, this would call your newsletter API
      // const response = await fetch('/api/newsletter/subscribe', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({ email }),
      // });

      setStatus('success');
      setEmail('');

      // Track conversion
      if (typeof window !== 'undefined' && 'gtag' in window) {
        (window as any).gtag('event', 'newsletter_signup', {
          event_category: 'Engagement',
          event_label: 'Email Capture',
        });
      }
    } catch {
      setStatus('error');
      setErrorMessage('Something went wrong. Please try again.');
    }
  };

  return (
    <section
      ref={sectionRef}
      className={cn('py-16 lg:py-20', className)}
      aria-labelledby="email-capture-title"
    >
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          className={cn(
            'max-w-2xl mx-auto text-center',
            'p-8 lg:p-12 rounded-2xl',
            'bg-white border border-neutral-100',
            'shadow-lg'
          )}
          initial={prefersReducedMotion ? {} : { opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5 }}
        >
          {/* Icon */}
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-accent-100 text-accent-600 mb-6">
            <Mail className="w-7 h-7" />
          </div>

          <h2
            id="email-capture-title"
            className="text-2xl sm:text-3xl font-bold text-neutral-900 mb-3"
          >
            {heading}
          </h2>

          <p className="text-neutral-600 mb-8 max-w-md mx-auto">{description}</p>

          {status === 'success' ? (
            <motion.div
              className="flex flex-col items-center gap-3 py-4"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3 }}
            >
              <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-green-600" />
              </div>
              <p className="text-green-700 font-medium">You&apos;re on the list!</p>
              <p className="text-sm text-neutral-500">Check your inbox for a welcome email.</p>
            </motion.div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="flex-1 relative">
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (status === 'error') setStatus('idle');
                    }}
                    placeholder="Enter your email"
                    className={cn(
                      'w-full px-4 py-3 rounded-xl',
                      'border transition-colors duration-200',
                      'text-neutral-900 placeholder:text-neutral-400',
                      'focus:outline-none focus:ring-4',
                      status === 'error'
                        ? 'border-red-300 focus:ring-red-100'
                        : 'border-neutral-200 focus:border-primary-300 focus:ring-primary-100'
                    )}
                    aria-label="Email address"
                    aria-invalid={status === 'error'}
                    aria-describedby={status === 'error' ? 'email-error' : undefined}
                    disabled={status === 'loading'}
                  />
                </div>

                <button
                  type="submit"
                  disabled={status === 'loading'}
                  className={cn(
                    'inline-flex items-center justify-center gap-2',
                    'px-6 py-3 rounded-xl font-semibold',
                    'gradient-marketplace-cta text-primary-900',
                    'shadow-md shadow-accent-500/20',
                    'transform transition-all duration-300',
                    'hover:shadow-lg hover:shadow-accent-500/30 hover:scale-[1.02]',
                    'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-accent-400/50',
                    'active:scale-[0.98]',
                    'disabled:opacity-70 disabled:cursor-not-allowed disabled:transform-none'
                  )}
                >
                  {status === 'loading' ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Subscribing...
                    </>
                  ) : (
                    'Subscribe'
                  )}
                </button>
              </div>

              {/* Error message */}
              {status === 'error' && errorMessage && (
                <p id="email-error" className="text-sm text-red-600" role="alert">
                  {errorMessage}
                </p>
              )}

              {/* Privacy note */}
              <p className="flex items-center justify-center gap-2 text-xs text-neutral-500">
                <Shield className="w-3.5 h-3.5" />
                {privacyNote}
              </p>
            </form>
          )}
        </motion.div>
      </div>
    </section>
  );
};

export default EmailCapture;
