import { Skeleton } from '@/components/ui/skeleton';

/**
 * Cart Loading Skeleton
 * Provides proper skeleton UI to prevent CLS during cart page loading
 */
export default function CartLoading() {
  return (
    <div className="min-h-screen bg-background">
      <div className="container py-8">
        {/* Page Header */}
        <div className="mb-8">
          <Skeleton className="h-10 w-48 mb-2" />
          <Skeleton className="h-5 w-32" />
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Cart Items Column */}
          <div className="lg:col-span-2 space-y-4">
            {/* Cart Items */}
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="flex gap-4 p-4 rounded-lg border bg-card"
              >
                {/* Product Image */}
                <Skeleton className="h-24 w-24 rounded-lg flex-shrink-0" />

                {/* Product Details */}
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-5 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                  <div className="flex items-center gap-4 mt-4">
                    {/* Quantity Selector */}
                    <Skeleton className="h-10 w-28" />
                    {/* Price */}
                    <Skeleton className="h-6 w-20" />
                  </div>
                </div>

                {/* Remove Button */}
                <Skeleton className="h-8 w-8 rounded-full flex-shrink-0" />
              </div>
            ))}

            {/* Continue Shopping Link */}
            <Skeleton className="h-10 w-40 mt-4" />
          </div>

          {/* Order Summary Column */}
          <div className="lg:col-span-1">
            <div className="p-6 rounded-lg border bg-card space-y-4">
              <Skeleton className="h-6 w-32 mb-4" />

              {/* Summary Lines */}
              <div className="space-y-3">
                <div className="flex justify-between">
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-4 w-16" />
                </div>
                <div className="flex justify-between">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-4 w-16" />
                </div>
                <div className="flex justify-between">
                  <Skeleton className="h-4 w-16" />
                  <Skeleton className="h-4 w-12" />
                </div>
              </div>

              <div className="border-t pt-4">
                <div className="flex justify-between mb-4">
                  <Skeleton className="h-6 w-16" />
                  <Skeleton className="h-6 w-24" />
                </div>
              </div>

              {/* Promo Code */}
              <div className="flex gap-2">
                <Skeleton className="h-10 flex-1" />
                <Skeleton className="h-10 w-20" />
              </div>

              {/* Checkout Button */}
              <Skeleton className="h-12 w-full" />

              {/* Trust Badges */}
              <div className="grid grid-cols-3 gap-2 pt-4">
                <Skeleton className="h-16 rounded" />
                <Skeleton className="h-16 rounded" />
                <Skeleton className="h-16 rounded" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
