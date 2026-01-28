'use client';

import { motion, useReducedMotion, useInView } from 'framer-motion';
import { useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * FeaturedCategories Component
 *
 * Marketplace activity proof section showing featured categories
 * with gradient accents (not full-card gradients)
 */

interface Category {
  id: string;
  name: string;
  description: string;
  image: string;
  productCount: number;
  href: string;
}

const defaultCategories: Category[] = [
  {
    id: 'electronics',
    name: 'Electronics',
    description: 'Latest gadgets & tech',
    image: '/images/categories/electronics.svg',
    productCount: 1250,
    href: '/categories/electronics',
  },
  {
    id: 'fashion',
    name: 'Fashion',
    description: 'Trending styles & apparel',
    image: '/images/categories/fashion.svg',
    productCount: 3420,
    href: '/categories/fashion',
  },
  {
    id: 'home-living',
    name: 'Home & Living',
    description: 'Furniture & decor',
    image: '/images/categories/home.svg',
    productCount: 890,
    href: '/categories/home-living',
  },
  {
    id: 'beauty',
    name: 'Beauty',
    description: 'Skincare & cosmetics',
    image: '/images/categories/beauty.svg',
    productCount: 1780,
    href: '/categories/beauty',
  },
  {
    id: 'sports',
    name: 'Sports & Outdoors',
    description: 'Gear & equipment',
    image: '/images/categories/sports.svg',
    productCount: 650,
    href: '/categories/sports',
  },
  {
    id: 'handmade',
    name: 'Handmade',
    description: 'Artisan crafts & unique finds',
    image: '/images/categories/handmade.svg',
    productCount: 420,
    href: '/categories/handmade',
  },
];

interface CategoryCardProps {
  category: Category;
  index: number;
  reducedMotion: boolean | null;
  inView: boolean;
}

const CategoryCard: React.FC<CategoryCardProps> = ({
  category,
  index,
  reducedMotion,
  inView,
}) => {
  return (
    <motion.div
      initial={reducedMotion ? {} : { opacity: 0, y: 20 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.5, delay: index * 0.1 }}
    >
      <Link
        href={category.href}
        className={cn(
          'group block relative overflow-hidden rounded-xl',
          'bg-white border border-neutral-100',
          'shadow-sm hover:shadow-lg transition-all duration-300',
          'card-gradient-outline'
        )}
      >
        {/* Image */}
        <div className="relative aspect-[4/3] overflow-hidden">
          <Image
            src={category.image}
            alt={category.name}
            fill
            className={cn(
              'object-cover transition-transform duration-500',
              !reducedMotion && 'group-hover:scale-105'
            )}
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          />
          {/* Gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />

          {/* Product count badge */}
          <div className="absolute top-3 right-3 badge-gradient-gold px-2.5 py-1 rounded-full text-xs font-medium">
            {category.productCount.toLocaleString()} items
          </div>
        </div>

        {/* Content */}
        <div className="p-4">
          <h3 className="font-semibold text-neutral-900 mb-1 group-hover:text-primary-700 transition-colors">
            {category.name}
          </h3>
          <p className="text-sm text-neutral-600 mb-3">{category.description}</p>

          {/* Link indicator */}
          <div
            className={cn(
              'inline-flex items-center gap-1 text-sm font-medium',
              'text-primary-600 group-hover:text-accent-600',
              'transition-colors duration-300'
            )}
          >
            Explore
            <ArrowRight
              className={cn(
                'w-4 h-4 transition-transform duration-300',
                !reducedMotion && 'group-hover:translate-x-1'
              )}
            />
          </div>
        </div>

        {/* Bottom gradient accent line */}
        <div
          className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-primary-600 via-accent-500 to-primary-600 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-500 origin-left"
          aria-hidden="true"
        />
      </Link>
    </motion.div>
  );
};

interface FeaturedCategoriesProps {
  categories?: Category[];
  className?: string;
}

export const FeaturedCategories: React.FC<FeaturedCategoriesProps> = ({
  categories = defaultCategories,
  className,
}) => {
  const prefersReducedMotion = useReducedMotion();
  const sectionRef = useRef<HTMLElement>(null);
  const isInView = useInView(sectionRef, { once: true, margin: '-100px' });

  return (
    <section
      ref={sectionRef}
      className={cn('py-16 lg:py-24', className)}
      aria-labelledby="categories-title"
    >
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <motion.div
          className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-10"
          initial={prefersReducedMotion ? {} : { opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5 }}
        >
          <div>
            <h2
              id="categories-title"
              className="text-3xl sm:text-4xl font-bold text-neutral-900 mb-2"
            >
              Shop by Category
            </h2>
            <p className="text-lg text-neutral-600">
              Discover quality products from verified vendors
            </p>
          </div>

          <Link
            href="/categories"
            className={cn(
              'inline-flex items-center gap-2 px-4 py-2 rounded-lg',
              'text-sm font-medium text-primary-600',
              'border border-primary-200 hover:bg-primary-50',
              'transition-colors duration-300'
            )}
          >
            View All Categories
            <ArrowRight className="w-4 h-4" />
          </Link>
        </motion.div>

        {/* Categories Grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {categories.slice(0, 6).map((category, index) => (
            <CategoryCard
              key={category.id}
              category={category}
              index={index}
              reducedMotion={prefersReducedMotion}
              inView={isInView}
            />
          ))}
        </div>
      </div>
    </section>
  );
};

export default FeaturedCategories;
