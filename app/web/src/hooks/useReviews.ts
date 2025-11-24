import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getProductReviews,
  getProductRatingStats,
  createReview,
  updateReview,
  deleteReview,
  voteReview,
  getMyVote,
  CreateReviewDto,
  UpdateReviewDto,
  VoteReviewDto,
} from '@/lib/api/reviews';
import { toast } from 'sonner';

/**
 * Hook to fetch product reviews
 */
export const useProductReviews = (
  productId: string,
  page: number = 1,
  limit: number = 10,
  sortBy: 'date' | 'rating' | 'helpful' = 'date'
) => {
  return useQuery({
    queryKey: ['reviews', productId, page, limit, sortBy],
    queryFn: () => getProductReviews(productId, page, limit, sortBy),
    enabled: !!productId,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
};

/**
 * Hook to fetch product rating stats
 */
export const useProductRatingStats = (productId: string) => {
  return useQuery({
    queryKey: ['reviews', 'stats', productId],
    queryFn: () => getProductRatingStats(productId),
    enabled: !!productId,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
};

/**
 * Hook to create a review
 */
export const useCreateReview = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateReviewDto) => createReview(data),
    onSuccess: (_, variables) => {
      toast.success('Review submitted successfully!');
      // Invalidate reviews queries for this product
      queryClient.invalidateQueries({ queryKey: ['reviews', variables.productId] });
      queryClient.invalidateQueries({ queryKey: ['reviews', 'stats', variables.productId] });
    },
    onError: (error: any) => {
      const message = error.response?.data?.message || 'Failed to submit review';
      toast.error(message);
    },
  });
};

/**
 * Hook to update a review
 */
export const useUpdateReview = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateReviewDto }) =>
      updateReview(id, data),
    onSuccess: (review) => {
      toast.success('Review updated successfully!');
      // Invalidate reviews queries
      queryClient.invalidateQueries({ queryKey: ['reviews', review.productId] });
      queryClient.invalidateQueries({ queryKey: ['reviews', 'stats', review.productId] });
    },
    onError: (error: any) => {
      const message = error.response?.data?.message || 'Failed to update review';
      toast.error(message);
    },
  });
};

/**
 * Hook to delete a review
 */
export const useDeleteReview = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, productId }: { id: string; productId: string }) => deleteReview(id),
    onSuccess: (_, variables) => {
      toast.success('Review deleted successfully!');
      // Invalidate reviews queries
      queryClient.invalidateQueries({ queryKey: ['reviews', variables.productId] });
      queryClient.invalidateQueries({ queryKey: ['reviews', 'stats', variables.productId] });
    },
    onError: (error: any) => {
      const message = error.response?.data?.message || 'Failed to delete review';
      toast.error(message);
    },
  });
};

/**
 * Hook to vote on a review
 */
export const useVoteReview = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: VoteReviewDto }) => voteReview(id, data),
    onSuccess: (_, variables) => {
      // Optimistically update the cache
      queryClient.invalidateQueries({ queryKey: ['reviews'] });
    },
    onError: (error: any) => {
      const message = error.response?.data?.message || 'Failed to vote';
      toast.error(message);
    },
  });
};

/**
 * Hook to get user's vote on a review
 */
export const useMyVote = (reviewId: string) => {
  return useQuery({
    queryKey: ['reviews', 'my-vote', reviewId],
    queryFn: () => getMyVote(reviewId),
    enabled: !!reviewId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};
