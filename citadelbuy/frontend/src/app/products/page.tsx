'use client';

import { Suspense } from 'react';
import { useProductSearch } from '@/hooks/useProductSearch';
import { SearchBar } from '@/components/search/search-bar';
import { ProductFilters } from '@/components/search/product-filters';
import { ProductGrid } from '@/components/products/product-grid';
import { ProductPagination } from '@/components/products/product-pagination';

function ProductsContent() {
  const {
    products,
    pagination,
    filters,
    isLoading,
    error,
    updateFilter,
    resetFilters,
    setPage,
  } = useProductSearch();

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header with Search */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-4">Products</h1>
        <SearchBar initialValue={filters.query} className="max-w-2xl" />
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-4">
        {/* Filters Sidebar */}
        <aside className="lg:col-span-1">
          <div className="sticky top-4">
            <ProductFilters
              filters={filters}
              onFilterChange={updateFilter}
              onResetFilters={resetFilters}
            />
          </div>
        </aside>

        {/* Products Grid */}
        <main className="lg:col-span-3">
          {isLoading ? (
            <div className="flex min-h-[400px] items-center justify-center">
              <div className="text-center">
                <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent"></div>
                <p className="mt-4 text-muted-foreground">Loading products...</p>
              </div>
            </div>
          ) : error ? (
            <div className="flex min-h-[400px] items-center justify-center">
              <div className="text-center">
                <p className="text-lg font-semibold text-destructive">
                  {error instanceof Error ? error.message : 'Failed to load products'}
                </p>
                <button
                  onClick={() => window.location.reload()}
                  className="mt-4 text-primary hover:underline"
                >
                  Try again
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="mb-4 flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  {pagination ? (
                    <>Showing {products.length} of {pagination.total} products</>
                  ) : (
                    <>{products.length} products</>
                  )}
                </p>
              </div>

              <ProductGrid products={products} />

              {pagination && pagination.totalPages > 1 && (
                <div className="mt-8">
                  <ProductPagination
                    currentPage={pagination.page}
                    totalPages={pagination.totalPages}
                    onPageChange={setPage}
                  />
                </div>
              )}
            </>
          )}
        </main>
      </div>
    </div>
  );
}

export default function ProductsPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    }>
      <ProductsContent />
    </Suspense>
  );
}
