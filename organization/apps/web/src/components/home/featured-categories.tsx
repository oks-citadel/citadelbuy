'use client';

import * as React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { ChevronRight } from 'lucide-react';
import { useCategoryStore } from '@/stores/category-store';
import { cn } from '@/lib/utils';

// Gradient colors for categories without images
const gradients = [
  'from-blue-500/20 to-cyan-500/20',
  'from-pink-500/20 to-rose-500/20',
  'from-green-500/20 to-emerald-500/20',
  'from-purple-500/20 to-violet-500/20',
  'from-orange-500/20 to-amber-500/20',
  'from-yellow-500/20 to-lime-500/20',
];

// Fallback categories for when API is not available
const fallbackCategories = [
  { name: 'Electronics', slug: 'electronics-technology', color: 'from-blue-500/20 to-cyan-500/20' },
  { name: 'Fashion', slug: 'fashion-lifestyle', color: 'from-pink-500/20 to-rose-500/20' },
  { name: 'Home & Living', slug: 'home-living', color: 'from-green-500/20 to-emerald-500/20' },
  { name: 'Health & Beauty', slug: 'health-beauty', color: 'from-purple-500/20 to-violet-500/20' },
  { name: 'Sports', slug: 'sports-outdoors', color: 'from-orange-500/20 to-amber-500/20' },
  { name: 'Kids & Toys', slug: 'kids-baby-toys', color: 'from-yellow-500/20 to-lime-500/20' },
];

export function FeaturedCategories() {
  const { featuredCategories, fetchFeaturedCategories, isLoading } = useCategoryStore();

  React.useEffect(() => {
    if (featuredCategories.length === 0) {
      fetchFeaturedCategories(6);
    }
  }, [featuredCategories.length, fetchFeaturedCategories]);

  const displayCategories = featuredCategories.length > 0 ? featuredCategories : [];
  const showFallback = !isLoading && displayCategories.length === 0;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold">Shop by Category</h2>
          <p className="text-sm text-muted-foreground">
            Explore our curated collections
          </p>
        </div>
        <Link
          href="/categories"
          className="text-sm text-primary hover:underline flex items-center"
        >
          View All Categories
          <ChevronRight className="h-4 w-4 ml-1" />
        </Link>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {isLoading ? (
          // Loading skeleton
          [...Array(6)].map((_, index) => (
            <div
              key={index}
              className="aspect-square rounded-xl bg-muted animate-pulse"
            />
          ))
        ) : showFallback ? (
          // Fallback categories when API not available
          fallbackCategories.map((category, index) => (
            <motion.div
              key={category.slug}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Link href={`/categories/${category.slug}`}>
                <div
                  className={cn(
                    'group relative overflow-hidden rounded-xl aspect-square',
                    'bg-gradient-to-br',
                    category.color
                  )}
                >
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-6xl font-bold text-white/10">
                      {category.name[0]}
                    </span>
                  </div>
                  <div className="absolute bottom-0 left-0 right-0 p-4 text-white">
                    <h3 className="font-semibold mb-1">{category.name}</h3>
                    <p className="text-xs opacity-80">Browse Products</p>
                  </div>
                </div>
              </Link>
            </motion.div>
          ))
        ) : (
          // API categories
          displayCategories.slice(0, 6).map((category, index) => (
            <motion.div
              key={category.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Link href={`/categories/${category.slug}`}>
                <div
                  className={cn(
                    'group relative overflow-hidden rounded-xl aspect-square',
                    'bg-gradient-to-br',
                    gradients[index % gradients.length]
                  )}
                >
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent z-10" />
                  {(category.thumbnailUrl || category.bannerImageUrl) ? (
                    <Image
                      src={category.thumbnailUrl || category.bannerImageUrl || ''}
                      alt={category.name}
                      fill
                      sizes="(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 16vw"
                      className="object-cover transition-transform duration-500 group-hover:scale-110"
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center">
                      {category.iconUrl ? (
                        <Image
                          src={category.iconUrl}
                          alt=""
                          width={48}
                          height={48}
                          className="opacity-30"
                        />
                      ) : (
                        <span className="text-6xl font-bold text-white/10">
                          {category.name[0]}
                        </span>
                      )}
                    </div>
                  )}
                  <div className="absolute bottom-0 left-0 right-0 p-4 text-white z-20">
                    <h3 className="font-semibold mb-1">{category.name}</h3>
                    <p className="text-xs opacity-80">
                      {category.productCount > 0
                        ? `${category.productCount.toLocaleString()}+ Products`
                        : 'Browse Products'}
                    </p>
                  </div>
                </div>
              </Link>
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
}
