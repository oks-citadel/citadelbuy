'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useCartStore } from '@/store/cart-store';
import type { Product } from '@/types';
import { ShoppingCart, Check } from 'lucide-react';

interface ProductInfoProps {
  product: Product;
}

export function ProductInfo({ product }: ProductInfoProps) {
  const router = useRouter();
  const [quantity, setQuantity] = useState(1);
  const [isAdded, setIsAdded] = useState(false);
  const { addItem } = useCartStore();
  const inStock = product.stock > 0;

  const handleAddToCart = () => {
    addItem(product, quantity);
    setIsAdded(true);
    setTimeout(() => setIsAdded(false), 2000);
  };

  const handleQuantityChange = (delta: number) => {
    const newQuantity = quantity + delta;
    if (newQuantity >= 1 && newQuantity <= product.stock) {
      setQuantity(newQuantity);
    }
  };

  return (
    <div className="space-y-6">
      {/* Title and Price */}
      <div>
        <h1 className="text-3xl font-bold">{product.name}</h1>
        <div className="mt-4 flex items-baseline gap-4">
          <span className="text-4xl font-bold">${product.price.toFixed(2)}</span>
          {inStock ? (
            <span className="text-sm text-green-600">In Stock ({product.stock} available)</span>
          ) : (
            <span className="text-sm text-red-600">Out of Stock</span>
          )}
        </div>
      </div>

      {/* Description */}
      <div>
        <h2 className="text-lg font-semibold">Description</h2>
        <p className="mt-2 text-muted-foreground">{product.description}</p>
      </div>

      {/* Quantity Selector */}
      {inStock && (
        <Card>
          <CardContent className="p-6">
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Quantity</label>
                <div className="mt-2 flex items-center gap-3">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleQuantityChange(-1)}
                    disabled={quantity <= 1}
                  >
                    -
                  </Button>
                  <span className="w-12 text-center font-medium">{quantity}</span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleQuantityChange(1)}
                    disabled={quantity >= product.stock}
                  >
                    +
                  </Button>
                </div>
              </div>

              <div className="flex gap-2">
                <Button onClick={handleAddToCart} className="flex-1" size="lg" disabled={isAdded}>
                  {isAdded ? (
                    <>
                      <Check className="mr-2 h-4 w-4" />
                      Added to Cart
                    </>
                  ) : (
                    <>
                      <ShoppingCart className="mr-2 h-4 w-4" />
                      Add to Cart
                    </>
                  )}
                </Button>
                {isAdded && (
                  <Button
                    variant="outline"
                    size="lg"
                    onClick={() => router.push('/cart')}
                  >
                    View Cart
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Product Details */}
      <Card>
        <CardContent className="p-6">
          <h2 className="text-lg font-semibold">Product Details</h2>
          <dl className="mt-4 space-y-2">
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Category</dt>
              <dd className="font-medium">{product.category || 'Uncategorized'}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">SKU</dt>
              <dd className="font-mono text-sm">{product.id.substring(0, 8)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Availability</dt>
              <dd className={inStock ? 'text-green-600' : 'text-red-600'}>
                {inStock ? 'In Stock' : 'Out of Stock'}
              </dd>
            </div>
          </dl>
        </CardContent>
      </Card>

      {/* Shipping Info */}
      <Card>
        <CardContent className="p-6">
          <h2 className="text-lg font-semibold">Shipping & Returns</h2>
          <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
            <li>✓ Free shipping on orders over $50</li>
            <li>✓ 30-day return policy</li>
            <li>✓ Secure checkout</li>
            <li>✓ Ships within 1-2 business days</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
