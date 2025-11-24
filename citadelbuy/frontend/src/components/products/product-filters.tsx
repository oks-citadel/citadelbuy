'use client';

import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useProductsStore } from '@/store/products-store';

export function ProductFilters() {
  const { filters, setFilters, clearFilters } = useProductsStore();
  const [localFilters, setLocalFilters] = useState(filters);

  const handleApply = () => {
    setFilters(localFilters);
  };

  const handleClear = () => {
    setLocalFilters({});
    clearFilters();
  };

  const sortOptions = [
    { value: 'newest', label: 'Newest First' },
    { value: 'price-asc', label: 'Price: Low to High' },
    { value: 'price-desc', label: 'Price: High to Low' },
    { value: 'popular', label: 'Most Popular' },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Filters</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Search */}
        <div className="space-y-2">
          <Label htmlFor="search">Search</Label>
          <Input
            id="search"
            placeholder="Search products..."
            value={localFilters.search || ''}
            onChange={(e) =>
              setLocalFilters({ ...localFilters, search: e.target.value })
            }
          />
        </div>

        {/* Price Range */}
        <div className="space-y-2">
          <Label>Price Range</Label>
          <div className="grid grid-cols-2 gap-2">
            <Input
              type="number"
              placeholder="Min"
              value={localFilters.minPrice || ''}
              onChange={(e) =>
                setLocalFilters({
                  ...localFilters,
                  minPrice: e.target.value ? Number(e.target.value) : undefined,
                })
              }
            />
            <Input
              type="number"
              placeholder="Max"
              value={localFilters.maxPrice || ''}
              onChange={(e) =>
                setLocalFilters({
                  ...localFilters,
                  maxPrice: e.target.value ? Number(e.target.value) : undefined,
                })
              }
            />
          </div>
        </div>

        {/* Sort By */}
        <div className="space-y-2">
          <Label htmlFor="sort">Sort By</Label>
          <select
            id="sort"
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            value={localFilters.sortBy || ''}
            onChange={(e) =>
              setLocalFilters({
                ...localFilters,
                sortBy: e.target.value as any,
              })
            }
          >
            <option value="">Default</option>
            {sortOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <Button onClick={handleApply} className="flex-1">
            Apply
          </Button>
          <Button onClick={handleClear} variant="outline" className="flex-1">
            Clear
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
