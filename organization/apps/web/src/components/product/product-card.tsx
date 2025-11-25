'use client';

import * as React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { Heart, ShoppingCart, Eye, Star, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { cn, formatCurrency, calculateDiscount, getStockStatus } from '@/lib/utils';
import { Product } from '@/types';
import { useCartStore } from '@/stores/cart-store';
import { toast } from 'sonner';

interface ProductCardProps {
  product: Product;
  badge?: {
    text: string;
    variant?: 'default' | 'secondary' | 'destructive' | 'success' | 'warning';
  };
  showQuickActions?: boolean;
  className?: string;
}

export function ProductCard({
  product,
  badge,
  showQuickActions = true,
  className,
}: ProductCardProps) {
  const [isHovered, setIsHovered] = React.useState(false);
  const [isWishlisted, setIsWishlisted] = React.useState(false);
  const [imageLoaded, setImageLoaded] = React.useState(false);

  const { addItem, isLoading: cartLoading } = useCartStore();

  const discount = product.compareAtPrice
    ? calculateDiscount(product.price, product.compareAtPrice)
    : 0;

  const stockStatus = getStockStatus(product.inventory.available);

  const handleAddToCart = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    try {
      await addItem(product);
      toast.success(`${product.name} added to cart`, {
        action: {
          label: 'View Cart',
          onClick: () => (window.location.href = '/cart'),
        },
      });
    } catch (error) {
      toast.error('Failed to add to cart');
    }
  };

  const handleWishlist = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsWishlisted(!isWishlisted);
    toast.success(
      isWishlisted ? 'Removed from wishlist' : 'Added to wishlist'
    );
  };

  const handleQuickView = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // Open quick view modal
  };

  return (
    <Card
      className={cn(
        'group relative overflow-hidden transition-all duration-300',
        isHovered && 'shadow-lg',
        className
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <Link href={`/products/${product.slug}`}>
        {/* Image Container */}
        <div className="relative aspect-square overflow-hidden bg-muted">
          {/* Badges */}
          <div className="absolute top-2 left-2 z-10 flex flex-col gap-1">
            {badge && (
              <Badge variant={badge.variant || 'default'} className="shadow-sm">
                <Sparkles className="h-3 w-3 mr-1" />
                {badge.text}
              </Badge>
            )}
            {discount > 0 && (
              <Badge variant="destructive" className="shadow-sm">
                -{discount}%
              </Badge>
            )}
            {product.inventory.status === 'LOW_STOCK' && (
              <Badge variant="warning" className="shadow-sm">
                Only {product.inventory.available} left
              </Badge>
            )}
          </div>

          {/* Wishlist Button */}
          <button
            onClick={handleWishlist}
            className={cn(
              'absolute top-2 right-2 z-10 h-8 w-8 rounded-full bg-white shadow-sm flex items-center justify-center transition-all',
              isWishlisted ? 'text-destructive' : 'text-muted-foreground hover:text-destructive'
            )}
          >
            <Heart
              className={cn('h-4 w-4', isWishlisted && 'fill-current')}
            />
          </button>

          {/* Product Image */}
          <div className="relative w-full h-full">
            {!imageLoaded && (
              <div className="absolute inset-0 skeleton" />
            )}
            <Image
              src={product.images[0]?.url || '/placeholder-product.jpg'}
              alt={product.images[0]?.alt || product.name}
              fill
              sizes="(max-width: 768px) 50vw, 25vw"
              className={cn(
                'object-cover transition-transform duration-500',
                isHovered && 'scale-110',
                !imageLoaded && 'opacity-0'
              )}
              onLoad={() => setImageLoaded(true)}
            />
            {/* Secondary image on hover */}
            {product.images[1] && isHovered && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="absolute inset-0"
              >
                <Image
                  src={product.images[1].url}
                  alt={product.images[1].alt || product.name}
                  fill
                  sizes="(max-width: 768px) 50vw, 25vw"
                  className="object-cover"
                />
              </motion.div>
            )}
          </div>

          {/* Quick Actions */}
          {showQuickActions && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: isHovered ? 1 : 0, y: isHovered ? 0 : 10 }}
              className="absolute bottom-2 left-2 right-2 flex gap-2"
            >
              <Button
                size="sm"
                className="flex-1"
                onClick={handleAddToCart}
                disabled={
                  cartLoading ||
                  product.inventory.status === 'OUT_OF_STOCK'
                }
              >
                <ShoppingCart className="h-4 w-4 mr-1" />
                Add to Cart
              </Button>
              <Button
                size="sm"
                variant="secondary"
                onClick={handleQuickView}
              >
                <Eye className="h-4 w-4" />
              </Button>
            </motion.div>
          )}
        </div>

        {/* Product Info */}
        <div className="p-4">
          {/* Vendor */}
          {product.vendor && (
            <p className="text-xs text-muted-foreground mb-1">
              {product.vendor.name}
            </p>
          )}

          {/* Name */}
          <h3 className="font-medium line-clamp-2 mb-2 group-hover:text-primary transition-colors">
            {product.name}
          </h3>

          {/* Rating */}
          {product.reviewCount > 0 && (
            <div className="flex items-center gap-1 mb-2">
              <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
              <span className="text-sm font-medium">{product.rating.toFixed(1)}</span>
              <span className="text-xs text-muted-foreground">
                ({product.reviewCount})
              </span>
            </div>
          )}

          {/* Price */}
          <div className="flex items-center gap-2">
            <span className="text-lg font-bold">
              {formatCurrency(product.price, product.currency)}
            </span>
            {product.compareAtPrice && (
              <span className="text-sm text-muted-foreground line-through">
                {formatCurrency(product.compareAtPrice, product.currency)}
              </span>
            )}
          </div>

          {/* Stock Status */}
          <p className={cn('text-xs mt-2', stockStatus.color)}>
            {stockStatus.label}
          </p>
        </div>
      </Link>
    </Card>
  );
}
