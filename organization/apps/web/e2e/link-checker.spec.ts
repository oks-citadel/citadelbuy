import { test, expect } from '@playwright/test';

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

// All internal routes that should exist
const internalRoutes = [
  // Core pages
  '/',
  '/help',
  '/about',
  '/contact',
  '/track-order',
  '/products',
  '/categories',
  '/brands',
  '/deals',
  '/new-arrivals',
  '/best-sellers',
  '/search',
  '/visual-search',
  '/cart',
  '/wishlist',

  // Shopping categories
  '/categories/electronics',
  '/categories/fashion',
  '/categories/home-garden',
  '/categories/beauty',
  '/categories/sports',
  '/categories/toys',
  '/categories/books',

  // Footer - Shop
  '/gift-cards',

  // Footer - Support
  '/shipping',
  '/returns',
  '/size-guide',

  // Footer - Company
  '/careers',
  '/press',
  '/sustainability',
  '/investors',
  '/blog',

  // Footer - Sell
  '/sell',
  '/vendor/login',
  '/vendor/guidelines',
  '/advertising',
  '/affiliates',
  '/api-docs',

  // Legal
  '/privacy',
  '/terms',
  '/cookies',

  // Auth
  '/auth/login',
  '/auth/register',
  '/auth/forgot-password',

  // Help center sub-pages
  '/help/orders',
  '/help/shipping',
  '/help/returns',
  '/help/payments',
  '/help/account',
  '/help/security',

  // Account pages (may redirect to login)
  '/account',
  '/account/orders',
  '/account/addresses',
  '/account/settings',
  '/account/security',

  // Other
  '/ai-features',
  '/trending',
  '/for-you',
  '/checkout',
];

test.describe('Route validation - no 404 errors', () => {
  for (const route of internalRoutes) {
    test(`${route} should not return 404`, async ({ page }) => {
      const response = await page.goto(`${BASE_URL}${route}`, {
        waitUntil: 'domcontentloaded',
        timeout: 30000,
      });

      // Allow 200, 302, 307 (redirects for auth pages)
      const status = response?.status() || 0;
      expect(status).not.toBe(404);
      expect([200, 302, 307, 308]).toContain(status);
    });
  }
});

test.describe('Link checker - all internal links resolve', () => {
  test('homepage should have no broken internal links', async ({ page }) => {
    await page.goto(`${BASE_URL}/`);

    // Get all internal links
    const links = await page.$$eval('a[href^="/"]', (elements) =>
      elements.map((el) => el.getAttribute('href')).filter(Boolean)
    );

    const uniqueLinks = [...new Set(links)];
    const brokenLinks: string[] = [];

    for (const link of uniqueLinks) {
      if (!link || link.startsWith('#')) continue;

      const response = await page.goto(`${BASE_URL}${link}`, {
        waitUntil: 'domcontentloaded',
        timeout: 10000,
      });

      if (response?.status() === 404) {
        brokenLinks.push(link);
      }
    }

    expect(brokenLinks).toEqual([]);
  });

  test('footer links should all resolve', async ({ page }) => {
    await page.goto(`${BASE_URL}/`);

    // Get all footer links
    const footerLinks = await page.$$eval('footer a[href^="/"]', (elements) =>
      elements.map((el) => el.getAttribute('href')).filter(Boolean)
    );

    const uniqueLinks = [...new Set(footerLinks)];
    const brokenLinks: string[] = [];

    for (const link of uniqueLinks) {
      if (!link) continue;

      const response = await page.goto(`${BASE_URL}${link}`, {
        waitUntil: 'domcontentloaded',
        timeout: 10000,
      });

      if (response?.status() === 404) {
        brokenLinks.push(link);
      }
    }

    expect(brokenLinks).toEqual([]);
  });

  test('help center category links should all resolve', async ({ page }) => {
    await page.goto(`${BASE_URL}/help`);

    // Get all links on help page
    const helpLinks = await page.$$eval('a[href^="/help/"]', (elements) =>
      elements.map((el) => el.getAttribute('href')).filter(Boolean)
    );

    const uniqueLinks = [...new Set(helpLinks)];
    const brokenLinks: string[] = [];

    for (const link of uniqueLinks) {
      if (!link) continue;

      const response = await page.goto(`${BASE_URL}${link}`, {
        waitUntil: 'domcontentloaded',
        timeout: 10000,
      });

      if (response?.status() === 404) {
        brokenLinks.push(link);
      }
    }

    expect(brokenLinks).toEqual([]);
  });
});

test.describe('Navigation menu links', () => {
  test('header navigation links should resolve', async ({ page }) => {
    await page.goto(`${BASE_URL}/`);

    const navLinks = await page.$$eval('header a[href^="/"]', (elements) =>
      elements.map((el) => el.getAttribute('href')).filter(Boolean)
    );

    const uniqueLinks = [...new Set(navLinks)];
    const brokenLinks: string[] = [];

    for (const link of uniqueLinks) {
      if (!link || link.startsWith('#')) continue;

      const response = await page.goto(`${BASE_URL}${link}`, {
        waitUntil: 'domcontentloaded',
        timeout: 10000,
      });

      if (response?.status() === 404) {
        brokenLinks.push(link);
      }
    }

    expect(brokenLinks).toEqual([]);
  });
});
