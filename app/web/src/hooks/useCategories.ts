import { useQuery } from '@tanstack/react-query';
import { getCategories, getTopLevelCategories, getCategoryById, getCategoryBySlug } from '@/lib/api/categories';

/**
 * Hook to fetch all categories
 */
export const useCategories = (includeEmpty: boolean = true) => {
  return useQuery({
    queryKey: ['categories', includeEmpty],
    queryFn: () => getCategories(includeEmpty),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

/**
 * Hook to fetch top-level categories
 */
export const useTopLevelCategories = () => {
  return useQuery({
    queryKey: ['categories', 'top-level'],
    queryFn: getTopLevelCategories,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

/**
 * Hook to fetch a single category by ID
 */
export const useCategory = (id: string) => {
  return useQuery({
    queryKey: ['category', id],
    queryFn: () => getCategoryById(id),
    enabled: !!id,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

/**
 * Hook to fetch a single category by slug
 */
export const useCategoryBySlug = (slug: string) => {
  return useQuery({
    queryKey: ['category', 'slug', slug],
    queryFn: () => getCategoryBySlug(slug),
    enabled: !!slug,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};
