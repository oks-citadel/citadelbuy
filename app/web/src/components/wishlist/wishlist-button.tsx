'use client';

import { Heart } from 'lucide-react';
import { useIsInWishlist, useToggleWishlist } from '@/hooks/useWishlist';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface WishlistButtonProps {
  productId: string;
  variant?: 'icon' | 'button';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function WishlistButton({
  productId,
  variant = 'icon',
  size = 'md',
  className,
}: WishlistButtonProps) {
  const isInWishlist = useIsInWishlist(productId);
  const { toggleWishlist, isPending } = useToggleWishlist();

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    toggleWishlist(productId, isInWishlist);
  };

  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6',
  };

  if (variant === 'button') {
    return (
      <Button
        variant={isInWishlist ? 'default' : 'outline'}
        size={size === 'sm' ? 'sm' : size === 'lg' ? 'lg' : 'default'}
        onClick={handleClick}
        disabled={isPending}
        className={cn('flex items-center gap-2', className)}
      >
        <Heart
          className={cn(
            sizeClasses[size],
            isInWishlist && 'fill-current'
          )}
        />
        {isInWishlist ? 'In Wishlist' : 'Add to Wishlist'}
      </Button>
    );
  }

  // Icon variant
  return (
    <button
      onClick={handleClick}
      disabled={isPending}
      className={cn(
        'rounded-full p-2 transition-all',
        'hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500',
        isInWishlist ? 'text-red-500' : 'text-gray-400 hover:text-red-500',
        isPending && 'opacity-50 cursor-not-allowed',
        className
      )}
      title={isInWishlist ? 'Remove from wishlist' : 'Add to wishlist'}
    >
      <Heart
        className={cn(
          sizeClasses[size],
          isInWishlist && 'fill-current'
        )}
      />
    </button>
  );
}
