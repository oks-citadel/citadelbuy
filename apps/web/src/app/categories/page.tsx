'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Grid3X3, List, ChevronRight, Search, Sparkles, Package, AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from 'sonner';

interface Category {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  image?: string;
  productCount?: number;
  status: string;
  isFeatured: boolean;
}

// Default category images for when API doesn't provide them
const defaultCategoryImages: Record<string, string> = {
  'electronics': 'https://images.unsplash.com/photo-1498049794561-7780e7231661?w=400',
  'clothing': 'https://images.unsplash.com/photo-1445205170230-053b83016050?w=400',
  'fashion': 'https://images.unsplash.com/photo-1445205170230-053b83016050?w=400',
  'home-garden': 'https://images.unsplash.com/photo-1484154218962-a197022b5858?w=400',
  'home': 'https://images.unsplash.com/photo-1484154218962-a197022b5858?w=400',
  'sports': 'https://images.unsplash.com/photo-1517649763962-0c623066013b?w=400',
  'sports-outdoors': 'https://images.unsplash.com/photo-1517649763962-0c623066013b?w=400',
  'beauty': 'https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=400',
  'toys': 'https://images.unsplash.com/photo-1558060370-d644479cb6f7?w=400',
  'toys-games': 'https://images.unsplash.com/photo-1558060370-d644479cb6f7?w=400',
  'automotive': 'https://images.unsplash.com/photo-1489824904134-891ab64532f1?w=400',
  'books': 'https://images.unsplash.com/photo-1495446815901-a7297e633e8d?w=400',
  'default': 'https://images.unsplash.com/photo-1472851294608-062f824d29cc?w=400',
};

function getCategoryImage(category: Category): string {
  if (category.image) return category.image;
  return defaultCategoryImages[category.slug] || defaultCategoryImages['default'];
}

