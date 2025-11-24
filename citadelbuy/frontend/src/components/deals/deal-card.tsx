'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Deal, DealStatus } from '@/lib/api/deals';
import { CountdownTimer } from './countdown-timer';
import { DealBadge } from './deal-badge';
import { cn } from '@/lib/utils';
import { ShoppingCart, Users, TrendingUp } from 'lucide-react';

interface DealCardProps {
  deal: Deal;
  showProducts?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function DealCard({
  deal,
  showProducts = true,
  size = 'md',
  className,
}: DealCardProps) {
  const productCount = deal._count?.dealProducts || deal.dealProducts?.length || 0;
  const purchaseCount = deal._count?.dealPurchases || 0;

  // Calculate stock percentage
  const stockPercentage =
    deal.totalStock && deal.remainingStock !== null
      ? ((deal.totalStock - deal.remainingStock) / deal.totalStock) * 100
      : 0;

  const isActive = deal.status === DealStatus.ACTIVE;
  const isUpcoming = deal.status === DealStatus.SCHEDULED;
  const isEnded = deal.status === DealStatus.ENDED;

  // Show preview of first few products
  const previewProducts = deal.dealProducts?.slice(0, 4) || [];

  return (
    <Link href={`/deals/${deal.id}`}>
      <Card
        className={cn(
          'group overflow-hidden transition-all hover:shadow-lg',
          !isActive && 'opacity-75',
          className,
        )}
      >
        {/* Banner Image */}
        {deal.bannerImage && (
          <div className="relative h-48 overflow-hidden bg-muted">
            <Image
              src={deal.bannerImage}
              alt={deal.name}
              fill
              className="object-cover transition-transform group-hover:scale-105"
            />
            {/* Overlay badges */}
            <div className="absolute top-3 left-3 flex flex-col gap-2">
              <DealBadge
                type={deal.type}
                customBadge={deal.badge}
                customColor={deal.badgeColor}
              />
              {deal.isFeatured && (
                <Badge className="bg-gradient-to-r from-purple-600 to-pink-600 text-white">
                  <TrendingUp className="h-3 w-3 mr-1" />
                  Featured
                </Badge>
              )}
            </div>
          </div>
        )}

        <CardContent className="p-4">
          {/* Deal Header */}
          <div className="space-y-3">
            {!deal.bannerImage && (
              <div className="flex items-center gap-2">
                <DealBadge
                  type={deal.type}
                  customBadge={deal.badge}
                  customColor={deal.badgeColor}
                />
                {deal.isFeatured && (
                  <Badge variant="secondary">Featured</Badge>
                )}
              </div>
            )}

            <div>
              <h3 className="font-semibold text-lg line-clamp-1 group-hover:text-primary transition-colors">
                {deal.name}
              </h3>
              <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                {deal.description}
              </p>
            </div>

            {/* Discount Display */}
            {deal.discountPercentage && (
              <div className="text-3xl font-bold text-red-600">
                {deal.discountPercentage}% OFF
              </div>
            )}
            {deal.discountAmount && (
              <div className="text-3xl font-bold text-red-600">
                ${deal.discountAmount} OFF
              </div>
            )}
            {deal.type === 'BOGO' && deal.buyQuantity && deal.getQuantity && (
              <div className="text-2xl font-bold text-green-600">
                Buy {deal.buyQuantity}, Get {deal.getQuantity} Free
              </div>
            )}

            {/* Countdown Timer */}
            {isActive && (
              <div className="bg-muted/50 rounded-lg p-3">
                <p className="text-xs text-muted-foreground mb-2">
                  Ends in:
                </p>
                <CountdownTimer
                  endTime={deal.endTime}
                  size="sm"
                  showIcon={false}
                />
              </div>
            )}

            {isUpcoming && (
              <div className="bg-blue-50 rounded-lg p-3">
                <p className="text-xs text-blue-900 mb-2">Starts in:</p>
                <CountdownTimer
                  endTime={deal.startTime}
                  startTime={deal.startTime}
                  size="sm"
                  showIcon={false}
                />
              </div>
            )}

            {/* Stock Progress */}
            {deal.totalStock && deal.remainingStock !== null && isActive && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">
                    Stock: {deal.remainingStock} / {deal.totalStock} left
                  </span>
                  <span className="font-medium">
                    {Math.round(stockPercentage)}% sold
                  </span>
                </div>
                <Progress value={stockPercentage} className="h-2" />
                {deal.remainingStock <= 10 && deal.remainingStock > 0 && (
                  <p className="text-xs text-red-600 font-medium">
                    Only {deal.remainingStock} left!
                  </p>
                )}
                {deal.remainingStock === 0 && (
                  <p className="text-xs text-red-600 font-bold">SOLD OUT</p>
                )}
              </div>
            )}

            {/* Product Preview */}
            {showProducts && previewProducts.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground font-medium">
                  {productCount} {productCount === 1 ? 'Product' : 'Products'}
                </p>
                <div className="flex gap-2">
                  {previewProducts.map((dealProduct) => (
                    <div
                      key={dealProduct.id}
                      className="relative h-16 w-16 rounded-md overflow-hidden bg-muted border"
                    >
                      {dealProduct.product.images[0] && (
                        <Image
                          src={dealProduct.product.images[0]}
                          alt={dealProduct.product.name}
                          fill
                          className="object-cover"
                        />
                      )}
                    </div>
                  ))}
                  {productCount > 4 && (
                    <div className="h-16 w-16 rounded-md bg-muted border flex items-center justify-center">
                      <span className="text-xs font-medium text-muted-foreground">
                        +{productCount - 4}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Stats */}
            <div className="flex items-center gap-4 pt-2 border-t text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <Users className="h-4 w-4" />
                <span>{deal.views.toLocaleString()} views</span>
              </div>
              {purchaseCount > 0 && (
                <div className="flex items-center gap-1">
                  <ShoppingCart className="h-4 w-4" />
                  <span>{purchaseCount} sold</span>
                </div>
              )}
            </div>

            {/* Tier requirement */}
            {deal.minimumTier && (
              <Badge variant="outline" className="text-xs">
                Requires {deal.minimumTier} tier
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
