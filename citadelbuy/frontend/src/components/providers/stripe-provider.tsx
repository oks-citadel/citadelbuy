'use client';

import { ReactNode } from 'react';
import { Elements } from '@stripe/react-stripe-js';
import { loadStripe, Stripe } from '@stripe/stripe-js';

// Load Stripe publishable key from environment
const stripePublishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;

if (!stripePublishableKey) {
  console.warn('NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY is not set');
}

// Initialize Stripe
let stripePromise: Promise<Stripe | null> | null = null;

if (stripePublishableKey) {
  stripePromise = loadStripe(stripePublishableKey);
}

interface StripeProviderProps {
  children: ReactNode;
  clientSecret?: string;
}

export function StripeProvider({ children, clientSecret }: StripeProviderProps) {
  if (!stripePromise) {
    // If Stripe is not configured, render children without Stripe context
    return <>{children}</>;
  }

  const options = clientSecret
    ? {
        clientSecret,
        appearance: {
          theme: 'stripe' as const,
          variables: {
            colorPrimary: '#0070f3',
            colorBackground: '#ffffff',
            colorText: '#000000',
            colorDanger: '#df1b41',
            fontFamily: 'system-ui, sans-serif',
            borderRadius: '8px',
          },
        },
      }
    : undefined;

  return (
    <Elements stripe={stripePromise} options={options}>
      {children}
    </Elements>
  );
}
