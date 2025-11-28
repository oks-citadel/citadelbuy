'use client';

import * as React from 'react';
import {
  PaymentElement,
  CardElement,
  useStripe,
  useElements,
  Elements,
} from '@stripe/react-stripe-js';
import { loadStripe, StripeElementsOptions, Stripe } from '@stripe/stripe-js';
import { Loader2, CreditCard, Lock, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { api } from '@/services/api';

// Initialize Stripe (memoized to avoid recreating on every render)
const stripePromise = loadStripe(
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || ''
);

// Types
export interface PaymentFormData {
  amount: number;
  currency?: string;
  orderId?: string;
  metadata?: Record<string, string>;
}

export interface PaymentResult {
  success: boolean;
  paymentIntentId?: string;
  error?: string;
}

interface StripePaymentFormProps {
  amount: number;
  currency?: string;
  orderId?: string;
  metadata?: Record<string, string>;
  onSuccess?: (result: PaymentResult) => void;
  onError?: (error: string) => void;
  submitButtonText?: string;
  showCardholderName?: boolean;
  className?: string;
}

// Card Element styling options
const CARD_ELEMENT_OPTIONS = {
  style: {
    base: {
      fontSize: '16px',
      color: '#1a1a1a',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      fontSmoothing: 'antialiased',
      '::placeholder': {
        color: '#9ca3af',
      },
      iconColor: '#6b7280',
    },
    invalid: {
      color: '#ef4444',
      iconColor: '#ef4444',
    },
    complete: {
      iconColor: '#10b981',
    },
  },
  hidePostalCode: false,
  iconStyle: 'solid' as const,
};

/**
 * Internal payment form component that uses Stripe Elements
 * This component must be wrapped by the Elements provider
 */
function StripePaymentFormInternal({
  amount,
  currency = 'USD',
  orderId,
  metadata,
  onSuccess,
  onError,
  submitButtonText = 'Pay Now',
  showCardholderName = true,
  className,
}: StripePaymentFormProps) {
  const stripe = useStripe();
  const elements = useElements();

  const [isProcessing, setIsProcessing] = React.useState(false);
  const [paymentError, setPaymentError] = React.useState<string | null>(null);
  const [paymentSuccess, setPaymentSuccess] = React.useState(false);
  const [cardComplete, setCardComplete] = React.useState(false);
  const [cardholderName, setCardholderName] = React.useState('');
  const [clientSecret, setClientSecret] = React.useState<string | null>(null);

  // Create payment intent on mount
  React.useEffect(() => {
    const createPaymentIntent = async () => {
      try {
        const response = await api.post<{ clientSecret: string }>('/payments/create-intent', {
          amount: Math.round(amount * 100), // Convert to cents
          currency: currency.toLowerCase(),
          orderId,
          metadata,
        });

        if (response.success && response.data) {
          setClientSecret(response.data.clientSecret);
        } else {
          setPaymentError('Failed to initialize payment. Please try again.');
          onError?.('Failed to create payment intent');
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to initialize payment';
        setPaymentError(errorMessage);
        onError?.(errorMessage);
      }
    };

    createPaymentIntent();
  }, [amount, currency, orderId, metadata, onError]);

  // Handle card element changes
  const handleCardChange = (event: any) => {
    setCardComplete(event.complete);
    if (event.error) {
      setPaymentError(event.error.message);
    } else {
      setPaymentError(null);
    }
  };

  // Handle form submission
  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!stripe || !elements || !clientSecret) {
      return;
    }

    // Validate cardholder name if required
    if (showCardholderName && !cardholderName.trim()) {
      setPaymentError('Please enter the cardholder name');
      return;
    }

    setIsProcessing(true);
    setPaymentError(null);

    try {
      const cardElement = elements.getElement(CardElement);
      if (!cardElement) {
        throw new Error('Card element not found');
      }

      // Confirm the payment with Stripe
      const { error, paymentIntent } = await stripe.confirmCardPayment(clientSecret, {
        payment_method: {
          card: cardElement,
          billing_details: {
            name: cardholderName || undefined,
          },
        },
      });

      if (error) {
        // Payment failed
        setPaymentError(error.message || 'Payment failed. Please try again.');
        onError?.(error.message || 'Payment failed');
      } else if (paymentIntent && paymentIntent.status === 'succeeded') {
        // Payment succeeded
        setPaymentSuccess(true);
        onSuccess?.({
          success: true,
          paymentIntentId: paymentIntent.id,
        });
      } else {
        // Unexpected state
        setPaymentError('Payment status is uncertain. Please contact support.');
        onError?.('Unexpected payment status');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
      setPaymentError(errorMessage);
      onError?.(errorMessage);
    } finally {
      setIsProcessing(false);
    }
  };

  // Loading state while creating payment intent
  if (!clientSecret) {
    return (
      <Card className={cn('w-full', className)}>
        <CardContent className="flex items-center justify-center py-12">
          <div className="text-center space-y-3">
            <Loader2 className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Initializing secure payment...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Success state
  if (paymentSuccess) {
    return (
      <Card className={cn('w-full', className)}>
        <CardContent className="flex items-center justify-center py-12">
          <div className="text-center space-y-3">
            <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center mx-auto">
              <CheckCircle2 className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <h3 className="font-semibold text-lg">Payment Successful!</h3>
              <p className="text-sm text-muted-foreground">Your payment has been processed securely.</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn('w-full', className)}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CreditCard className="h-5 w-5" />
          Payment Details
        </CardTitle>
        <CardDescription>
          Enter your card information securely. Your data is encrypted and never stored on our servers.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Cardholder Name */}
          {showCardholderName && (
            <div className="space-y-2">
              <label htmlFor="cardholderName" className="text-sm font-medium">
                Cardholder Name
              </label>
              <input
                id="cardholderName"
                type="text"
                value={cardholderName}
                onChange={(e) => setCardholderName(e.target.value)}
                placeholder="John Doe"
                className={cn(
                  'w-full px-3 py-2 border rounded-md',
                  'focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent',
                  'disabled:opacity-50 disabled:cursor-not-allowed'
                )}
                disabled={isProcessing}
                required
              />
            </div>
          )}

          {/* Card Element */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Card Information</label>
            <div
              className={cn(
                'p-3 border rounded-md transition-colors',
                'focus-within:ring-2 focus-within:ring-primary focus-within:border-transparent',
                paymentError && 'border-red-500',
                cardComplete && 'border-green-500'
              )}
            >
              <CardElement
                options={CARD_ELEMENT_OPTIONS}
                onChange={handleCardChange}
              />
            </div>
          </div>

          {/* Error Message */}
          {paymentError && (
            <div className="flex items-start gap-2 p-3 rounded-md bg-red-50 border border-red-200">
              <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-600">{paymentError}</p>
            </div>
          )}

          {/* Security Notice */}
          <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/50 p-3 rounded-md">
            <Lock className="h-4 w-4 flex-shrink-0" />
            <span>
              Your payment is secured by 256-bit SSL encryption. Card details are processed directly by Stripe
              and never touch our servers (PCI DSS compliant).
            </span>
          </div>

          {/* Submit Button */}
          <Button
            type="submit"
            size="lg"
            className="w-full"
            disabled={!stripe || isProcessing || !cardComplete}
          >
            {isProcessing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing Payment...
              </>
            ) : (
              <>
                <Lock className="mr-2 h-4 w-4" />
                {submitButtonText}
              </>
            )}
          </Button>

          {/* Stripe Badge */}
          <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
            <span>Secured by</span>
            <svg
              className="h-4"
              viewBox="0 0 60 25"
              xmlns="http://www.w3.org/2000/svg"
              width="60"
              height="25"
            >
              <path
                fill="var(--stripe-color, #635BFF)"
                d="M59.64 14.28h-8.06c.19 1.93 1.6 2.55 3.2 2.55 1.64 0 2.96-.37 4.05-.95v3.32a8.33 8.33 0 0 1-4.56 1.1c-4.01 0-6.83-2.5-6.83-7.48 0-4.19 2.39-7.52 6.3-7.52 3.92 0 5.96 3.28 5.96 7.5 0 .4-.04 1.26-.06 1.48zm-5.92-5.62c-1.03 0-2.17.73-2.17 2.58h4.25c0-1.85-1.07-2.58-2.08-2.58zM40.95 20.3c-1.44 0-2.32-.6-2.9-1.04l-.02 4.63-4.12.87V5.57h3.76l.08 1.02a4.7 4.7 0 0 1 3.23-1.29c2.9 0 5.62 2.6 5.62 7.4 0 5.23-2.7 7.6-5.65 7.6zM40 8.95c-.95 0-1.54.34-1.97.81l.02 6.12c.4.44.98.78 1.95.78 1.52 0 2.54-1.65 2.54-3.87 0-2.15-1.04-3.84-2.54-3.84zM28.24 5.57h4.13v14.44h-4.13V5.57zm0-4.7L32.37 0v3.36l-4.13.88V.88zm-4.32 9.35v9.79H19.8V5.57h3.7l.12 1.22c1-1.77 3.07-1.41 3.62-1.22v3.79c-.52-.17-2.29-.43-3.32.86zm-8.55 4.72c0 2.43 2.6 1.68 3.12 1.46v3.36c-.55.3-1.54.54-2.89.54a4.15 4.15 0 0 1-4.27-4.24l.01-13.17 4.02-.86v3.54h3.14V9.1h-3.13v5.85zm-4.91.7c0 2.97-2.31 4.66-5.73 4.66a11.2 11.2 0 0 1-4.46-.93v-3.93c1.38.75 3.1 1.31 4.46 1.31.92 0 1.53-.24 1.53-1C6.26 13.77 0 14.51 0 9.95 0 7.04 2.28 5.3 5.62 5.3c1.36 0 2.72.2 4.09.75v3.88a9.23 9.23 0 0 0-4.1-1.06c-.86 0-1.44.25-1.44.93 0 1.85 6.29.97 6.29 5.88z"
              />
            </svg>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

/**
 * Wrapper component that provides Stripe Elements context
 * This is the main component to export and use
 */
export interface StripePaymentFormWrapperProps extends StripePaymentFormProps {
  stripeOptions?: Partial<StripeElementsOptions>;
}

export function StripePaymentFormWrapper({
  stripeOptions,
  ...formProps
}: StripePaymentFormWrapperProps) {
  const options: StripeElementsOptions = React.useMemo(
    () => ({
      appearance: {
        theme: 'stripe',
        variables: {
          colorPrimary: '#635BFF',
          colorBackground: '#ffffff',
          colorText: '#1a1a1a',
          colorDanger: '#ef4444',
          fontFamily: 'system-ui, -apple-system, sans-serif',
          borderRadius: '6px',
        },
        ...stripeOptions?.appearance,
      },
      ...stripeOptions,
    }),
    [stripeOptions]
  );

  return (
    <Elements stripe={stripePromise} options={options}>
      <StripePaymentFormInternal {...formProps} />
    </Elements>
  );
}

// Export both the wrapper and the internal form
export default StripePaymentFormWrapper;

// Named exports for flexibility
export { StripePaymentFormInternal as StripePaymentForm };

/**
 * Hook to access Stripe instance (must be used within Elements provider)
 */
export function useStripeInstance() {
  const stripe = useStripe();
  const elements = useElements();

  return {
    stripe,
    elements,
    isReady: !!(stripe && elements),
  };
}

/**
 * Utility function to format amount for Stripe (convert to cents)
 */
export function formatAmountForStripe(amount: number, currency: string = 'USD'): number {
  // Zero-decimal currencies (e.g., JPY, KRW)
  const zeroDecimalCurrencies = ['BIF', 'CLP', 'DJF', 'GNF', 'JPY', 'KMF', 'KRW', 'MGA', 'PYG', 'RWF', 'UGX', 'VND', 'VUV', 'XAF', 'XOF', 'XPF'];

  if (zeroDecimalCurrencies.includes(currency.toUpperCase())) {
    return Math.round(amount);
  }

  return Math.round(amount * 100);
}

/**
 * Utility function to format amount from Stripe (convert from cents)
 */
export function formatAmountFromStripe(amount: number, currency: string = 'USD'): number {
  const zeroDecimalCurrencies = ['BIF', 'CLP', 'DJF', 'GNF', 'JPY', 'KMF', 'KRW', 'MGA', 'PYG', 'RWF', 'UGX', 'VND', 'VUV', 'XAF', 'XOF', 'XPF'];

  if (zeroDecimalCurrencies.includes(currency.toUpperCase())) {
    return amount;
  }

  return amount / 100;
}
