'use client';

import { RatingStats } from '@/lib/api/reviews';
import { Star } from 'lucide-react';

interface RatingDistributionProps {
  stats: RatingStats;
}

export function RatingDistribution({ stats }: RatingDistributionProps) {
  const { ratingDistribution, totalReviews } = stats;

  const getPercentage = (count: number) => {
    if (totalReviews === 0) return 0;
    return Math.round((count / totalReviews) * 100);
  };

  const ratings = [5, 4, 3, 2, 1] as const;

  return (
    <div className="space-y-2">
      {ratings.map((rating) => {
        const count = ratingDistribution[rating];
        const percentage = getPercentage(count);

        return (
          <div key={rating} className="flex items-center gap-2">
            <div className="flex items-center gap-1 w-12">
              <span className="text-sm font-medium">{rating}</span>
              <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
            </div>
            <div className="flex-1 h-3 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-yellow-400 transition-all duration-300"
                style={{ width: `${percentage}%` }}
              />
            </div>
            <span className="text-sm text-gray-600 w-12 text-right">
              {count}
            </span>
          </div>
        );
      })}
    </div>
  );
}
