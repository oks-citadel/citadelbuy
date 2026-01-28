import { Skeleton } from '@/components/ui/skeleton';

/**
 * Products Listing Loading Skeleton
 * Provides proper skeleton UI to prevent CLS during products page loading
 */
export default function ProductsLoading() {
  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="bg-background border-b sticky top-0 z-10">
        <div className="container py-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <Skeleton className="h-8 w-48 mb-2" />
              <Skeleton className="h-5 w-32" />
            </div>

            <div className="flex items-center gap-2">
              <Skeleton className="h-10 w-32" />
              <Skeleton className="h-10 w-20" />
              <Skeleton className="h-10 w-24 lg:hidden" />
            </div>
          </div>
        </div>
      </div>

      <div className="container py-8">
        <div className="flex gap-8">
          {/* Sidebar Filters */}
          <aside className="w-64 flex-shrink-0 space-y-6 hidden lg:block">
            {/* AI Suggestion Card */}
            <div className="p-4 rounded-lg border bg-muted/30">
              <div className="flex items-center gap-2 mb-2">
                <Skeleton className="h-4 w-4" />
                <Skeleton className="h-4 w-24" />
              </div>
              <Skeleton className="h-12 w-full" />
            </div>

            {/* Categories Filter */}
            <div>
              <Skeleton className="h-5 w-24 mb-3" />
              <div className="space-y-2">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <Skeleton className="h-4 w-4" />
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-8" />
                  </div>
                ))}
              </div>
            </div>

            {/* Price Range Filter */}
            <div>
              <Skeleton className="h-5 w-24 mb-3" />
              <div className="space-y-2">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <Skeleton className="h-4 w-4 rounded-full" />
                    <Skeleton className="h-4 w-20" />
                  </div>
                ))}
              </div>
            </div>

            {/* Rating Filter */}
            <div>
              <Skeleton className="h-5 w-32 mb-3" />
              <div className="space-y-2">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <Skeleton className="h-4 w-4 rounded-full" />
                    <div className="flex gap-1">
                      {Array.from({ length: 5 }).map((_, j) => (
                        <Skeleton key={j} className="h-4 w-4" />
                      ))}
                    </div>
                    <Skeleton className="h-4 w-12" />
                  </div>
                ))}
              </div>
            </div>
          </aside>

          {/* Products Grid */}
          <div className="flex-1">
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
              {Array.from({ length: 12 }).map((_, i) => (
                <div key={i} className="rounded-xl border bg-card overflow-hidden">
                  {/* Product Image */}
                  <Skeleton className="aspect-[4/5] w-full" />

                  {/* Product Info */}
                  <div className="p-4 space-y-3">
                    {/* Vendor */}
                    <Skeleton className="h-3 w-16" />
                    {/* Name */}
                    <Skeleton className="h-5 w-full" />
                    <Skeleton className="h-5 w-3/4" />
                    {/* Rating */}
                    <div className="flex items-center gap-2">
                      <div className="flex gap-0.5">
                        {Array.from({ length: 5 }).map((_, j) => (
                          <Skeleton key={j} className="h-3.5 w-3.5" />
                        ))}
                      </div>
                      <Skeleton className="h-4 w-8" />
                      <Skeleton className="h-3 w-12" />
                    </div>
                    {/* Price */}
                    <div className="flex items-baseline gap-2">
                      <Skeleton className="h-6 w-20" />
                      <Skeleton className="h-4 w-16" />
                    </div>
                    {/* Mobile Add to Cart */}
                    <Skeleton className="h-10 w-full md:hidden" />
                  </div>
                </div>
              ))}
            </div>

            {/* Load More */}
            <div className="mt-8 text-center">
              <Skeleton className="h-12 w-40 mx-auto" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
