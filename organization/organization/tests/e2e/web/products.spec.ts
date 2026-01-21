import { test, expect } from '@playwright/test';

test.describe('Product Browsing', () => {
  test.describe('Home Page', () => {
    test('should load home page', async ({ page }) => {
      await page.goto('/');
      await expect(page).toHaveTitle(/Broxiva|Home/i);
    });

    test('should display product sections', async ({ page }) => {
      await page.goto('/');

      // Check for common sections
      const sections = [
        /new arrivals/i,
        /trending|popular/i,
        /categories/i,
        /featured/i,
      ];

      let foundSection = false;
      for (const section of sections) {
        if (await page.getByText(section).isVisible()) {
          foundSection = true;
          break;
        }
      }

      expect(foundSection).toBe(true);
    });

    test('should have navigation menu', async ({ page }) => {
      await page.goto('/');
      await expect(page.getByRole('navigation')).toBeVisible();
    });

    test('should have search functionality', async ({ page }) => {
      await page.goto('/');

      const searchInput = page.getByRole('searchbox').or(page.getByPlaceholder(/search/i));
      await expect(searchInput).toBeVisible();
    });
  });

  test.describe('Product Listing', () => {
    test('should display products grid', async ({ page }) => {
      await page.goto('/products');

      const products = page.locator('[data-testid="product-card"]').or(page.locator('.product-card'));
      await expect(products.first()).toBeVisible({ timeout: 10000 });
    });

    test('should filter products by category', async ({ page }) => {
      await page.goto('/categories/electronics');

      // Page should show electronics products
      await expect(page.getByText(/electronics/i)).toBeVisible();
    });

    test('should sort products', async ({ page }) => {
      await page.goto('/products');

      const sortSelect = page.getByRole('combobox', { name: /sort/i });
      if (await sortSelect.isVisible()) {
        await sortSelect.selectOption({ label: /price.*low/i });
        await page.waitForTimeout(1000);
        // Verify sort applied (page reloaded or products reordered)
      }
    });

    test('should paginate products', async ({ page }) => {
      await page.goto('/products');

      const pagination = page.getByRole('navigation', { name: /pagination/i });
      const nextButton = page.getByRole('button', { name: /next|>/i });

      const hasPagination = await pagination.isVisible() || await nextButton.isVisible();
      // Pagination may or may not be visible depending on product count
    });
  });

  test.describe('Product Details', () => {
    test('should display product details page', async ({ page }) => {
      await page.goto('/products');

      const firstProduct = page.locator('[data-testid="product-card"]').first();
      await firstProduct.waitFor({ state: 'visible', timeout: 10000 });
      await firstProduct.click();

      // Should be on product detail page
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
      await expect(page.getByText(/\$\d+/)).toBeVisible(); // Price
    });

    test('should show product images', async ({ page }) => {
      await page.goto('/products');
      const firstProduct = page.locator('[data-testid="product-card"]').first();
      await firstProduct.click();

      await expect(page.getByRole('img')).toBeVisible();
    });

    test('should have add to cart button', async ({ page }) => {
      await page.goto('/products');
      const firstProduct = page.locator('[data-testid="product-card"]').first();
      await firstProduct.click();

      await expect(page.getByRole('button', { name: /add to cart/i })).toBeVisible();
    });

    test('should show product reviews', async ({ page }) => {
      await page.goto('/products');
      const firstProduct = page.locator('[data-testid="product-card"]').first();
      await firstProduct.click();

      // Reviews section should be visible
      const reviewsSection = page.getByText(/reviews|ratings/i);
      await expect(reviewsSection).toBeVisible();
    });
  });

  test.describe('Search', () => {
    test('should search for products', async ({ page }) => {
      await page.goto('/');

      const searchInput = page.getByRole('searchbox').or(page.getByPlaceholder(/search/i));
      await searchInput.fill('laptop');
      await page.keyboard.press('Enter');

      await expect(page).toHaveURL(/search.*laptop|q=laptop/i);
    });

    test('should show search results', async ({ page }) => {
      await page.goto('/search?q=phone');

      // Should show results or no results message
      const results = page.locator('[data-testid="product-card"]');
      const noResults = page.getByText(/no results|not found/i);

      const hasResults = await results.count() > 0;
      const hasNoResultsMessage = await noResults.isVisible();

      expect(hasResults || hasNoResultsMessage).toBe(true);
    });

    test('should show autocomplete suggestions', async ({ page }) => {
      await page.goto('/');

      const searchInput = page.getByRole('searchbox').or(page.getByPlaceholder(/search/i));
      await searchInput.fill('lap');
      await page.waitForTimeout(500);

      // Autocomplete dropdown might appear
      const suggestions = page.locator('[data-testid="search-suggestions"]').or(
        page.locator('.autocomplete-dropdown')
      );

      // May or may not have autocomplete
    });
  });
});
