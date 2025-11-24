import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useRouter, useSearchParams } from 'next/navigation';
import { searchProducts, ProductSearchParams } from '@/lib/api/categories';

export const useProductSearch = (initialParams?: ProductSearchParams) => {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Parse URL search params
  const [filters, setFilters] = useState<ProductSearchParams>(() => ({
    query: searchParams.get('q') || initialParams?.query || '',
    category: searchParams.get('category') || initialParams?.category || '',
    minPrice: searchParams.get('minPrice') ? parseFloat(searchParams.get('minPrice')!) : initialParams?.minPrice,
    maxPrice: searchParams.get('maxPrice') ? parseFloat(searchParams.get('maxPrice')!) : initialParams?.maxPrice,
    sort: searchParams.get('sort') || initialParams?.sort || 'relevance',
    page: searchParams.get('page') ? parseInt(searchParams.get('page')!) : initialParams?.page || 1,
    limit: initialParams?.limit || 20,
  }));

  // Fetch products with current filters
  const {
    data,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['products', 'search', filters],
    queryFn: () => searchProducts(filters),
    enabled: true,
  });

  // Update URL when filters change
  useEffect(() => {
    const params = new URLSearchParams();

    if (filters.query) params.set('q', filters.query);
    if (filters.category) params.set('category', filters.category);
    if (filters.minPrice) params.set('minPrice', filters.minPrice.toString());
    if (filters.maxPrice) params.set('maxPrice', filters.maxPrice.toString());
    if (filters.sort && filters.sort !== 'relevance') params.set('sort', filters.sort);
    if (filters.page && filters.page > 1) params.set('page', filters.page.toString());

    const newUrl = params.toString() ? `?${params.toString()}` : '';
    const currentUrl = window.location.search;

    if (newUrl !== currentUrl) {
      router.replace(newUrl || window.location.pathname);
    }
  }, [filters, router]);

  // Update a single filter
  const updateFilter = (key: keyof ProductSearchParams, value: any) => {
    setFilters((prev) => ({
      ...prev,
      [key]: value,
      // Reset to page 1 when filters change (except page itself)
      ...(key !== 'page' ? { page: 1 } : {}),
    }));
  };

  // Update multiple filters at once
  const updateFilters = (newFilters: Partial<ProductSearchParams>) => {
    setFilters((prev) => ({
      ...prev,
      ...newFilters,
      page: newFilters.page !== undefined ? newFilters.page : 1,
    }));
  };

  // Reset all filters
  const resetFilters = () => {
    setFilters({
      query: '',
      category: '',
      minPrice: undefined,
      maxPrice: undefined,
      sort: 'relevance',
      page: 1,
      limit: filters.limit,
    });
  };

  // Change page
  const setPage = (page: number) => {
    updateFilter('page', page);
  };

  return {
    // Data
    products: data?.products || [],
    pagination: data?.pagination,
    filters: data?.filters || filters,

    // State
    isLoading,
    error,

    // Actions
    updateFilter,
    updateFilters,
    resetFilters,
    setPage,
    refetch,
  };
};
