import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ChevronRight } from 'lucide-react';

export default function ProductDetailLoading() {
  return (
    <div className="min-h-screen bg-background">
      {/* Breadcrumb Skeleton */}
      <div className="border-b bg-muted/30">
        <div className="container py-3">
          <nav className="flex items-center gap-2">
            <Skeleton className="h-4 w-12" />
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
            <Skeleton className="h-4 w-16" />
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
            <Skeleton className="h-4 w-20" />
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
            <Skeleton className="h-4 w-32" />
          </nav>
        </div>
      </div>

      <div className="container py-8">
        {/* Main Product Section */}
        <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 mb-12">
          {/* Gallery Skeleton */}
          <div className="space-y-4">
            {/* Main Image */}
            <Skeleton className="aspect-square rounded-2xl" />

            {/* Thumbnails */}
            <div className="grid grid-cols-5 gap-2">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="aspect-square rounded-lg" />
              ))}
            </div>
          </div>

          {/* Product Info Skeleton */}
          <div className="space-y-6">
            {/* Vendor */}
            <div className="flex items-center gap-3">
              <Skeleton className="h-10 w-10 rounded-full" />
              <div className="space-y-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-3 w-20" />
              </div>
            </div>

            {/* Title */}
            <div className="space-y-2">
              <Skeleton className="h-10 w-3/4" />
              <Skeleton className="h-6 w-full" />
            </div>

            {/* Rating */}
            <div className="flex items-center gap-3">
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-20" />
            </div>

            {/* Price */}
            <div className="space-y-2">
              <div className="flex items-baseline gap-3">
                <Skeleton className="h-12 w-32" />
                <Skeleton className="h-6 w-24" />
              </div>
              <Skeleton className="h-4 w-48" />
            </div>

            {/* Stock */}
            <Skeleton className="h-5 w-32" />

            {/* SKU and Brand */}
            <div className="flex gap-6">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-4 w-32" />
            </div>

            {/* Variant Selection */}
            <div className="space-y-4">
              <Skeleton className="h-4 w-24" />
              <div className="flex flex-wrap gap-2">
                {[...Array(4)].map((_, i) => (
                  <Skeleton key={i} className="h-10 w-20 rounded-lg" />
                ))}
              </div>
            </div>

            {/* Quantity */}
            <div className="space-y-2">
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-12 w-48" />
            </div>

            {/* Buttons */}
            <div className="flex gap-3">
              <Skeleton className="h-14 flex-1" />
              <Skeleton className="h-14 w-14" />
              <Skeleton className="h-14 w-14" />
            </div>

            {/* Trust Badges */}
            <div className="grid grid-cols-3 gap-3 pt-4 border-t">
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-20 rounded-lg" />
              ))}
            </div>
          </div>
        </div>

        {/* Tabs Skeleton */}
        <Card className="mb-12">
          <div className="border-b p-6">
            <div className="flex gap-6">
              <Skeleton className="h-10 w-32" />
              <Skeleton className="h-10 w-32" />
              <Skeleton className="h-10 w-32" />
              <Skeleton className="h-10 w-32" />
            </div>
          </div>
          <CardContent className="p-6 space-y-3">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </CardContent>
        </Card>

        {/* Accordion Skeleton */}
        <Card className="mb-12">
          <CardContent className="p-6 space-y-4">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </CardContent>
        </Card>

        {/* Related Products Skeleton */}
        <div>
          <Skeleton className="h-8 w-48 mb-6" />
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <Card key={i}>
                <Skeleton className="aspect-[4/5] rounded-t-xl" />
                <CardContent className="p-4 space-y-2">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-6 w-24" />
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
