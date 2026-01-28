/** @type {import('next').NextConfig} */
const nextConfig = {
  // output: 'standalone' disabled for local Windows builds, enable for Docker
  output: process.env.DOCKER_BUILD === 'true' ? 'standalone' : undefined,
  reactStrictMode: true,

  // Enable source maps in production for Sentry error tracking
  // Source maps will be uploaded to Sentry and removed from public access
  productionBrowserSourceMaps: true,

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
    ],
  },
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb',
    },
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

  // Webpack configuration
  webpack: (config, { isServer }) => {
    // Sentry source map configuration
    if (!isServer) {
      config.devtool = 'source-map';
    }
    return config;
  },
};

// Wrap with Sentry config for automatic source map upload
// Only if Sentry auth token is available (production builds)
if (process.env.SENTRY_AUTH_TOKEN && process.env.NEXT_PUBLIC_SENTRY_DSN) {
  const { withSentryConfig } = require('@sentry/nextjs');

  const sentryWebpackPluginOptions = {
    // Suppresses source map uploading logs during build
    silent: true,

    // Upload source maps during production builds only
    dryRun: process.env.NODE_ENV !== 'production',

    // Organization and project from environment or sentry.properties
    org: process.env.SENTRY_ORG,
    project: process.env.SENTRY_PROJECT,

    // Auth token from environment variable
    authToken: process.env.SENTRY_AUTH_TOKEN,

    // Additional configuration
    hideSourceMaps: true, // Hides source maps from public after upload
    widenClientFileUpload: true, // Upload wider range of source maps
    disableLogger: true, // Disables Sentry logger statements in production
  };

  module.exports = withSentryConfig(nextConfig, sentryWebpackPluginOptions);
} else {
  module.exports = nextConfig;
}
