'use client';

import * as React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  TrendingDown,
  TrendingUp,
  Clock,
  Sparkles,
  AlertTriangle,
  Timer,
  Percent,
  Users,
  Flame,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn, formatCurrency } from '@/lib/utils';

export interface DynamicPricingInfo {
  currentPrice: number;
  originalPrice?: number;
  currency?: string;
  discountPercentage?: number;
  priceDropAmount?: number;
  priceDropDate?: string;
  demandLevel?: 'LOW' | 'MEDIUM' | 'HIGH' | 'VERY_HIGH';
  stockLevel?: 'IN_STOCK' | 'LOW_STOCK' | 'VERY_LOW_STOCK';
  viewersCount?: number;
  recentPurchases?: number;
  priceHistory?: { date: string; price: number }[];
  predictedPriceChange?: 'UP' | 'DOWN' | 'STABLE';
  dealEndsAt?: string;
  isFlashDeal?: boolean;
  isBestPrice?: boolean;
  priceMatchGuarantee?: boolean;
}

interface DynamicPricingLabelProps {
  pricing: DynamicPricingInfo;
  variant?: 'default' | 'compact' | 'detailed' | 'inline';
  showBadges?: boolean;
  showUrgency?: boolean;
  className?: string;
}

function CountdownTimer({ endTime }: { endTime: string }) {
  const [timeLeft, setTimeLeft] = React.useState<{
    hours: number;
    minutes: number;
    seconds: number;
  } | null>(null);

  React.useEffect(() => {
    const calculateTimeLeft = () => {
      const difference = new Date(endTime).getTime() - Date.now();
      if (difference <= 0) {
        setTimeLeft(null);
        return;
      }

      setTimeLeft({
        hours: Math.floor(difference / (1000 * 60 * 60)),
        minutes: Math.floor((difference / (1000 * 60)) % 60),
        seconds: Math.floor((difference / 1000) % 60),
      });
    };

    calculateTimeLeft();
    const timer = setInterval(calculateTimeLeft, 1000);
    return () => clearInterval(timer);
  }, [endTime]);

  if (!timeLeft) return null;

  return (
    <div className="flex items-center gap-1 font-mono text-sm">
      <Timer className="h-3 w-3" />
      <span>
        {String(timeLeft.hours).padStart(2, '0')}:
        {String(timeLeft.minutes).padStart(2, '0')}:
        {String(timeLeft.seconds).padStart(2, '0')}
      </span>
    </div>
  );
}

function DemandIndicator({ level }: { level: DynamicPricingInfo['demandLevel'] }) {
  const config = {
    LOW: { color: 'bg-gray-100 text-gray-600', label: 'Low demand', bars: 1 },
    MEDIUM: { color: 'bg-yellow-100 text-yellow-700', label: 'Moderate demand', bars: 2 },
    HIGH: { color: 'bg-orange-100 text-orange-700', label: 'High demand', bars: 3 },
    VERY_HIGH: { color: 'bg-red-100 text-red-700', label: 'Very high demand', bars: 4 },
  };

  const { color, label, bars } = config[level || 'LOW'];

  return (
    <div className="flex items-center gap-2">
      <div className="flex gap-0.5">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className={cn(
              'w-1 rounded-full transition-all',
              i <= bars ? 'h-3 bg-current' : 'h-2 bg-muted'
            )}
          />
        ))}
      </div>
      <span className={cn('text-xs px-2 py-0.5 rounded-full', color)}>{label}</span>
    </div>
  );
}

