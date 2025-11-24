'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useCartStore } from '@/store/cart-store';
import type { ShippingFormData } from './shipping-form';

interface OrderReviewProps {
  shippingInfo: ShippingFormData;
  onBack: () => void;
  onPlaceOrder: () => void;
}

export function OrderReview({ shippingInfo, onBack, onPlaceOrder }: OrderReviewProps) {
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);
  const { items, subtotal, tax, total } = useCartStore();

  const subtotalAmount = subtotal();
  const taxAmount = tax();
  const shippingAmount = subtotalAmount >= 50 ? 0 : 9.99;
  const totalAmount = total() + shippingAmount;

  const handlePlaceOrder = async () => {
    setIsPlacingOrder(true);
    await onPlaceOrder();
    setIsPlacingOrder(false);
  };

  return (
    <div className="space-y-6">
      {/* Order Items */}
      <Card>
        <CardHeader>
          <CardTitle>Order Items ({items.length})</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {items.map((item) => (
            <div key={item.product.id} className="flex gap-4">
              <div className="relative h-16 w-16 flex-shrink-0">
                <Image
                  src={item.product.images?.[0] || '/placeholder-product.jpg'}
                  alt={item.product.name}
                  fill
                  className="rounded-md object-cover"
                  sizes="64px"
                />
              </div>
              <div className="flex-1">
                <h4 className="font-semibold">{item.product.name}</h4>
                <p className="text-sm text-muted-foreground">
                  Quantity: {item.quantity}
                </p>
              </div>
              <div className="text-right">
                <p className="font-semibold">
                  ${(item.product.price * item.quantity).toFixed(2)}
                </p>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Shipping Address */}
      <Card>
        <CardHeader>
          <CardTitle>Shipping Address</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-1 text-sm">
            <p className="font-semibold">{shippingInfo.fullName}</p>
            <p>{shippingInfo.street}</p>
            <p>
              {shippingInfo.city}, {shippingInfo.state} {shippingInfo.postalCode}
            </p>
            <p>{shippingInfo.country}</p>
            <p className="pt-2 text-muted-foreground">{shippingInfo.email}</p>
            <p className="text-muted-foreground">{shippingInfo.phone}</p>
          </div>
        </CardContent>
      </Card>

      {/* Order Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Order Summary</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Subtotal</span>
              <span className="font-medium">${subtotalAmount.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Tax (10%)</span>
              <span className="font-medium">${taxAmount.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Shipping</span>
              <span className="font-medium">
                {shippingAmount === 0 ? (
                  <span className="text-green-600">FREE</span>
                ) : (
                  `$${shippingAmount.toFixed(2)}`
                )}
              </span>
            </div>
          </div>

          <div className="border-t pt-4">
            <div className="flex justify-between">
              <span className="text-lg font-semibold">Total</span>
              <span className="text-lg font-bold">${totalAmount.toFixed(2)}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex gap-4">
        <Button variant="outline" onClick={onBack} className="flex-1">
          Back to Payment
        </Button>
        <Button
          onClick={handlePlaceOrder}
          disabled={isPlacingOrder}
          className="flex-1"
          size="lg"
        >
          {isPlacingOrder ? 'Placing Order...' : 'Place Order'}
        </Button>
      </div>
    </div>
  );
}
