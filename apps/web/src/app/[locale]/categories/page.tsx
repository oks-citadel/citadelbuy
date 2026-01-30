import { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import { Grid3X3, Sparkles, Package, ChevronRight } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { generateCategoryMetadata } from '@/lib/seo/metadata';
import {
  BreadcrumbSchema,
  CollectionPageJsonLd,
  CategoryHreflang,
} from '@/components/seo';
import { seoConfig } from '@/lib/seo/config';

interface Category {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  image?: string;
  productCount?: number;
  status: string;
  isFeatured: boolean;
  translations?: Array<{ locale: string; name: string; slug: string }>;
}

interface PageProps {
  params: Promise<{
    locale: string;
  }>;
}

// Default category images for when API doesn't provide them
const defaultCategoryImages: Record<string, string> = {
  'electronics': 'https://images.unsplash.com/photo-1498049794561-7780e7231661?w=400',
  'clothing': 'https://images.unsplash.com/photo-1445205170230-053b83016050?w=400',
  'fashion': 'https://images.unsplash.com/photo-1445205170230-053b83016050?w=400',
  'home-garden': 'https://images.unsplash.com/photo-1484154218962-a197022b5858?w=400',
  'home': 'https://images.unsplash.com/photo-1484154218962-a197022b5858?w=400',
  'sports': 'https://images.unsplash.com/photo-1517649763962-0c623066013b?w=400',
  'beauty': 'https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=400',
  'toys': 'https://images.unsplash.com/photo-1558060370-d644479cb6f7?w=400',
  'automotive': 'https://images.unsplash.com/photo-1489824904134-891ab64532f1?w=400',
  'books': 'https://images.unsplash.com/photo-1495446815901-a7297e633e8d?w=400',
  'default': 'https://images.unsplash.com/photo-1472851294608-062f824d29cc?w=400',
};

function getCategoryImage(category: Category): string {
  if (category.image) return category.image;
  return defaultCategoryImages[category.slug] || defaultCategoryImages['default'];
}

// Generate metadata for the page
export async function generateMetadata({ params: paramsPromise }: PageProps): Promise<Metadata> {
  const params = await paramsPromise;
  return generateCategoryMetadata({
    name: 'All Categories',
    description: 'Browse all product categories on Broxiva. Find electronics, fashion, home goods, and more from trusted vendors worldwide.',
    locale: params.locale,
    path: '/categories',
  });
}

// Fetch categories from API
async function getCategories(locale: string): Promise<Category[]> {
  try {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';
    const response = await fetch(`${apiUrl}/categories?locale=${locale}`, {
      next: { revalidate: 3600 }, // Cache for 1 hour
    });

    if (!response.ok) {
      throw new Error('Failed to fetch categories');
    }

    const data = await response.json();
    return data.data || [];
  } catch (error) {
    console.error('Error fetching categories:', error);
    // Return mock data for development
    return [
      { id: '1', name: 'Electronics', slug: 'electronics', description: 'Phones, laptops, and gadgets', productCount: 15420, isFeatured: true, status: 'ACTIVE' },
      { id: '2', name: 'Fashion', slug: 'fashion', description: 'Clothing, shoes, and accessories', productCount: 28650, isFeatured: true, status: 'ACTIVE' },
      { id: '3', name: 'Home & Garden', slug: 'home-garden', description: 'Furniture, decor, and outdoor', productCount: 12380, isFeatured: true, status: 'ACTIVE' },
      { id: '4', name: 'Sports & Outdoors', slug: 'sports', description: 'Sports equipment and outdoor gear', productCount: 8940, isFeatured: false, status: 'ACTIVE' },
      { id: '5', name: 'Beauty & Health', slug: 'beauty', description: 'Cosmetics, skincare, and wellness', productCount: 18720, isFeatured: false, status: 'ACTIVE' },
      { id: '6', name: 'Toys & Games', slug: 'toys', description: 'Toys, games, and hobbies', productCount: 6540, isFeatured: false, status: 'ACTIVE' },
      { id: '7', name: 'Automotive', slug: 'automotive', description: 'Car parts and accessories', productCount: 9870, isFeatured: false, status: 'ACTIVE' },
      { id: '8', name: 'Books & Media', slug: 'books', description: 'Books, music, and movies', productCount: 4320, isFeatured: false, status: 'ACTIVE' },
    ];
  }
}

export default async function CategoriesPage({ params: paramsPromise }: PageProps) {
  const params = await paramsPromise;
  const categories = await getCategories(params.locale);

  const featuredCategories = categories.filter(c => c.isFeatured);
  const regularCategories = categories.filter(c => !c.isFeatured);

  // Calculate total products
  const totalProducts = categories.reduce((sum, c) => sum + (c.productCount || 0), 0);

  // Generate structured data for the collection page
  const collectionPageData = {
    name: 'All Categories',
    description: 'Browse all product categories on Broxiva marketplace',
    url: `${seoConfig.siteUrl}/${params.locale}/categories`,
    mainEntity: {
      itemListElement: categories.map((category, index) => ({
        name: category.name,
        url: `${seoConfig.siteUrl}/${params.locale}/categories/${category.slug}`,
        position: index + 1,
        image: getCategoryImage(category),
      })),
    },
    breadcrumb: [
      { name: 'Home', url: `${seoConfig.siteUrl}/${params.locale}` },
      { name: 'Categories', url: `${seoConfig.siteUrl}/${params.locale}/categories` },
    ],
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* SEO Components */}
      <BreadcrumbSchema
        items={[
          { name: 'Home', url: '/' },
          { name: 'Categories' },
        ]}
        locale={params.locale}
      />
      <CollectionPageJsonLd data={collectionPageData} />
      <CategoryHreflang
        categorySlug="categories"
        tenantLocales={seoConfig.supportedLocales.map(l => l.code)}
      />

      {/* Header */}
      <div className="bg-white border-b">
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center gap-3 mb-2">
            <Grid3X3 className="w-6 h-6 text-primary" />
            <h1 className="text-3xl font-bold text-gray-900">Browse Categories</h1>
          </div>
          <p className="text-gray-600">
            Explore our wide range of products across {categories.length} categories with {totalProducts.toLocaleString()}+ products
          </p>
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
                <Link key={category.id} href={`/${params.locale}/categories/${category.slug}`}>
                  <Card className="group overflow-hidden hover:shadow-lg transition-all duration-300 h-full">
                    <div className="relative h-48 overflow-hidden">
                      <Image
                        src={getCategoryImage(category)}
                        alt={category.name}
                        fill
                        className="object-cover group-hover:scale-105 transition-transform duration-300"
                        sizes="(max-width: 768px) 100vw, 33vw"
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

          {categories.length === 0 ? (
            <div className="text-center py-12">
              <Package className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">No categories available yet.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {(featuredCategories.length > 0 ? regularCategories : categories).map((category) => (
                <Link key={category.id} href={`/${params.locale}/categories/${category.slug}`}>
                  <Card className="group overflow-hidden hover:shadow-lg transition-all duration-300 h-full">
                    <div className="relative h-40 overflow-hidden">
                      <Image
                        src={getCategoryImage(category)}
                        alt={category.name}
                        fill
                        className="object-cover group-hover:scale-105 transition-transform duration-300"
                        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                      />
                    </div>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="font-semibold mb-1">{category.name}</h3>
                          <p className="text-sm text-gray-500">
                            {category.productCount?.toLocaleString() || 0} products
                          </p>
                        </div>
                        <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-primary transition-colors" />
                      </div>
                      {category.description && (
                        <p className="text-xs text-gray-400 mt-2 line-clamp-2">
                          {category.description}
                        </p>
                      )}
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </section>

        {/* SEO Content */}
        <section className="mt-16 prose prose-gray max-w-none">
          <h2>Shop by Category on Broxiva</h2>
          <p>
            Discover millions of products across {categories.length} carefully curated categories on Broxiva,
            Africa's leading B2B e-commerce marketplace. Whether you're looking for electronics, fashion,
            home goods, or industrial supplies, our verified vendors offer competitive wholesale pricing
            with secure payment options and reliable shipping worldwide.
          </p>
          <h3>Why Shop by Category?</h3>
          <ul>
            <li><strong>Easy Navigation:</strong> Find exactly what you need with our organized category structure</li>
            <li><strong>Verified Vendors:</strong> All sellers are verified for quality and reliability</li>
            <li><strong>Competitive Pricing:</strong> Wholesale and bulk pricing available across all categories</li>
            <li><strong>Global Shipping:</strong> Products ship to over 150 countries worldwide</li>
          </ul>
        </section>
      </div>
    </div>
  );
}