export default function CategoriesPage() {
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchCategories = async () => {
      setError(null);
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || '/api';
        const res = await fetch(`${apiUrl}/categories`);

        if (!res.ok) {
          throw new Error(`HTTP error! status: ${res.status}`);
        }

        const data = await res.json();
        setCategories(data.data || []);
      } catch (error: any) {
        const errorMessage = error?.message || 'Failed to fetch categories';
        console.error('Failed to fetch categories:', error);
        setError(errorMessage);
        toast.error('Failed to load categories', {
          description: errorMessage,
          action: {
            label: 'Retry',
            onClick: () => window.location.reload(),
          },
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchCategories();
  }, []);

  const filteredCategories = categories.filter(
    category =>
      category.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (category.description?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false)
  );

  const featuredCategories = filteredCategories.filter(c => c.isFeatured);
  const regularCategories = filteredCategories.filter(c => !c.isFeatured);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="bg-white border-b">
          <div className="container mx-auto px-4 py-8">
            <div className="animate-pulse">
              <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2 mb-8"></div>
            </div>
          </div>
        </div>
        <div className="container mx-auto px-4 py-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="bg-gray-200 rounded-lg h-48 mb-4"></div>
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-4 bg-gray-200 rounded w-1/2"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error && categories.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="bg-white border-b">
          <div className="container mx-auto px-4 py-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Browse Categories</h1>
          </div>
        </div>
        <div className="container mx-auto px-4 py-8">
          <Card className="bg-red-50 border-red-200">
            <CardContent className="p-12 text-center">
              <AlertTriangle className="w-16 h-16 text-red-600 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-red-900 mb-2">
                Failed to Load Categories
              </h3>
              <p className="text-red-700 mb-6">{error}</p>
              <Button onClick={() => window.location.reload()} variant="outline">
                <RefreshCw className="w-4 h-4 mr-2" />
                Try Again
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="container mx-auto px-4 py-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Browse Categories</h1>
          <p className="text-gray-600 mb-6">
            Explore our wide range of products across {categories.length} categories
          </p>

          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
            <div className="relative w-full sm:w-96">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                type="text"
                placeholder="Search categories..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant={viewMode === 'grid' ? 'default' : 'outline'}
                size="icon"
                onClick={() => setViewMode('grid')}
              >
                <Grid3X3 className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === 'list' ? 'default' : 'outline'}
                size="icon"
                onClick={() => setViewMode('list')}
              >
                <List className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {/* Featured Categories */}
        {featuredCategories.length > 0 && (
          <section className="mb-12">
            <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-yellow-500" />
              Featured Categories
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {featuredCategories.map((category) => (
                <Link key={category.id} href={`/categories/${category.slug}`}>
                  <Card className="group overflow-hidden hover:shadow-lg transition-all duration-300 h-full">
                    <div className="relative h-48 overflow-hidden">
                      <Image
                        src={getCategoryImage(category)}
                        alt={category.name}
                        fill
                        className="object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
                      <div className="absolute bottom-4 left-4 right-4 text-white">
                        <h3 className="text-xl font-bold mb-1">{category.name}</h3>
                        <p className="text-sm opacity-90">
                          {category.productCount?.toLocaleString() || 0} products
                        </p>
                      </div>
                    </div>
                    <CardContent className="p-4">
                      <p className="text-sm text-gray-600">
                        {category.description || `Browse ${category.name} products`}
                      </p>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* All Categories */}
        <section>
          <h2 className="text-xl font-semibold mb-6">
            {featuredCategories.length > 0 ? 'All Categories' : 'Categories'}
          </h2>

          {filteredCategories.length === 0 ? (
            <div className="text-center py-12">
              {searchQuery ? (
                <>
                  <p className="text-gray-500">No categories found matching &quot;{searchQuery}&quot;</p>
                  <Button variant="link" onClick={() => setSearchQuery('')}>
                    Clear search
                  </Button>
                </>
              ) : (
                <div className="flex flex-col items-center gap-4">
                  <Package className="h-16 w-16 text-gray-300" />
                  <p className="text-gray-500">No categories available yet.</p>
                </div>
              )}
            </div>
          ) : viewMode === 'grid' ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {(featuredCategories.length > 0 ? regularCategories : filteredCategories).map((category) => (
                <Link key={category.id} href={`/categories/${category.slug}`}>
                  <Card className="group overflow-hidden hover:shadow-lg transition-all duration-300 h-full">
                    <div className="relative h-40 overflow-hidden">
                      <Image
                        src={getCategoryImage(category)}
                        alt={category.name}
                        fill
                        className="object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    </div>
                    <CardContent className="p-4">
                      <h3 className="font-semibold mb-1">{category.name}</h3>
                      <p className="text-sm text-gray-500 mb-2">
                        {category.productCount?.toLocaleString() || 0} products
                      </p>
                      {category.description && (
                        <p className="text-xs text-gray-400 line-clamp-2">
                          {category.description}
                        </p>
                      )}
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              {(featuredCategories.length > 0 ? regularCategories : filteredCategories).map((category) => (
                <Link key={category.id} href={`/categories/${category.slug}`}>
                  <Card className="group hover:shadow-lg transition-all duration-300">
                    <CardContent className="p-4 flex items-center gap-6">
                      <div className="relative w-24 h-24 rounded-lg overflow-hidden flex-shrink-0">
                        <Image
                          src={getCategoryImage(category)}
                          alt={category.name}
                          fill
                          className="object-cover"
                        />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-lg mb-1">{category.name}</h3>
                        <p className="text-sm text-gray-600 mb-2">
                          {category.description || `Browse ${category.name} products`}
                        </p>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold text-primary">
                          {category.productCount?.toLocaleString() || 0}
                        </div>
                        <div className="text-sm text-gray-500">products</div>
                        <ChevronRight className="h-5 w-5 text-gray-400 mt-2 group-hover:translate-x-1 transition-transform" />
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
