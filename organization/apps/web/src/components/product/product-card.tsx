'use client';

import * as React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { Heart, ShoppingCart, Eye, Star, Sparkles, Zap, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn, formatCurrency, calculateDiscount, getStockStatus } from '@/lib/utils';
import { Product } from '@/types';
import { useCartStore } from '@/stores/cart-store';
import { toast } from 'sonner';

interface ProductCardProps {
  product: Product;
  badge?: {
    text: string;
    variant?: 'default' | 'secondary' | 'destructive' | 'success' | 'warning' | 'premium' | 'trending';
  };
  showQuickActions?: boolean;
  size?: 'sm' | 'default' | 'lg';
  className?: string;
}

export function ProductCard({
  product,
  badge,
  showQuickActions = true,
  size = 'default',
  className,
}: ProductCardProps) {
  const [isHovered, setIsHovered] = React.useState(false);
  const [isWishlisted, setIsWishlisted] = React.useState(false);
  const [imageLoaded, setImageLoaded] = React.useState(false);
  const [isAddingToCart, setIsAddingToCart] = React.useState(false);

  const { addItem } = useCartStore();

  const discount = product.compareAtPrice
    ? calculateDiscount(product.price, product.compareAtPrice)
    : 0;

  const stockStatus = getStockStatus(product.inventory.available);

  const handleAddToCart = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsAddingToCart(true);

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
    } finally {
      setIsAddingToCart(false);
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
  };

  const sizeClasses = {
    sm: 'max-w-[180px]',
    default: '',
    lg: 'max-w-[320px]',
  };

  const imageSizeClasses = {
    sm: 'aspect-square',
    default: 'aspect-[4/5]',
    lg: 'aspect-[3/4]',
  };

  const getBadgeIcon = (variant?: string) => {
    switch (variant) {
      case 'premium': return <Sparkles className="h-3 w-3" />;
      case 'trending': return <TrendingUp className="h-3 w-3" />;
      default: return <Zap className="h-3 w-3" />;
    }
  };

  return (
    <article
      className={cn(
        'group relative overflow-hidden rounded-xl bg-card border border-border/50',
        'transition-all duration-300 ease-out',
        'hover:shadow-xl hover:-translate-y-1 hover:border-primary/20',
        sizeClasses[size],
        className
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <Link href={`/products/${product.slug}`} className="block">
        <div className={cn('relative overflow-hidden bg-slate-100 dark:bg-slate-800', imageSizeClasses[size])}>
          <div className="absolute top-3 left-3 z-10 flex flex-col gap-1.5">
            {badge && (
              <Badge
                variant={badge.variant === 'premium' || badge.variant === 'trending' ? 'default' : badge.variant || 'default'}
                className={cn(
                  'shadow-md backdrop-blur-sm gap-1',
                  badge.variant === 'premium' && 'bg-gradient-to-r from-amber-500 to-orange-500 border-0',
                  badge.variant === 'trending' && 'bg-gradient-to-r from-violet-600 to-purple-600 border-0'
                )}
              >
                {getBadgeIcon(badge.variant)}
                {badge.text}
              </Badge>
            )}
            {discount > 0 && (
              <Badge variant="destructive" className="shadow-md font-bold">
                -{discount}%
              </Badge>
            )}
          </div>

          <motion.button
            onClick={handleWishlist}
            whileTap={{ scale: 0.9 }}
            className={cn(
              'absolute top-3 right-3 z-10 h-9 w-9 rounded-full',
              'bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm shadow-md',
              'flex items-center justify-center transition-all duration-200',
              'hover:scale-110',
              isWishlisted ? 'text-rose-500' : 'text-slate-400 hover:text-rose-500'
            )}
          >
            <Heart className={cn('h-4 w-4 transition-all', isWishlisted && 'fill-current scale-110')} />
          </motion.button>

          {product.inventory.status === 'LOW_STOCK' && (
            <div className="absolute bottom-3 left-3 right-3 z-10">
              <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-amber-500/90 backdrop-blur-sm text-white text-xs font-medium">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-white" />
                </span>
                Only {product.inventory.available} left
              </div>
            </div>
          )}

          <div className="relative w-full h-full">
            {!imageLoaded && <div className="absolute inset-0 shimmer" />}
            <Image
              src={product.images[0]?.url || '/placeholder-product.jpg'}
              alt={product.images[0]?.alt || product.name}
              fill
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
              className={cn(
                'object-cover transition-all duration-500 ease-out',
                isHovered && 'scale-105',
                !imageLoaded && 'opacity-0'
              )}
              onLoad={() => setImageLoaded(true)}
            />

            <AnimatePresence>
              {product.images[1] && isHovered && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.3 }}
                  className="absolute inset-0"
                >
                  <Image
                    src={product.images[1].url}
                    alt={product.images[1].alt || product.name}
                    fill
                    sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                    className="object-cover"
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <AnimatePresence>
            {showQuickActions && isHovered && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/60 to-transparent pointer-events-none"
              />
            )}
          </AnimatePresence>

          {showQuickActions && (
            <AnimatePresence>
              {isHovered && (
                <motion.div
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 16 }}
                  transition={{ duration: 0.2 }}
                  className="absolute bottom-3 left-3 right-3 flex gap-2"
                >
                  <Button
                    size="sm"
                    variant="default"
                    className="flex-1 h-10 shadow-lg"
                    onClick={handleAddToCart}
                    loading={isAddingToCart}
                    disabled={product.inventory.status === 'OUT_OF_STOCK'}
                  >
                    <ShoppingCart className="h-4 w-4 mr-1.5" />
                    Add to Cart
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    className="h-10 w-10 p-0 shadow-lg bg-white/90 hover:bg-white text-slate-700"
                    onClick={handleQuickView}
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                </motion.div>
              )}
            </AnimatePresence>
          )}
        </div>

        <div className="p-4">
          {product.vendor && (
            <p className="text-xs font-medium text-primary/80 uppercase tracking-wide mb-1">
              {product.vendor.name}
            </p>
          )}

          <h3 className="font-semibold text-foreground line-clamp-2 mb-2 group-hover:text-primary transition-colors duration-200">
            {product.name}
          </h3>

          {product.reviewCount > 0 && (
            <div className="flex items-center gap-1.5 mb-3">
              <div className="flex items-center">
                {[...Array(5)].map((_, i) => (
                  <Star
                    key={i}
                    className={cn(
                      'h-3.5 w-3.5',
                      i < Math.floor(product.rating)
                        ? 'fill-amber-400 text-amber-400'
                        : 'fill-slate-200 text-slate-200 dark:fill-slate-700 dark:text-slate-700'
                    )}
                  />
                ))}
              </div>
              <span className="text-sm font-medium text-foreground">{product.rating.toFixed(1)}</span>
              <span className="text-xs text-muted-foreground">({product.reviewCount.toLocaleString()})</span>
            </div>
          )}

          <div className="flex items-baseline gap-2 flex-wrap">
            <span className="text-xl font-bold text-foreground">
              {formatCurrency(product.price, product.currency)}
            </span>
            {product.compareAtPrice && (
              <span className="text-sm text-muted-foreground line-through">
                {formatCurrency(product.compareAtPrice, product.currency)}
              </span>
            )}
            {discount > 0 && (
              <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                Save {formatCurrency(product.compareAtPrice! - product.price, product.currency)}
              </span>
            )}
          </div>

          {product.inventory.status !== 'IN_STOCK' && (
            <p className={cn('text-xs font-medium mt-2 flex items-center gap-1', stockStatus.color)}>
              {stockStatus.label}
            </p>
          )}

          <div className="mt-3 md:hidden">
            <Button
              size="sm"
              variant="outline"
              className="w-full"
              onClick={handleAddToCart}
              loading={isAddingToCart}
              disabled={product.inventory.status === 'OUT_OF_STOCK'}
            >
              <ShoppingCart className="h-4 w-4 mr-1.5" />
              Add to Cart
            </Button>
          </div>
        </div>
      </Link>
    </article>
  );
}
