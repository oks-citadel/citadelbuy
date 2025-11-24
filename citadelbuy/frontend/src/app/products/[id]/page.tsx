'use client';

import { use, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useProductsStore } from '@/store/products-store';
import { useAuthStore } from '@/store/auth-store';
import { ImageGallery } from '@/components/products/detail/image-gallery';
import { ProductInfo } from '@/components/products/detail/product-info';
import { ReviewForm } from '@/components/reviews/review-form';
import { ReviewList } from '@/components/reviews/review-list';
import { RatingDistribution } from '@/components/reviews/rating-distribution';
import { useProductRatingStats } from '@/hooks/useReviews';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { Product } from '@/types';

interface ProductDetailPageProps {
  params: Promise<{ id: string }>;
}

export default function ProductDetailPage({ params }: ProductDetailPageProps) {
  const resolvedParams = use(params);
  const router = useRouter();
  const [product, setProduct] = useState<Product | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { isAuthenticated } = useAuthStore();
  const fetchProductById = useProductsStore((state) => state.fetchProductById);

  // Fetch rating stats
  const { data: ratingStats } = useProductRatingStats(resolvedParams.id);

  useEffect(() => {
    const loadProduct = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const data = await fetchProductById(resolvedParams.id);
        if (data) {
          setProduct(data);
        } else {
          setError('Product not found');
        }
      } catch (err) {
        setError('Failed to load product');
      } finally {
        setIsLoading(false);
      }
    };

    loadProduct();
  }, [resolvedParams.id, fetchProductById]);

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex min-h-[500px] items-center justify-center">
          <div className="text-center">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent"></div>
            <p className="mt-4 text-muted-foreground">Loading product...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex min-h-[500px] items-center justify-center">
          <div className="text-center">
            <h2 className="text-2xl font-bold">Product Not Found</h2>
            <p className="mt-2 text-muted-foreground">
              {error || 'The product you are looking for does not exist.'}
            </p>
            <Button asChild className="mt-4">
              <Link href="/products">Back to Products</Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Breadcrumb */}
      <nav className="mb-8 flex items-center gap-2 text-sm text-muted-foreground">
        <Link href="/" className="hover:text-foreground">
          Home
        </Link>
        <span>/</span>
        <Link href="/products" className="hover:text-foreground">
          Products
        </Link>
        <span>/</span>
        <span className="text-foreground">{product.name}</span>
      </nav>

      {/* Product Content */}
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        {/* Image Gallery */}
        <div>
          <ImageGallery
            images={product.images || ['/placeholder-product.jpg']}
            productName={product.name}
          />
        </div>

        {/* Product Info */}
        <div>
          <ProductInfo product={product} />
        </div>
      </div>

      {/* Reviews Section */}
      <div className="mt-16">
        <h2 className="text-3xl font-bold mb-8">Customer Reviews</h2>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column: Rating Summary */}
          <div className="lg:col-span-1">
            {ratingStats && (
              <Card>
                <CardHeader>
                  <CardTitle>Rating Overview</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center mb-6">
                    <div className="text-5xl font-bold mb-2">
                      {ratingStats.averageRating.toFixed(1)}
                    </div>
                    <div className="text-yellow-400 mb-2">★★★★★</div>
                    <p className="text-sm text-gray-600">
                      {ratingStats.totalReviews} {ratingStats.totalReviews === 1 ? 'review' : 'reviews'}
                    </p>
                  </div>
                  <RatingDistribution stats={ratingStats} />
                </CardContent>
              </Card>
            )}

            {/* Write Review Form */}
            {isAuthenticated && (
              <div className="mt-6">
                <ReviewForm productId={resolvedParams.id} />
              </div>
            )}

            {!isAuthenticated && (
              <Card className="mt-6">
                <CardContent className="pt-6 text-center">
                  <p className="text-sm text-gray-600 mb-4">
                    Sign in to write a review
                  </p>
                  <Button asChild className="w-full">
                    <Link href="/auth/login">Sign In</Link>
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Right Column: Reviews List */}
          <div className="lg:col-span-2">
            <ReviewList productId={resolvedParams.id} />
          </div>
        </div>
      </div>

      {/* Related Products Section (Placeholder) */}
      <div className="mt-16">
        <h2 className="text-2xl font-bold">Related Products</h2>
        <p className="mt-2 text-muted-foreground">
          Coming soon: Products you might also like
        </p>
      </div>
    </div>
  );
}
