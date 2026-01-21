'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

interface LoadingSkeletonProps {
  type: 'products' | 'categories' | 'brands' | 'product-detail' | 'cart';
  count?: number;
}

export function LoadingSkeleton({ type, count = 4 }: LoadingSkeletonProps) {
  switch (type) {
    case 'products':
      return (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: count }).map((_, i) => (
            <div key={i} className="space-y-3">
              <div className="aspect-square rounded-lg skeleton" />
              <div className="h-4 rounded skeleton w-3/4" />
              <div className="h-4 rounded skeleton w-1/2" />
              <div className="h-6 rounded skeleton w-1/3" />
            </div>
          ))}
        </div>
      );

    case 'categories':
      return (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="aspect-square rounded-xl skeleton" />
          ))}
        </div>
      );

    case 'brands':
      return (
        <div className="grid grid-cols-4 md:grid-cols-8 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="aspect-square rounded-lg skeleton" />
          ))}
        </div>
      );

    case 'product-detail':
      return (
        <div className="grid md:grid-cols-2 gap-8">
          <div className="space-y-4">
            <div className="aspect-square rounded-lg skeleton" />
            <div className="grid grid-cols-4 gap-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="aspect-square rounded-lg skeleton" />
              ))}
            </div>
          </div>
          <div className="space-y-4">
            <div className="h-8 rounded skeleton w-3/4" />
            <div className="h-6 rounded skeleton w-1/4" />
            <div className="h-10 rounded skeleton w-1/3" />
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-4 rounded skeleton" />
              ))}
            </div>
            <div className="flex gap-2">
              <div className="h-12 rounded-lg skeleton flex-1" />
              <div className="h-12 w-12 rounded-lg skeleton" />
            </div>
          </div>
        </div>
      );

    case 'cart':
      return (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex gap-4 p-4 rounded-lg border">
              <div className="h-20 w-20 rounded-lg skeleton" />
              <div className="flex-1 space-y-2">
                <div className="h-5 rounded skeleton w-2/3" />
                <div className="h-4 rounded skeleton w-1/3" />
                <div className="h-6 rounded skeleton w-1/4" />
              </div>
            </div>
          ))}
        </div>
      );

    default:
      return null;
  }
}

interface SkeletonProps {
  className?: string;
}

export function Skeleton({ className }: SkeletonProps) {
  return <div className={cn('skeleton rounded', className)} />;
}
