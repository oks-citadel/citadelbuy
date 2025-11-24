import { api } from '../api';

export interface Review {
  id: string;
  userId: string;
  productId: string;
  rating: number;
  comment?: string;
  isVerifiedPurchase: boolean;
  helpfulCount: number;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  createdAt: string;
  updatedAt: string;
  user: {
    id: string;
    name: string;
  };
}

export interface RatingStats {
  averageRating: number;
  totalReviews: number;
  ratingDistribution: {
    5: number;
    4: number;
    3: number;
    2: number;
    1: number;
  };
}

export interface ReviewsResponse {
  reviews: Review[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
  stats: RatingStats;
}

export interface CreateReviewDto {
  productId: string;
  rating: number;
  comment?: string;
}

export interface UpdateReviewDto {
  rating?: number;
  comment?: string;
}

export interface VoteReviewDto {
  isHelpful: boolean;
}

/**
 * Create a new review
 */
export const createReview = async (data: CreateReviewDto): Promise<Review> => {
  const response = await api.post('/reviews', data);
  return response.data;
};

/**
 * Get reviews for a product
 */
export const getProductReviews = async (
  productId: string,
  page: number = 1,
  limit: number = 10,
  sortBy: 'date' | 'rating' | 'helpful' = 'date'
): Promise<ReviewsResponse> => {
  const response = await api.get(`/reviews/product/${productId}`, {
    params: { page, limit, sortBy },
  });
  return response.data;
};

/**
 * Get rating statistics for a product
 */
export const getProductRatingStats = async (productId: string): Promise<RatingStats> => {
  const response = await api.get(`/reviews/product/${productId}/stats`);
  return response.data;
};

/**
 * Get a single review
 */
export const getReview = async (id: string): Promise<Review> => {
  const response = await api.get(`/reviews/${id}`);
  return response.data;
};

/**
 * Update own review
 */
export const updateReview = async (id: string, data: UpdateReviewDto): Promise<Review> => {
  const response = await api.patch(`/reviews/${id}`, data);
  return response.data;
};

/**
 * Delete own review
 */
export const deleteReview = async (id: string): Promise<{ message: string }> => {
  const response = await api.delete(`/reviews/${id}`);
  return response.data;
};

/**
 * Vote on a review
 */
export const voteReview = async (
  id: string,
  data: VoteReviewDto
): Promise<{ message: string; helpfulCount: number }> => {
  const response = await api.post(`/reviews/${id}/vote`, data);
  return response.data;
};

/**
 * Get user's vote on a review
 */
export const getMyVote = async (id: string): Promise<{ isHelpful: boolean } | null> => {
  const response = await api.get(`/reviews/${id}/my-vote`);
  return response.data;
};
