'use client';

import * as React from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Filter,
  Grid3X3,
  List,
  SlidersHorizontal,
  X,
  ChevronDown,
  Star,
  Sparkles,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ProductCard } from '@/components/product/product-card';
import { useSearchStore } from '@/stores/search-store';
import { smartSearchService, recommendationService } from '@/services/ai';
import { Product, Category } from '@/types';
import { cn, formatCurrency } from '@/lib/utils';

const categories: Category[] = [
  { id: '1', name: 'Electronics', slug: 'electronics', productCount: 1250 },
  { id: '2', name: 'Fashion', slug: 'fashion', productCount: 3420 },
  { id: '3', name: 'Home & Garden', slug: 'home-garden', productCount: 890 },
  { id: '4', name: 'Sports', slug: 'sports', productCount: 654 },
  { id: '5', name: 'Beauty', slug: 'beauty', productCount: 1120 },
  { id: '6', name: 'Toys', slug: 'toys', productCount: 430 },
];

const sortOptions = [
  { value: 'relevance', label: 'Most Relevant' },
  { value: 'popular', label: 'Most Popular' },
  { value: 'newest', label: 'Newest First' },
  { value: 'price-low', label: 'Price: Low to High' },
  { value: 'price-high', label: 'Price: High to Low' },
  { value: 'rating', label: 'Highest Rated' },
];

const priceRanges = [
  { min: 0, max: 25, label: 'Under $25' },
  { min: 25, max: 50, label: '$25 - $50' },
  { min: 50, max: 100, label: '$50 - $100' },
  { min: 100, max: 200, label: '$100 - $200' },
  { min: 200, max: Infinity, label: 'Over $200' },
];

const ratings = [4, 3, 2, 1];

