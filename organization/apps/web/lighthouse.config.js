/**
 * Broxiva Lighthouse CI Configuration
 * Target Scores: Performance 90+, Accessibility 100, Best Practices 100, SEO 100
 */

module.exports = {
  ci: {
    collect: {
      // Number of runs per URL
      numberOfRuns: 3,

      // URLs to test
      url: [
        'http://localhost:3000/',
        'http://localhost:3000/products',
        'http://localhost:3000/categories',
        'http://localhost:3000/cart',
        'http://localhost:3000/checkout',
        'http://localhost:3000/account',
      ],

      // Start server command
      startServerCommand: 'pnpm run start',
      startServerReadyPattern: 'ready on',
      startServerReadyTimeout: 30000,

      // Puppeteer settings
      settings: {
        preset: 'desktop',
        throttling: {
          cpuSlowdownMultiplier: 1,
        },
        chromeFlags: ['--no-sandbox', '--disable-gpu', '--headless'],
      },
    },

    assert: {
      assertions: {
        // Performance budgets
        'categories:performance': ['error', { minScore: 0.9 }],
        'categories:accessibility': ['error', { minScore: 1.0 }],
        'categories:best-practices': ['error', { minScore: 1.0 }],
        'categories:seo': ['error', { minScore: 1.0 }],

        // Core Web Vitals
        'first-contentful-paint': ['error', { maxNumericValue: 1800 }],
        'largest-contentful-paint': ['error', { maxNumericValue: 2500 }],
        'cumulative-layout-shift': ['error', { maxNumericValue: 0.1 }],
        'total-blocking-time': ['error', { maxNumericValue: 200 }],
        'interactive': ['error', { maxNumericValue: 3800 }],
        'speed-index': ['error', { maxNumericValue: 3400 }],

        // Resource budgets
        'resource-summary:script:size': ['error', { maxNumericValue: 300000 }],
        'resource-summary:stylesheet:size': ['error', { maxNumericValue: 100000 }],
        'resource-summary:image:size': ['error', { maxNumericValue: 500000 }],
        'resource-summary:total:size': ['error', { maxNumericValue: 1500000 }],

        // Critical audits
        'uses-responsive-images': 'error',
        'uses-optimized-images': 'error',
        'uses-webp-images': 'warn',
        'uses-text-compression': 'error',
        'render-blocking-resources': 'warn',
        'unused-javascript': 'warn',
        'unused-css-rules': 'warn',
        'efficient-animated-content': 'warn',
        'uses-rel-preconnect': 'warn',
        'font-display': 'error',

        // Accessibility audits
        'color-contrast': 'error',
        'button-name': 'error',
        'image-alt': 'error',
        'label': 'error',
        'link-name': 'error',
        'meta-viewport': 'error',
        'html-has-lang': 'error',
        'document-title': 'error',

        // SEO audits
        'meta-description': 'error',
        'crawlable-anchors': 'error',
        'hreflang': 'warn',
        'canonical': 'error',
        'robots-txt': 'error',

        // Best practices
        'is-on-https': 'error',
        'no-vulnerable-libraries': 'error',
        'csp-xss': 'warn',
        'js-libraries': 'off',
      },
    },

    upload: {
      // Upload to temporary public storage
      target: 'temporary-public-storage',
    },

    server: {
      port: 9001,
    },
  },
};
