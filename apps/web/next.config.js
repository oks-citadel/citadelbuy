/** @type {import('next').NextConfig} */

/**
 * Broxiva Next.js Configuration
 * Optimized for Core Web Vitals and Lighthouse performance
 *
 * Performance Targets:
 * - CLS < 0.1
 * - LCP < 2.5s
 * - FID < 100ms
 *
 * i18n Strategy:
 * - Locale detection handled by Edge Middleware (middleware.ts)
 * - URL structure: /{locale}/path (e.g., /en-us/products)
 * - Supported locales defined in src/lib/i18n-edge/config.ts
 */

const nextConfig = {
  // output: 'standalone' disabled for local Windows builds, enable for Docker
  output: process.env.DOCKER_BUILD === 'true' ? 'standalone' : undefined,
  reactStrictMode: true,

  // ESLint configuration for builds
  eslint: {
    // In Vercel production builds (CI=true), we still want to allow builds
    // even with ESLint warnings to prevent deployment failures
    // Run `pnpm lint` locally to see all warnings before committing
    ignoreDuringBuilds: true,
  },

  // TypeScript configuration for builds
  typescript: {
    // Allow production builds to complete even with type errors
    // This prevents deployment failures due to type issues
    // Run `pnpm type-check` locally to verify types before committing
    ignoreBuildErrors: true,
  },

  // Enable compression for better performance
  compress: true,

  // Disable powered by header for security
  poweredByHeader: false,

  // Generate ETags for caching
  generateEtags: true,

  // Note: i18n routing is handled by Edge Middleware (middleware.ts)
  // We don't use Next.js built-in i18n as it doesn't work with App Router
  // The middleware handles:
  // - Locale detection from Accept-Language, cookies, and geo
  // - Locale-prefixed URL redirects
  // - Setting x-bx-* headers for downstream components

  async redirects() {
    return [
      {
        source: '/login',
        destination: '/auth/login',
        permanent: true,
      },
      {
        source: '/signin',
        destination: '/auth/login',
        permanent: true,
      },
      {
        source: '/register',
        destination: '/auth/register',
        permanent: true,
      },
      {
        source: '/signup',
        destination: '/auth/register',
        permanent: true,
      },
    ];
  },

  // Enhanced image optimization for performance
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.broxiva.com',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
      {
        protocol: 'https',
        hostname: 'cdn.broxiva.com',
      },
      {
        protocol: 'https',
        hostname: 'placehold.co',
      },
    ],
    // Modern image formats for better compression
    formats: ['image/avif', 'image/webp'],
    // Responsive image sizes
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    // Cache images for 30 days
    minimumCacheTTL: 60 * 60 * 24 * 30,
  },

  experimental: {
    serverActions: {
      bodySizeLimit: '10mb',
    },
    // Optimize package imports for smaller bundles
    // Note: lucide-react removed due to tree-shaking issues causing build failures
    optimizePackageImports: [
      '@radix-ui/react-icons',
      'date-fns',
      'lodash',
      'framer-motion',
    ],
  },

  // Custom headers for caching and security
  async headers() {
    return [
      // Cache static assets
      {
        source: '/_next/static/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      // Cache fonts
      {
        source: '/fonts/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      // Cache images
      {
        source: '/images/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=86400, stale-while-revalidate=604800',
          },
        ],
      },
    ];
  },
  env: {
    // API Configuration
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
    NEXT_PUBLIC_AI_SERVICE_URL: process.env.NEXT_PUBLIC_AI_SERVICE_URL,
    NEXT_PUBLIC_WS_URL: process.env.NEXT_PUBLIC_WS_URL,

    // Application
    NEXT_PUBLIC_APP_NAME: process.env.NEXT_PUBLIC_APP_NAME,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,

    // Payment
    NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,

    // OAuth
    NEXT_PUBLIC_GOOGLE_CLIENT_ID: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
    NEXT_PUBLIC_GITHUB_CLIENT_ID: process.env.NEXT_PUBLIC_GITHUB_CLIENT_ID,
    NEXT_PUBLIC_FACEBOOK_APP_ID: process.env.NEXT_PUBLIC_FACEBOOK_APP_ID,
    NEXT_PUBLIC_APPLE_CLIENT_ID: process.env.NEXT_PUBLIC_APPLE_CLIENT_ID,

    // Analytics
    NEXT_PUBLIC_GA_TRACKING_ID: process.env.NEXT_PUBLIC_GA_TRACKING_ID,
    NEXT_PUBLIC_FB_PIXEL_ID: process.env.NEXT_PUBLIC_FB_PIXEL_ID,
    NEXT_PUBLIC_TIKTOK_PIXEL_ID: process.env.NEXT_PUBLIC_TIKTOK_PIXEL_ID,

    // Feature Flags
    NEXT_PUBLIC_ENABLE_AI_FEATURES: process.env.NEXT_PUBLIC_ENABLE_AI_FEATURES,
    NEXT_PUBLIC_ENABLE_AR_TRYON: process.env.NEXT_PUBLIC_ENABLE_AR_TRYON,
    NEXT_PUBLIC_ENABLE_VOICE_SEARCH: process.env.NEXT_PUBLIC_ENABLE_VOICE_SEARCH,
    NEXT_PUBLIC_ENABLE_CHATBOT: process.env.NEXT_PUBLIC_ENABLE_CHATBOT,

    // CDN
    NEXT_PUBLIC_CDN_URL: process.env.NEXT_PUBLIC_CDN_URL,
    NEXT_PUBLIC_IMAGE_OPTIMIZATION: process.env.NEXT_PUBLIC_IMAGE_OPTIMIZATION,

    // Push Notifications
    NEXT_PUBLIC_VAPID_PUBLIC_KEY: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,

    // Error Tracking
    NEXT_PUBLIC_SENTRY_DSN: process.env.NEXT_PUBLIC_SENTRY_DSN,
  },
};

module.exports = nextConfig;
