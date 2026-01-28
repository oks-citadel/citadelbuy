import { MetadataRoute } from 'next';
import { seoConfig, SUPPORTED_LOCALES } from '@/lib/seo/config';

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || seoConfig.siteUrl;

/**
 * Dynamic robots.txt generation
 * Supports multi-tenant configuration and per-locale sitemaps
 */
export default function robots(): MetadataRoute.Robots {
  // Generate sitemap references for all locales
  const sitemaps = [
    `${BASE_URL}/sitemap.xml`,
    ...SUPPORTED_LOCALES.map((locale) => `${BASE_URL}/api/seo/sitemap/${locale.code}.xml`),
  ];

  return {
    rules: [
      // Default rules for all crawlers
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          // API and internal routes
          '/api/',
          '/_next/',
          '/private/',

          // User account areas
          '/admin/',
          '/dashboard/',
          '/account/',
          '/vendor-portal/',

          // Transactional pages (no SEO value)
          '/checkout/',
          '/cart/',
          '/wishlist/',
          '/orders/',

          // Auth pages
          '/auth/',
          '/login',
          '/register',
          '/forgot-password',
          '/reset-password',

          // Dynamic parameters (avoid duplicate content)
          '/*.json$',
          '/search?*',
          '/*?*sort=',
          '/*?*filter=',
          '/*?*page=',
          '/*?*view=',
          '/*?*ref=',
          '/*?*utm_*',
          '/*?*fbclid=',
          '/*?*gclid=',

          // Internal tools
          '/dev/',
          '/test/',
          '/__*',
        ],
      },

      // Googlebot-specific rules (more permissive)
      {
        userAgent: 'Googlebot',
        allow: '/',
        disallow: [
          '/api/',
          '/admin/',
          '/dashboard/',
          '/account/',
          '/vendor-portal/',
          '/checkout/',
          '/cart/',
          '/wishlist/',
          '/orders/',
          '/auth/',
          '/_next/',
          '/private/',
        ],
      },

      // Google Image bot - allow image crawling
      {
        userAgent: 'Googlebot-Image',
        allow: [
          '/*.jpg$',
          '/*.jpeg$',
          '/*.gif$',
          '/*.png$',
          '/*.webp$',
          '/*.svg$',
          '/*.avif$',
          '/products/',
          '/categories/',
          '/vendors/',
        ],
        disallow: ['/private/', '/admin/', '/account/'],
      },

      // Bingbot rules
      {
        userAgent: 'Bingbot',
        allow: '/',
        disallow: [
          '/api/',
          '/admin/',
          '/dashboard/',
          '/account/',
          '/vendor-portal/',
          '/checkout/',
          '/cart/',
          '/wishlist/',
          '/orders/',
          '/auth/',
          '/_next/',
          '/private/',
        ],
      },

      // Yandex bot (important for Russian markets)
      {
        userAgent: 'Yandex',
        allow: '/',
        disallow: [
          '/api/',
          '/admin/',
          '/account/',
          '/checkout/',
          '/cart/',
          '/_next/',
          '/private/',
        ],
      },

      // Baidu bot (important for Chinese markets)
      {
        userAgent: 'Baiduspider',
        allow: '/',
        disallow: [
          '/api/',
          '/admin/',
          '/account/',
          '/checkout/',
          '/cart/',
          '/_next/',
          '/private/',
        ],
      },

      // Block aggressive/unwanted bots
      {
        userAgent: 'AhrefsBot',
        disallow: '/',
      },
      {
        userAgent: 'SemrushBot',
        disallow: '/',
      },
      {
        userAgent: 'MJ12bot',
        disallow: '/',
      },
      {
        userAgent: 'DotBot',
        disallow: '/',
      },
      {
        userAgent: 'BLEXBot',
        disallow: '/',
      },
      {
        userAgent: 'PetalBot',
        disallow: '/',
      },
      {
        userAgent: 'SeznamBot',
        disallow: '/',
      },
      {
        userAgent: 'DataForSeoBot',
        disallow: '/',
      },
      {
        userAgent: 'GPTBot',
        disallow: '/', // Block AI training bots
      },
      {
        userAgent: 'CCBot',
        disallow: '/', // Block CommonCrawl
      },
    ],
    sitemap: sitemaps,
    host: BASE_URL,
  };
}
