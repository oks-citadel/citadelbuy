'use client';

import * as React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

const categories = [
  {
    name: 'Electronics',
    image: '/categories/electronics.jpg',
    href: '/categories/electronics',
    count: '2.5K+ Products',
    color: 'from-blue-500/20 to-cyan-500/20',
  },
  {
    name: 'Fashion',
    image: '/categories/fashion.jpg',
    href: '/categories/fashion',
    count: '5K+ Products',
    color: 'from-pink-500/20 to-rose-500/20',
  },
  {
    name: 'Home & Garden',
    image: '/categories/home.jpg',
    href: '/categories/home-garden',
    count: '3K+ Products',
    color: 'from-green-500/20 to-emerald-500/20',
  },
  {
    name: 'Beauty',
    image: '/categories/beauty.jpg',
    href: '/categories/beauty',
    count: '1.8K+ Products',
    color: 'from-purple-500/20 to-violet-500/20',
  },
  {
    name: 'Sports',
    image: '/categories/sports.jpg',
    href: '/categories/sports',
    count: '2K+ Products',
    color: 'from-orange-500/20 to-amber-500/20',
  },
  {
    name: 'Toys & Games',
    image: '/categories/toys.jpg',
    href: '/categories/toys',
    count: '1.2K+ Products',
    color: 'from-yellow-500/20 to-lime-500/20',
  },
];

export function FeaturedCategories() {
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
        {categories.map((category, index) => (
          <motion.div
            key={category.name}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <Link href={category.href}>
              <div
                className={cn(
                  'group relative overflow-hidden rounded-xl aspect-square',
                  'bg-gradient-to-br',
                  category.color
                )}
              >
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
                <Image
                  src={category.image}
                  alt={category.name}
                  fill
                  sizes="(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 16vw"
                  className="object-cover transition-transform duration-500 group-hover:scale-110"
                />
                <div className="absolute bottom-0 left-0 right-0 p-4 text-white">
                  <h3 className="font-semibold mb-1">{category.name}</h3>
                  <p className="text-xs opacity-80">{category.count}</p>
                </div>
              </div>
            </Link>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
