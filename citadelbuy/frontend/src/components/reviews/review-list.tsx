'use client';

import { useState } from 'react';
import { useProductReviews, useVoteReview } from '@/hooks/useReviews';
import { useAuthStore } from '@/store/auth-store';
import { StarRating } from './star-rating';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ThumbsUp, ThumbsDown, CheckCircle } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface ReviewListProps {
  productId: string;
}

export function ReviewList({ productId }: ReviewListProps) {
  const [page, setPage] = useState(1);
  const [sortBy, setSortBy] = useState<'date' | 'rating' | 'helpful'>('date');

  const { isAuthenticated } = useAuthStore();
  const { data, isLoading, error } = useProductReviews(productId, page, 10, sortBy);
  const voteReview = useVoteReview();

  const handleVote = (reviewId: string, isHelpful: boolean) => {
    if (!isAuthenticated) {
      // Could show login modal here
      return;
    }

    voteReview.mutate({ id: reviewId, data: { isHelpful } });
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-red-600">Failed to load reviews</p>
      </div>
    );
  }

  const { reviews, pagination, stats } = data || { reviews: [], pagination: null, stats: null };

  if (reviews.length === 0) {
    return (
      <div className="text-center py-12 bg-gray-50 rounded-lg">
        <p className="text-gray-600">No reviews yet. Be the first to review this product!</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Summary */}
      {stats && (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div>
              <div className="text-3xl font-bold">{stats.averageRating.toFixed(1)}</div>
              <StarRating rating={stats.averageRating} size="sm" />
            </div>
            <div className="text-sm text-gray-600">
              Based on {stats.totalReviews} {stats.totalReviews === 1 ? 'review' : 'reviews'}
            </div>
          </div>

          {/* Sort Options */}
          <div>
            <label className="text-sm font-medium text-gray-700 mr-2">Sort by:</label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as 'date' | 'rating' | 'helpful')}
              className="px-3 py-1 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
            >
              <option value="date">Most Recent</option>
              <option value="rating">Highest Rating</option>
              <option value="helpful">Most Helpful</option>
            </select>
          </div>
        </div>
      )}

      {/* Reviews List */}
      <div className="space-y-4">
        {reviews.map((review) => (
          <Card key={review.id}>
            <CardContent className="pt-6">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold">{review.user.name}</span>
                    {review.isVerifiedPurchase && (
                      <span className="flex items-center gap-1 text-xs text-green-600 bg-green-50 px-2 py-0.5 rounded-full">
                        <CheckCircle className="w-3 h-3" />
                        Verified Purchase
                      </span>
                    )}
                  </div>
                  <StarRating rating={review.rating} size="sm" />
                </div>
                <span className="text-sm text-gray-500">
                  {formatDistanceToNow(new Date(review.createdAt), { addSuffix: true })}
                </span>
              </div>

              {review.comment && (
                <p className="text-gray-700 mb-4">{review.comment}</p>
              )}

              {/* Voting */}
              <div className="flex items-center gap-4 pt-3 border-t">
                <span className="text-sm text-gray-600">Was this helpful?</span>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleVote(review.id, true)}
                    disabled={!isAuthenticated}
                    className="flex items-center gap-1"
                  >
                    <ThumbsUp className="w-4 h-4" />
                    <span className="text-sm">{review.helpfulCount}</span>
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleVote(review.id, false)}
                    disabled={!isAuthenticated}
                  >
                    <ThumbsDown className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Pagination */}
      {pagination && pagination.totalPages > 1 && (
        <div className="flex justify-center gap-2 pt-4">
          <Button
            variant="outline"
            onClick={() => setPage(page - 1)}
            disabled={page === 1}
          >
            Previous
          </Button>
          <span className="px-4 py-2 text-sm">
            Page {page} of {pagination.totalPages}
          </span>
          <Button
            variant="outline"
            onClick={() => setPage(page + 1)}
            disabled={page === pagination.totalPages}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
}
