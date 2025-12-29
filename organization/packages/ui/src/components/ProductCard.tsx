/**
 * Broxiva Design System - Product Card Component
 * High-end product display component for luxury e-commerce
 */

import React from 'react';
import { cn } from '../utils';
import Badge from './Badge';

export interface ProductCardProps extends React.HTMLAttributes<HTMLDivElement> {
  imageSrc: string;
  imageAlt: string;
  title: string;
  description?: string;
  price: number;
  originalPrice?: number;
  currency?: string;
  badge?: string;
  badgeVariant?: 'primary' | 'accent' | 'success' | 'warning' | 'error';
  rating?: number;
  reviewCount?: number;
  onAddToCart?: () => void;
  onQuickView?: () => void;
  inStock?: boolean;
}

const ProductCard = React.forwardRef<HTMLDivElement, ProductCardProps>(
  (
    {
      className,
      imageSrc,
      imageAlt,
      title,
      description,
      price,
      originalPrice,
      currency = '$',
      badge,
      badgeVariant = 'accent',
      rating,
      reviewCount,
      onAddToCart,
      onQuickView,
      inStock = true,
      ...props
    },
    ref
  ) => {
    const discount = originalPrice
      ? Math.round(((originalPrice - price) / originalPrice) * 100)
      : 0;

    return (
      <div
        ref={ref}
        className={cn(
          'group relative bg-white rounded-xl overflow-hidden',
          'border border-neutral-200',
          'transition-all duration-300',
          'hover:shadow-xl hover:-translate-y-1',
          'focus-within:ring-4 focus-within:ring-primary-500/10',
          className
        )}
        {...props}
      >
        {/* Image container */}
        <div className="relative aspect-square overflow-hidden bg-neutral-100">
          <img
            src={imageSrc}
            alt={imageAlt}
            className="h-full w-full object-cover object-center transition-transform duration-500 group-hover:scale-110"
          />

          {/* Badge */}
          {badge && (
            <div className="absolute top-3 left-3 z-10">
              <Badge variant={badgeVariant} size="sm">
                {badge}
              </Badge>
            </div>
          )}

          {/* Discount badge */}
          {discount > 0 && (
            <div className="absolute top-3 right-3 z-10">
              <Badge variant="error" size="sm">
                -{discount}%
              </Badge>
            </div>
          )}

          {/* Quick actions overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-neutral-900/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            <div className="absolute bottom-4 left-4 right-4 flex gap-2">
              {onQuickView && (
                <button
                  onClick={onQuickView}
                  className="flex-1 bg-white text-neutral-900 px-4 py-2 rounded-lg text-sm font-semibold hover:bg-neutral-100 transition-colors"
                >
                  Quick View
                </button>
              )}
            </div>
          </div>

          {/* Out of stock overlay */}
          {!inStock && (
            <div className="absolute inset-0 bg-neutral-900/80 flex items-center justify-center">
              <span className="bg-white text-neutral-900 px-4 py-2 rounded-lg font-semibold">
                Out of Stock
              </span>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="p-4">
          {/* Title */}
          <h3 className="text-lg font-semibold text-neutral-900 line-clamp-2 mb-1">
            {title}
          </h3>

          {/* Description */}
          {description && (
            <p className="text-sm text-neutral-600 line-clamp-2 mb-3">
              {description}
            </p>
          )}

          {/* Rating */}
          {rating !== undefined && (
            <div className="flex items-center gap-1 mb-3">
              <div className="flex items-center">
                {[...Array(5)].map((_, i) => (
                  <svg
                    key={i}
                    className={cn(
                      'h-4 w-4',
                      i < Math.floor(rating)
                        ? 'text-accent-500'
                        : 'text-neutral-300'
                    )}
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                ))}
              </div>
              {reviewCount !== undefined && (
                <span className="text-xs text-neutral-500">
                  ({reviewCount})
                </span>
              )}
            </div>
          )}

          {/* Price and action */}
          <div className="flex items-center justify-between">
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold text-neutral-900">
                {currency}{price.toFixed(2)}
              </span>
              {originalPrice && (
                <span className="text-sm text-neutral-500 line-through">
                  {currency}{originalPrice.toFixed(2)}
                </span>
              )}
            </div>

            {onAddToCart && inStock && (
              <button
                onClick={onAddToCart}
                className="p-2 rounded-lg bg-primary-500 text-white hover:bg-primary-700 transition-colors"
                aria-label="Add to cart"
              >
                <svg
                  className="h-5 w-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"
                  />
                </svg>
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }
);

ProductCard.displayName = 'ProductCard';

export default ProductCard;
