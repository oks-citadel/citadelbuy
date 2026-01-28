'use client';

import * as React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { ChevronRight, ArrowRight } from 'lucide-react';
import { Category } from '@/stores/category-store';
import { cn } from '@/lib/utils';

interface CategoryGridProps {
  categories: Category[];
  title?: string;
  subtitle?: string;
  viewAllLink?: string;
  columns?: 2 | 3 | 4 | 6;
  variant?: 'default' | 'compact' | 'card' | 'banner';
  showProductCount?: boolean;
  showDescription?: boolean;
  className?: string;
}

// Gradient colors for categories without images
const gradients = [
  'from-blue-500/20 to-cyan-500/20',
  'from-pink-500/20 to-rose-500/20',
  'from-green-500/20 to-emerald-500/20',
  'from-purple-500/20 to-violet-500/20',
  'from-orange-500/20 to-amber-500/20',
  'from-yellow-500/20 to-lime-500/20',
  'from-teal-500/20 to-cyan-500/20',
  'from-indigo-500/20 to-blue-500/20',
  'from-red-500/20 to-pink-500/20',
  'from-emerald-500/20 to-green-500/20',
];

export function CategoryGrid({
  categories,
  title,
  subtitle,
  viewAllLink,
  columns = 6,
  variant = 'default',
  showProductCount = true,
  showDescription = false,
  className,
}: CategoryGridProps) {
  const gridCols = {
    2: 'grid-cols-1 sm:grid-cols-2',
    3: 'grid-cols-2 md:grid-cols-3',
    4: 'grid-cols-2 md:grid-cols-4',
    6: 'grid-cols-2 md:grid-cols-3 lg:grid-cols-6',
  };

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.05 },
    },
  };

  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 },
  };

  return (
    <div className={className}>
      {/* Header */}
      {(title || viewAllLink) && (
        <div className="flex items-center justify-between mb-6">
          <div>
            {title && <h2 className="text-2xl font-bold">{title}</h2>}
            {subtitle && (
              <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>
            )}
          </div>
          {viewAllLink && (
            <Link
              href={viewAllLink}
              className="text-sm text-primary hover:underline flex items-center"
            >
              View All
              <ChevronRight className="h-4 w-4 ml-1" />
            </Link>
          )}
        </div>
      )}

      {/* Grid */}
      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className={cn('grid gap-4', gridCols[columns])}
      >
        {categories.map((category, index) => (
          <motion.div key={category.id} variants={item}>
            {variant === 'default' && (
              <CategoryCardDefault
                category={category}
                gradient={gradients[index % gradients.length]}
                showProductCount={showProductCount}
              />
            )}
            {variant === 'compact' && (
              <CategoryCardCompact
                category={category}
                showProductCount={showProductCount}
              />
            )}
            {variant === 'card' && (
              <CategoryCardStyled
                category={category}
                gradient={gradients[index % gradients.length]}
                showProductCount={showProductCount}
                showDescription={showDescription}
              />
            )}
            {variant === 'banner' && (
              <CategoryBanner
                category={category}
                gradient={gradients[index % gradients.length]}
              />
            )}
          </motion.div>
        ))}
      </motion.div>
    </div>
  );
}

// Default Category Card (Image with overlay)
function CategoryCardDefault({
  category,
  gradient,
  showProductCount,
}: {
  category: Category;
  gradient: string;
  showProductCount: boolean;
}) {
  return (
    <Link href={`/categories/${category.slug}`}>
      <div
        className={cn(
          'group relative overflow-hidden rounded-xl aspect-square',
          'bg-gradient-to-br',
          gradient
        )}
      >
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent z-10" />
        {(category.thumbnailUrl || category.bannerImageUrl) ? (
          <Image
            src={category.thumbnailUrl || category.bannerImageUrl!}
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
              <span className="text-6xl font-bold opacity-10">
                {category.name[0]}
              </span>
            )}
          </div>
        )}
        <div className="absolute bottom-0 left-0 right-0 p-4 text-white z-20">
          <h3 className="font-semibold mb-1 group-hover:text-primary-foreground transition-colors">
            {category.name}
          </h3>
          {showProductCount && category.productCount > 0 && (
            <p className="text-xs opacity-80">
              {category.productCount.toLocaleString()} products
            </p>
          )}
        </div>
      </div>
    </Link>
  );
}

