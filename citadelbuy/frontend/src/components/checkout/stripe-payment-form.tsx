'use client';

import { useState } from 'react';
import {
  PaymentElement,
  useStripe,
  useElements,
} from '@stripe/react-stripe-js';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';

interface StripePaymentFormProps {
  onNext: () => void;
  onBack: () => void;
  clientSecret: string;
}

export function StripePaymentForm({
  onNext,
  onBack,
  clientSecret,
}: StripePaymentFormProps) {
  const stripe = useStripe();
  const elements = useElements();
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setIsProcessing(true);
    setErrorMessage(null);

    try {
      // Confirm the payment without redirecting
      // We'll handle the redirect manually after order creation
      const { error } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/checkout?payment=success`,
        },
        redirect: 'if_required',
      });

      if (error) {
        setErrorMessage(error.message || 'An error occurred');
        setIsProcessing(false);
      } else {
        // Payment successful, proceed to review
        onNext();
      }
    } catch (error) {
      console.error('Payment error:', error);
      setErrorMessage('An unexpected error occurred');
      setIsProcessing(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Payment Information</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Stripe Payment Element */}
          <div className="rounded-lg border p-4">
            <PaymentElement
              options={{
                layout: 'tabs',
              }}
            />
          </div>

          {/* Error Message */}
          {errorMessage && (
            <div className="rounded-lg bg-destructive/10 p-4">
              <p className="text-sm text-destructive">{errorMessage}</p>
            </div>
          )}

          {/* Security Notice */}
          <div className="rounded-lg bg-muted p-4">
            <p className="text-sm text-muted-foreground">
              🔒 Your payment information is encrypted and secure. Powered by
              Stripe.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-4 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onBack}
              className="flex-1"
              disabled={isProcessing}
            >
              Back
            </Button>
            <Button
              type="submit"
              disabled={!stripe || isProcessing}
              className="flex-1"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                'Review Order'
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
