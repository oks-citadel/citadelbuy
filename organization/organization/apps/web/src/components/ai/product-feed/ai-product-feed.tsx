'use client';

import * as React from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles,
  TrendingUp,
  Clock,
  Heart,
  Eye,
  RefreshCw,
  ChevronRight,
  Loader2,
  Flame,
  Zap,
  Star,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ProductCard } from '@/components/product/product-card';
import { cn } from '@/lib/utils';
import { recommendationService } from '@/services/ai';
import { Product, Recommendation, RecommendationType } from '@/types';
import { useAuthStore } from '@/stores/auth-store';

interface FeedSection {
  id: string;
  type: RecommendationType;
  title: string;
  description: string;
  icon: React.ReactNode;
  products: Product[];
  isLoading: boolean;
}

const feedSectionConfig: Record<
  RecommendationType,
  { title: string; description: string; icon: React.ReactNode; color: string }
> = {
  PERSONALIZED: {
    title: 'For You',
    description: 'Curated based on your preferences',
    icon: <Sparkles className="h-5 w-5" />,
    color: 'from-violet-500 to-purple-500',
  },
  TRENDING: {
    title: 'Trending Now',
    description: "What's popular right now",
    icon: <TrendingUp className="h-5 w-5" />,
    color: 'from-orange-500 to-red-500',
  },
  NEW_ARRIVALS: {
    title: 'New Arrivals',
    description: 'Fresh picks just for you',
    icon: <Zap className="h-5 w-5" />,
    color: 'from-blue-500 to-cyan-500',
  },
  RECENTLY_VIEWED: {
    title: 'Recently Viewed',
    description: 'Pick up where you left off',
    icon: <Clock className="h-5 w-5" />,
    color: 'from-gray-500 to-gray-600',
  },
  SIMILAR: {
    title: 'Similar Items',
    description: 'Based on your browsing',
    icon: <Eye className="h-5 w-5" />,
    color: 'from-green-500 to-emerald-500',
  },
  FREQUENTLY_BOUGHT_TOGETHER: {
    title: 'Frequently Bought Together',
    description: 'Popular combinations',
    icon: <Star className="h-5 w-5" />,
    color: 'from-yellow-500 to-amber-500',
  },
  CROSS_SELL: {
    title: 'You Might Also Like',
    description: 'Complementary products',
    icon: <Heart className="h-5 w-5" />,
    color: 'from-pink-500 to-rose-500',
  },
  UPSELL: {
    title: 'Premium Picks',
    description: 'Upgrade your experience',
    icon: <Flame className="h-5 w-5" />,
    color: 'from-amber-500 to-orange-500',
  },
  COMPLETE_THE_LOOK: {
    title: 'Complete the Look',
    description: 'Style suggestions',
    icon: <Sparkles className="h-5 w-5" />,
    color: 'from-indigo-500 to-purple-500',
  },
};

function FeedSectionComponent({
  section,
  onRefresh,
}: {
  section: FeedSection;
  onRefresh: () => void;
}) {
  const config = feedSectionConfig[section.type];

  if (section.products.length === 0 && !section.isLoading) {
    return null;
  }

  return (
    <section className="mb-12">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div
            className={cn(
              'p-2 rounded-lg bg-gradient-to-br text-white',
              config.color
            )}
          >
            {config.icon}
          </div>
          <div>
            <h2 className="text-xl font-bold">{config.title}</h2>
            <p className="text-sm text-muted-foreground">{config.description}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={onRefresh}
            disabled={section.isLoading}
          >
            <RefreshCw
              className={cn('h-4 w-4', section.isLoading && 'animate-spin')}
            />
          </Button>
          <Link href={`/products?feed=${section.type.toLowerCase()}`}>
            <Button variant="ghost" size="sm">
              See All
              <ChevronRight className="ml-1 h-4 w-4" />
            </Button>
          </Link>
        </div>
      </div>

      {section.isLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {[...Array(5)].map((_, i) => (
            <div
              key={i}
              className="aspect-[3/4] rounded-lg bg-muted animate-pulse"
            />
          ))}
        </div>
      ) : (
        <div className="relative">
          <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide">
            <AnimatePresence>
              {section.products.map((product, index) => (
                <motion.div
                  key={product.id}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ delay: index * 0.05 }}
                  className="flex-shrink-0 w-[200px] md:w-[220px]"
                >
                  <ProductCard product={product} />
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>
      )}
    </section>
  );
}

