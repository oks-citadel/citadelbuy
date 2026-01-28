'use client';

import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Star, ShoppingCart, Heart } from 'lucide-react';

interface Product {
  id: string;
  name: string;
  price: number;
  originalPrice?: number;
  image: string;
  rating: number;
  reviewCount: number;
  category: string;
  inStock: boolean;
}

interface RecommendationCarouselProps {
  title: string;
  subtitle?: string;
  products: Product[];
  type: 'personalized' | 'similar' | 'trending' | 'recently-viewed';
  onAddToCart?: (productId: string) => void;
  onAddToWishlist?: (productId: string) => void;
}

export function RecommendationCarousel({
  title,
  subtitle,
  products,
  type,
  onAddToCart,
  onAddToWishlist,
}: RecommendationCarouselProps) {
  const getTypeColor = () => {
    switch (type) {
      case 'personalized':
        return 'bg-purple-100 text-purple-800';
      case 'similar':
        return 'bg-blue-100 text-blue-800';
      case 'trending':
        return 'bg-orange-100 text-orange-800';
      case 'recently-viewed':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getTypeLabel = () => {
    switch (type) {
      case 'personalized':
        return 'AI Picked for You';
      case 'similar':
        return 'Similar Items';
      case 'trending':
        return 'Trending Now';
      case 'recently-viewed':
        return 'Recently Viewed';
      default:
        return '';
    }
  };

  if (!products || products.length === 0) {
    return null;
  }

  return (
    <section className="py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h2 className="text-2xl font-bold">{title}</h2>
            <Badge className={getTypeColor()}>{getTypeLabel()}</Badge>
          </div>
          {subtitle && <p className="text-muted-foreground">{subtitle}</p>}
        </div>
        <Button variant="outline" asChild>
          <Link href="/products">View All</Link>
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        {products.map((product) => (
          <Card key={product.id} className="group overflow-hidden">
            <div className="relative aspect-square">
              <Link href={`/products/${product.id}`}>
                <Image
                  src={product.image}
                  alt={product.name}
                  fill
                  className="object-cover transition-transform group-hover:scale-105"
                />
              </Link>
              {product.originalPrice && (
                <Badge className="absolute top-2 left-2 bg-red-500">
                  {Math.round((1 - product.price / product.originalPrice) * 100)}% OFF
                </Badge>
              )}
              <Button
                size="icon"
                variant="secondary"
                className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={() => onAddToWishlist?.(product.id)}
              >
                <Heart className="h-4 w-4" />
              </Button>
            </div>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground mb-1">{product.category}</p>
              <Link href={`/products/${product.id}`}>
                <h3 className="font-medium line-clamp-2 hover:text-primary transition-colors">
                  {product.name}
                </h3>
              </Link>
              <div className="flex items-center gap-1 mt-2">
                <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                <span className="text-sm font-medium">{product.rating.toFixed(1)}</span>
                <span className="text-xs text-muted-foreground">({product.reviewCount})</span>
              </div>
              <div className="flex items-center justify-between mt-3">
                <div>
                  <span className="text-lg font-bold">${product.price.toFixed(2)}</span>
                  {product.originalPrice && (
                    <span className="text-sm text-muted-foreground line-through ml-2">
                      ${product.originalPrice.toFixed(2)}
                    </span>
                  )}
                </div>
              </div>
              <Button
                className="w-full mt-3"
                size="sm"
                disabled={!product.inStock}
                onClick={() => onAddToCart?.(product.id)}
              >
                <ShoppingCart className="h-4 w-4 mr-2" />
                {product.inStock ? 'Add to Cart' : 'Out of Stock'}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
}

export default RecommendationCarousel;
