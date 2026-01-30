import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { ChevronRight, Filter, SortAsc, Grid3X3, List, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { generateCategoryMetadata } from '@/lib/seo/metadata';
import {
  BreadcrumbSchema,
  generateCategoryBreadcrumbs,
  CategoryHreflang,
  CategoryFAQSchema,
} from '@/components/seo';
import { CollectionPageJsonLd } from '@/lib/seo/json-ld';
import { seoConfig } from '@/lib/seo/config';

interface Category {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  image?: string;
  productCount?: number;
  parentCategory?: {
    name: string;
    slug: string;
  };
  subcategories?: Array<{
    id: string;
    name: string;
    slug: string;
    productCount?: number;
  }>;
  translations?: Array<{ locale: string; name: string; slug: string; description?: string }>;
}

interface Product {
  id: string;
  name: string;
  slug: string;
  price: number;
  originalPrice?: number;
  currency: string;
  image: string;
  rating?: number;
  reviewCount?: number;
  vendor?: string;
}

interface PageProps {
  params: Promise<{
    locale: string;
    slug: string;
  }>;
  searchParams: Promise<{
    page?: string;
    sort?: string;
    minPrice?: string;
    maxPrice?: string;
  }>;
}

// Fetch category from API
async function getCategory(slug: string, locale: string): Promise<Category | null> {
  try {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';
    const response = await fetch(`${apiUrl}/categories/${slug}?locale=${locale}`, {
      next: { revalidate: 3600 },
    });

    if (!response.ok) {
      if (response.status === 404) return null;
      throw new Error('Failed to fetch category');
    }

    const data = await response.json();
    return data.data || null;
  } catch (error) {
    console.error('Error fetching category:', error);
    // Return mock data for development
    return {
      id: '1',
      name: 'Electronics',
      slug: 'electronics',
      description: 'Discover the latest in electronics including smartphones, laptops, tablets, and accessories from top brands worldwide.',
      productCount: 15420,
      subcategories: [
        { id: '1-1', name: 'Smartphones', slug: 'smartphones', productCount: 3240 },
        { id: '1-2', name: 'Laptops', slug: 'laptops', productCount: 2180 },
        { id: '1-3', name: 'Tablets', slug: 'tablets', productCount: 1560 },
        { id: '1-4', name: 'Accessories', slug: 'accessories', productCount: 8440 },
      ],
    };
  }
}

// Fetch products in category
async function getCategoryProducts(
  slug: string,
  locale: string,
  page: number = 1,
  sort?: string
): Promise<{ products: Product[]; total: number }> {
  try {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';
    const response = await fetch(
      `${apiUrl}/products?category=${slug}&locale=${locale}&page=${page}&limit=24&sort=${sort || 'popular'}`,
      { next: { revalidate: 300 } }
    );

    if (!response.ok) {
      throw new Error('Failed to fetch products');
    }

    const data = await response.json();
    return { products: data.data || [], total: data.total || 0 };
  } catch (error) {
    console.error('Error fetching products:', error);
    // Return mock data
    return {
      products: [
        { id: '1', name: 'Wireless Headphones Pro', slug: 'wireless-headphones-pro', price: 199.99, currency: 'USD', image: '/products/headphones.jpg', rating: 4.5, reviewCount: 234 },
        { id: '2', name: 'Smart Watch Series X', slug: 'smart-watch-series-x', price: 299.99, currency: 'USD', image: '/products/watch.jpg', rating: 4.8, reviewCount: 567 },
        { id: '3', name: 'Portable Charger 20000mAh', slug: 'portable-charger-20000', price: 49.99, currency: 'USD', image: '/products/charger.jpg', rating: 4.3, reviewCount: 189 },
        { id: '4', name: 'Bluetooth Speaker Mini', slug: 'bluetooth-speaker-mini', price: 79.99, currency: 'USD', image: '/products/speaker.jpg', rating: 4.6, reviewCount: 345 },
      ],
      total: 100,
    };
  }
}

// Generate metadata
export async function generateMetadata({ params: paramsPromise }: PageProps): Promise<Metadata> {
  const params = await paramsPromise;
  const category = await getCategory(params.slug, params.locale);

  if (!category) {
    return {};
  }

  // Get localized content
  const translation = category.translations?.find((t) => t.locale === params.locale);
  const name = translation?.name || category.name;
  const description = translation?.description || category.description || `Browse ${name} products on Broxiva`;

  return generateCategoryMetadata({
    name,
    description,
    image: category.image,
    productCount: category.productCount,
    locale: params.locale,
    path: `/categories/${params.slug}`,
    parentCategory: category.parentCategory?.name,
  });
}

export default async function CategoryPage({ params: paramsPromise, searchParams: searchParamsPromise }: PageProps) {
  const params = await paramsPromise;
  const searchParams = await searchParamsPromise;
  const category = await getCategory(params.slug, params.locale);

  if (!category) {
    notFound();
  }

  const page = parseInt(searchParams.page || '1', 10);
  const { products, total } = await getCategoryProducts(
    params.slug,
    params.locale,
    page,
    searchParams.sort
  );

  const totalPages = Math.ceil(total / 24);

  // Get localized content
  const translation = category.translations?.find((t) => t.locale === params.locale);
  const name = translation?.name || category.name;
  const description = translation?.description || category.description;

  // Generate breadcrumbs
  const breadcrumbs = generateCategoryBreadcrumbs(
    category.parentCategory
      ? [{ name: category.parentCategory.name, slug: category.parentCategory.slug }]
      : [],
  );
  breadcrumbs.push({ name });

  // Format price
  const formatPrice = (price: number, currency: string) => {
    return new Intl.NumberFormat(params.locale, {
      style: 'currency',
      currency,
    }).format(price);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* SEO Components */}
      <BreadcrumbSchema items={breadcrumbs} locale={params.locale} />
      <CategoryHreflang
        categorySlug={params.slug}
        translations={category.translations}
      />
      <CollectionPageJsonLd
        data={{
          name,
          description: description || `Shop ${name}`,
          url: `${seoConfig.siteUrl}/${params.locale}/categories/${params.slug}`,
          mainEntity: {
            itemListElement: products.slice(0, 10).map((p, i) => ({
              name: p.name,
              url: `${seoConfig.siteUrl}/${params.locale}/products/${p.slug}`,
              position: i + 1,
              image: p.image,
            })),
          },
          breadcrumb: breadcrumbs.map((b, i) => ({
            name: b.name,
            url: b.url || `${seoConfig.siteUrl}/${params.locale}/categories`,
          })),
        }}
      />
      <CategoryFAQSchema categoryName={name} items={[]} />

      {/* Header */}
      <div className="bg-white border-b">
        <div className="container mx-auto px-4 py-8">
          {/* Breadcrumb navigation */}
          <nav className="flex items-center gap-2 text-sm text-gray-500 mb-4">
            <Link href={`/${params.locale}`} className="hover:text-primary">
              Home
            </Link>
            <ChevronRight className="w-4 h-4" />
            <Link href={`/${params.locale}/categories`} className="hover:text-primary">
              Categories
            </Link>
            {category.parentCategory && (
              <>
                <ChevronRight className="w-4 h-4" />
                <Link
                  href={`/${params.locale}/categories/${category.parentCategory.slug}`}
                  className="hover:text-primary"
                >
                  {category.parentCategory.name}
                </Link>
              </>
            )}
            <ChevronRight className="w-4 h-4" />
            <span className="text-gray-900">{name}</span>
          </nav>

          <h1 className="text-3xl font-bold text-gray-900 mb-2">{name}</h1>
          {description && (
            <p className="text-gray-600 mb-4 max-w-3xl">{description}</p>
          )}
          <p className="text-sm text-gray-500">
            {category.productCount?.toLocaleString() || 0} products available
          </p>
        </div>
      </div>

      {/* Subcategories */}
      {category.subcategories && category.subcategories.length > 0 && (
        <div className="bg-white border-b">
          <div className="container mx-auto px-4 py-4">
            <div className="flex flex-wrap gap-2">
              {category.subcategories.map((sub) => (
                <Link
                  key={sub.id}
                  href={`/${params.locale}/categories/${sub.slug}`}
                >
                  <Button variant="outline" size="sm">
                    {sub.name}
                    <span className="ml-1 text-gray-400">({sub.productCount?.toLocaleString() || 0})</span>
                  </Button>
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Products Grid */}
      <div className="container mx-auto px-4 py-8">
        {/* Toolbar */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <p className="text-gray-600">
            Showing {((page - 1) * 24) + 1}-{Math.min(page * 24, total)} of {total.toLocaleString()} products
          </p>
          <div className="flex items-center gap-4">
            <Button variant="outline" size="sm">
              <Filter className="w-4 h-4 mr-2" />
              Filter
            </Button>
            <Button variant="outline" size="sm">
              <SortAsc className="w-4 h-4 mr-2" />
              Sort
            </Button>
          </div>
        </div>

        {/* Products */}
        {products.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500">No products found in this category.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {products.map((product) => (
              <Link
                key={product.id}
                href={`/${params.locale}/products/${product.slug}`}
              >
                <Card className="overflow-hidden hover:shadow-lg transition-shadow h-full">
                  <div className="aspect-square relative bg-gray-100">
                    <Image
                      src={product.image || '/placeholder.jpg'}
                      alt={product.name}
                      fill
                      className="object-cover"
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                    />
                    {product.originalPrice && product.originalPrice > product.price && (
                      <div className="absolute top-2 left-2 bg-red-500 text-white text-xs px-2 py-1 rounded">
                        {Math.round((1 - product.price / product.originalPrice) * 100)}% OFF
                      </div>
                    )}
                  </div>
                  <CardContent className="p-4">
                    <h3 className="font-semibold mb-2 line-clamp-2">{product.name}</h3>
                    {product.rating && (
                      <div className="flex items-center gap-1 mb-2">
                        <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                        <span className="text-sm">{product.rating}</span>
                        {product.reviewCount && (
                          <span className="text-sm text-gray-500">
                            ({product.reviewCount.toLocaleString()})
                          </span>
                        )}
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <p className="text-lg font-bold text-primary">
                        {formatPrice(product.price, product.currency)}
                      </p>
                      {product.originalPrice && product.originalPrice > product.price && (
                        <p className="text-sm text-gray-500 line-through">
                          {formatPrice(product.originalPrice, product.currency)}
                        </p>
                      )}
                    </div>
                    {product.vendor && (
                      <p className="text-xs text-gray-500 mt-2">
                        by {product.vendor}
                      </p>
                    )}
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex justify-center gap-2 mt-8">
            {page > 1 && (
              <Link
                href={`/${params.locale}/categories/${params.slug}?page=${page - 1}`}
              >
                <Button variant="outline">Previous</Button>
              </Link>
            )}
            <span className="flex items-center px-4">
              Page {page} of {totalPages}
            </span>
            {page < totalPages && (
              <Link
                href={`/${params.locale}/categories/${params.slug}?page=${page + 1}`}
              >
                <Button variant="outline">Next</Button>
              </Link>
            )}
          </div>
        )}

        {/* SEO Content */}
        <section className="mt-16 prose prose-gray max-w-none">
          <h2>Shop {name} on Broxiva</h2>
          <p>
            Discover our extensive collection of {name.toLowerCase()} products from verified vendors
            worldwide. With {category.productCount?.toLocaleString() || 'thousands of'} products to
            choose from, you'll find everything you need at competitive wholesale prices.
          </p>
          {category.subcategories && category.subcategories.length > 0 && (
            <>
              <h3>Browse {name} Subcategories</h3>
              <ul>
                {category.subcategories.map((sub) => (
                  <li key={sub.id}>
                    <Link href={`/${params.locale}/categories/${sub.slug}`}>
                      {sub.name}
                    </Link>{' '}
                    - {sub.productCount?.toLocaleString() || 0} products
                  </li>
                ))}
              </ul>
            </>
          )}
        </section>
      </div>
    </div>
  );
}
