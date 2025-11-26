import { z } from 'zod';

export const productReviewSchema = z.object({
  rating: z.number().min(1, 'Rating must be at least 1').max(5, 'Rating cannot exceed 5'),
  title: z.string().min(3, 'Title must be at least 3 characters').max(100, 'Title is too long'),
  content: z.string().min(10, 'Review must be at least 10 characters').max(2000, 'Review is too long'),
  recommend: z.boolean().optional(),
});

export const productFilterSchema = z.object({
  minPrice: z.number().min(0, 'Minimum price cannot be negative').optional(),
  maxPrice: z.number().min(0, 'Maximum price cannot be negative').optional(),
  category: z.string().optional(),
  brand: z.string().optional(),
  rating: z.number().min(1).max(5).optional(),
  inStock: z.boolean().optional(),
  sortBy: z.enum(['price_asc', 'price_desc', 'newest', 'popularity', 'rating']).optional(),
}).refine((data) => {
  if (data.minPrice && data.maxPrice) {
    return data.minPrice <= data.maxPrice;
  }
  return true;
}, {
  message: 'Minimum price cannot be greater than maximum price',
  path: ['minPrice'],
});

export const addToCartSchema = z.object({
  productId: z.string().min(1, 'Product ID is required'),
  quantity: z.number().min(1, 'Quantity must be at least 1').max(100, 'Quantity cannot exceed 100'),
  variantId: z.string().optional(),
});

export const wishlistItemSchema = z.object({
  productId: z.string().min(1, 'Product ID is required'),
  note: z.string().max(500, 'Note is too long').optional(),
});

export type ProductReviewInput = z.infer<typeof productReviewSchema>;
export type ProductFilterInput = z.infer<typeof productFilterSchema>;
export type AddToCartInput = z.infer<typeof addToCartSchema>;
export type WishlistItemInput = z.infer<typeof wishlistItemSchema>;
