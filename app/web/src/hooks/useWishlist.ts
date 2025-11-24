import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getWishlist,
  getWishlistCount,
  checkProductInWishlist,
  addToWishlist,
  removeFromWishlist,
  clearWishlist,
  AddToWishlistDto,
} from '@/lib/api/wishlist';
import { useAuthStore } from '@/store/auth-store';
import { toast } from 'sonner';
import { useEffect, useState } from 'react';

const GUEST_WISHLIST_KEY = 'citadelbuy_guest_wishlist';

/**
 * Hook to manage wishlist (supports both authenticated and guest users)
 */
export const useWishlist = () => {
  const queryClient = useQueryClient();
  const { isAuthenticated } = useAuthStore();
  const [guestWishlist, setGuestWishlist] = useState<string[]>([]);

  // Load guest wishlist from localStorage on mount
  useEffect(() => {
    if (!isAuthenticated) {
      const stored = localStorage.getItem(GUEST_WISHLIST_KEY);
      if (stored) {
        try {
          setGuestWishlist(JSON.parse(stored));
        } catch (e) {
          setGuestWishlist([]);
        }
      }
    }
  }, [isAuthenticated]);

  // Fetch authenticated user's wishlist
  const { data: authWishlist, isLoading } = useQuery({
    queryKey: ['wishlist'],
    queryFn: getWishlist,
    enabled: isAuthenticated,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });

  // Get wishlist based on auth status
  const wishlist = isAuthenticated ? authWishlist || [] : [];
  const wishlistProductIds = isAuthenticated
    ? wishlist.map((item) => item.productId)
    : guestWishlist;

  return {
    wishlist,
    wishlistProductIds,
    isLoading: isAuthenticated ? isLoading : false,
    count: wishlistProductIds.length,
  };
};

/**
 * Hook to check if product is in wishlist
 */
export const useIsInWishlist = (productId: string) => {
  const { isAuthenticated } = useAuthStore();
  const { wishlistProductIds } = useWishlist();

  // For guests, just check the local array
  if (!isAuthenticated) {
    return wishlistProductIds.includes(productId);
  }

  // For authenticated users, use the wishlist data
  return wishlistProductIds.includes(productId);
};

/**
 * Hook to toggle product in wishlist
 */
export const useToggleWishlist = () => {
  const queryClient = useQueryClient();
  const { isAuthenticated } = useAuthStore();
  const [guestWishlist, setGuestWishlist] = useState<string[]>([]);

  // Load guest wishlist
  useEffect(() => {
    if (!isAuthenticated) {
      const stored = localStorage.getItem(GUEST_WISHLIST_KEY);
      if (stored) {
        try {
          setGuestWishlist(JSON.parse(stored));
        } catch (e) {
          setGuestWishlist([]);
        }
      }
    }
  }, [isAuthenticated]);

  const addMutation = useMutation({
    mutationFn: (data: AddToWishlistDto) => addToWishlist(data),
    onSuccess: () => {
      toast.success('Added to wishlist');
      queryClient.invalidateQueries({ queryKey: ['wishlist'] });
    },
    onError: (error: any) => {
      const message = error.response?.data?.message || 'Failed to add to wishlist';
      toast.error(message);
    },
  });

  const removeMutation = useMutation({
    mutationFn: (productId: string) => removeFromWishlist(productId),
    onSuccess: () => {
      toast.success('Removed from wishlist');
      queryClient.invalidateQueries({ queryKey: ['wishlist'] });
    },
    onError: (error: any) => {
      const message = error.response?.data?.message || 'Failed to remove from wishlist';
      toast.error(message);
    },
  });

  const toggleWishlist = (productId: string, isCurrentlyInWishlist: boolean) => {
    if (!isAuthenticated) {
      // Handle guest wishlist with localStorage
      const stored = localStorage.getItem(GUEST_WISHLIST_KEY);
      let wishlistIds: string[] = [];

      if (stored) {
        try {
          wishlistIds = JSON.parse(stored);
        } catch (e) {
          wishlistIds = [];
        }
      }

      if (isCurrentlyInWishlist) {
        wishlistIds = wishlistIds.filter((id) => id !== productId);
        toast.success('Removed from wishlist');
      } else {
        wishlistIds.push(productId);
        toast.success('Added to wishlist');
      }

      localStorage.setItem(GUEST_WISHLIST_KEY, JSON.stringify(wishlistIds));
      setGuestWishlist(wishlistIds);

      // Notify localStorage listeners
      window.dispatchEvent(new Event('storage'));
      return;
    }

    // Handle authenticated user wishlist
    if (isCurrentlyInWishlist) {
      removeMutation.mutate(productId);
    } else {
      addMutation.mutate({ productId });
    }
  };

  return {
    toggleWishlist,
    isPending: addMutation.isPending || removeMutation.isPending,
  };
};

/**
 * Hook to clear wishlist
 */
export const useClearWishlist = () => {
  const queryClient = useQueryClient();
  const { isAuthenticated } = useAuthStore();

  return useMutation({
    mutationFn: () => {
      if (!isAuthenticated) {
        localStorage.removeItem(GUEST_WISHLIST_KEY);
        window.dispatchEvent(new Event('storage'));
        return Promise.resolve({ message: 'Wishlist cleared' });
      }
      return clearWishlist();
    },
    onSuccess: () => {
      toast.success('Wishlist cleared');
      queryClient.invalidateQueries({ queryKey: ['wishlist'] });
    },
    onError: (error: any) => {
      const message = error.response?.data?.message || 'Failed to clear wishlist';
      toast.error(message);
    },
  });
};
