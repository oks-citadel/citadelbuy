'use client';

import { useState } from 'react';
import { useCreateReview } from '@/hooks/useReviews';
import { StarRating } from './star-rating';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface ReviewFormProps {
  productId: string;
  onSuccess?: () => void;
}

export function ReviewForm({ productId, onSuccess }: ReviewFormProps) {
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');

  const createReview = useCreateReview();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (rating === 0) {
      return;
    }

    createReview.mutate(
      {
        productId,
        rating,
        comment: comment.trim() || undefined,
      },
      {
        onSuccess: () => {
          setRating(0);
          setComment('');
          onSuccess?.();
        },
      }
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Write a Review</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Rating Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Your Rating *
            </label>
            <StarRating
              rating={rating}
              interactive
              onChange={setRating}
              size="lg"
            />
            {rating === 0 && (
              <p className="mt-1 text-sm text-gray-500">
                Click on the stars to rate this product
              </p>
            )}
          </div>

          {/* Comment */}
          <div>
            <label htmlFor="comment" className="block text-sm font-medium text-gray-700 mb-2">
              Your Review (optional)
            </label>
            <Textarea
              id="comment"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Share your experience with this product..."
              rows={4}
              className="w-full"
              minLength={10}
            />
            {comment && comment.length < 10 && (
              <p className="mt-1 text-sm text-red-600">
                Review must be at least 10 characters long
              </p>
            )}
          </div>

          {/* Submit Button */}
          <Button
            type="submit"
            disabled={rating === 0 || (comment.length > 0 && comment.length < 10) || createReview.isPending}
            className="w-full"
          >
            {createReview.isPending ? 'Submitting...' : 'Submit Review'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
