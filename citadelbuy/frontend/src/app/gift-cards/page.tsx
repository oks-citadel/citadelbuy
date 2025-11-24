'use client';

import { useState, useEffect, Suspense } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { GiftCardPurchaseForm } from '@/components/gift-cards/gift-card-purchase-form';
import { GiftCardBalance } from '@/components/gift-cards/gift-card-balance';
import { GiftCardCard } from '@/components/gift-cards/gift-card-card';
import { useMyPurchasedGiftCards, useMyRedeemedGiftCards } from '@/lib/api/gift-cards';
import {
  Gift,
  ShoppingBag,
  CreditCard,
  CheckCircle,
  Calendar,
} from 'lucide-react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

function GiftCardsContent() {
  const searchParams = useSearchParams();
  const [showSuccessAlert, setShowSuccessAlert] = useState(false);

  const { data: purchasedCards = [], isLoading: purchasedLoading } = useMyPurchasedGiftCards({
    limit: 20,
  });
  const { data: redeemedCards = [], isLoading: redeemedLoading } = useMyRedeemedGiftCards({
    limit: 20,
  });

  useEffect(() => {
    if (searchParams?.get('success') === 'true') {
      setShowSuccessAlert(true);
      setTimeout(() => setShowSuccessAlert(false), 5000);
    }
  }, [searchParams]);

  return (
    <div className="container mx-auto space-y-6 p-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Gift className="h-8 w-8" />
          Gift Cards
        </h1>
        <p className="text-muted-foreground">
          Purchase, manage, and redeem gift cards
        </p>
      </div>

      {/* Success Alert */}
      {showSuccessAlert && (
        <Alert className="border-green-200 bg-green-50">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-900">
            Gift card purchased successfully! It has been sent to the recipient&apos;s email.
          </AlertDescription>
        </Alert>
      )}

      {/* Quick Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <ShoppingBag className="h-4 w-4" />
              Purchased Cards
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{purchasedCards.length}</div>
            <p className="text-xs text-muted-foreground">Total cards purchased</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <CreditCard className="h-4 w-4" />
              Redeemed Cards
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{redeemedCards.length}</div>
            <p className="text-xs text-muted-foreground">Cards you&apos;ve used</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Gift className="h-4 w-4" />
              Total Value
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              $
              {purchasedCards
                .reduce((sum, card) => sum + card.initialAmount, 0)
                .toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground">Lifetime gift card purchases</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="purchase" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="purchase">
            <ShoppingBag className="mr-2 h-4 w-4" />
            Purchase
          </TabsTrigger>
          <TabsTrigger value="balance">
            <CreditCard className="mr-2 h-4 w-4" />
            Check Balance
          </TabsTrigger>
          <TabsTrigger value="my-cards">
            <Gift className="mr-2 h-4 w-4" />
            My Cards
          </TabsTrigger>
          <TabsTrigger value="redeemed">
            <CheckCircle className="mr-2 h-4 w-4" />
            Redeemed
          </TabsTrigger>
        </TabsList>

        {/* Purchase Tab */}
        <TabsContent value="purchase" className="space-y-4">
          <GiftCardPurchaseForm />

          {/* Benefits Section */}
          <Card>
            <CardHeader>
              <CardTitle>Why Give Gift Cards?</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="flex items-start gap-3">
                  <div className="rounded-lg bg-primary/10 p-2">
                    <Gift className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium">Perfect Gift</p>
                    <p className="text-sm text-muted-foreground">
                      Let them choose exactly what they want from our entire catalog
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="rounded-lg bg-primary/10 p-2">
                    <Calendar className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium">Schedule Delivery</p>
                    <p className="text-sm text-muted-foreground">
                      Send gift cards on a future date for birthdays or special occasions
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="rounded-lg bg-primary/10 p-2">
                    <CheckCircle className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium">No Expiration</p>
                    <p className="text-sm text-muted-foreground">
                      Our gift cards never expire (unless otherwise specified)
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="rounded-lg bg-primary/10 p-2">
                    <CreditCard className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium">Easy to Use</p>
                    <p className="text-sm text-muted-foreground">
                      Simple redemption process at checkout or convert to store credit
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Check Balance Tab */}
        <TabsContent value="balance" className="space-y-4">
          <GiftCardBalance />

          <Card>
            <CardHeader>
              <CardTitle>Need Help?</CardTitle>
              <CardDescription>
                Common questions about gift cards
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="font-medium mb-1">Where can I find my gift card code?</p>
                <p className="text-sm text-muted-foreground">
                  The gift card code was sent to the recipient&apos;s email address. Check your inbox
                  or spam folder for an email from CitadelBuy.
                </p>
              </div>
              <div>
                <p className="font-medium mb-1">How do I redeem a gift card?</p>
                <p className="text-sm text-muted-foreground">
                  You can redeem your gift card at checkout or visit the{' '}
                  <Link href="/gift-cards/redeem" className="text-primary underline">
                    redemption page
                  </Link>{' '}
                  to apply it to your account.
                </p>
              </div>
              <div>
                <p className="font-medium mb-1">Can I use multiple gift cards?</p>
                <p className="text-sm text-muted-foreground">
                  Yes! You can apply multiple gift cards to a single order. Any remaining balance
                  will stay on the card for future use.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* My Cards Tab */}
        <TabsContent value="my-cards" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Gift Cards I Purchased</CardTitle>
              <CardDescription>
                View and manage the gift cards you&apos;ve purchased for others
              </CardDescription>
            </CardHeader>
            <CardContent>
              {purchasedLoading ? (
                <div className="text-center py-8 text-muted-foreground">Loading...</div>
              ) : purchasedCards.length === 0 ? (
                <div className="text-center py-8">
                  <Gift className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground mb-4">
                    You haven&apos;t purchased any gift cards yet
                  </p>
                  <Button asChild>
                    <Link href="#purchase" onClick={() => (document.querySelector('[value="purchase"]') as HTMLElement)?.click()}>
                      Purchase Your First Gift Card
                    </Link>
                  </Button>
                </div>
              ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {purchasedCards.map((card) => (
                    <GiftCardCard key={card.id} giftCard={card} />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Redeemed Tab */}
        <TabsContent value="redeemed" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Gift Cards I&apos;ve Received</CardTitle>
              <CardDescription>
                Gift cards that have been redeemed on your account
              </CardDescription>
            </CardHeader>
            <CardContent>
              {redeemedLoading ? (
                <div className="text-center py-8 text-muted-foreground">Loading...</div>
              ) : redeemedCards.length === 0 ? (
                <div className="text-center py-8">
                  <CreditCard className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground mb-4">
                    You haven&apos;t redeemed any gift cards yet
                  </p>
                  <Button asChild variant="outline">
                    <Link href="/gift-cards/redeem">Redeem a Gift Card</Link>
                  </Button>
                </div>
              ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {redeemedCards.map((card) => (
                    <GiftCardCard key={card.id} giftCard={card} />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default function GiftCardsPage() {
  return (
    <Suspense fallback={<div className="container mx-auto p-6">Loading...</div>}>
      <GiftCardsContent />
    </Suspense>
  );
}
