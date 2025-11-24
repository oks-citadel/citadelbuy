'use client';

import { useEffect, useRef } from 'react';
import { useAdsForDisplay, useTrackImpression, useTrackClick } from '@/hooks/useAdvertisements';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import Image from 'next/image';
import type { Advertisement } from '@/lib/api/advertisements';

interface SponsoredProductsProps {
  placement: string;
  categoryId?: string;
  keywords?: string[];
  limit?: number;
  className?: string;
}

export function SponsoredProducts({
  placement,
  categoryId,
  keywords,
  limit = 3,
  className = '',
}: SponsoredProductsProps) {
  const keywordsString = keywords?.join(',');
  const { data: ads, isLoading } = useAdsForDisplay({
    placement,
    categoryId,
    keywords: keywordsString,
    limit,
  });

  const trackImpression = useTrackImpression();
  const trackClick = useTrackClick();
  const impressionsTracked = useRef<Set<string>>(new Set());

  // Track impressions when ads are loaded
  useEffect(() => {
    if (ads && ads.length > 0) {
      ads.forEach((ad: Advertisement) => {
        if (!impressionsTracked.current.has(ad.id)) {
          trackImpression.mutate({
            adId: ad.id,
            placement,
          });
          impressionsTracked.current.add(ad.id);
        }
      });
    }
  }, [ads, placement, trackImpression]);

  const handleClick = (adId: string) => {
    trackClick.mutate({
      adId,
      placement,
    });
  };

  if (isLoading) {
    return (
      <div className={`grid grid-cols-1 md:grid-cols-3 gap-4 ${className}`}>
        {Array.from({ length: limit }).map((_, i) => (
          <Card key={i} className="overflow-hidden">
            <div className="aspect-square bg-gray-200 animate-pulse" />
            <CardContent className="p-4">
              <div className="h-4 bg-gray-200 rounded animate-pulse mb-2" />
              <div className="h-4 bg-gray-200 rounded animate-pulse w-2/3" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!ads || ads.length === 0) {
    return null;
  }

  return (
    <div className={`space-y-4 ${className}`}>
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Sponsored Products</h3>
        <Badge variant="outline" className="text-xs">
          Ad
        </Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {ads.map((ad: Advertisement) => (
          <Link
            key={ad.id}
            href={ad.targetUrl || `/products/${ad.product?.slug}`}
            onClick={() => handleClick(ad.id)}
            className="group"
          >
            <Card className="overflow-hidden hover:shadow-lg transition-shadow">
              <div className="relative aspect-square">
                <Image
                  src={ad.imageUrl || ad.product?.images[0] || '/placeholder-product.png'}
                  alt={ad.title}
                  fill
                  className="object-cover group-hover:scale-105 transition-transform"
                />
                <Badge className="absolute top-2 right-2 text-xs" variant="secondary">
                  Sponsored
                </Badge>
              </div>
              <CardContent className="p-4">
                <h4 className="font-semibold text-sm mb-1 line-clamp-2">{ad.title}</h4>
                {ad.description && (
                  <p className="text-xs text-gray-600 mb-2 line-clamp-2">{ad.description}</p>
                )}
                {ad.product && (
                  <p className="text-lg font-bold text-primary">${ad.product.price.toFixed(2)}</p>
                )}
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
