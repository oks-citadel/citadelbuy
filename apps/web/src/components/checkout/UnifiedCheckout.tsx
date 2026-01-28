'use client';

import React, { useState, useEffect } from 'react';
import { loadStripe, Stripe, StripeElementsOptions } from '@stripe/stripe-js';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, CreditCard, Wallet, Building2 } from 'lucide-react';

// Payment provider types
type PaymentProvider = 'STRIPE' | 'PAYPAL' | 'FLUTTERWAVE' | 'PAYSTACK';

interface CheckoutItem {
  id: string;
  name: string;
  quantity: number;
  unitPrice: number;
}

interface CheckoutProps {
  amount: number;
  currency: string;
  items?: CheckoutItem[];
  metadata?: Record<string, any>;
  onSuccess: (result: PaymentResult) => void;
  onError: (error: string) => void;
  returnUrl?: string;
  cancelUrl?: string;
  availableProviders?: PaymentProvider[];
}

interface PaymentResult {
  success: boolean;
  transactionId: string;
  provider: PaymentProvider;
}

// Initialize Stripe
const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || '');

// API helper
const api = {
  post: async (url: string, body: any) => {
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || ''}${url}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
      },
      body: JSON.stringify(body),
    });
    return res.json();
  },
  get: async (url: string) => {
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || ''}${url}`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
      },
    });
    return res.json();
  },
};

/**
 * Stripe Payment Form Component
 */
function StripePaymentForm({
  onSuccess,
  onError,
}: {
  onSuccess: (result: PaymentResult) => void;
  onError: (error: string) => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) return;

    setIsLoading(true);

    try {
      const { error, paymentIntent } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: window.location.origin + '/checkout/success',
        },
        redirect: 'if_required',
      });

      if (error) {
        onError(error.message || 'Payment failed');
      } else if (paymentIntent?.status === 'succeeded') {
        onSuccess({
          success: true,
          transactionId: paymentIntent.id,
          provider: 'STRIPE',
        });
      }
    } catch (err: any) {
      onError(err.message || 'Payment failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <PaymentElement />
      <Button
        type="submit"
        className="w-full mt-4"
        disabled={!stripe || isLoading}
      >
        {isLoading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Processing...
          </>
        ) : (
          'Pay Now'
        )}
      </Button>
    </form>
  );
}

/**
 * PayPal Payment Component
 */
function PayPalPayment({
  amount,
  currency,
  items,
  metadata,
  onSuccess,
  onError,
  returnUrl,
  cancelUrl,
}: {
  amount: number;
  currency: string;
  items?: CheckoutItem[];
  metadata?: Record<string, any>;
  onSuccess: (result: PaymentResult) => void;
  onError: (error: string) => void;
  returnUrl?: string;
  cancelUrl?: string;
}) {
  const [isLoading, setIsLoading] = useState(false);

  const handlePayPal = async () => {
    setIsLoading(true);

    try {
      const response = await api.post('/api/payments/paypal/create-order', {
        amount,
        currency,
        items,
        metadata,
        returnUrl: returnUrl || `${window.location.origin}/checkout/success`,
        cancelUrl: cancelUrl || `${window.location.origin}/checkout/cancel`,
      });

      if (response.success && response.checkoutUrl) {
        // Redirect to PayPal
        window.location.href = response.checkoutUrl;
      } else {
        onError(response.error?.message || 'Failed to create PayPal order');
      }
    } catch (err: any) {
      onError(err.message || 'PayPal payment failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button
      onClick={handlePayPal}
      className="w-full bg-[#0070ba] hover:bg-[#003087]"
      disabled={isLoading}
    >
      {isLoading ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Connecting to PayPal...
        </>
      ) : (
        <>
          <svg className="mr-2 h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
            <path d="M7.076 21.337H2.47a.641.641 0 0 1-.633-.74L4.944.901C5.026.382 5.474 0 5.998 0h7.46c2.57 0 4.578.543 5.69 1.81 1.01 1.15 1.304 2.42 1.012 4.287-.023.143-.047.288-.077.437-.983 5.05-4.349 6.797-8.647 6.797h-2.19c-.524 0-.968.382-1.05.9l-1.12 7.106zm14.146-14.42a3.35 3.35 0 0 0-.607-.541c-.013.076-.026.175-.041.254-.59 3.025-2.566 6.082-8.558 6.082H9.828l-1.453 9.212h3.838a.641.641 0 0 0 .633-.54l.026-.169.503-3.185.032-.174a.641.641 0 0 1 .633-.54h.399c2.584 0 4.607-.953 5.198-3.71.247-1.15.191-2.113-.264-2.789z"/>
          </svg>
          Pay with PayPal
        </>
      )}
    </Button>
  );
}

/**
 * Flutterwave Payment Component
 */
function FlutterwavePayment({
  amount,
  currency,
  items,
  metadata,
  onSuccess,
  onError,
  returnUrl,
}: {
  amount: number;
  currency: string;
  items?: CheckoutItem[];
  metadata?: Record<string, any>;
  onSuccess: (result: PaymentResult) => void;
  onError: (error: string) => void;
  returnUrl?: string;
}) {
  const [isLoading, setIsLoading] = useState(false);

  const handleFlutterwave = async () => {
    setIsLoading(true);

    try {
      const response = await api.post('/api/payments/flutterwave/init', {
        amount,
        currency: currency || 'NGN',
        items,
        metadata,
        returnUrl: returnUrl || `${window.location.origin}/checkout/success`,
      });

      if (response.success && response.checkoutUrl) {
        window.location.href = response.checkoutUrl;
      } else {
        onError(response.error?.message || 'Failed to initialize Flutterwave');
      }
    } catch (err: any) {
      onError(err.message || 'Flutterwave payment failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button
      onClick={handleFlutterwave}
      className="w-full bg-[#f5a623] hover:bg-[#e09612] text-black"
      disabled={isLoading}
    >
      {isLoading ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Connecting...
        </>
      ) : (
        <>
          <Building2 className="mr-2 h-5 w-5" />
          Pay with Flutterwave
        </>
      )}
    </Button>
  );
}

/**
 * Paystack Payment Component
 */
function PaystackPayment({
  amount,
  currency,
  items,
  metadata,
  onSuccess,
  onError,
  returnUrl,
}: {
  amount: number;
  currency: string;
  items?: CheckoutItem[];
  metadata?: Record<string, any>;
  onSuccess: (result: PaymentResult) => void;
  onError: (error: string) => void;
  returnUrl?: string;
}) {
  const [isLoading, setIsLoading] = useState(false);

  const handlePaystack = async () => {
    setIsLoading(true);

    try {
      const response = await api.post('/api/payments/paystack/init', {
        amount,
        currency: currency || 'NGN',
        items,
        metadata,
        returnUrl: returnUrl || `${window.location.origin}/checkout/success`,
      });

      if (response.success && response.checkoutUrl) {
        window.location.href = response.checkoutUrl;
      } else {
        onError(response.error?.message || 'Failed to initialize Paystack');
      }
    } catch (err: any) {
      onError(err.message || 'Paystack payment failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button
      onClick={handlePaystack}
      className="w-full bg-[#00c3f7] hover:bg-[#00a8d4] text-white"
      disabled={isLoading}
    >
      {isLoading ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Connecting...
        </>
      ) : (
        <>
          <Building2 className="mr-2 h-5 w-5" />
          Pay with Paystack
        </>
      )}
    </Button>
  );
}

/**
 * Unified Checkout Component
 *
 * Supports multiple payment providers:
 * - Stripe (cards, Apple Pay, Google Pay)
 * - PayPal
 * - Flutterwave (African markets)
 * - Paystack (Nigeria, Ghana)
 */
export function UnifiedCheckout({
  amount,
  currency,
  items,
  metadata,
  onSuccess,
  onError,
  returnUrl,
  cancelUrl,
  availableProviders = ['STRIPE', 'PAYPAL'],
}: CheckoutProps) {
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [selectedProvider, setSelectedProvider] = useState<PaymentProvider>(availableProviders[0]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Create Stripe payment intent when Stripe is selected
  useEffect(() => {
    if (selectedProvider === 'STRIPE') {
      createStripeIntent();
    }
  }, [selectedProvider, amount, currency]);

  const createStripeIntent = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await api.post('/api/payments/checkout-session', {
        amount,
        currency,
        items,
        metadata,
        provider: 'STRIPE',
        returnUrl,
        cancelUrl,
      });

      if (response.success && response.clientSecret) {
        setClientSecret(response.clientSecret);
      } else {
        setError(response.error?.message || 'Failed to create payment');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to initialize payment');
    } finally {
      setIsLoading(false);
    }
  };

  const stripeOptions: StripeElementsOptions = {
    clientSecret: clientSecret || undefined,
    appearance: {
      theme: 'stripe',
      variables: {
        colorPrimary: '#0070f3',
        colorBackground: '#ffffff',
        colorText: '#1a1a1a',
        colorDanger: '#df1b41',
        fontFamily: 'system-ui, sans-serif',
        spacingUnit: '4px',
        borderRadius: '8px',
      },
    },
  };

  const handleError = (message: string) => {
    setError(message);
    onError(message);
  };

  const getProviderTab = (provider: PaymentProvider) => {
    switch (provider) {
      case 'STRIPE':
        return { label: 'Card', icon: <CreditCard className="h-4 w-4" /> };
      case 'PAYPAL':
        return { label: 'PayPal', icon: <Wallet className="h-4 w-4" /> };
      case 'FLUTTERWAVE':
        return { label: 'Flutterwave', icon: <Building2 className="h-4 w-4" /> };
      case 'PAYSTACK':
        return { label: 'Paystack', icon: <Building2 className="h-4 w-4" /> };
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle>Payment</CardTitle>
        <CardDescription>
          {currency} {amount.toFixed(2)}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md text-red-700 text-sm">
            {error}
          </div>
        )}

        <Tabs
          value={selectedProvider}
          onValueChange={(v) => setSelectedProvider(v as PaymentProvider)}
        >
          <TabsList className="grid w-full" style={{ gridTemplateColumns: `repeat(${availableProviders.length}, 1fr)` }}>
            {availableProviders.map((provider) => {
              const tab = getProviderTab(provider);
              return (
                <TabsTrigger key={provider} value={provider} className="flex items-center gap-2">
                  {tab.icon}
                  <span className="hidden sm:inline">{tab.label}</span>
                </TabsTrigger>
              );
            })}
          </TabsList>

          <div className="mt-4">
            <TabsContent value="STRIPE">
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin" />
                </div>
              ) : clientSecret ? (
                <Elements stripe={stripePromise} options={stripeOptions}>
                  <StripePaymentForm onSuccess={onSuccess} onError={handleError} />
                </Elements>
              ) : null}
            </TabsContent>

            <TabsContent value="PAYPAL">
              <PayPalPayment
                amount={amount}
                currency={currency}
                items={items}
                metadata={metadata}
                onSuccess={onSuccess}
                onError={handleError}
                returnUrl={returnUrl}
                cancelUrl={cancelUrl}
              />
            </TabsContent>

            <TabsContent value="FLUTTERWAVE">
              <FlutterwavePayment
                amount={amount}
                currency={currency}
                items={items}
                metadata={metadata}
                onSuccess={onSuccess}
                onError={handleError}
                returnUrl={returnUrl}
              />
            </TabsContent>

            <TabsContent value="PAYSTACK">
              <PaystackPayment
                amount={amount}
                currency={currency}
                items={items}
                metadata={metadata}
                onSuccess={onSuccess}
                onError={handleError}
                returnUrl={returnUrl}
              />
            </TabsContent>
          </div>
        </Tabs>

        <p className="text-xs text-gray-500 mt-4 text-center">
          Your payment is secured with industry-standard encryption
        </p>
      </CardContent>
    </Card>
  );
}

export default UnifiedCheckout;
