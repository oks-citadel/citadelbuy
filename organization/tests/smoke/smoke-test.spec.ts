/**
 * Broxiva E2E Smoke Tests
 *
 * Purpose: Comprehensive smoke tests to verify critical user flows
 * Run after deployment to ensure system is functional
 *
 * Usage:
 *   pnpm playwright test tests/smoke/smoke-test.spec.ts
 *   PLAYWRIGHT_BASE_URL=https://staging.broxiva.com pnpm playwright test tests/smoke/
 */

import { test, expect } from '@playwright/test';

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:4000';
const WEB_BASE_URL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000';

test.describe('Smoke Tests - API Health', () => {
  test('should verify API health endpoint', async ({ request }) => {
    const response = await request.get(`${API_BASE_URL}/api/health`);
    expect(response.ok()).toBeTruthy();

    const body = await response.json();
    expect(body.status).toBe('ok');
  });

  test('should verify database connectivity', async ({ request }) => {
    const response = await request.get(`${API_BASE_URL}/api/health`);
    const body = await response.json();

    expect(body.details.database.status).toBe('up');
  });

  test('should verify Redis connectivity', async ({ request }) => {
    const response = await request.get(`${API_BASE_URL}/api/health`);
    const body = await response.json();

    expect(body.details.redis.status).toBe('up');
  });

  test('should verify readiness probe', async ({ request }) => {
    const response = await request.get(`${API_BASE_URL}/api/health/ready`);
    expect(response.ok()).toBeTruthy();

    const body = await response.json();
    expect(body.status).toBe('ok');
  });

  test('should verify liveness probe', async ({ request }) => {
    const response = await request.get(`${API_BASE_URL}/api/health/live`);
    expect(response.ok()).toBeTruthy();
  });

  test('should verify detailed health metrics', async ({ request }) => {
    const response = await request.get(`${API_BASE_URL}/api/health/detailed`);
    expect(response.ok()).toBeTruthy();

    const body = await response.json();
    expect(body.status).toBe('healthy');
    expect(body.checks.database.status).toBe('up');
    expect(body.checks.redis.status).toBe('up');
    expect(body.checks.memory).toBeDefined();
    expect(body.checks.uptime).toBeGreaterThan(0);
  });
});

test.describe('Smoke Tests - Critical API Endpoints', () => {
  test('should fetch products list', async ({ request }) => {
    const response = await request.get(`${API_BASE_URL}/api/products`);
    expect(response.ok()).toBeTruthy();

    const body = await response.json();
    expect(Array.isArray(body.data || body)).toBeTruthy();
  });

  test('should fetch categories list', async ({ request }) => {
    const response = await request.get(`${API_BASE_URL}/api/categories`);
    expect(response.ok()).toBeTruthy();

    const body = await response.json();
    expect(Array.isArray(body.data || body)).toBeTruthy();
  });

  test('should perform search query', async ({ request }) => {
    const response = await request.get(`${API_BASE_URL}/api/search?q=test`);
    expect(response.ok()).toBeTruthy();
  });

  test('should check auth endpoint', async ({ request }) => {
    const response = await request.get(`${API_BASE_URL}/api/auth/check`);
    // Should return 200 or 401, not 500
    expect([200, 401]).toContain(response.status());
  });
});

