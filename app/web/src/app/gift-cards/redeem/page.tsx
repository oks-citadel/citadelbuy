'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { RedeemWidget } from '@/components/gift-cards/redeem-widget';
import { useConvertToStoreCredit } from '@/lib/api/gift-cards';
import { Gift, Wallet, ArrowRight, CheckCircle2 } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function RedeemGiftCardPage() {
  const router = useRouter();
  const [redemptionSuccess, setRedemptionSuccess] = useState<{
    amount: number;
    remainingBalance: number;
  } | null>(null);

  const convertToCredit = useConvertToStoreCredit();
  const [convertedCode, setConvertedCode] = useState<string | null>(null);

  const handleRedemptionSuccess = (amount: number, remainingBalance: number) => {
    setRedemptionSuccess({ amount, remainingBalance });
  };

  return (
    <div className="container mx-auto max-w-4xl space-y-6 p-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold flex items-center justify-center gap-2">
          <Gift className="h-8 w-8" />
          Redeem Gift Card
        </h1>
        <p className="text-muted-foreground">
          Enter your gift card code to apply it to your account or convert to store credit
        </p>
      </div>

      {/* Success Alert */}
      {redemptionSuccess && (
        <Alert className="border-green-200 bg-green-50">
          <CheckCircle2 className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-900">
            <div className="space-y-1">
              <p className="font-medium">Gift card redeemed successfully!</p>
              <p className="text-sm">
                ${redemptionSuccess.amount.toFixed(2)} has been added to your account.
                {redemptionSuccess.remainingBalance > 0 && (
                  <>
                    {' '}
                    Remaining balance: ${redemptionSuccess.remainingBalance.toFixed(2)}
                  </>
                )}
              </p>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Conversion Success Alert */}
      {convertToCredit.isSuccess && (
        <Alert className="border-green-200 bg-green-50">
          <CheckCircle2 className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-900">
            <div className="space-y-2">
              <p className="font-medium">Successfully converted to store credit!</p>
              <Button asChild variant="outline" size="sm">
                <Link href="/account/store-credit">
                  View Store Credit <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        {/* Redeem Widget */}
        <div>
          <RedeemWidget onRedemptionSuccess={handleRedemptionSuccess} />
        </div>

        {/* Convert to Store Credit Option */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wallet className="h-5 w-5" />
              Convert to Store Credit
            </CardTitle>
            <CardDescription>
              Convert your gift card balance to store credit for more flexibility
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-start gap-2 text-sm">
                <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5" />
                <p>Use across multiple purchases</p>
              </div>
              <div className="flex items-start gap-2 text-sm">
                <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5" />
                <p>No need to enter codes at checkout</p>
              </div>
              <div className="flex items-start gap-2 text-sm">
                <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5" />
                <p>Automatically applied to eligible orders</p>
              </div>
              <div className="flex items-start gap-2 text-sm">
                <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5" />
                <p>Track balance easily in your account</p>
              </div>
            </div>

            <div className="pt-4 border-t">
              <p className="text-sm text-muted-foreground mb-4">
                Have a gift card code you want to convert?
              </p>
              <Button
                className="w-full"
                variant="outline"
                asChild
              >
                <Link href="/account/store-credit">
                  Go to Store Credit <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* How It Works */}
      <Card>
        <CardHeader>
          <CardTitle>How Redemption Works</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 md:grid-cols-3">
            <div className="space-y-2">
              <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10 text-primary font-bold">
                1
              </div>
              <h3 className="font-semibold">Enter Your Code</h3>
              <p className="text-sm text-muted-foreground">
                Enter the 16-character gift card code you received via email
              </p>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10 text-primary font-bold">
                2
              </div>
              <h3 className="font-semibold">Check Balance</h3>
              <p className="text-sm text-muted-foreground">
                Verify the available balance and choose how much to redeem
              </p>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10 text-primary font-bold">
                3
              </div>
              <h3 className="font-semibold">Apply & Shop</h3>
              <p className="text-sm text-muted-foreground">
                The amount is added to your account and ready to use at checkout
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* FAQ */}
      <Card>
        <CardHeader>
          <CardTitle>Frequently Asked Questions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="font-medium mb-1">Can I use part of my gift card?</p>
            <p className="text-sm text-muted-foreground">
              Yes! You can redeem a partial amount from your gift card. The remaining balance
              will stay on the card for future use.
            </p>
          </div>
          <div>
            <p className="font-medium mb-1">Do gift cards expire?</p>
            <p className="text-sm text-muted-foreground">
              Most gift cards don&apos;t expire unless specified. Check your gift card email for
              expiration details.
            </p>
          </div>
          <div>
            <p className="font-medium mb-1">What&apos;s the difference between gift card and store credit?</p>
            <p className="text-sm text-muted-foreground">
              Gift cards require entering a code, while store credit is automatically available
              in your account. You can convert gift cards to store credit for convenience.
            </p>
          </div>
          <div>
            <p className="font-medium mb-1">Can I combine gift cards with other discounts?</p>
            <p className="text-sm text-muted-foreground">
              Yes! Gift cards can typically be combined with promotional codes and loyalty
              discounts for maximum savings.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Browse Products CTA */}
      <Card className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white border-0">
        <CardContent className="p-6 text-center space-y-4">
          <h2 className="text-2xl font-bold">Ready to Shop?</h2>
          <p className="text-blue-100">
            Explore our products and use your gift card or store credit at checkout
          </p>
          <Button size="lg" variant="secondary" asChild>
            <Link href="/products">
              Browse Products <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
