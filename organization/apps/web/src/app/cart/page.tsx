'use client';

import * as React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ShoppingCart,
  Trash2,
  Plus,
  Minus,
  Heart,
  Truck,
  Shield,
  RotateCcw,
  Tag,
  Sparkles,
  ArrowRight,
  Clock,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ProductCard } from '@/components/product/product-card';
import { useCartStore, selectCartItemCount, selectIsCartEmpty } from '@/stores/cart-store';
import { useAuthStore } from '@/stores/auth-store';
import { formatCurrency, cn } from '@/lib/utils';
import { toast } from 'sonner';

export default function CartPage() {
  const {
    cart,
    isLoading,
    recommendations,
    updateQuantity,
    removeItem,
    applyCoupon,
    removeCoupon,
    saveForLater,
    moveToCart,
    clearCart,
  } = useCartStore();

  const { isAuthenticated } = useAuthStore();
  const isCartEmpty = useCartStore(selectIsCartEmpty);
  const itemCount = useCartStore(selectCartItemCount);

  const [couponCode, setCouponCode] = React.useState('');
  const [isApplyingCoupon, setIsApplyingCoupon] = React.useState(false);

  const handleQuantityChange = async (itemId: string, newQuantity: number) => {
    if (newQuantity < 1) return;
    try {
      await updateQuantity(itemId, newQuantity);
    } catch {
      toast.error('Failed to update quantity');
    }
  };

  const handleRemoveItem = async (itemId: string) => {
    try {
      await removeItem(itemId);
      toast.success('Item removed from cart');
    } catch {
      toast.error('Failed to remove item');
    }
  };

  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) return;

    setIsApplyingCoupon(true);
    try {
      await applyCoupon(couponCode);
      toast.success('Coupon applied successfully!');
      setCouponCode('');
    } catch (error) {
      toast.error('Invalid coupon code');
    } finally {
      setIsApplyingCoupon(false);
    }
  };

  const handleSaveForLater = async (itemId: string) => {
    try {
      await saveForLater(itemId);
      toast.success('Item saved for later');
    } catch {
      toast.error('Failed to save item');
    }
  };

  if (isCartEmpty) {
    return (
      <div className="container py-12">
        <div className="max-w-md mx-auto text-center">
          <div className="h-24 w-24 rounded-full bg-muted flex items-center justify-center mx-auto mb-6">
            <ShoppingCart className="h-12 w-12 text-muted-foreground" />
          </div>
          <h1 className="text-2xl font-bold mb-2">Your cart is empty</h1>
          <p className="text-muted-foreground mb-6">
            Looks like you haven't added anything to your cart yet.
            Start shopping to fill it up!
          </p>
          <Link href="/">
            <Button size="lg">
              <Sparkles className="mr-2 h-4 w-4" />
              Discover Products
            </Button>
          </Link>
        </div>

        {/* Recommendations */}
        {recommendations.length > 0 && (
          <div className="mt-16">
            <h2 className="text-xl font-bold mb-6">You might like these</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {recommendations.slice(0, 4).map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="container py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Shopping Cart</h1>
          <p className="text-muted-foreground">
            {itemCount} {itemCount === 1 ? 'item' : 'items'} in your cart
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={clearCart}>
          Clear Cart
        </Button>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Cart Items */}
        <div className="lg:col-span-2 space-y-4">
          <AnimatePresence mode="popLayout">
            {cart?.items.map((item) => (
              <motion.div
                key={item.id}
                layout
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -100 }}
              >
                <Card>
                  <CardContent className="p-4">
                    <div className="flex gap-4">
                      {/* Product Image */}
                      <Link href={`/products/${item.product.slug}`}>
                        <div className="relative h-24 w-24 md:h-32 md:w-32 rounded-lg overflow-hidden bg-muted flex-shrink-0">
                          <Image
                            src={item.product.images[0]?.url || '/placeholder.jpg'}
                            alt={item.product.name}
                            fill
                            className="object-cover"
                          />
                        </div>
                      </Link>

                      {/* Product Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <Link href={`/products/${item.product.slug}`}>
                              <h3 className="font-medium hover:text-primary transition-colors line-clamp-2">
                                {item.product.name}
                              </h3>
                            </Link>
                            {item.variant && (
                              <p className="text-sm text-muted-foreground mt-1">
                                {item.variant.options.map((opt) => opt.value).join(' / ')}
                              </p>
                            )}
                            {item.product.vendor && (
                              <p className="text-xs text-muted-foreground mt-1">
                                Sold by {item.product.vendor.name}
                              </p>
                            )}
                          </div>
                          <div className="text-right">
                            <p className="font-bold">
                              {formatCurrency(item.total, item.product.currency)}
                            </p>
                            {item.product.compareAtPrice && (
                              <p className="text-sm text-muted-foreground line-through">
                                {formatCurrency(
                                  item.product.compareAtPrice * item.quantity,
                                  item.product.currency
                                )}
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Quantity & Actions */}
                        <div className="flex items-center justify-between mt-4">
                          <div className="flex items-center gap-2">
                            <div className="flex items-center border rounded-md">
                              <button
                                onClick={() => handleQuantityChange(item.id, item.quantity - 1)}
                                disabled={item.quantity <= 1 || isLoading}
                                className="p-2 hover:bg-muted transition-colors disabled:opacity-50"
                              >
                                <Minus className="h-4 w-4" />
                              </button>
                              <span className="w-12 text-center font-medium">
                                {item.quantity}
                              </span>
                              <button
                                onClick={() => handleQuantityChange(item.id, item.quantity + 1)}
                                disabled={isLoading}
                                className="p-2 hover:bg-muted transition-colors disabled:opacity-50"
                              >
                                <Plus className="h-4 w-4" />
                              </button>
                            </div>
                            <span className="text-sm text-muted-foreground">
                              {formatCurrency(item.price, item.product.currency)} each
                            </span>
                          </div>

                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleSaveForLater(item.id)}
                              className="p-2 text-muted-foreground hover:text-foreground transition-colors"
                              title="Save for later"
                            >
                              <Heart className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleRemoveItem(item.id)}
                              className="p-2 text-muted-foreground hover:text-destructive transition-colors"
                              title="Remove"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </div>

                        {/* Stock Warning */}
                        {item.product.inventory.status === 'LOW_STOCK' && (
                          <div className="flex items-center gap-1 mt-2 text-xs text-amber-600">
                            <Clock className="h-3 w-3" />
                            Only {item.product.inventory.available} left - order soon!
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </AnimatePresence>

          {/* Saved for Later */}
          {cart?.savedForLater && cart.savedForLater.length > 0 && (
            <div className="mt-8">
              <h2 className="text-lg font-semibold mb-4">Saved for Later</h2>
              <div className="space-y-4">
                {cart.savedForLater.map((item) => (
                  <Card key={item.id}>
                    <CardContent className="p-4">
                      <div className="flex gap-4">
                        <div className="relative h-20 w-20 rounded-lg overflow-hidden bg-muted">
                          <Image
                            src={item.product.images[0]?.url || '/placeholder.jpg'}
                            alt={item.product.name}
                            fill
                            className="object-cover"
                          />
                        </div>
                        <div className="flex-1">
                          <h3 className="font-medium">{item.product.name}</h3>
                          <p className="font-bold mt-1">
                            {formatCurrency(item.price, item.product.currency)}
                          </p>
                          <Button
                            size="sm"
                            variant="outline"
                            className="mt-2"
                            onClick={() => moveToCart(item.id)}
                          >
                            Move to Cart
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Order Summary */}
        <div className="lg:col-span-1">
          <Card className="sticky top-24">
            <CardHeader>
              <CardTitle>Order Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Coupon Code */}
              <div>
                <div className="flex gap-2">
                  <Input
                    placeholder="Coupon code"
                    value={couponCode}
                    onChange={(e) => setCouponCode(e.target.value)}
                    disabled={isApplyingCoupon || !!cart?.couponCode}
                  />
                  <Button
                    variant="outline"
                    onClick={handleApplyCoupon}
                    disabled={isApplyingCoupon || !!cart?.couponCode}
                  >
                    {isApplyingCoupon ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      'Apply'
                    )}
                  </Button>
                </div>
                {cart?.couponCode && (
                  <div className="flex items-center justify-between mt-2 p-2 bg-success/10 rounded-md">
                    <div className="flex items-center gap-2 text-success">
                      <Tag className="h-4 w-4" />
                      <span className="text-sm font-medium">{cart.couponCode}</span>
                    </div>
                    <button
                      onClick={removeCoupon}
                      className="text-xs text-muted-foreground hover:text-foreground"
                    >
                      Remove
                    </button>
                  </div>
                )}
              </div>

              {/* Price Breakdown */}
              <div className="space-y-2 pt-4 border-t">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span>{formatCurrency(cart?.subtotal || 0)}</span>
                </div>
                {(cart?.discount || 0) > 0 && (
                  <div className="flex justify-between text-sm text-success">
                    <span>Discount</span>
                    <span>-{formatCurrency(cart?.discount || 0)}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Shipping</span>
                  <span>
                    {(cart?.shipping || 0) === 0 ? (
                      <span className="text-success">Free</span>
                    ) : (
                      formatCurrency(cart?.shipping || 0)
                    )}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Tax</span>
                  <span>{formatCurrency(cart?.tax || 0)}</span>
                </div>
              </div>

              {/* Total */}
              <div className="flex justify-between items-center pt-4 border-t">
                <span className="text-lg font-semibold">Total</span>
                <span className="text-2xl font-bold">
                  {formatCurrency(cart?.total || 0)}
                </span>
              </div>

              {/* Free Shipping Progress */}
              {(cart?.subtotal || 0) < 50 && (
                <div className="p-3 bg-primary/5 rounded-lg">
                  <div className="flex items-center gap-2 text-sm mb-2">
                    <Truck className="h-4 w-4 text-primary" />
                    <span>
                      Add{' '}
                      <strong>{formatCurrency(50 - (cart?.subtotal || 0))}</strong>{' '}
                      for free shipping
                    </span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary transition-all"
                      style={{
                        width: `${Math.min(((cart?.subtotal || 0) / 50) * 100, 100)}%`,
                      }}
                    />
                  </div>
                </div>
              )}

              {/* Checkout Button */}
              <Link href={isAuthenticated ? '/checkout' : '/auth/login?redirect=/checkout'}>
                <Button size="lg" className="w-full">
                  {isAuthenticated ? 'Proceed to Checkout' : 'Sign in to Checkout'}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>

              {/* Trust Badges */}
              <div className="flex items-center justify-center gap-4 pt-4 text-xs text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Shield className="h-4 w-4" />
                  <span>Secure</span>
                </div>
                <div className="flex items-center gap-1">
                  <RotateCcw className="h-4 w-4" />
                  <span>30-day returns</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* AI Recommendations */}
      {recommendations.length > 0 && (
        <div className="mt-16">
          <div className="flex items-center gap-2 mb-6">
            <Sparkles className="h-5 w-5 text-primary" />
            <h2 className="text-xl font-bold">Complete Your Order</h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {recommendations.slice(0, 4).map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                badge={{ text: 'Recommended', variant: 'secondary' }}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
