'use client';

import * as React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight, Grid3X3, Sparkles, TrendingUp } from 'lucide-react';
import { useCategoryStore, Category } from '@/stores/category-store';
import { cn } from '@/lib/utils';

interface MegaMenuProps {
  className?: string;
}

export function MegaMenu({ className }: MegaMenuProps) {
  const {
    categoryTree,
    featuredCategories,
    isLoadingTree,
    isMegaMenuOpen,
    activeMegaMenuCategory,
    setMegaMenuOpen,
    setActiveMegaMenuCategory,
    fetchCategoryTree,
    fetchFeaturedCategories,
  } = useCategoryStore();

  const menuRef = React.useRef<HTMLDivElement>(null);

  // Fetch data on mount
  React.useEffect(() => {
    if (categoryTree.length === 0) {
      fetchCategoryTree(3);
    }
    if (featuredCategories.length === 0) {
      fetchFeaturedCategories(6);
    }
  }, [categoryTree.length, featuredCategories.length, fetchCategoryTree, fetchFeaturedCategories]);

  // Close menu on click outside
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMegaMenuOpen(false);
      }
    };

    if (isMegaMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isMegaMenuOpen, setMegaMenuOpen]);

  // Close on escape
  React.useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setMegaMenuOpen(false);
      }
    };

    if (isMegaMenuOpen) {
      document.addEventListener('keydown', handleEscape);
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isMegaMenuOpen, setMegaMenuOpen]);

  const activeCategory = categoryTree.find((cat) => cat.id === activeMegaMenuCategory);

  return (
    <div ref={menuRef} className={cn('relative', className)}>
      {/* Trigger Button */}
      <button
        onClick={() => setMegaMenuOpen(!isMegaMenuOpen)}
        onMouseEnter={() => setMegaMenuOpen(true)}
        className={cn(
          'flex items-center gap-2 px-4 py-2 rounded-lg transition-colors',
          'hover:bg-accent text-sm font-medium',
          isMegaMenuOpen && 'bg-accent'
        )}
      >
        <Grid3X3 className="h-4 w-4" />
        <span>Categories</span>
        <ChevronRight
          className={cn(
            'h-4 w-4 transition-transform',
            isMegaMenuOpen && 'rotate-90'
          )}
        />
      </button>

      {/* Mega Menu Dropdown */}
      <AnimatePresence>
        {isMegaMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            transition={{ duration: 0.2 }}
            className="absolute left-0 top-full mt-2 w-[900px] max-w-[calc(100vw-2rem)] bg-background rounded-xl border shadow-2xl z-50 overflow-hidden"
            onMouseLeave={() => setMegaMenuOpen(false)}
          >
            <div className="flex">
              {/* Left Column - Main Categories */}
              <div className="w-64 border-r bg-muted/30 py-2">
                <div className="px-4 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  All Categories
                </div>
                {isLoadingTree ? (
                  <div className="p-4 space-y-2">
                    {[...Array(8)].map((_, i) => (
                      <div key={i} className="h-8 bg-muted animate-pulse rounded" />
                    ))}
                  </div>
                ) : (
                  <div className="max-h-[400px] overflow-y-auto">
                    {categoryTree.map((category) => (
                      <button
                        key={category.id}
                        onMouseEnter={() => setActiveMegaMenuCategory(category.id)}
                        onClick={() => {
                          setMegaMenuOpen(false);
                        }}
                        className={cn(
                          'w-full flex items-center justify-between px-4 py-2.5 text-sm transition-colors',
                          'hover:bg-accent group',
                          activeMegaMenuCategory === category.id && 'bg-accent'
                        )}
                      >
                        <span className="flex items-center gap-3">
                          {category.iconUrl ? (
                            <Image
                              src={category.iconUrl}
                              alt=""
                              width={20}
                              height={20}
                              className="opacity-70 group-hover:opacity-100"
                            />
                          ) : (
                            <span className="w-5 h-5 rounded bg-primary/10 flex items-center justify-center text-xs text-primary">
                              {category.name[0]}
                            </span>
                          )}
                          <span>{category.name}</span>
                        </span>
                        {category.children && category.children.length > 0 && (
                          <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Right Column - Subcategories & Content */}
              <div className="flex-1 p-6">
                {activeCategory ? (
                  <div>
                    {/* Category Header */}
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h3 className="font-semibold text-lg">{activeCategory.name}</h3>
                        {activeCategory.description && (
                          <p className="text-sm text-muted-foreground mt-1">
                            {activeCategory.description}
                          </p>
                        )}
                      </div>
                      <Link
                        href={`/categories/${activeCategory.slug}`}
                        onClick={() => setMegaMenuOpen(false)}
                        className="text-sm text-primary hover:underline flex items-center"
                      >
                        View All
                        <ChevronRight className="h-4 w-4 ml-1" />
                      </Link>
                    </div>

                    {/* Subcategories Grid */}
                    {activeCategory.children && activeCategory.children.length > 0 && (
                      <div className="grid grid-cols-3 gap-x-8 gap-y-4">
                        {activeCategory.children.map((subcat) => (
                          <div key={subcat.id}>
                            <Link
                              href={`/categories/${subcat.slug}`}
                              onClick={() => setMegaMenuOpen(false)}
                              className="font-medium text-sm hover:text-primary transition-colors block mb-2"
                            >
                              {subcat.name}
                            </Link>
                            {subcat.children && subcat.children.length > 0 && (
                              <ul className="space-y-1">
                                {subcat.children.slice(0, 5).map((item) => (
                                  <li key={item.id}>
                                    <Link
                                      href={`/categories/${item.slug}`}
                                      onClick={() => setMegaMenuOpen(false)}
                                      className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                                    >
                                      {item.name}
                                    </Link>
                                  </li>
                                ))}
                                {subcat.children.length > 5 && (
                                  <li>
                                    <Link
                                      href={`/categories/${subcat.slug}`}
                                      onClick={() => setMegaMenuOpen(false)}
                                      className="text-sm text-primary hover:underline"
                                    >
                                      +{subcat.children.length - 5} more
                                    </Link>
                                  </li>
                                )}
                              </ul>
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Category Banner */}
                    {activeCategory.bannerImageUrl && (
                      <div className="mt-6 relative h-32 rounded-lg overflow-hidden">
                        <Image
                          src={activeCategory.bannerImageUrl}
                          alt={activeCategory.name}
                          fill
                          className="object-cover"
                        />
                        <div className="absolute inset-0 bg-gradient-to-r from-black/60 to-transparent flex items-center">
                          <div className="p-4 text-white">
                            <p className="text-sm opacity-80">Explore</p>
                            <p className="font-semibold">{activeCategory.name}</p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  /* Default Content - Featured Categories */
                  <div>
                    <div className="flex items-center gap-2 mb-4">
                      <Sparkles className="h-5 w-5 text-primary" />
                      <h3 className="font-semibold">Featured Categories</h3>
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                      {featuredCategories.slice(0, 6).map((category) => (
                        <Link
                          key={category.id}
                          href={`/categories/${category.slug}`}
                          onClick={() => setMegaMenuOpen(false)}
                          className="group relative aspect-[4/3] rounded-lg overflow-hidden"
                        >
                          {category.thumbnailUrl || category.bannerImageUrl ? (
                            <Image
                              src={category.thumbnailUrl || category.bannerImageUrl!}
                              alt={category.name}
                              fill
                              className="object-cover transition-transform group-hover:scale-105"
                            />
                          ) : (
                            <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-primary/40" />
                          )}
                          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                          <div className="absolute bottom-0 left-0 right-0 p-3 text-white">
                            <p className="font-medium text-sm">{category.name}</p>
                            {category.productCount > 0 && (
                              <p className="text-xs opacity-80">
                                {category.productCount.toLocaleString()} products
                              </p>
                            )}
                          </div>
                        </Link>
                      ))}
                    </div>

                    {/* Trending Now */}
                    <div className="mt-6 pt-4 border-t">
                      <div className="flex items-center gap-2 mb-3">
                        <TrendingUp className="h-4 w-4 text-orange-500" />
                        <span className="text-sm font-medium">Trending Now</span>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {categoryTree
                          .flatMap((c) => c.children || [])
                          .slice(0, 8)
                          .map((cat) => (
                            <Link
                              key={cat.id}
                              href={`/categories/${cat.slug}`}
                              onClick={() => setMegaMenuOpen(false)}
                              className="px-3 py-1.5 bg-muted rounded-full text-xs hover:bg-accent transition-colors"
                            >
                              {cat.name}
                            </Link>
                          ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Bottom Bar */}
            <div className="border-t bg-muted/30 px-6 py-3 flex items-center justify-between">
              <Link
                href="/categories"
                onClick={() => setMegaMenuOpen(false)}
                className="text-sm text-primary hover:underline flex items-center"
              >
                Browse All Categories
                <ChevronRight className="h-4 w-4 ml-1" />
              </Link>
              <span className="text-xs text-muted-foreground">
                {categoryTree.length} main categories
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
