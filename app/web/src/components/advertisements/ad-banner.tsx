'use client';

import { useEffect, useRef } from 'react';
import { useAdsForDisplay, useTrackImpression, useTrackClick } from '@/hooks/useAdvertisements';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import Image from 'next/image';
import { X } from 'lucide-react';
import { useState } from 'react';

interface AdBannerProps {
  placement: string;
  categoryId?: string;
  className?: string;
  dismissible?: boolean;
}

export function AdBanner({ placement, categoryId, className = '', dismissible = false }: AdBannerProps) {
  const [dismissed, setDismissed] = useState(false);
  const { data: ads, isLoading } = useAdsForDisplay({
    placement,
    categoryId,
    limit: 1,
  });

  const trackImpression = useTrackImpression();
  const trackClick = useTrackClick();
  const impressionTracked = useRef(false);

  const ad = ads?.[0];

  // Track impression when ad is loaded
  useEffect(() => {
    if (ad && !impressionTracked.current) {
      trackImpression.mutate({
        adId: ad.id,
        placement,
      });
      impressionTracked.current = true;
    }
  }, [ad, placement, trackImpression]);

  const handleClick = () => {
    if (ad) {
      trackClick.mutate({
        adId: ad.id,
        placement,
      });
    }
  };

  if (isLoading) {
    return (
      <div className={`relative w-full h-32 bg-gray-200 rounded-lg animate-pulse ${className}`}>
        <div className="absolute top-2 right-2">
          <Badge variant="outline" className="text-xs">
            Ad
          </Badge>
        </div>
      </div>
    );
  }

  if (!ad || dismissed) {
    return null;
  }

  return (
    <div className={`relative w-full rounded-lg overflow-hidden shadow-md ${className}`}>
      <Link href={ad.targetUrl || '#'} onClick={handleClick} className="block">
        <div className="relative w-full h-32 md:h-48">
          {ad.imageUrl ? (
            <Image src={ad.imageUrl} alt={ad.title} fill className="object-cover" />
          ) : (
            <div className="w-full h-full bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center p-6">
              <div className="text-center text-white">
                <h3 className="text-2xl font-bold mb-2">{ad.title}</h3>
                {ad.description && <p className="text-sm">{ad.description}</p>}
              </div>
            </div>
          )}
        </div>
      </Link>

      <Badge className="absolute top-2 right-2 text-xs" variant="secondary">
        Sponsored
      </Badge>

      {dismissible && (
        <button
          onClick={(e) => {
            e.preventDefault();
            setDismissed(true);
          }}
          className="absolute top-2 left-2 bg-white/80 hover:bg-white rounded-full p-1 transition-colors"
          aria-label="Dismiss ad"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
