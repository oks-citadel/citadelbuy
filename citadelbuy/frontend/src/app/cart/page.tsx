'use client';

import Link from 'next/link';
import { useCartStore } from '@/store/cart-store';
import { CartItem } from '@/components/cart/cart-item';
import { CartSummary } from '@/components/cart/cart-summary';
import { Button } from '@/components/ui/button';
import { ShoppingBag } from 'lucide-react';

export default function CartPage() {
  const { items, clearCart, itemCount } = useCartStore();
  const count = itemCount();

  if (items.length === 0) {
    return (
      <div className="container mx-auto px-4 py-16">
        <div className="flex min-h-[400px] flex-col items-center justify-center">
          <ShoppingBag className="h-24 w-24 text-muted-foreground" />
          <h2 className="mt-6 text-2xl font-bold">Your cart is empty</h2>
          <p className="mt-2 text-muted-foreground">
            Add some products to your cart to get started
          </p>
          <Button asChild className="mt-6" size="lg">
            <Link href="/products">Browse Products</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Shopping Cart</h1>
        <p className="mt-2 text-muted-foreground">
          {count} {count === 1 ? 'item' : 'items'} in your cart
        </p>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        {/* Cart Items */}
        <div className="lg:col-span-2">
          <div className="rounded-lg border bg-card p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold">Cart Items</h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={clearCart}
                className="text-destructive hover:text-destructive"
              >
                Clear Cart
              </Button>
            </div>

            <div className="divide-y">
              {items.map((item) => (
                <CartItem key={item.product.id} item={item} />
              ))}
            </div>
          </div>
        </div>

        {/* Order Summary */}
        <div className="lg:col-span-1">
          <div className="sticky top-4">
            <CartSummary />
          </div>
        </div>
      </div>
    </div>
  );
}