interface AIProductFeedProps {
  initialRecommendations?: Recommendation[];
  showAllSections?: boolean;
  sections?: RecommendationType[];
}

export function AIProductFeed({
  initialRecommendations,
  showAllSections = false,
  sections = ['PERSONALIZED', 'TRENDING', 'NEW_ARRIVALS'],
}: AIProductFeedProps) {
  const { user, isAuthenticated } = useAuthStore();
  const [feedSections, setFeedSections] = React.useState<FeedSection[]>([]);
  const [isInitializing, setIsInitializing] = React.useState(true);

  const loadSection = React.useCallback(
    async (type: RecommendationType): Promise<FeedSection> => {
      const config = feedSectionConfig[type];
      try {
        let products: Product[] = [];

        switch (type) {
          case 'PERSONALIZED':
            const personalized = await recommendationService.getPersonalized(
              user?.id || 'anonymous',
              10
            );
            products = personalized.products;
            break;
          case 'TRENDING':
            const trending = await recommendationService.getTrending(10);
            products = trending.products;
            break;
          case 'NEW_ARRIVALS':
            const newArrivals = await recommendationService.getNewArrivals(10);
            products = newArrivals.products;
            break;
          case 'RECENTLY_VIEWED':
            if (isAuthenticated) {
              const recent = await recommendationService.getRecentlyViewed(
                user!.id,
                10
              );
              products = recent.products;
            }
            break;
          default:
            products = [];
        }

        return {
          id: type,
          type,
          title: config.title,
          description: config.description,
          icon: config.icon,
          products,
          isLoading: false,
        };
      } catch (error) {
        console.error(`Failed to load ${type} section:`, error);
        return {
          id: type,
          type,
          title: config.title,
          description: config.description,
          icon: config.icon,
          products: [],
          isLoading: false,
        };
      }
    },
    [user, isAuthenticated]
  );

  const initializeFeed = React.useCallback(async () => {
    setIsInitializing(true);

    // Set loading state for all sections
    const loadingSections: FeedSection[] = sections.map((type) => ({
      id: type,
      type,
      title: feedSectionConfig[type].title,
      description: feedSectionConfig[type].description,
      icon: feedSectionConfig[type].icon,
      products: [],
      isLoading: true,
    }));
    setFeedSections(loadingSections);

    // Load all sections in parallel
    const loadedSections = await Promise.all(sections.map(loadSection));
    setFeedSections(loadedSections);
    setIsInitializing(false);
  }, [sections, loadSection]);

  React.useEffect(() => {
    initializeFeed();
  }, [initializeFeed]);

  const refreshSection = async (type: RecommendationType) => {
    setFeedSections((prev) =>
      prev.map((section) =>
        section.type === type ? { ...section, isLoading: true } : section
      )
    );

    const updatedSection = await loadSection(type);
    setFeedSections((prev) =>
      prev.map((section) =>
        section.type === type ? updatedSection : section
      )
    );
  };

  return (
    <div className="space-y-8">
      {/* AI Status Banner */}
      <Card className="bg-gradient-to-r from-primary/10 to-primary/5 border-primary/20">
        <CardContent className="py-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/20">
              <Sparkles className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1">
              <p className="font-medium">
                {isAuthenticated
                  ? `Welcome back, ${user?.name?.split(' ')[0]}! Your personalized feed is ready.`
                  : 'Discover products tailored just for you'}
              </p>
              <p className="text-sm text-muted-foreground">
                {isAuthenticated
                  ? 'Recommendations based on your browsing history and preferences'
                  : 'Sign in for personalized recommendations'}
              </p>
            </div>
            {!isAuthenticated && (
              <Link href="/auth/login">
                <Button variant="outline" size="sm">
                  Sign In
                </Button>
              </Link>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={initializeFeed}
              disabled={isInitializing}
            >
              {isInitializing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Feed Sections */}
      {feedSections.map((section) => (
        <FeedSectionComponent
          key={section.id}
          section={section}
          onRefresh={() => refreshSection(section.type)}
        />
      ))}

      {/* Load More */}
      {showAllSections && (
        <div className="text-center py-8">
          <Button variant="outline" size="lg">
            Load More Recommendations
          </Button>
        </div>
      )}
    </div>
  );
}
