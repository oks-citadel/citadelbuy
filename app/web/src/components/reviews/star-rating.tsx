'use client';

import { Star } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StarRatingProps {
  rating: number;
  maxRating?: number;
  size?: 'sm' | 'md' | 'lg';
  showNumber?: boolean;
  interactive?: boolean;
  onChange?: (rating: number) => void;
  className?: string;
}

export function StarRating({
  rating,
  maxRating = 5,
  size = 'md',
  showNumber = false,
  interactive = false,
  onChange,
  className,
}: StarRatingProps) {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6',
  };

  const handleClick = (value: number) => {
    if (interactive && onChange) {
      onChange(value);
    }
  };

  return (
    <div className={cn('flex items-center gap-1', className)}>
      {Array.from({ length: maxRating }, (_, index) => {
        const starValue = index + 1;
        const isFilled = starValue <= Math.floor(rating);
        const isPartial = starValue === Math.ceil(rating) && rating % 1 !== 0;

        return (
          <button
            key={index}
            type="button"
            onClick={() => handleClick(starValue)}
            onMouseEnter={
              interactive
                ? (e) => {
                    const stars = e.currentTarget.parentElement?.querySelectorAll('button');
                    stars?.forEach((star, i) => {
                      const svg = star.querySelector('svg');
                      if (svg) {
                        if (i <= index) {
                          svg.classList.add('fill-yellow-400', 'text-yellow-400');
                        } else {
                          svg.classList.remove('fill-yellow-400', 'text-yellow-400');
                        }
                      }
                    });
                  }
                : undefined
            }
            onMouseLeave={
              interactive
                ? (e) => {
                    const stars = e.currentTarget.parentElement?.querySelectorAll('button');
                    stars?.forEach((star, i) => {
                      const svg = star.querySelector('svg');
                      if (svg) {
                        if (i < Math.floor(rating)) {
                          svg.classList.add('fill-yellow-400', 'text-yellow-400');
                        } else {
                          svg.classList.remove('fill-yellow-400', 'text-yellow-400');
                        }
                      }
                    });
                  }
                : undefined
            }
            disabled={!interactive}
            className={cn(
              'focus:outline-none',
              interactive && 'cursor-pointer hover:scale-110 transition-transform',
              !interactive && 'cursor-default'
            )}
          >
            <Star
              className={cn(
                sizeClasses[size],
                isFilled && 'fill-yellow-400 text-yellow-400',
                isPartial && 'fill-yellow-200 text-yellow-400',
                !isFilled && !isPartial && 'text-gray-300'
              )}
            />
          </button>
        );
      })}
      {showNumber && (
        <span className="ml-1 text-sm font-medium text-gray-700">
          {rating.toFixed(1)}
        </span>
      )}
    </div>
  );
}
