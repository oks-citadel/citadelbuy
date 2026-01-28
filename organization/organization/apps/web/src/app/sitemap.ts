import { MetadataRoute } from 'next';

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://broxiva.com';
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

interface SitemapEntry {
  loc: string;
  lastmod?: string;
  changefreq?: string;
  priority?: number;
}

async function fetchFromAPI<T>(endpoint: string): Promise<T | null> {
  try {
    const response = await fetch(`${API_URL}${endpoint}`, {
      next: { revalidate: 3600 }, // Cache for 1 hour
    });
    if (!response.ok) return null;
    return response.json();
  } catch (error) {
    console.error(`Failed to fetch ${endpoint}:`, error);
    return null;
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const entries: MetadataRoute.Sitemap = [];

  // Static pages
  const staticPages = [
    { path: '', priority: 1.0, changeFrequency: 'daily' as const },
    { path: '/products', priority: 0.9, changeFrequency: 'daily' as const },
    { path: '/categories', priority: 0.8, changeFrequency: 'weekly' as const },
    { path: '/about', priority: 0.5, changeFrequency: 'monthly' as const },
    { path: '/contact', priority: 0.5, changeFrequency: 'monthly' as const },
    { path: '/privacy', priority: 0.3, changeFrequency: 'monthly' as const },
    { path: '/terms', priority: 0.3, changeFrequency: 'monthly' as const },
    { path: '/faq', priority: 0.5, changeFrequency: 'weekly' as const },
    { path: '/shipping', priority: 0.5, changeFrequency: 'monthly' as const },
    { path: '/returns', priority: 0.5, changeFrequency: 'monthly' as const },
  ];

  for (const page of staticPages) {
    entries.push({
      url: `${BASE_URL}${page.path}`,
      lastModified: new Date(),
      changeFrequency: page.changeFrequency,
      priority: page.priority,
    });
  }

  // Fetch products from API
  try {
    const productsResponse = await fetchFromAPI<{
      products: Array<{ slug: string; updatedAt: string }>;
    }>('/products?limit=10000&fields=slug,updatedAt');

    if (productsResponse?.products) {
      for (const product of productsResponse.products) {
        entries.push({
          url: `${BASE_URL}/products/${product.slug}`,
          lastModified: new Date(product.updatedAt),
          changeFrequency: 'weekly',
          priority: 0.7,
        });
      }
    }
  } catch (error) {
    console.error('Failed to fetch products for sitemap:', error);
  }

  // Fetch categories from API
  try {
    const categoriesResponse = await fetchFromAPI<{
      categories: Array<{ slug: string; updatedAt: string }>;
    }>('/categories?limit=1000&fields=slug,updatedAt');

    if (categoriesResponse?.categories) {
      for (const category of categoriesResponse.categories) {
        entries.push({
          url: `${BASE_URL}/categories/${category.slug}`,
          lastModified: new Date(category.updatedAt),
          changeFrequency: 'weekly',
          priority: 0.6,
        });
      }
    }
  } catch (error) {
    console.error('Failed to fetch categories for sitemap:', error);
  }

  // Fetch blog posts if available
  try {
    const postsResponse = await fetchFromAPI<{
      posts: Array<{ slug: string; updatedAt: string }>;
    }>('/blog/posts?limit=5000&fields=slug,updatedAt');

    if (postsResponse?.posts) {
      for (const post of postsResponse.posts) {
        entries.push({
          url: `${BASE_URL}/blog/${post.slug}`,
          lastModified: new Date(post.updatedAt),
          changeFrequency: 'monthly',
          priority: 0.5,
        });
      }
    }
  } catch (error) {
    // Blog may not exist, ignore error
  }

  return entries;
}
