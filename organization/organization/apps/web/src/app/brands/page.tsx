'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Search, Star, ChevronRight } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';

interface Brand {
  id: string;
  name: string;
  logo: string;
  category: string;
  productCount: number;
  rating: number;
  featured?: boolean;
}

const brands: Brand[] = [
  { id: 'apple', name: 'Apple', logo: 'https://upload.wikimedia.org/wikipedia/commons/f/fa/Apple_logo_black.svg', category: 'Electronics', productCount: 234, rating: 4.9, featured: true },
  { id: 'samsung', name: 'Samsung', logo: 'https://upload.wikimedia.org/wikipedia/commons/2/24/Samsung_Logo.svg', category: 'Electronics', productCount: 456, rating: 4.7, featured: true },
  { id: 'nike', name: 'Nike', logo: 'https://upload.wikimedia.org/wikipedia/commons/a/a6/Logo_NIKE.svg', category: 'Sports', productCount: 892, rating: 4.8, featured: true },
  { id: 'adidas', name: 'Adidas', logo: 'https://upload.wikimedia.org/wikipedia/commons/2/20/Adidas_Logo.svg', category: 'Sports', productCount: 756, rating: 4.7 },
  { id: 'sony', name: 'Sony', logo: 'https://upload.wikimedia.org/wikipedia/commons/c/ca/Sony_logo.svg', category: 'Electronics', productCount: 345, rating: 4.6 },
  { id: 'lg', name: 'LG', logo: 'https://upload.wikimedia.org/wikipedia/commons/2/20/LG_symbol.svg', category: 'Electronics', productCount: 289, rating: 4.5 },
  { id: 'dyson', name: 'Dyson', logo: 'https://upload.wikimedia.org/wikipedia/commons/1/1e/Dyson_logo.svg', category: 'Home', productCount: 87, rating: 4.8 },
  { id: 'loreal', name: "L'Oreal", logo: 'https://upload.wikimedia.org/wikipedia/commons/9/9d/L%27Or%C3%A9al_logo.svg', category: 'Beauty', productCount: 432, rating: 4.6 },
  { id: 'estee-lauder', name: 'Estee Lauder', logo: 'https://upload.wikimedia.org/wikipedia/commons/f/f1/Estee_Lauder_Companies_logo.svg', category: 'Beauty', productCount: 321, rating: 4.7 },
  { id: 'canon', name: 'Canon', logo: 'https://upload.wikimedia.org/wikipedia/commons/0/0a/Canon_wordmark.svg', category: 'Electronics', productCount: 178, rating: 4.6 },
  { id: 'jbl', name: 'JBL', logo: 'https://upload.wikimedia.org/wikipedia/commons/1/1e/JBL_logo.svg', category: 'Electronics', productCount: 134, rating: 4.5 },
  { id: 'north-face', name: 'The North Face', logo: 'https://upload.wikimedia.org/wikipedia/commons/1/10/The_North_Face_logo.svg', category: 'Sports', productCount: 234, rating: 4.7 },
];

const categories = ['All', 'Electronics', 'Sports', 'Beauty', 'Home', 'Fashion'];

export default function BrandsPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');

  const filteredBrands = brands.filter(brand => {
    const matchesSearch = brand.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'All' || brand.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const featuredBrands = filteredBrands.filter(b => b.featured);
  const regularBrands = filteredBrands.filter(b => !b.featured);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="container mx-auto px-4 py-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Shop by Brand</h1>
          <p className="text-gray-600 mb-6">
            Discover products from your favorite brands
          </p>

          {/* Search and Filter */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                type="text"
                placeholder="Search brands..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex gap-2 overflow-x-auto pb-2 sm:pb-0">
              {categories.map(cat => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                    selectedCategory === cat
                      ? 'bg-primary text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {/* Featured Brands */}
        {featuredBrands.length > 0 && (
          <section className="mb-12">
            <h2 className="text-xl font-semibold mb-6">Featured Brands</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {featuredBrands.map((brand) => (
                <Link key={brand.id} href={`/products?brand=${brand.id}`}>
                  <Card className="group hover:shadow-lg transition-all duration-300 overflow-hidden">
                    <CardContent className="p-6">
                      <div className="flex items-center gap-4 mb-4">
                        <div className="w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center p-2">
                          <Image
                            src={brand.logo}
                            alt={brand.name}
                            width={48}
                            height={48}
                            className="object-contain"
                          />
                        </div>
                        <div>
                          <h3 className="font-bold text-lg">{brand.name}</h3>
                          <Badge variant="secondary">{brand.category}</Badge>
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1">
                          <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                          <span className="font-medium">{brand.rating}</span>
                        </div>
                        <span className="text-sm text-gray-500">
                          {brand.productCount} products
                        </span>
                        <ChevronRight className="h-5 w-5 text-gray-400 group-hover:text-primary transition-colors" />
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* All Brands */}
        <section>
          <h2 className="text-xl font-semibold mb-6">All Brands</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {regularBrands.map((brand) => (
              <Link key={brand.id} href={`/products?brand=${brand.id}`}>
                <Card className="group hover:shadow-md transition-all duration-300 h-full">
                  <CardContent className="p-4 text-center">
                    <div className="w-12 h-12 bg-gray-100 rounded-lg mx-auto mb-3 flex items-center justify-center p-2">
                      <Image
                        src={brand.logo}
                        alt={brand.name}
                        width={32}
                        height={32}
                        className="object-contain"
                      />
                    </div>
                    <h3 className="font-medium text-sm mb-1 group-hover:text-primary transition-colors">
                      {brand.name}
                    </h3>
                    <p className="text-xs text-gray-500">{brand.productCount} products</p>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </section>

        {filteredBrands.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500">No brands found matching your search</p>
          </div>
        )}
      </div>
    </div>
  );
}
