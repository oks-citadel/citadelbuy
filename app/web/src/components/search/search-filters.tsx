'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Checkbox } from '@/components/ui/checkbox';
import { X } from 'lucide-react';

interface Category {
  id: string;
  name: string;
}

interface SearchFiltersProps {
  categories?: Category[];
  onFilterChange: (filters: any) => void;
  initialFilters?: any;
}

export function SearchFilters({
  categories = [],
  onFilterChange,
  initialFilters = {}
}: SearchFiltersProps) {
  const [filters, setFilters] = useState({
    categoryId: initialFilters.categoryId || '',
    minPrice: initialFilters.minPrice || 0,
    maxPrice: initialFilters.maxPrice || 1000,
    minRating: initialFilters.minRating || 0,
    inStock: initialFilters.inStock || false,
    sortBy: initialFilters.sortBy || 'relevance',
  });

  const updateFilter = (key: string, value: any) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
    onFilterChange(newFilters);
  };

  const clearFilters = () => {
    const defaultFilters = {
      categoryId: '',
      minPrice: 0,
      maxPrice: 1000,
      minRating: 0,
      inStock: false,
      sortBy: 'relevance',
    };
    setFilters(defaultFilters);
    onFilterChange(defaultFilters);
  };

  const hasActiveFilters =
    filters.categoryId ||
    filters.minPrice > 0 ||
    filters.maxPrice < 1000 ||
    filters.minRating > 0 ||
    filters.inStock;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Filters</CardTitle>
          {hasActiveFilters && (
            <Button variant="ghost" size="sm" onClick={clearFilters}>
              <X className="h-4 w-4 mr-2" />
              Clear All
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Category Filter */}
        {categories.length > 0 && (
          <div>
            <Label htmlFor="category">Category</Label>
            <select
              id="category"
              value={filters.categoryId}
              onChange={(e) => updateFilter('categoryId', e.target.value)}
              className="w-full mt-1 p-2 border rounded-md"
            >
              <option value="">All Categories</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Price Range */}
        <div>
          <Label>Price Range</Label>
          <div className="mt-2 space-y-4">
            <div className="flex items-center gap-4">
              <Input
                type="number"
                placeholder="Min"
                value={filters.minPrice}
                onChange={(e) => updateFilter('minPrice', Number(e.target.value))}
                className="w-full"
              />
              <span>-</span>
              <Input
                type="number"
                placeholder="Max"
                value={filters.maxPrice}
                onChange={(e) => updateFilter('maxPrice', Number(e.target.value))}
                className="w-full"
              />
            </div>
            <Slider
              min={0}
              max={1000}
              step={10}
              value={[filters.minPrice, filters.maxPrice]}
              onValueChange={(value) => {
                updateFilter('minPrice', value[0]);
                updateFilter('maxPrice', value[1]);
              }}
            />
            <div className="flex justify-between text-sm text-gray-500">
              <span>${filters.minPrice}</span>
              <span>${filters.maxPrice}</span>
            </div>
          </div>
        </div>

        {/* Rating Filter */}
        <div>
          <Label>Minimum Rating</Label>
          <div className="mt-2 space-y-2">
            {[4, 3, 2, 1].map((rating) => (
              <button
                key={rating}
                onClick={() => updateFilter('minRating', rating)}
                className={`w-full text-left px-3 py-2 rounded-md border ${
                  filters.minRating === rating
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-300 hover:border-gray-400'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="text-yellow-400">{'★'.repeat(rating)}</span>
                  <span className="text-gray-400">{'★'.repeat(5 - rating)}</span>
                  <span className="text-sm text-gray-600">& up</span>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Availability */}
        <div className="flex items-center gap-2">
          <Checkbox
            id="inStock"
            checked={filters.inStock}
            onCheckedChange={(checked) => updateFilter('inStock', checked)}
          />
          <Label htmlFor="inStock" className="cursor-pointer">
            In Stock Only
          </Label>
        </div>

        {/* Sort By */}
        <div>
          <Label htmlFor="sortBy">Sort By</Label>
          <select
            id="sortBy"
            value={filters.sortBy}
            onChange={(e) => updateFilter('sortBy', e.target.value)}
            className="w-full mt-1 p-2 border rounded-md"
          >
            <option value="relevance">Relevance</option>
            <option value="price">Price: Low to High</option>
            <option value="price-desc">Price: High to Low</option>
            <option value="rating">Rating</option>
            <option value="newest">Newest</option>
          </select>
        </div>
      </CardContent>
    </Card>
  );
}
