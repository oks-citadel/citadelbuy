'use client';

import * as React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight, ChevronLeft, X, Grid3X3, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useCategoryStore, Category } from '@/stores/category-store';
import { cn } from '@/lib/utils';

interface MobileCategoryMenuProps {
  isOpen: boolean;
  onClose: () => void;
}

export function MobileCategoryMenu({ isOpen, onClose }: MobileCategoryMenuProps) {
  const { categoryTree, fetchCategoryTree, isLoadingTree, searchCategories, searchResults } =
    useCategoryStore();
  const [navigationStack, setNavigationStack] = React.useState<Category[]>([]);
  const [searchQuery, setSearchQuery] = React.useState('');
  const [isSearching, setIsSearching] = React.useState(false);

  const currentCategory = navigationStack[navigationStack.length - 1] || null;
  const currentChildren = currentCategory?.children || categoryTree;

  // Fetch categories on mount
  React.useEffect(() => {
    if (isOpen && categoryTree.length === 0) {
      fetchCategoryTree(3);
    }
  }, [isOpen, categoryTree.length, fetchCategoryTree]);

  // Reset state when closed
  React.useEffect(() => {
    if (!isOpen) {
      setNavigationStack([]);
      setSearchQuery('');
      setIsSearching(false);
    }
  }, [isOpen]);

  // Search handler
  React.useEffect(() => {
    if (searchQuery.trim()) {
      const timer = setTimeout(() => {
        searchCategories(searchQuery);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [searchQuery, searchCategories]);

  const navigateInto = (category: Category) => {
    if (category.children && category.children.length > 0) {
      setNavigationStack((prev) => [...prev, category]);
    }
  };

  const navigateBack = () => {
    setNavigationStack((prev) => prev.slice(0, -1));
  };

  const handleCategoryClick = (category: Category) => {
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-40 md:hidden"
            onClick={onClose}
          />

          {/* Drawer */}
          <motion.div
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed left-0 top-0 bottom-0 w-full max-w-sm bg-background z-50 shadow-xl md:hidden"
          >
            <div className="flex flex-col h-full">
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b">
                {navigationStack.length > 0 ? (
                  <button
                    onClick={navigateBack}
                    className="flex items-center gap-2 text-sm font-medium"
                  >
                    <ChevronLeft className="h-5 w-5" />
                    <span>Back</span>
                  </button>
                ) : (
                  <div className="flex items-center gap-2">
                    <Grid3X3 className="h-5 w-5" />
                    <span className="font-semibold">Categories</span>
                  </div>
                )}
                <Button variant="ghost" size="icon" onClick={onClose}>
                  <X className="h-5 w-5" />
                </Button>
              </div>

              {/* Current Category Title */}
              {currentCategory && (
                <div className="p-4 border-b bg-muted/30">
                  <h2 className="font-semibold">{currentCategory.name}</h2>
                  {currentCategory.description && (
                    <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                      {currentCategory.description}
                    </p>
                  )}
                  <Link
                    href={`/categories/${currentCategory.slug}`}
                    onClick={() => handleCategoryClick(currentCategory)}
                    className="inline-flex items-center text-sm text-primary mt-2 hover:underline"
                  >
                    View All {currentCategory.name}
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Link>
                </div>
              )}

              {/* Search */}
              <div className="p-4 border-b">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="text"
                    placeholder="Search categories..."
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setIsSearching(e.target.value.trim().length > 0);
                    }}
                    className="pl-10"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => {
                        setSearchQuery('');
                        setIsSearching(false);
                      }}
                      className="absolute right-3 top-1/2 -translate-y-1/2"
                    >
                      <X className="h-4 w-4 text-muted-foreground" />
                    </button>
                  )}
                </div>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto">
                {isLoadingTree ? (
                  <div className="p-4 space-y-3">
                    {[...Array(8)].map((_, i) => (
                      <div
                        key={i}
                        className="h-14 bg-muted animate-pulse rounded-lg"
                      />
                    ))}
                  </div>
                ) : isSearching ? (
                  /* Search Results */
                  <div className="py-2">
                    {searchResults.length > 0 ? (
                      searchResults.map((category) => (
                        <Link
                          key={category.id}
                          href={`/categories/${category.slug}`}
                          onClick={() => handleCategoryClick(category)}
                          className="flex items-center gap-3 px-4 py-3 hover:bg-accent transition-colors"
                        >
                          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                            {category.iconUrl ? (
                              <Image
                                src={category.iconUrl}
                                alt=""
                                width={20}
                                height={20}
                              />
                            ) : (
                              <span className="text-sm font-medium text-primary">
                                {category.name[0]}
                              </span>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate">{category.name}</p>
                            {category.productCount > 0 && (
                              <p className="text-xs text-muted-foreground">
                                {category.productCount.toLocaleString()} products
                              </p>
                            )}
                          </div>
                        </Link>
                      ))
                    ) : (
                      <div className="p-8 text-center text-muted-foreground">
                        <p>No categories found</p>
                      </div>
                    )}
                  </div>
                ) : (
                  /* Category List */
                  <div className="py-2">
                    {currentChildren.map((category) => (
                      <MobileCategoryItem
                        key={category.id}
                        category={category}
                        onNavigate={navigateInto}
                        onSelect={() => handleCategoryClick(category)}
                      />
                    ))}
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="p-4 border-t bg-background">
                <Link href="/categories" onClick={onClose}>
                  <Button variant="outline" className="w-full">
                    Browse All Categories
                  </Button>
                </Link>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// Mobile Category Item
function MobileCategoryItem({
  category,
  onNavigate,
  onSelect,
}: {
  category: Category;
  onNavigate: (category: Category) => void;
  onSelect: () => void;
}) {
  const hasChildren = category.children && category.children.length > 0;

  return (
    <div className="flex items-center">
      <Link
        href={`/categories/${category.slug}`}
        onClick={onSelect}
        className="flex-1 flex items-center gap-3 px-4 py-3 hover:bg-accent transition-colors"
      >
        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
          {category.iconUrl ? (
            <Image src={category.iconUrl} alt="" width={20} height={20} />
          ) : category.thumbnailUrl ? (
            <Image
              src={category.thumbnailUrl}
              alt=""
              width={40}
              height={40}
              className="rounded-lg object-cover"
            />
          ) : (
            <span className="text-sm font-medium text-primary">
              {category.name[0]}
            </span>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-medium truncate">{category.name}</p>
          {category.productCount > 0 && (
            <p className="text-xs text-muted-foreground">
              {category.productCount.toLocaleString()} products
            </p>
          )}
        </div>
      </Link>
      {hasChildren && (
        <button
          onClick={() => onNavigate(category)}
          className="p-4 hover:bg-accent transition-colors"
        >
          <ChevronRight className="h-5 w-5 text-muted-foreground" />
        </button>
      )}
    </div>
  );
}
