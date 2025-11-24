'use client';

import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { DealCard } from '@/components/deals/deal-card';
import {
  useActiveDeals,
  useFeaturedDeals,
  useDeals,
  DealType,
  DealStatus,
} from '@/lib/api/deals';
import { AlertCircle, Filter, Zap } from 'lucide-react';

export default function DealsPage() {
  const [selectedType, setSelectedType] = useState<DealType | 'all'>('all');
  const [currentPage, setCurrentPage] = useState(1);

  // Fetch deals based on selected filters
  const { data: activeData, isLoading: activeLoading } = useActiveDeals();
  const { data: featuredData, isLoading: featuredLoading } = useFeaturedDeals();
  const { data: allData, isLoading: allLoading } = useDeals({
    type: selectedType === 'all' ? undefined : selectedType,
    page: currentPage,
    limit: 12,
  });

  const activeDeals = activeData?.deals || [];
  const featuredDeals = featuredData?.deals || [];
  const allDeals = allData?.deals || [];
  const pagination = allData?.pagination;

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex flex-col gap-4 mb-8">
        <div className="flex items-center gap-3">
          <Zap className="h-8 w-8 text-yellow-500" />
          <div>
            <h1 className="text-3xl font-bold">Flash Sales & Deals</h1>
            <p className="text-muted-foreground mt-1">
              Limited time offers on your favorite products
            </p>
          </div>
        </div>

        {/* Filter */}
        <div className="flex items-center gap-4">
          <Filter className="h-5 w-5 text-muted-foreground" />
          <Select
            value={selectedType}
            onValueChange={(value) => setSelectedType(value as DealType | 'all')}
          >
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Filter by type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Deals</SelectItem>
              <SelectItem value={DealType.FLASH_SALE}>Flash Sale</SelectItem>
              <SelectItem value={DealType.DAILY_DEAL}>Daily Deal</SelectItem>
              <SelectItem value={DealType.BUNDLE_DEAL}>Bundle Deal</SelectItem>
              <SelectItem value={DealType.BOGO}>BOGO</SelectItem>
              <SelectItem value={DealType.PERCENTAGE_DISCOUNT}>
                Percentage Discount
              </SelectItem>
              <SelectItem value={DealType.FIXED_DISCOUNT}>
                Fixed Discount
              </SelectItem>
              <SelectItem value={DealType.VOLUME_DISCOUNT}>
                Volume Discount
              </SelectItem>
              <SelectItem value={DealType.SEASONAL_SALE}>
                Seasonal Sale
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="active" className="space-y-6">
        <TabsList className="grid w-full max-w-md grid-cols-3">
          <TabsTrigger value="active">
            Active Deals ({activeDeals.length})
          </TabsTrigger>
          <TabsTrigger value="featured">
            Featured ({featuredDeals.length})
          </TabsTrigger>
          <TabsTrigger value="all">All Deals</TabsTrigger>
        </TabsList>

        {/* Active Deals Tab */}
        <TabsContent value="active" className="space-y-6">
          {activeLoading ? (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-[400px]" />
              ))}
            </div>
          ) : activeDeals.length === 0 ? (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                No active deals at the moment. Check back soon!
              </AlertDescription>
            </Alert>
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {activeDeals.map((deal) => (
                <DealCard key={deal.id} deal={deal} />
              ))}
            </div>
          )}
        </TabsContent>

        {/* Featured Deals Tab */}
        <TabsContent value="featured" className="space-y-6">
          {featuredLoading ? (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-[400px]" />
              ))}
            </div>
          ) : featuredDeals.length === 0 ? (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                No featured deals available right now.
              </AlertDescription>
            </Alert>
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {featuredDeals.map((deal) => (
                <DealCard key={deal.id} deal={deal} />
              ))}
            </div>
          )}
        </TabsContent>

        {/* All Deals Tab */}
        <TabsContent value="all" className="space-y-6">
          {allLoading ? (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-[400px]" />
              ))}
            </div>
          ) : allDeals.length === 0 ? (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                No deals found matching your filters.
              </AlertDescription>
            </Alert>
          ) : (
            <>
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {allDeals.map((deal) => (
                  <DealCard key={deal.id} deal={deal} />
                ))}
              </div>

              {/* Pagination */}
              {pagination && pagination.totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 mt-8">
                  <Button
                    variant="outline"
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                  >
                    Previous
                  </Button>
                  <span className="text-sm text-muted-foreground px-4">
                    Page {pagination.page} of {pagination.totalPages}
                  </span>
                  <Button
                    variant="outline"
                    onClick={() =>
                      setCurrentPage((p) => Math.min(pagination.totalPages, p + 1))
                    }
                    disabled={currentPage === pagination.totalPages}
                  >
                    Next
                  </Button>
                </div>
              )}
            </>
          )}
        </TabsContent>
      </Tabs>

      {/* Benefits Section */}
      <div className="mt-12 p-6 bg-muted/50 rounded-lg">
        <h2 className="text-xl font-semibold mb-4">Why Shop Our Deals?</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <h3 className="font-medium mb-2">Limited Time Offers</h3>
            <p className="text-sm text-muted-foreground">
              Flash sales and daily deals available for a short time only.
            </p>
          </div>
          <div>
            <h3 className="font-medium mb-2">Best Prices</h3>
            <p className="text-sm text-muted-foreground">
              Save up to 70% on selected products during our sales events.
            </p>
          </div>
          <div>
            <h3 className="font-medium mb-2">Loyalty Benefits</h3>
            <p className="text-sm text-muted-foreground">
              Higher tier members get early access to the best deals.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