export default function ProductsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { query, setQuery, results, isSearching } = useSearchStore();

  const [products, setProducts] = React.useState<Product[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [viewMode, setViewMode] = React.useState<'grid' | 'list'>('grid');
  const [showFilters, setShowFilters] = React.useState(false);
  const [sortBy, setSortBy] = React.useState('relevance');
  const [selectedCategories, setSelectedCategories] = React.useState<string[]>([]);
  const [priceRange, setPriceRange] = React.useState<{ min: number; max: number } | null>(null);
  const [minRating, setMinRating] = React.useState<number | null>(null);
  const [totalProducts, setTotalProducts] = React.useState(0);

  // Load products based on search/filters
  React.useEffect(() => {
    const loadProducts = async () => {
      setIsLoading(true);
      try {
        const searchQuery = searchParams.get('q') || '';
        const category = searchParams.get('category') || '';

        if (searchQuery) {
          setQuery(searchQuery);
          const searchResults = await smartSearchService.search(searchQuery);
          setProducts(searchResults.products);
          setTotalProducts(searchResults.total);
        } else {
          // Load recommended/featured products
          const recommended = await recommendationService.getPersonalized('user', 24);
          setProducts(recommended);
          setTotalProducts(recommended.length);
        }
      } catch (error) {
        console.error('Failed to load products:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadProducts();
  }, [searchParams, setQuery]);

  const handleCategoryToggle = (categoryId: string) => {
    setSelectedCategories((prev) =>
      prev.includes(categoryId)
        ? prev.filter((id) => id !== categoryId)
        : [...prev, categoryId]
    );
  };

  const handlePriceRangeSelect = (range: { min: number; max: number } | null) => {
    setPriceRange(range);
  };

  const handleClearFilters = () => {
    setSelectedCategories([]);
    setPriceRange(null);
    setMinRating(null);
    setSortBy('relevance');
  };

  const hasActiveFilters =
    selectedCategories.length > 0 || priceRange !== null || minRating !== null;

  const filteredProducts = React.useMemo(() => {
    let filtered = [...products];

    // Filter by category
    if (selectedCategories.length > 0) {
      filtered = filtered.filter((p) =>
        selectedCategories.includes(p.category?.id || '')
      );
    }

    // Filter by price
    if (priceRange) {
      filtered = filtered.filter(
        (p) => p.price >= priceRange.min && p.price <= priceRange.max
      );
    }

    // Filter by rating
    if (minRating) {
      filtered = filtered.filter((p) => (p.rating?.average || 0) >= minRating);
    }

    // Sort
    switch (sortBy) {
      case 'price-low':
        filtered.sort((a, b) => a.price - b.price);
        break;
      case 'price-high':
        filtered.sort((a, b) => b.price - a.price);
        break;
      case 'rating':
        filtered.sort((a, b) => (b.rating?.average || 0) - (a.rating?.average || 0));
        break;
      case 'newest':
        filtered.sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
        break;
    }

    return filtered;
  }, [products, selectedCategories, priceRange, minRating, sortBy]);

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="bg-background border-b sticky top-0 z-10">
        <div className="container py-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold">
                {query ? `Results for "${query}"` : 'All Products'}
              </h1>
              <p className="text-sm text-muted-foreground">
                {filteredProducts.length} products found
              </p>
            </div>

            <div className="flex items-center gap-2">
              {/* Sort */}
              <div className="relative">
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="appearance-none bg-background border rounded-md px-3 py-2 pr-8 text-sm"
                >
                  {sortOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 pointer-events-none" />
              </div>

              {/* View Toggle */}
              <div className="flex border rounded-md">
                <button
                  onClick={() => setViewMode('grid')}
                  className={cn(
                    'p-2',
                    viewMode === 'grid' ? 'bg-muted' : 'hover:bg-muted/50'
                  )}
                >
                  <Grid3X3 className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={cn(
                    'p-2',
                    viewMode === 'list' ? 'bg-muted' : 'hover:bg-muted/50'
                  )}
                >
                  <List className="h-4 w-4" />
                </button>
              </div>

              {/* Filter Toggle (Mobile) */}
              <Button
                variant="outline"
                className="lg:hidden"
                onClick={() => setShowFilters(!showFilters)}
              >
                <Filter className="h-4 w-4 mr-2" />
                Filters
                {hasActiveFilters && (
                  <Badge className="ml-2" variant="secondary">
                    {selectedCategories.length + (priceRange ? 1 : 0) + (minRating ? 1 : 0)}
                  </Badge>
                )}
              </Button>
            </div>
          </div>

          {/* Active Filters */}
          {hasActiveFilters && (
            <div className="flex flex-wrap items-center gap-2 mt-4">
              <span className="text-sm text-muted-foreground">Active filters:</span>
              {selectedCategories.map((catId) => {
                const cat = categories.find((c) => c.id === catId);
                return (
                  <Badge key={catId} variant="secondary" className="gap-1">
                    {cat?.name}
                    <button onClick={() => handleCategoryToggle(catId)}>
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                );
              })}
              {priceRange && (
                <Badge variant="secondary" className="gap-1">
                  {priceRange.max === Infinity
                    ? `Over ${formatCurrency(priceRange.min)}`
                    : `${formatCurrency(priceRange.min)} - ${formatCurrency(priceRange.max)}`}
                  <button onClick={() => setPriceRange(null)}>
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              )}
              {minRating && (
                <Badge variant="secondary" className="gap-1">
                  {minRating}+ Stars
                  <button onClick={() => setMinRating(null)}>
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              )}
              <Button variant="ghost" size="sm" onClick={handleClearFilters}>
                Clear all
              </Button>
            </div>
          )}
        </div>
      </div>

      <div className="container py-8">
        <div className="flex gap-8">
          {/* Sidebar Filters (Desktop) */}
          <aside
            className={cn(
              'w-64 flex-shrink-0 space-y-6',
              'hidden lg:block',
              showFilters && 'fixed inset-0 z-50 bg-background p-6 lg:relative lg:p-0'
            )}
          >
            <div className="flex items-center justify-between lg:hidden">
              <h2 className="text-lg font-semibold">Filters</h2>
              <Button variant="ghost" size="sm" onClick={() => setShowFilters(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>

            {/* AI-Powered Suggestion */}
            <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles className="h-4 w-4 text-primary" />
                  <span className="font-medium text-sm">AI Suggestion</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  Based on your browsing, you might like products in the{' '}
                  <button className="text-primary font-medium hover:underline">
                    Electronics
                  </button>{' '}
                  category.
                </p>
              </CardContent>
            </Card>

            {/* Categories */}
            <div>
              <h3 className="font-medium mb-3">Categories</h3>
              <div className="space-y-2">
                {categories.map((category) => (
                  <label
                    key={category.id}
                    className="flex items-center gap-2 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={selectedCategories.includes(category.id)}
                      onChange={() => handleCategoryToggle(category.id)}
                      className="h-4 w-4 rounded"
                    />
                    <span className="text-sm flex-1">{category.name}</span>
                    <span className="text-xs text-muted-foreground">
                      ({category.productCount})
                    </span>
                  </label>
                ))}
              </div>
            </div>

            {/* Price Range */}
            <div>
              <h3 className="font-medium mb-3">Price Range</h3>
              <div className="space-y-2">
                {priceRanges.map((range, index) => (
                  <label
                    key={index}
                    className="flex items-center gap-2 cursor-pointer"
                  >
                    <input
                      type="radio"
                      name="price"
                      checked={priceRange?.min === range.min && priceRange?.max === range.max}
                      onChange={() => handlePriceRangeSelect(range)}
                      className="h-4 w-4"
                    />
                    <span className="text-sm">{range.label}</span>
                  </label>
                ))}
                <button
                  onClick={() => setPriceRange(null)}
                  className="text-sm text-primary hover:underline"
                >
                  Clear
                </button>
              </div>
            </div>

            {/* Rating */}
            <div>
              <h3 className="font-medium mb-3">Customer Rating</h3>
              <div className="space-y-2">
                {ratings.map((rating) => (
                  <label
                    key={rating}
                    className="flex items-center gap-2 cursor-pointer"
                  >
                    <input
                      type="radio"
                      name="rating"
                      checked={minRating === rating}
                      onChange={() => setMinRating(rating)}
                      className="h-4 w-4"
                    />
                    <div className="flex items-center gap-1">
                      {[...Array(5)].map((_, i) => (
                        <Star
                          key={i}
                          className={cn(
                            'h-4 w-4',
                            i < rating
                              ? 'fill-yellow-400 text-yellow-400'
                              : 'text-muted-foreground'
                          )}
                        />
                      ))}
                      <span className="text-sm ml-1">& Up</span>
                    </div>
                  </label>
                ))}
                <button
                  onClick={() => setMinRating(null)}
                  className="text-sm text-primary hover:underline"
                >
                  Clear
                </button>
              </div>
            </div>
          </aside>

          {/* Products Grid */}
          <div className="flex-1">
            {isLoading ? (
              <div className="flex items-center justify-center h-64">
                <Loader2 className="h-8 w-8 animate-spin" />
              </div>
            ) : filteredProducts.length === 0 ? (
              <Card className="p-12 text-center">
                <SlidersHorizontal className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <h2 className="text-xl font-bold mb-2">No products found</h2>
                <p className="text-muted-foreground mb-4">
                  Try adjusting your filters or search terms
                </p>
                <Button onClick={handleClearFilters}>Clear Filters</Button>
              </Card>
            ) : (
              <motion.div
                layout
                className={cn(
                  viewMode === 'grid'
                    ? 'grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4'
                    : 'space-y-4'
                )}
              >
                <AnimatePresence>
                  {filteredProducts.map((product, index) => (
                    <motion.div
                      key={product.id}
                      layout
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      transition={{ delay: index * 0.05 }}
                    >
                      <ProductCard
                        product={product}
                        variant={viewMode === 'list' ? 'horizontal' : 'default'}
                      />
                    </motion.div>
                  ))}
                </AnimatePresence>
              </motion.div>
            )}

            {/* Load More */}
            {!isLoading && filteredProducts.length > 0 && filteredProducts.length < totalProducts && (
              <div className="mt-8 text-center">
                <Button variant="outline" size="lg">
                  Load More Products
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
