import { api } from '../api';

export interface WishlistItem {
  id: string;
  productId: string;
  product: {
    id: string;
    name: string;
    slug: string;
    description: string;
    price: number;
    images: string[];
    stock: number;
    category: {
      id: string;
      name: string;
      slug: string;
    };
    vendor: {
      id: string;
      name: string;
    };
  };
  addedAt: string;
}

export interface AddToWishlistDto {
  productId: string;
}

/**
 * Get user's wishlist
 */
export const getWishlist = async (): Promise<WishlistItem[]> => {
  const response = await api.get('/wishlist');
  return response.data;
};

/**
 * Get wishlist count
 */
export const getWishlistCount = async (): Promise<number> => {
  const response = await api.get('/wishlist/count');
  return response.data.count;
};

/**
 * Check if product is in wishlist
 */
export const checkProductInWishlist = async (productId: string): Promise<boolean> => {
  const response = await api.get(`/wishlist/check/${productId}`);
  return response.data.inWishlist;
};

/**
 * Add product to wishlist
 */
export const addToWishlist = async (data: AddToWishlistDto): Promise<WishlistItem> => {
  const response = await api.post('/wishlist', data);
  return response.data;
};

/**
 * Remove product from wishlist
 */
export const removeFromWishlist = async (productId: string): Promise<{ message: string }> => {
  const response = await api.delete(`/wishlist/${productId}`);
  return response.data;
};

/**
 * Clear entire wishlist
 */
export const clearWishlist = async (): Promise<{ message: string }> => {
  const response = await api.delete('/wishlist');
  return response.data;
};