// Compact Category Card (Icon + Text)
function CategoryCardCompact({
  category,
  showProductCount,
}: {
  category: Category;
  showProductCount: boolean;
}) {
  return (
    <Link href={`/categories/${category.slug}`}>
      <div className="group flex items-center gap-3 p-3 rounded-lg border bg-card hover:bg-accent transition-colors">
        <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
          {category.iconUrl ? (
            <Image
              src={category.iconUrl}
              alt=""
              width={24}
              height={24}
              className="group-hover:scale-110 transition-transform"
            />
          ) : (
            <span className="text-lg font-bold text-primary">
              {category.name[0]}
            </span>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-medium text-sm truncate group-hover:text-primary transition-colors">
            {category.name}
          </h3>
          {showProductCount && category.productCount > 0 && (
            <p className="text-xs text-muted-foreground">
              {category.productCount.toLocaleString()} items
            </p>
          )}
        </div>
        <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
      </div>
    </Link>
  );
}

// Styled Card (With description)
function CategoryCardStyled({
  category,
  gradient,
  showProductCount,
  showDescription,
}: {
  category: Category;
  gradient: string;
  showProductCount: boolean;
  showDescription: boolean;
}) {
  return (
    <Link href={`/categories/${category.slug}`}>
      <div className="group rounded-xl border bg-card overflow-hidden hover:shadow-lg transition-shadow">
        <div
          className={cn(
            'relative aspect-[16/9] bg-gradient-to-br',
            gradient
          )}
        >
          {(category.thumbnailUrl || category.bannerImageUrl) ? (
            <Image
              src={category.thumbnailUrl || category.bannerImageUrl!}
              alt={category.name}
              fill
              className="object-cover group-hover:scale-105 transition-transform duration-500"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-4xl font-bold opacity-20">
                {category.name[0]}
              </span>
            </div>
          )}
        </div>
        <div className="p-4">
          <h3 className="font-semibold group-hover:text-primary transition-colors">
            {category.name}
          </h3>
          {showDescription && category.description && (
            <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
              {category.description}
            </p>
          )}
          <div className="flex items-center justify-between mt-3">
            {showProductCount && category.productCount > 0 && (
              <span className="text-xs text-muted-foreground">
                {category.productCount.toLocaleString()} products
              </span>
            )}
            <span className="text-sm text-primary flex items-center group-hover:underline">
              Shop Now
              <ArrowRight className="h-3 w-3 ml-1 group-hover:translate-x-1 transition-transform" />
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}

// Banner Style Category
function CategoryBanner({
  category,
  gradient,
}: {
  category: Category;
  gradient: string;
}) {
  return (
    <Link href={`/categories/${category.slug}`}>
      <div
        className={cn(
          'group relative overflow-hidden rounded-xl h-48',
          'bg-gradient-to-br',
          gradient
        )}
      >
        <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/30 to-transparent z-10" />
        {(category.thumbnailUrl || category.bannerImageUrl) && (
          <Image
            src={category.thumbnailUrl || category.bannerImageUrl!}
            alt={category.name}
            fill
            className="object-cover transition-transform duration-700 group-hover:scale-110"
          />
        )}
        <div className="absolute inset-0 z-20 flex flex-col justify-center p-6 text-white">
          <span className="text-sm opacity-80 mb-1">Explore</span>
          <h3 className="text-2xl font-bold mb-2">{category.name}</h3>
          {category.description && (
            <p className="text-sm opacity-80 line-clamp-2 max-w-md mb-4">
              {category.description}
            </p>
          )}
          <span className="inline-flex items-center text-sm font-medium group-hover:underline">
            Shop Collection
            <ArrowRight className="h-4 w-4 ml-2 group-hover:translate-x-2 transition-transform" />
          </span>
        </div>
      </div>
    </Link>
  );
}
