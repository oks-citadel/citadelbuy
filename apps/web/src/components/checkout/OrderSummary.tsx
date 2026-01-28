'use client';

import * as React from 'react';
import { ShoppingBag, Truck, Gift, Tag, Shield, Lock } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export interface OrderItem {
  id: string;
  name: string;
  quantity: number;
  price: number;
  image?: string;
  variant?: string;
}

export interface OrderSummaryProps {
  items: OrderItem[];
  subtotal: number;
  shipping?: number;
  tax?: number;
  discount?: number;
  giftWrap?: number;
  total: number;
  currency?: string;
  currencySymbol?: string;
  shippingMethod?: string;
  estimatedDelivery?: string;
  promoCode?: string;
  className?: string;
  showItems?: boolean;
  showTrustBadges?: boolean;
}

/**
 * Formats a currency value for display
 */
function formatCurrency(amount: number, symbol: string = '$'): string {
  return `${symbol}${amount.toFixed(2)}`;
}

/**
 * OrderSummary Component
 *
 * Displays a comprehensive order summary including items, pricing breakdown,
 * shipping information, discounts, and trust badges.
 */
export function OrderSummary({
  items,
  subtotal,
  shipping = 0,
  tax = 0,
  discount = 0,
  giftWrap = 0,
  total,
  currency = 'USD',
  currencySymbol = '$',
  shippingMethod,
  estimatedDelivery,
  promoCode,
  className,
  showItems = true,
  showTrustBadges = true,
}: OrderSummaryProps) {
  const freeShipping = shipping === 0;

  return (
    <Card className={cn('w-full', className)}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ShoppingBag className="h-5 w-5" />
          Order Summary
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Items List */}
        {showItems && items.length > 0 && (
          <div className="space-y-3 max-h-64 overflow-y-auto" data-testid="order-items">
            {items.map((item) => (
              <div key={item.id} className="flex items-center gap-3" data-testid="order-item">
                <div className="relative">
                  {item.image ? (
                    <img
                      src={item.image}
                      alt={item.name}
                      className="h-12 w-12 rounded-lg object-cover"
                    />
                  ) : (
                    <div className="h-12 w-12 rounded-lg bg-muted" />
                  )}
                  <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center">
                    {item.quantity}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium line-clamp-1">{item.name}</p>
                  {item.variant && (
                    <p className="text-xs text-muted-foreground">{item.variant}</p>
                  )}
                </div>
                <p className="text-sm font-medium">
                  {formatCurrency(item.price * item.quantity, currencySymbol)}
                </p>
              </div>
            ))}
          </div>
        )}

        {showItems && items.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-4" data-testid="empty-cart-message">
            Your cart is empty
          </p>
        )}

        {/* Promo Code Badge */}
        {promoCode && (
          <div className="flex items-center gap-2 p-2 bg-success/10 rounded-md" data-testid="promo-badge">
            <Tag className="h-4 w-4 text-success" />
            <span className="text-sm text-success font-medium">
              Promo code applied: {promoCode}
            </span>
          </div>
        )}

        {/* Price Breakdown */}
        <div className="space-y-2 pt-4 border-t" data-testid="price-breakdown">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Subtotal</span>
            <span data-testid="subtotal">{formatCurrency(subtotal, currencySymbol)}</span>
          </div>

          {discount > 0 && (
            <div className="flex justify-between text-sm text-success">
              <span>Discount</span>
              <span data-testid="discount">-{formatCurrency(discount, currencySymbol)}</span>
            </div>
          )}

          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground flex items-center gap-1">
              <Truck className="h-3.5 w-3.5" />
              Shipping
              {shippingMethod && (
                <span className="text-xs">({shippingMethod})</span>
              )}
            </span>
            <span data-testid="shipping">
              {freeShipping ? (
                <span className="text-success">Free</span>
              ) : (
                formatCurrency(shipping, currencySymbol)
              )}
            </span>
          </div>

          {estimatedDelivery && (
            <p className="text-xs text-muted-foreground pl-5" data-testid="estimated-delivery">
              Estimated: {estimatedDelivery}
            </p>
          )}

          {giftWrap > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground flex items-center gap-1">
                <Gift className="h-3.5 w-3.5" />
                Gift wrap
              </span>
              <span data-testid="gift-wrap">{formatCurrency(giftWrap, currencySymbol)}</span>
            </div>
          )}

          {tax > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Tax</span>
              <span data-testid="tax">{formatCurrency(tax, currencySymbol)}</span>
            </div>
          )}
        </div>

        {/* Total */}
        <div className="flex justify-between items-center pt-4 border-t" data-testid="total-section">
          <span className="text-lg font-semibold">Total</span>
          <div className="text-right">
            <span className="text-2xl font-bold" data-testid="total">
              {formatCurrency(total, currencySymbol)}
            </span>
            <p className="text-xs text-muted-foreground">{currency}</p>
          </div>
        </div>

        {/* Trust Badges */}
        {showTrustBadges && (
          <div
            className="flex items-center justify-center gap-4 pt-4 text-xs text-muted-foreground"
            data-testid="trust-badges"
          >
            <div className="flex items-center gap-1">
              <Shield className="h-4 w-4" />
              <span>Secure</span>
            </div>
            <div className="flex items-center gap-1">
              <Lock className="h-4 w-4" />
              <span>Encrypted</span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default OrderSummary;
