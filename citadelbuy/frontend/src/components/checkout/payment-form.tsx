'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';

interface PaymentFormProps {
  onNext: () => void;
  onBack: () => void;
}

export function PaymentForm({ onNext, onBack }: PaymentFormProps) {
  const [isProcessing, setIsProcessing] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessing(true);

    // Simulate payment processing
    await new Promise((resolve) => setTimeout(resolve, 1500));

    setIsProcessing(false);
    onNext();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Payment Information</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Payment Method Selection */}
          <div className="space-y-2">
            <Label>Payment Method</Label>
            <div className="grid gap-3">
              <button
                type="button"
                className="flex items-center gap-3 rounded-lg border-2 border-primary bg-primary/5 p-4 text-left transition-colors"
              >
                <div className="flex h-5 w-5 items-center justify-center rounded-full border-2 border-primary">
                  <div className="h-2.5 w-2.5 rounded-full bg-primary" />
                </div>
                <div>
                  <p className="font-semibold">Credit / Debit Card</p>
                  <p className="text-sm text-muted-foreground">
                    Pay securely with Stripe
                  </p>
                </div>
              </button>
            </div>
          </div>

          {/* Card Details - Placeholder */}
          <div className="space-y-4 rounded-lg border p-4">
            <div className="space-y-2">
              <Label htmlFor="cardNumber">Card Number</Label>
              <Input
                id="cardNumber"
                placeholder="4242 4242 4242 4242"
                required
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="expiry">Expiry Date</Label>
                <Input id="expiry" placeholder="MM/YY" required />
              </div>

              <div className="space-y-2">
                <Label htmlFor="cvc">CVC</Label>
                <Input id="cvc" placeholder="123" required />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="cardName">Name on Card</Label>
              <Input id="cardName" placeholder="John Doe" required />
            </div>
          </div>

          {/* Security Notice */}
          <div className="rounded-lg bg-muted p-4">
            <p className="text-sm text-muted-foreground">
              🔒 Your payment information is encrypted and secure. We use Stripe for
              payment processing and never store your card details.
            </p>
          </div>

          <div className="flex gap-4 pt-4">
            <Button type="button" variant="outline" onClick={onBack} className="flex-1">
              Back
            </Button>
            <Button type="submit" disabled={isProcessing} className="flex-1">
              {isProcessing ? 'Processing...' : 'Review Order'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
