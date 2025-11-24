'use client';

import { use } from 'react';
import { useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { CountdownTimer } from '@/components/deals/countdown-timer';
import { DealBadge } from '@/components/deals/deal-badge';
import { useDeal, useTrackDealView, useCheckDealEligibility, DealStatus } from '@/lib/api/deals';
import {
  Clock,
  Package,
  ShoppingCart,
  Eye,
  TrendingUp,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Info,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface DealDetailPageProps {
  params: Promise<{ id: string }>;
}

export default function DealDetailPage({ params }: DealDetailPageProps) {
  const { id } = use(params);
  const { data: deal, isLoading } = useDeal(id);
  const { mutate: trackView } = useTrackDealView();

  // Track view on page load
  useEffect(() => {
    if (deal) {
      trackView({ dealId: deal.id });
    }
  }, [deal?.id]);

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Skeleton className="h-96 w-full mb-8" />
        <div className="grid gap-6 lg:grid-cols-2">
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
        </div>
      </div>
    );
  }

  if (!deal) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Deal Not Found</AlertTitle>
          <AlertDescription>
            The deal you're looking for doesn't exist or has been removed.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const isActive = deal.status === DealStatus.ACTIVE;
  const isUpcoming = deal.status === DealStatus.SCHEDULED;
  const isEnded = deal.status === DealStatus.ENDED;

  const stockPercentage =
    deal.totalStock && deal.remainingStock !== null
      ? ((deal.totalStock - deal.remainingStock) / deal.totalStock) * 100
      : 0;

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Hero Section */}
      <div className="mb-8">
        {deal.bannerImage && (
          <div className="relative h-96 rounded-lg overflow-hidden mb-6">
            <Image
              src={deal.bannerImage}
              alt={deal.name}
              fill
              className="object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
            <div className="absolute bottom-6 left-6 right-6 text-white">
              <div className="flex flex-wrap gap-2 mb-4">
                <DealBadge
                  type={deal.type}
                  customBadge={deal.badge}
                  customColor={deal.badgeColor}
                  size="lg"
                />
                {deal.isFeatured && (
                  <Badge className="bg-gradient-to-r from-purple-600 to-pink-600 text-white px-3 py-1 text-sm">
                    <TrendingUp className="h-4 w-4 mr-1" />
                    Featured
                  </Badge>
                )}
              </div>
              <h1 className="text-4xl font-bold mb-2">{deal.name}</h1>
              <p className="text-lg opacity-90">{deal.description}</p>
            </div>
          </div>
        )}

        {!deal.bannerImage && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-3">
              <DealBadge
                type={deal.type}
                customBadge={deal.badge}
                customColor={deal.badgeColor}
                size="lg"
              />
              {deal.isFeatured && (
                <Badge variant="secondary" className="text-sm">
                  Featured
                </Badge>
              )}
            </div>
            <div>
              <h1 className="text-4xl font-bold mb-2">{deal.name}</h1>
              <p className="text-lg text-muted-foreground">
                {deal.description}
              </p>
            </div>
          </div>
        )}
      </div>

      <div className="grid gap-8 lg:grid-cols-3">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Deal Info Card */}
          <Card>
            <CardContent className="p-6 space-y-6">
              {/* Discount Display */}
              <div>
                <h2 className="text-sm font-medium text-muted-foreground mb-2">
                  Discount
                </h2>
                {deal.discountPercentage && (
                  <div className="text-5xl font-bold text-red-600">
                    {deal.discountPercentage}% OFF
                  </div>
                )}
                {deal.discountAmount && (
                  <div className="text-5xl font-bold text-red-600">
                    ${deal.discountAmount} OFF
                  </div>
                )}
                {deal.type === 'BOGO' &&
                  deal.buyQuantity &&
                  deal.getQuantity && (
                    <div className="text-4xl font-bold text-green-600">
                      Buy {deal.buyQuantity}, Get {deal.getQuantity} Free
                    </div>
                  )}
              </div>

              <Separator />

              {/* Timer */}
              <div>
                <h2 className="text-sm font-medium text-muted-foreground mb-3">
                  {isActive && 'Time Remaining'}
                  {isUpcoming && 'Starts In'}
                  {isEnded && 'Status'}
                </h2>
                {isActive && (
                  <CountdownTimer endTime={deal.endTime} size="lg" />
                )}
                {isUpcoming && (
                  <CountdownTimer
                    endTime={deal.startTime}
                    startTime={deal.startTime}
                    size="lg"
                  />
                )}
                {isEnded && (
                  <Badge variant="secondary" className="text-lg py-2 px-4">
                    Deal Ended
                  </Badge>
                )}
              </div>

              {/* Stock Progress */}
              {deal.totalStock && deal.remainingStock !== null && isActive && (
                <>
                  <Separator />
                  <div className="space-y-3">
                    <h2 className="text-sm font-medium text-muted-foreground">
                      Stock Availability
                    </h2>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span>
                          {deal.remainingStock} / {deal.totalStock} remaining
                        </span>
                        <span className="font-semibold">
                          {Math.round(stockPercentage)}% sold
                        </span>
                      </div>
                      <Progress value={stockPercentage} className="h-3" />
                      {deal.remainingStock <= 10 && deal.remainingStock > 0 && (
                        <p className="text-sm text-red-600 font-medium">
                          Hurry! Only {deal.remainingStock} left in stock!
                        </p>
                      )}
                      {deal.remainingStock === 0 && (
                        <Alert variant="destructive">
                          <XCircle className="h-4 w-4" />
                          <AlertDescription>
                            This deal is sold out
                          </AlertDescription>
                        </Alert>
                      )}
                    </div>
                  </div>
                </>
              )}

              {/* Conditions */}
              <Separator />
              <div className="space-y-3">
                <h2 className="text-sm font-medium text-muted-foreground">
                  Deal Conditions
                </h2>
                <div className="space-y-2 text-sm">
                  {deal.minimumPurchase && (
                    <div className="flex items-center gap-2">
                      <Info className="h-4 w-4 text-muted-foreground" />
                      <span>
                        Minimum purchase: ${deal.minimumPurchase.toFixed(2)}
                      </span>
                    </div>
                  )}
                  {deal.limitPerCustomer && (
                    <div className="flex items-center gap-2">
                      <Info className="h-4 w-4 text-muted-foreground" />
                      <span>Limit {deal.limitPerCustomer} per customer</span>
                    </div>
                  )}
                  {deal.minimumTier && (
                    <div className="flex items-center gap-2">
                      <Info className="h-4 w-4 text-muted-foreground" />
                      <span>Requires {deal.minimumTier} tier or higher</span>
                    </div>
                  )}
                  {deal.earlyAccessHours > 0 && deal.minimumTier && (
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span>
                        {deal.earlyAccessHours}h early access for{' '}
                        {deal.minimumTier}+ members
                      </span>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                    <span>
                      {deal.stackableWithCoupons
                        ? 'Can be combined with coupons'
                        : 'Cannot be combined with coupons'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                    <span>
                      {deal.stackableWithLoyalty
                        ? 'Can be combined with loyalty rewards'
                        : 'Cannot be combined with loyalty rewards'}
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Products */}
          {deal.dealProducts && deal.dealProducts.length > 0 && (
            <Card>
              <CardContent className="p-6">
                <h2 className="text-xl font-semibold mb-4">
                  Products ({deal.dealProducts.length})
                </h2>
                <div className="grid gap-4 sm:grid-cols-2">
                  {deal.dealProducts.map((dealProduct) => (
                    <Link
                      key={dealProduct.id}
                      href={`/products/${dealProduct.product.slug}`}
                    >
                      <Card className="group hover:shadow-md transition-shadow">
                        <CardContent className="p-4">
                          <div className="flex gap-3">
                            <div className="relative h-20 w-20 rounded-md overflow-hidden bg-muted shrink-0">
                              {dealProduct.product.images[0] && (
                                <Image
                                  src={dealProduct.product.images[0]}
                                  alt={dealProduct.product.name}
                                  fill
                                  className="object-cover"
                                />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <h3 className="font-medium line-clamp-2 group-hover:text-primary transition-colors">
                                {dealProduct.product.name}
                              </h3>
                              <div className="mt-2 flex items-baseline gap-2">
                                {dealProduct.dealPrice && (
                                  <>
                                    <span className="text-lg font-bold text-red-600">
                                      ${dealProduct.dealPrice.toFixed(2)}
                                    </span>
                                    <span className="text-sm text-muted-foreground line-through">
                                      ${dealProduct.originalPrice.toFixed(2)}
                                    </span>
                                  </>
                                )}
                                {!dealProduct.dealPrice && deal.discountPercentage && (
                                  <>
                                    <span className="text-lg font-bold text-red-600">
                                      $
                                      {(
                                        dealProduct.originalPrice *
                                        (1 - deal.discountPercentage / 100)
                                      ).toFixed(2)}
                                    </span>
                                    <span className="text-sm text-muted-foreground line-through">
                                      ${dealProduct.originalPrice.toFixed(2)}
                                    </span>
                                  </>
                                )}
                              </div>
                              {dealProduct.stockRemaining !== null && (
                                <p className="text-xs text-muted-foreground mt-1">
                                  {dealProduct.stockRemaining} available
                                </p>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </Link>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Eligibility Check */}
          {deal.eligibility && (
            <Card>
              <CardContent className="p-6">
                <h2 className="font-semibold mb-4">Eligibility Status</h2>
                {deal.eligibility.isEligible ? (
                  <div className="flex items-center gap-2 text-green-600">
                    <CheckCircle2 className="h-5 w-5" />
                    <span className="font-medium">
                      You're eligible for this deal!
                    </span>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-red-600">
                      <XCircle className="h-5 w-5" />
                      <span className="font-medium">Not eligible</span>
                    </div>
                    <ul className="space-y-1 text-sm text-muted-foreground">
                      {deal.eligibility.reasons.map((reason, i) => (
                        <li key={i}>• {reason}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Stats */}
          <Card>
            <CardContent className="p-6 space-y-4">
              <h2 className="font-semibold mb-4">Deal Statistics</h2>
              <div className="space-y-3 text-sm">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Eye className="h-4 w-4" />
                    <span>Views</span>
                  </div>
                  <span className="font-medium">
                    {deal.views.toLocaleString()}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <ShoppingCart className="h-4 w-4" />
                    <span>Purchases</span>
                  </div>
                  <span className="font-medium">
                    {deal.conversions.toLocaleString()}
                  </span>
                </div>
                {deal._count && (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Package className="h-4 w-4" />
                      <span>Products</span>
                    </div>
                    <span className="font-medium">
                      {deal._count.dealProducts}
                    </span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* CTA */}
          {isActive && deal.dealProducts && deal.dealProducts.length > 0 && (
            <Button className="w-full" size="lg" asChild>
              <Link href={`/products/${deal.dealProducts[0].product.slug}`}>
                Shop Now
              </Link>
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
