'use client';

import * as React from 'react';
import Link from 'next/link';
import { TrendingUp, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ProductCard } from '@/components/product/product-card';
import { recommendationService } from '@/services/ai';
import { Product } from '@/types';

export function TrendingProducts() {
  const [products, setProducts] = React.useState<Product[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    const fetchTrending = async () => {
      try {
        const data = await recommendationService.getTrending(undefined, 8);
        setProducts(data);
      } catch (error) {
        console.error('Failed to fetch trending products:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchTrending();
  }, []);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-green-500/10 flex items-center justify-center">
            <TrendingUp className="h-5 w-5 text-green-500" />
          </div>
          <div>
            <h2 className="text-2xl font-bold">Trending Now</h2>
            <p className="text-sm text-muted-foreground">
              Most popular products this week
            </p>
          </div>
        </div>
        <Link href="/trending">
          <Button variant="outline" size="sm">
            See All <ChevronRight className="ml-1 h-4 w-4" />
          </Button>
        </Link>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="space-y-3">
              <div className="aspect-square rounded-lg skeleton" />
              <div className="h-4 rounded skeleton w-3/4" />
              <div className="h-4 rounded skeleton w-1/2" />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}
    </div>
  );
}
