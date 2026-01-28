'use client';

import React, { useState } from 'react';
import { CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { CreditCard, Lock } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface PaymentMethodFormProps {
  onSuccess: (paymentMethodId: string) => void;
  onCancel?: () => void;
  isLoading?: boolean;
}

const CARD_ELEMENT_OPTIONS = {
  style: {
    base: {
      fontSize: '16px',
      color: '#424770',
      '::placeholder': {
        color: '#aab7c4',
      },
      fontFamily: 'system-ui, -apple-system, sans-serif',
    },
    invalid: {
      color: '#9e2146',
    },
  },
  hidePostalCode: false,
};

export function PaymentMethodForm({ onSuccess, onCancel, isLoading }: PaymentMethodFormProps) {
  const stripe = useStripe();
  const elements = useElements();
  const [setAsDefault, setSetAsDefault] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setError(null);
    setProcessing(true);

    try {
      const cardElement = elements.getElement(CardElement);
      if (!cardElement) {
        throw new Error('Card element not found');
      }

      const { error: stripeError, paymentMethod } = await stripe.createPaymentMethod({
        type: 'card',
        card: cardElement,
      });

      if (stripeError) {
        setError(stripeError.message || 'An error occurred');
        return;
      }

      if (paymentMethod) {
        onSuccess(paymentMethod.id);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CreditCard className="h-5 w-5" />
          Add Payment Method
        </CardTitle>
        <CardDescription>
          Enter your credit or debit card information
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="card-element">Card Information</Label>
            <div className="p-3 border rounded-md bg-background">
              <CardElement id="card-element" options={CARD_ELEMENT_OPTIONS} />
            </div>
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="flex items-center space-x-2">
            <Checkbox
              id="set-default"
              checked={setAsDefault}
              onCheckedChange={(checked) => setSetAsDefault(checked as boolean)}
            />
            <Label
              htmlFor="set-default"
              className="text-sm font-normal cursor-pointer"
            >
              Set as default payment method
            </Label>
          </div>

          <div className="flex items-start gap-2 text-xs text-muted-foreground bg-muted p-3 rounded-md">
            <Lock className="h-4 w-4 flex-shrink-0 mt-0.5" />
            <p>
              Your payment information is encrypted and secure. We use Stripe for payment
              processing and never store your full card details.
            </p>
          </div>

          <div className="flex gap-3">
            <Button
              type="submit"
              disabled={!stripe || processing || isLoading}
              isLoading={processing || isLoading}
              className="flex-1"
            >
              Add Payment Method
            </Button>
            {onCancel && (
              <Button
                type="button"
                variant="outline"
                onClick={onCancel}
                disabled={processing || isLoading}
              >
                Cancel
              </Button>
            )}
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