export function DynamicPricingLabel({
  pricing,
  variant = 'default',
  showBadges = true,
  showUrgency = true,
  className,
}: DynamicPricingLabelProps) {
  const hasDiscount = pricing.originalPrice && pricing.originalPrice > pricing.currentPrice;
  const discountPercent = hasDiscount
    ? Math.round(((pricing.originalPrice! - pricing.currentPrice) / pricing.originalPrice!) * 100)
    : pricing.discountPercentage;

  // Compact variant
  if (variant === 'compact') {
    return (
      <div className={cn('flex items-center gap-2', className)}>
        <span className="text-lg font-bold">
          {formatCurrency(pricing.currentPrice)}
        </span>
        {hasDiscount && (
          <>
            <span className="text-sm text-muted-foreground line-through">
              {formatCurrency(pricing.originalPrice!)}
            </span>
            <Badge variant="destructive" className="text-xs">
              -{discountPercent}%
            </Badge>
          </>
        )}
      </div>
    );
  }

  // Inline variant
  if (variant === 'inline') {
    return (
      <div className={cn('inline-flex items-center gap-2 flex-wrap', className)}>
        <span className="font-bold text-primary">
          {formatCurrency(pricing.currentPrice)}
        </span>
        {hasDiscount && (
          <span className="text-sm text-muted-foreground line-through">
            {formatCurrency(pricing.originalPrice!)}
          </span>
        )}
        {pricing.isFlashDeal && (
          <Badge variant="destructive" className="gap-1">
            <Flame className="h-3 w-3" />
            Flash Deal
          </Badge>
        )}
        {pricing.isBestPrice && (
          <Badge className="gap-1 bg-green-500">
            <Sparkles className="h-3 w-3" />
            Best Price
          </Badge>
        )}
      </div>
    );
  }

  // Detailed variant
  if (variant === 'detailed') {
    return (
      <div className={cn('space-y-3', className)}>
        {/* Price Display */}
        <div className="flex items-baseline gap-3">
          <span className="text-3xl font-bold text-primary">
            {formatCurrency(pricing.currentPrice)}
          </span>
          {hasDiscount && (
            <div className="flex items-center gap-2">
              <span className="text-lg text-muted-foreground line-through">
                {formatCurrency(pricing.originalPrice!)}
              </span>
              <Badge variant="destructive" className="text-sm px-2 py-0.5">
                Save {discountPercent}%
              </Badge>
            </div>
          )}
        </div>

        {/* Badges */}
        {showBadges && (
          <div className="flex flex-wrap gap-2">
            {pricing.isFlashDeal && (
              <Badge variant="destructive" className="gap-1">
                <Flame className="h-3 w-3" />
                Flash Deal
              </Badge>
            )}
            {pricing.isBestPrice && (
              <Badge className="gap-1 bg-green-500 hover:bg-green-600">
                <Sparkles className="h-3 w-3" />
                Best Price in 30 days
              </Badge>
            )}
            {pricing.priceMatchGuarantee && (
              <Badge variant="outline" className="gap-1">
                <Percent className="h-3 w-3" />
                Price Match Guarantee
              </Badge>
            )}
            {pricing.priceDropAmount && pricing.priceDropDate && (
              <Badge variant="secondary" className="gap-1">
                <TrendingDown className="h-3 w-3 text-green-500" />
                Price dropped {formatCurrency(pricing.priceDropAmount)} on{' '}
                {new Date(pricing.priceDropDate).toLocaleDateString()}
              </Badge>
            )}
          </div>
        )}

        {/* Urgency Indicators */}
        {showUrgency && (
          <div className="space-y-2">
            {/* Deal Timer */}
            {pricing.dealEndsAt && (
              <div className="flex items-center gap-2 p-2 rounded-lg bg-destructive/10 text-destructive">
                <Timer className="h-4 w-4" />
                <span className="text-sm font-medium">Deal ends in</span>
                <CountdownTimer endTime={pricing.dealEndsAt} />
              </div>
            )}

            {/* Demand Level */}
            {pricing.demandLevel && (
              <DemandIndicator level={pricing.demandLevel} />
            )}

            {/* Stock Level */}
            {pricing.stockLevel && pricing.stockLevel !== 'IN_STOCK' && (
              <div className="flex items-center gap-2 text-sm">
                <AlertTriangle
                  className={cn(
                    'h-4 w-4',
                    pricing.stockLevel === 'VERY_LOW_STOCK'
                      ? 'text-destructive'
                      : 'text-yellow-500'
                  )}
                />
                <span
                  className={cn(
                    pricing.stockLevel === 'VERY_LOW_STOCK'
                      ? 'text-destructive'
                      : 'text-yellow-600'
                  )}
                >
                  {pricing.stockLevel === 'VERY_LOW_STOCK'
                    ? 'Only a few left!'
                    : 'Low stock - order soon'}
                </span>
              </div>
            )}

            {/* Social Proof */}
            {(pricing.viewersCount || pricing.recentPurchases) && (
              <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
                {pricing.viewersCount && (
                  <span className="flex items-center gap-1">
                    <Users className="h-3 w-3" />
                    {pricing.viewersCount} viewing now
                  </span>
                )}
                {pricing.recentPurchases && (
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {pricing.recentPurchases} bought in last 24h
                  </span>
                )}
              </div>
            )}

            {/* Price Prediction */}
            {pricing.predictedPriceChange && (
              <div
                className={cn(
                  'flex items-center gap-2 text-sm p-2 rounded-lg',
                  pricing.predictedPriceChange === 'UP'
                    ? 'bg-red-50 text-red-700'
                    : pricing.predictedPriceChange === 'DOWN'
                    ? 'bg-green-50 text-green-700'
                    : 'bg-gray-50 text-gray-700'
                )}
              >
                <Sparkles className="h-4 w-4" />
                <span>
                  AI Prediction: Price likely to{' '}
                  {pricing.predictedPriceChange === 'UP'
                    ? 'increase soon'
                    : pricing.predictedPriceChange === 'DOWN'
                    ? 'decrease soon'
                    : 'stay stable'}
                </span>
                {pricing.predictedPriceChange === 'UP' ? (
                  <TrendingUp className="h-4 w-4 ml-auto" />
                ) : pricing.predictedPriceChange === 'DOWN' ? (
                  <TrendingDown className="h-4 w-4 ml-auto" />
                ) : null}
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  // Default variant
  return (
    <div className={cn('space-y-2', className)}>
      <div className="flex items-baseline gap-2">
        <span className="text-2xl font-bold">
          {formatCurrency(pricing.currentPrice)}
        </span>
        {hasDiscount && (
          <>
            <span className="text-sm text-muted-foreground line-through">
              {formatCurrency(pricing.originalPrice!)}
            </span>
            <Badge variant="destructive">-{discountPercent}%</Badge>
          </>
        )}
      </div>

      {showBadges && (
        <div className="flex flex-wrap gap-1">
          {pricing.isFlashDeal && (
            <Badge variant="destructive" className="text-xs gap-1">
              <Flame className="h-3 w-3" />
              Flash
            </Badge>
          )}
          {pricing.isBestPrice && (
            <Badge className="text-xs gap-1 bg-green-500">
              <Sparkles className="h-3 w-3" />
              Best Price
            </Badge>
          )}
          {pricing.stockLevel === 'LOW_STOCK' && (
            <Badge variant="secondary" className="text-xs gap-1">
              <AlertTriangle className="h-3 w-3" />
              Low Stock
            </Badge>
          )}
          {pricing.stockLevel === 'VERY_LOW_STOCK' && (
            <Badge variant="destructive" className="text-xs gap-1">
              <AlertTriangle className="h-3 w-3" />
              Almost Gone
            </Badge>
          )}
        </div>
      )}

      {pricing.dealEndsAt && (
        <div className="text-xs text-muted-foreground flex items-center gap-1">
          <Clock className="h-3 w-3" />
          <CountdownTimer endTime={pricing.dealEndsAt} />
        </div>
      )}
    </div>
  );
}
