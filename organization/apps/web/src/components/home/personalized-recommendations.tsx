'use client';

import * as React from 'react';
import Link from 'next/link';
import { Sparkles, ChevronRight, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ProductCard } from '@/components/product/product-card';
import { useAuthStore } from '@/stores/auth-store';
import { recommendationService } from '@/services/ai';
import { Product, Recommendation } from '@/types';

export function PersonalizedRecommendations() {
  const [recommendations, setRecommendations] = React.useState<Product[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const { user, isAuthenticated } = useAuthStore();

  const fetchRecommendations = React.useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      if (isAuthenticated && user) {
        const result = await recommendationService.getPersonalized(user.id, 8);
        setRecommendations(result.products);
      } else {
        // Get trending products for non-authenticated users
        const products = await recommendationService.getTrending(undefined, 8);
        setRecommendations(products);
      }
    } catch (err) {
      console.error('Failed to fetch recommendations:', err);
      setError('Unable to load recommendations');
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated, user]);

  React.useEffect(() => {
    fetchRecommendations();
  }, [fetchRecommendations]);

  if (error) {
    return null;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
            <Sparkles className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h2 className="text-2xl font-bold">
              {isAuthenticated ? 'Recommended For You' : 'Popular Right Now'}
            </h2>
            <p className="text-sm text-muted-foreground">
              {isAuthenticated
                ? 'AI-curated picks based on your preferences'
                : 'Discover what others are loving'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={fetchRecommendations}>
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
          <Link href="/for-you">
            <Button variant="outline" size="sm">
              View All <ChevronRight className="ml-1 h-4 w-4" />
            </Button>
          </Link>
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="space-y-3">
              <div className="aspect-square rounded-lg skeleton" />
              <div className="h-4 rounded skeleton w-3/4" />
              <div className="h-4 rounded skeleton w-1/2" />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {recommendations.map((product, index) => (
            <ProductCard
              key={product.id}
              product={product}
              badge={index < 2 ? { text: 'AI Pick', variant: 'default' } : undefined}
            />
          ))}
        </div>
      )}

      {!isAuthenticated && (
        <div className="mt-6 p-6 bg-primary/5 rounded-lg border border-primary/20">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold mb-1">Get Personalized Recommendations</h3>
              <p className="text-sm text-muted-foreground">
                Sign in to unlock AI-powered recommendations tailored to your style
              </p>
            </div>
            <Link href="/auth/register">
              <Button>
                <Sparkles className="mr-2 h-4 w-4" />
                Create Account
              </Button>
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
