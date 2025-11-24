'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { StoreCreditDisplay } from '@/components/gift-cards/store-credit-display';
import { useConvertToStoreCredit } from '@/lib/api/gift-cards';
import {
  Wallet,
  Gift,
  ArrowRight,
  CheckCircle2,
  Info,
  TrendingUp,
  ShoppingCart,
} from 'lucide-react';
import Link from 'next/link';

export default function StoreCreditPage() {
  const [giftCardCode, setGiftCardCode] = useState('');
  const convertToCredit = useConvertToStoreCredit();

  const handleConvert = () => {
    if (!giftCardCode.trim()) return;

    convertToCredit.mutate(
      { giftCardCode: giftCardCode.trim() },
      {
        onSuccess: () => {
          setGiftCardCode('');
        },
      },
    );
  };

  return (
    <div className="container mx-auto max-w-6xl space-y-6 p-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Wallet className="h-8 w-8" />
          Store Credit
        </h1>
        <p className="text-muted-foreground">
          Manage your store credit and convert gift cards
        </p>
      </div>

      {/* Conversion Success Alert */}
      {convertToCredit.isSuccess && (
        <Alert className="border-green-200 bg-green-50">
          <CheckCircle2 className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-900">
            <p className="font-medium">
              {convertToCredit.data.message || 'Gift card successfully converted to store credit!'}
            </p>
          </AlertDescription>
        </Alert>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Content - 2/3 width */}
        <div className="lg:col-span-2 space-y-6">
          {/* Store Credit Display */}
          <StoreCreditDisplay />

          {/* Convert Gift Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Gift className="h-5 w-5" />
                Convert Gift Card to Store Credit
              </CardTitle>
              <CardDescription>
                Have a gift card? Convert it to store credit for automatic application at checkout
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="giftCardCode">Gift Card Code</Label>
                <div className="flex gap-2">
                  <Input
                    id="giftCardCode"
                    placeholder="XXXX-XXXX-XXXX-XXXX"
                    value={giftCardCode}
                    onChange={(e) => setGiftCardCode(e.target.value.toUpperCase())}
                    className="font-mono"
                    maxLength={19}
                  />
                  <Button
                    onClick={handleConvert}
                    disabled={!giftCardCode.trim() || convertToCredit.isPending}
                  >
                    {convertToCredit.isPending ? 'Converting...' : 'Convert'}
                  </Button>
                </div>
              </div>

              {convertToCredit.isError && (
                <Alert variant="destructive">
                  <AlertDescription>
                    {convertToCredit.error instanceof Error
                      ? convertToCredit.error.message
                      : 'Failed to convert gift card. Please check the code and try again.'}
                  </AlertDescription>
                </Alert>
              )}

              <div className="pt-4 border-t space-y-2">
                <h4 className="font-medium text-sm">Benefits of Store Credit:</h4>
                <ul className="space-y-1 text-sm text-muted-foreground">
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5" />
                    Automatically applied at checkout - no codes needed
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5" />
                    Use across multiple purchases until depleted
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5" />
                    Track your balance easily in one place
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5" />
                    Can be combined with other discounts and promotions
                  </li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar - 1/3 width */}
        <div className="space-y-6">
          {/* How It Works */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Info className="h-4 w-4" />
                How Store Credit Works
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex gap-3">
                  <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold shrink-0">
                    1
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Receive store credit from refunds, compensation, or gift card conversion
                  </p>
                </div>
                <div className="flex gap-3">
                  <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold shrink-0">
                    2
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Credit is automatically applied when you check out
                  </p>
                </div>
                <div className="flex gap-3">
                  <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold shrink-0">
                    3
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Any unused credit remains in your account for future purchases
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Ways to Earn */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                Ways to Earn Credit
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-start gap-2 text-sm">
                <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 shrink-0" />
                <div>
                  <p className="font-medium">Refunds</p>
                  <p className="text-muted-foreground text-xs">
                    Returned items are credited to your account
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-2 text-sm">
                <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 shrink-0" />
                <div>
                  <p className="font-medium">Gift Cards</p>
                  <p className="text-muted-foreground text-xs">
                    Convert gift cards to store credit
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-2 text-sm">
                <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 shrink-0" />
                <div>
                  <p className="font-medium">Promotions</p>
                  <p className="text-muted-foreground text-xs">
                    Special promotional credits from campaigns
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-2 text-sm">
                <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 shrink-0" />
                <div>
                  <p className="font-medium">Loyalty Rewards</p>
                  <p className="text-muted-foreground text-xs">
                    Redeem loyalty points for store credit
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Shop CTA */}
          <Card className="bg-gradient-to-br from-purple-500 to-indigo-600 text-white border-0">
            <CardContent className="p-6 space-y-4">
              <ShoppingCart className="h-10 w-10" />
              <div>
                <h3 className="font-bold text-lg mb-2">Ready to Shop?</h3>
                <p className="text-sm text-purple-100">
                  Use your store credit on any purchase
                </p>
              </div>
              <Button variant="secondary" className="w-full" asChild>
                <Link href="/products">
                  Browse Products <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