test.describe('Smoke Tests - Frontend Rendering', () => {
  test('should load homepage', async ({ page }) => {
    await page.goto('/');

    // Should not show error page
    await expect(page.locator('text=/error|something went wrong/i')).not.toBeVisible();

    // Should render core elements
    await expect(page).toHaveTitle(/Broxiva|Home/i);
  });

  test('should load products page', async ({ page }) => {
    await page.goto('/products');

    // Wait for products to load
    await page.waitForLoadState('networkidle', { timeout: 10000 });

    // Should render product grid or list
    await expect(
      page.locator('[data-testid="product-card"], .product-card, [class*="product"]').first()
    ).toBeVisible({ timeout: 15000 });
  });

  test('should render navigation menu', async ({ page }) => {
    await page.goto('/');

    // Should have main navigation
    await expect(
      page.locator('nav, header, [role="navigation"]')
    ).toBeVisible();
  });

  test('should load login page', async ({ page }) => {
    await page.goto('/auth/login');

    // Should render login form
    await expect(page.locator('input[name="email"], input[type="email"]')).toBeVisible();
    await expect(page.locator('input[name="password"], input[type="password"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  test('should handle 404 gracefully', async ({ page }) => {
    const response = await page.goto('/this-page-does-not-exist-404-test');

    // Should return 404 status
    expect(response?.status()).toBe(404);

    // Should render 404 page, not error page
    await expect(page.locator('text=/404|not found/i')).toBeVisible();
  });
});

test.describe('Smoke Tests - Authentication Flow', () => {
  test('should access login page', async ({ page }) => {
    await page.goto('/auth/login');

    // Should render without errors
    await expect(page.locator('input[name="email"]')).toBeVisible();
  });

  test('should access register page', async ({ page }) => {
    await page.goto('/auth/register');

    // Should render registration form
    await expect(page.locator('input[name="email"]')).toBeVisible();
    await expect(page.locator('input[name="password"]')).toBeVisible();
  });

  test('should validate login form', async ({ page }) => {
    await page.goto('/auth/login');

    // Click submit without filling
    await page.click('button[type="submit"]');

    // Should show validation errors
    await expect(page.locator('text=/required|this field/i')).toHaveCount(
      { min: 1 },
      { timeout: 5000 }
    );
  });
});

test.describe('Smoke Tests - Shopping Flow', () => {
  test('should browse products', async ({ page }) => {
    await page.goto('/products');
    await page.waitForLoadState('networkidle', { timeout: 10000 });

    // Should show products
    const productCount = await page.locator('[data-testid="product-card"], .product-card').count();
    expect(productCount).toBeGreaterThan(0);
  });

  test('should view product details', async ({ page }) => {
    await page.goto('/products');
    await page.waitForLoadState('networkidle');

    // Click first product
    const firstProduct = page.locator('[data-testid="product-card"], .product-card').first();
    await firstProduct.click();

    // Should navigate to product page
    await page.waitForURL(/\/products\/[^\/]+/, { timeout: 10000 });

    // Should show product details
    await expect(page.locator('text=/add to cart|buy now/i')).toBeVisible();
  });

  test('should access cart page', async ({ page }) => {
    await page.goto('/cart');

    // Should render cart (even if empty)
    await expect(
      page.locator('text=/cart|shopping cart/i, [data-testid="cart"]')
    ).toBeVisible();
  });
});

test.describe('Smoke Tests - Performance', () => {
  test('should load homepage within acceptable time', async ({ page }) => {
    const startTime = Date.now();
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    const loadTime = Date.now() - startTime;

    // Should load within 5 seconds
    expect(loadTime).toBeLessThan(5000);
  });

  test('should load products page within acceptable time', async ({ page }) => {
    const startTime = Date.now();
    await page.goto('/products');
    await page.waitForLoadState('domcontentloaded');
    const loadTime = Date.now() - startTime;

    // Should load within 5 seconds
    expect(loadTime).toBeLessThan(5000);
  });

  test('API health check should respond quickly', async ({ request }) => {
    const startTime = Date.now();
    const response = await request.get(`${API_BASE_URL}/api/health`);
    const responseTime = Date.now() - startTime;

    expect(response.ok()).toBeTruthy();
    expect(responseTime).toBeLessThan(1000); // Should respond within 1 second
  });
});

test.describe('Smoke Tests - Search & Filter', () => {
  test('should perform product search', async ({ page }) => {
    await page.goto('/products');

    // Find search input
    const searchInput = page.locator('input[type="search"], input[placeholder*="Search"], input[name="search"]');

    if (await searchInput.count() > 0) {
      await searchInput.first().fill('test');
      await page.keyboard.press('Enter');

      // Should handle search (results or no results)
      await page.waitForLoadState('networkidle');
    }
  });

  test('should access categories', async ({ page }) => {
    await page.goto('/categories');

    // Should render categories page
    await expect(page).not.toHaveURL(/error|404/);
  });
});

test.describe('Smoke Tests - Responsive Design', () => {
  test('should render on mobile viewport', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');

    // Should render without errors
    await expect(page).toHaveTitle(/Broxiva|Home/i);
  });

  test('should render on tablet viewport', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto('/');

    // Should render without errors
    await expect(page).toHaveTitle(/Broxiva|Home/i);
  });

  test('should render on desktop viewport', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.goto('/');

    // Should render without errors
    await expect(page).toHaveTitle(/Broxiva|Home/i);
  });
});
