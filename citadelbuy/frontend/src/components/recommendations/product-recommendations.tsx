'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import Link from 'next/link';
import Image from 'next/image';

interface Product {
  id: string;
  name: string;
  price: number;
  images: string[];
  slug: string;
}

interface ProductRecommendationsProps {
  type: 'personalized' | 'similar' | 'trending' | 'frequently-bought';
  productId?: string;
  userId?: string;
  title?: string;
  limit?: number;
}

export function ProductRecommendations({
  type,
  productId,
  userId,
  title,
  limit = 6
}: ProductRecommendationsProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRecommendations = async () => {
      try {
        let url = '';
        switch (type) {
          case 'personalized':
            url = `/api/recommendations/personalized?limit=${limit}`;
            break;
          case 'similar':
            url = `/api/recommendations/similar/${productId}?limit=${limit}`;
            break;
          case 'trending':
            url = `/api/recommendations/trending?limit=${limit}`;
            break;
          case 'frequently-bought':
            url = `/api/recommendations/frequently-bought-together/${productId}`;
            break;
        }

        const response = await fetch(url);
        const data = await response.json();
        setProducts(data);
      } catch (error) {
        console.error('Failed to fetch recommendations:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchRecommendations();
  }, [type, productId, limit]);

  const getTitle = () => {
    if (title) return title;
    switch (type) {
      case 'personalized': return 'Recommended For You';
      case 'similar': return 'Similar Products';
      case 'trending': return 'Trending Now';
      case 'frequently-bought': return 'Frequently Bought Together';
      default: return 'You May Also Like';
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <h2 className="text-2xl font-bold">{getTitle()}</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {Array.from({ length: limit }).map((_, i) => (
            <Card key={i} className="animate-pulse">
              <div className="aspect-square bg-gray-200" />
              <CardContent className="p-4">
                <div className="h-4 bg-gray-200 rounded mb-2" />
                <div className="h-4 bg-gray-200 rounded w-2/3" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (!products || products.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold">{getTitle()}</h2>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {products.map((product) => (
          <Link key={product.id} href={`/products/${product.slug}`}>
            <Card className="hover:shadow-lg transition-shadow">
              <div className="relative aspect-square">
                <Image
                  src={product.images[0] || '/placeholder.png'}
                  alt={product.name}
                  fill
                  className="object-cover rounded-t-lg"
                />
              </div>
              <CardContent className="p-4">
                <h3 className="font-medium text-sm line-clamp-2 mb-2">
                  {product.name}
                </h3>
                <p className="text-lg font-bold">${product.price.toFixed(2)}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
