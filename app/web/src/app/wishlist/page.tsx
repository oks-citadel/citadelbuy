'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useWishlist, useClearWishlist } from '@/hooks/useWishlist';
import { useAuthStore } from '@/store/auth-store';
import { useCartStore } from '@/store/cart-store';
import { WishlistButton } from '@/components/wishlist/wishlist-button';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Heart, ShoppingCart, Trash2 } from 'lucide-react';

export default function WishlistPage() {
  const { isAuthenticated } = useAuthStore();
  const { wishlist, isLoading, count } = useWishlist();
  const { addItem } = useCartStore();
  const clearWishlist = useClearWishlist();

  const handleAddToCart = (product: any) => {
    addItem(product, 1);
  };

  const handleClearWishlist = () => {
    if (confirm('Are you sure you want to clear your entire wishlist?')) {
      clearWishlist.mutate();
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-md mx-auto text-center">
          <Heart className="w-16 h-16 mx-auto mb-4 text-gray-400" />
          <h1 className="text-2xl font-bold mb-2">Sign in to view your wishlist</h1>
          <p className="text-gray-600 mb-6">
            Create an account or sign in to save your favorite products
          </p>
          <Button asChild className="w-full">
            <Link href="/auth/login">Sign In</Link>
          </Button>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-16">
        <div className="flex justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">My Wishlist</h1>
          <p className="text-gray-600 mt-1">
            {count} {count === 1 ? 'item' : 'items'}
          </p>
        </div>

        {count > 0 && (
          <Button
            variant="outline"
            onClick={handleClearWishlist}
            disabled={clearWishlist.isPending}
            className="flex items-center gap-2"
          >
            <Trash2 className="w-4 h-4" />
            Clear Wishlist
          </Button>
        )}
      </div>

      {/* Empty State */}
      {count === 0 && (
        <div className="text-center py-16">
          <Heart className="w-20 h-20 mx-auto mb-4 text-gray-300" />
          <h2 className="text-2xl font-semibold mb-2">Your wishlist is empty</h2>
          <p className="text-gray-600 mb-6">
            Start adding products you love to your wishlist
          </p>
          <Button asChild>
            <Link href="/products">Browse Products</Link>
          </Button>
        </div>
      )}

      {/* Wishlist Grid */}
      {count > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {wishlist.map((item) => (
            <Card key={item.id} className="group relative">
              <CardContent className="p-4">
                {/* Remove Button */}
                <div className="absolute top-2 right-2 z-10">
                  <WishlistButton productId={item.productId} variant="icon" />
                </div>

                {/* Product Image */}
                <Link href={`/products/${item.productId}`} className="block mb-3">
                  <div className="relative aspect-square overflow-hidden rounded-lg bg-gray-100">
                    <Image
                      src={item.product.images[0] || '/placeholder-product.jpg'}
                      alt={item.product.name}
                      fill
                      className="object-cover transition-transform group-hover:scale-105"
                    />
                  </div>
                </Link>

                {/* Product Info */}
                <div className="space-y-2">
                  <Link
                    href={`/products/${item.productId}`}
                    className="block hover:text-blue-600 transition-colors"
                  >
                    <h3 className="font-semibold line-clamp-2">{item.product.name}</h3>
                  </Link>

                  <div className="flex items-center justify-between">
                    <span className="text-2xl font-bold">
                      ${item.product.price.toFixed(2)}
                    </span>
                    {item.product.stock > 0 ? (
                      <span className="text-sm text-green-600">In Stock</span>
                    ) : (
                      <span className="text-sm text-red-600">Out of Stock</span>
                    )}
                  </div>

                  {/* Add to Cart Button */}
                  <Button
                    onClick={() => handleAddToCart(item.product)}
                    disabled={item.product.stock === 0}
                    className="w-full flex items-center justify-center gap-2"
                  >
                    <ShoppingCart className="w-4 h-4" />
                    {item.product.stock === 0 ? 'Out of Stock' : 'Add to Cart'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
