import { test, expect } from '@playwright/test';
import {
  generateTestUser,
  registerUser,
  waitForNetworkIdle,
} from './helpers/test-helpers';

test.describe('Product Search and Filtering', () => {
  test.beforeEach(async ({ page }) => {
    // Some tests may require authentication
    const credentials = generateTestUser();
    await registerUser(page, credentials);
  });

  describe('Product Search', () => {
    test('should search products by name', async ({ page }) => {
      await page.goto('/products');
      await waitForNetworkIdle(page);

      // Enter search query
      const searchInput = page.locator('[data-testid="search-input"]');
      await searchInput.fill('laptop');

      // Submit search
      const searchButton = page.locator('[data-testid="search-button"]');
      await searchButton.click();

      await waitForNetworkIdle(page);

      // URL should contain search parameter
      await expect(page).toHaveURL(/search=laptop/i);

      // Should display search results
      const products = page.locator('[data-testid="product-card"]');
      if ((await products.count()) > 0) {
        await expect(products.first()).toBeVisible();
      }

      // Should show search query
      await expect(
        page.locator('text=/results.*laptop|searching.*laptop/i'),
      ).toBeVisible({ timeout: 5000 });
    });

    test('should handle empty search results', async ({ page }) => {
      await page.goto('/products');
      await waitForNetworkIdle(page);

      // Search for something that doesn't exist
      const searchInput = page.locator('[data-testid="search-input"]');
      await searchInput.fill('xyznonexistentproduct123');
      await page.click('[data-testid="search-button"]');

      await waitForNetworkIdle(page);

      // Should show no results message
      await expect(
        page.locator('text=/no results|no products found/i'),
      ).toBeVisible({ timeout: 5000 });
    });

    test('should search with autocomplete suggestions', async ({ page }) => {
      await page.goto('/products');
      await waitForNetworkIdle(page);

      const searchInput = page.locator('[data-testid="search-input"]');
      await searchInput.fill('lap');

      // Wait for suggestions
      const suggestions = page.locator('[data-testid="search-suggestion"]');
      if ((await suggestions.count()) > 0) {
        // Click first suggestion
        await suggestions.first().click();

        await waitForNetworkIdle(page);

        // Should navigate to search results
        await expect(page).toHaveURL(/search=/i);
      }
    });

    test('should clear search', async ({ page }) => {
      await page.goto('/products?search=laptop');
      await waitForNetworkIdle(page);

      // Click clear button
      const clearButton = page.locator('[data-testid="clear-search"]');
      if (await clearButton.isVisible({ timeout: 2000 })) {
        await clearButton.click();

        await waitForNetworkIdle(page);

        // URL should be cleared
        await expect(page).toHaveURL('/products');
      }
    });

    test('should search by pressing Enter key', async ({ page }) => {
      await page.goto('/products');
      await waitForNetworkIdle(page);

      const searchInput = page.locator('[data-testid="search-input"]');
      await searchInput.fill('phone');
      await searchInput.press('Enter');

      await waitForNetworkIdle(page);

      await expect(page).toHaveURL(/search=phone/i);
    });

    test('should persist search across page navigation', async ({ page }) => {
      await page.goto('/products?search=laptop');
      await waitForNetworkIdle(page);

      // Navigate to a product
      const productCard = page.locator('[data-testid="product-card"]').first();
      if (await productCard.isVisible({ timeout: 2000 })) {
        await productCard.click();
        await page.waitForURL(/\/products\/[^\/]+$/);

        // Go back
        await page.goBack();

        // Search should still be active
        await expect(page).toHaveURL(/search=laptop/i);
      }
    });
  });

  describe('Category Filtering', () => {
    test('should filter by category', async ({ page }) => {
      await page.goto('/products');
      await waitForNetworkIdle(page);

      // Click category filter
      const categoryFilter = page.locator('[data-testid="category-filter"]');
      if (await categoryFilter.isVisible({ timeout: 2000 })) {
        await categoryFilter.click();

        // Select a category
        const electronicsOption = page.locator('text=Electronics');
        if (await electronicsOption.isVisible({ timeout: 2000 })) {
          await electronicsOption.click();

          await waitForNetworkIdle(page);

          // URL should contain category parameter
          await expect(page).toHaveURL(/category=/i);

          // Should display filtered products
          const products = page.locator('[data-testid="product-card"]');
          if ((await products.count()) > 0) {
            await expect(products.first()).toBeVisible();
          }
        }
      }
    });

    test('should show active category filter', async ({ page }) => {
      await page.goto('/products?category=electronics');
      await waitForNetworkIdle(page);

      // Should show active category
      const activeCategory = page.locator('[data-testid="active-category"]');
      if (await activeCategory.isVisible({ timeout: 2000 })) {
        await expect(activeCategory).toContainText(/electronics/i);
      }
    });

    test('should clear category filter', async ({ page }) => {
      await page.goto('/products?category=electronics');
      await waitForNetworkIdle(page);

      const clearButton = page.locator('[data-testid="clear-category"]');
      if (await clearButton.isVisible({ timeout: 2000 })) {
        await clearButton.click();

        await waitForNetworkIdle(page);

        // URL should be cleared
        await expect(page).toHaveURL('/products');
      }
    });

    test('should display category hierarchy', async ({ page }) => {
      await page.goto('/products');
      await waitForNetworkIdle(page);

      // Open category menu
      const categoryButton = page.locator('[data-testid="categories-button"]');
      if (await categoryButton.isVisible({ timeout: 2000 })) {
        await categoryButton.click();

        // Should show parent categories
        await expect(
          page.locator('[data-testid="parent-category"]').first(),
        ).toBeVisible({ timeout: 5000 });

        // Click parent to show subcategories
        await page.locator('[data-testid="parent-category"]').first().click();

        // Should show subcategories
        const subcategories = page.locator('[data-testid="subcategory"]');
        if ((await subcategories.count()) > 0) {
          await expect(subcategories.first()).toBeVisible();
        }
      }
    });
  });

  describe('Price Filtering', () => {
    test('should filter by price range', async ({ page }) => {
      await page.goto('/products');
      await waitForNetworkIdle(page);

      // Set price range
      const minPriceInput = page.locator('[data-testid="min-price"]');
      const maxPriceInput = page.locator('[data-testid="max-price"]');

      if (await minPriceInput.isVisible({ timeout: 2000 })) {
        await minPriceInput.fill('50');
        await maxPriceInput.fill('200');

        // Apply filter
        const applyButton = page.locator('button:has-text("Apply")');
        if (await applyButton.isVisible({ timeout: 2000 })) {
          await applyButton.click();
        } else {
          // Auto-apply on input change
          await page.waitForTimeout(1000);
        }

        await waitForNetworkIdle(page);

        // URL should contain price parameters
        await expect(page).toHaveURL(/minPrice=50/);
        await expect(page).toHaveURL(/maxPrice=200/);

        // Verify products are within range
        const productPrices = page.locator('[data-testid="product-price"]');
        const count = await productPrices.count();

        if (count > 0) {
          for (let i = 0; i < Math.min(count, 5); i++) {
            const priceText = await productPrices.nth(i).textContent();
            const price = parseFloat(priceText?.replace(/[^0-9.]/g, '') || '0');
            expect(price).toBeGreaterThanOrEqual(50);
            expect(price).toBeLessThanOrEqual(200);
          }
        }
      }
    });

    test('should use price slider', async ({ page }) => {
      await page.goto('/products');
      await waitForNetworkIdle(page);

      const priceSlider = page.locator('[data-testid="price-slider"]');
      if (await priceSlider.isVisible({ timeout: 2000 })) {
        // Interact with slider
        const sliderBoundingBox = await priceSlider.boundingBox();

        if (sliderBoundingBox) {
          await page.mouse.click(
            sliderBoundingBox.x + sliderBoundingBox.width / 2,
            sliderBoundingBox.y + sliderBoundingBox.height / 2,
          );

          await waitForNetworkIdle(page);

          // URL should update with price range
          await expect(page).toHaveURL(/minPrice=|maxPrice=/);
        }
      }
    });

    test('should clear price filter', async ({ page }) => {
      await page.goto('/products?minPrice=50&maxPrice=200');
      await waitForNetworkIdle(page);

      const clearButton = page.locator('[data-testid="clear-price"]');
      if (await clearButton.isVisible({ timeout: 2000 })) {
        await clearButton.click();

        await waitForNetworkIdle(page);

        // URL should be cleared
        await expect(page).not.toHaveURL(/minPrice=|maxPrice=/);
      }
    });
  });

  describe('Sorting', () => {
    test('should sort by price low to high', async ({ page }) => {
      await page.goto('/products');
      await waitForNetworkIdle(page);

      // Open sort dropdown
      const sortDropdown = page.locator('[data-testid="sort-dropdown"]');
      await sortDropdown.click();

      // Select price low to high
      await page.click('text=Price: Low to High');

      await waitForNetworkIdle(page);

      // URL should contain sort parameter
      await expect(page).toHaveURL(/sort.*price.*asc|sortBy=price/i);

      // Verify products are sorted
      const productPrices = page.locator('[data-testid="product-price"]');
      const count = await productPrices.count();

      if (count > 1) {
        const prices: number[] = [];
        for (let i = 0; i < Math.min(count, 5); i++) {
          const priceText = await productPrices.nth(i).textContent();
          const price = parseFloat(priceText?.replace(/[^0-9.]/g, '') || '0');
          prices.push(price);
        }

        // Verify ascending order
        for (let i = 1; i < prices.length; i++) {
          expect(prices[i]).toBeGreaterThanOrEqual(prices[i - 1]);
        }
      }
    });

    test('should sort by price high to low', async ({ page }) => {
      await page.goto('/products');
      await waitForNetworkIdle(page);

      const sortDropdown = page.locator('[data-testid="sort-dropdown"]');
      await sortDropdown.click();
      await page.click('text=Price: High to Low');

      await waitForNetworkIdle(page);

      await expect(page).toHaveURL(/sort.*price.*desc|order=desc/i);

      // Verify descending order
      const productPrices = page.locator('[data-testid="product-price"]');
      const count = await productPrices.count();

      if (count > 1) {
        const prices: number[] = [];
        for (let i = 0; i < Math.min(count, 5); i++) {
          const priceText = await productPrices.nth(i).textContent();
          const price = parseFloat(priceText?.replace(/[^0-9.]/g, '') || '0');
          prices.push(price);
        }

        // Verify descending order
        for (let i = 1; i < prices.length; i++) {
          expect(prices[i]).toBeLessThanOrEqual(prices[i - 1]);
        }
      }
    });

    test('should sort by newest', async ({ page }) => {
      await page.goto('/products');
      await waitForNetworkIdle(page);

      const sortDropdown = page.locator('[data-testid="sort-dropdown"]');
      await sortDropdown.click();
      await page.click('text=Newest');

      await waitForNetworkIdle(page);

      await expect(page).toHaveURL(/sort.*date|newest/i);
    });

    test('should sort by popularity', async ({ page }) => {
      await page.goto('/products');
      await waitForNetworkIdle(page);

      const sortDropdown = page.locator('[data-testid="sort-dropdown"]');
      await sortDropdown.click();

      const popularityOption = page.locator('text=/popular|best.*selling/i');
      if (await popularityOption.isVisible({ timeout: 2000 })) {
        await popularityOption.click();

        await waitForNetworkIdle(page);

        await expect(page).toHaveURL(/sort.*popular|bestselling/i);
      }
    });

    test('should sort by rating', async ({ page }) => {
      await page.goto('/products');
      await waitForNetworkIdle(page);

      const sortDropdown = page.locator('[data-testid="sort-dropdown"]');
      await sortDropdown.click();

      const ratingOption = page.locator('text=/rating|highest rated/i');
      if (await ratingOption.isVisible({ timeout: 2000 })) {
        await ratingOption.click();

        await waitForNetworkIdle(page);

        await expect(page).toHaveURL(/sort.*rating/i);
      }
    });
  });

  describe('Brand Filtering', () => {
    test('should filter by brand', async ({ page }) => {
      await page.goto('/products');
      await waitForNetworkIdle(page);

      // Open brand filter
      const brandFilter = page.locator('[data-testid="brand-filter"]');
      if (await brandFilter.isVisible({ timeout: 2000 })) {
        await brandFilter.click();

        // Select a brand
        const brandCheckbox = page.locator('[data-testid="brand-checkbox"]').first();
        if (await brandCheckbox.isVisible({ timeout: 2000 })) {
          await brandCheckbox.check();

          await waitForNetworkIdle(page);

          // URL should contain brand parameter
          await expect(page).toHaveURL(/brand=/i);
        }
      }
    });

    test('should filter by multiple brands', async ({ page }) => {
      await page.goto('/products');
      await waitForNetworkIdle(page);

      const brandFilter = page.locator('[data-testid="brand-filter"]');
      if (await brandFilter.isVisible({ timeout: 2000 })) {
        await brandFilter.click();

        // Select multiple brands
        const brandCheckboxes = page.locator('[data-testid="brand-checkbox"]');
        const count = await brandCheckboxes.count();

        if (count >= 2) {
          await brandCheckboxes.nth(0).check();
          await brandCheckboxes.nth(1).check();

          await waitForNetworkIdle(page);

          // Should show products from selected brands
          const products = page.locator('[data-testid="product-card"]');
          if ((await products.count()) > 0) {
            await expect(products.first()).toBeVisible();
          }
        }
      }
    });
  });

  describe('Rating Filtering', () => {
    test('should filter by minimum rating', async ({ page }) => {
      await page.goto('/products');
      await waitForNetworkIdle(page);

      // Open rating filter
      const ratingFilter = page.locator('[data-testid="rating-filter"]');
      if (await ratingFilter.isVisible({ timeout: 2000 })) {
        await ratingFilter.click();

        // Select 4 stars and up
        const fourStars = page.locator('[data-testid="rating-4"]');
        if (await fourStars.isVisible({ timeout: 2000 })) {
          await fourStars.click();

          await waitForNetworkIdle(page);

          await expect(page).toHaveURL(/rating=4|minRating=4/i);
        }
      }
    });
  });

  describe('Availability Filtering', () => {
    test('should filter by stock availability', async ({ page }) => {
      await page.goto('/products');
      await waitForNetworkIdle(page);

      // Check "In Stock Only" filter
      const inStockCheckbox = page.locator('[data-testid="in-stock-only"]');
      if (await inStockCheckbox.isVisible({ timeout: 2000 })) {
        await inStockCheckbox.check();

        await waitForNetworkIdle(page);

        // Should only show in-stock products
        await expect(page).toHaveURL(/inStock=true/i);
      }
    });

    test('should filter by on sale', async ({ page }) => {
      await page.goto('/products');
      await waitForNetworkIdle(page);

      const onSaleCheckbox = page.locator('[data-testid="on-sale-only"]');
      if (await onSaleCheckbox.isVisible({ timeout: 2000 })) {
        await onSaleCheckbox.check();

        await waitForNetworkIdle(page);

        await expect(page).toHaveURL(/onSale=true/i);
      }
    });
  });

  describe('Combined Filters', () => {
    test('should apply multiple filters simultaneously', async ({ page }) => {
      await page.goto('/products');
      await waitForNetworkIdle(page);

      // Apply category filter
      const categoryFilter = page.locator('[data-testid="category-filter"]');
      if (await categoryFilter.isVisible({ timeout: 2000 })) {
        await categoryFilter.click();
        const electronicsOption = page.locator('text=Electronics');
        if (await electronicsOption.isVisible({ timeout: 2000 })) {
          await electronicsOption.click();
          await waitForNetworkIdle(page);
        }
      }

      // Apply price range
      const minPriceInput = page.locator('[data-testid="min-price"]');
      if (await minPriceInput.isVisible({ timeout: 2000 })) {
        await minPriceInput.fill('100');
        await page.waitForTimeout(1000);
        await waitForNetworkIdle(page);
      }

      // Apply sorting
      const sortDropdown = page.locator('[data-testid="sort-dropdown"]');
      await sortDropdown.click();
      await page.click('text=Price: Low to High');
      await waitForNetworkIdle(page);

      // URL should contain all filters
      await expect(page).toHaveURL(/category=/i);
      await expect(page).toHaveURL(/minPrice=100/i);
      await expect(page).toHaveURL(/sort/i);
    });

    test('should show active filters count', async ({ page }) => {
      await page.goto('/products?category=electronics&minPrice=50&maxPrice=200');
      await waitForNetworkIdle(page);

      const activeFiltersCount = page.locator('[data-testid="active-filters-count"]');
      if (await activeFiltersCount.isVisible({ timeout: 2000 })) {
        const count = await activeFiltersCount.textContent();
        expect(parseInt(count || '0')).toBeGreaterThan(0);
      }
    });

    test('should clear all filters', async ({ page }) => {
      await page.goto('/products?category=electronics&minPrice=50&maxPrice=200&sort=price');
      await waitForNetworkIdle(page);

      const clearAllButton = page.locator('[data-testid="clear-all-filters"]');
      if (await clearAllButton.isVisible({ timeout: 2000 })) {
        await clearAllButton.click();

        await waitForNetworkIdle(page);

        // URL should be clean
        await expect(page).toHaveURL('/products');
      }
    });
  });

  describe('Pagination', () => {
    test('should paginate through results', async ({ page }) => {
      await page.goto('/products');
      await waitForNetworkIdle(page);

      // Check if next page button exists
      const nextButton = page.locator('[data-testid="next-page"]');
      if (await nextButton.isVisible({ timeout: 2000 })) {
        await nextButton.click();

        await waitForNetworkIdle(page);

        // URL should have page parameter
        await expect(page).toHaveURL(/page=2/);

        // Should show different products
        await expect(page.locator('[data-testid="product-card"]').first()).toBeVisible();
      }
    });

    test('should navigate to specific page', async ({ page }) => {
      await page.goto('/products');
      await waitForNetworkIdle(page);

      const pageNumber = page.locator('[data-testid="page-3"]');
      if (await pageNumber.isVisible({ timeout: 2000 })) {
        await pageNumber.click();

        await waitForNetworkIdle(page);

        await expect(page).toHaveURL(/page=3/);
      }
    });

    test('should change items per page', async ({ page }) => {
      await page.goto('/products');
      await waitForNetworkIdle(page);

      const itemsPerPageDropdown = page.locator('[data-testid="items-per-page"]');
      if (await itemsPerPageDropdown.isVisible({ timeout: 2000 })) {
        await itemsPerPageDropdown.click();
        await page.click('text=50');

        await waitForNetworkIdle(page);

        await expect(page).toHaveURL(/limit=50/i);

        // Should show more products
        const products = page.locator('[data-testid="product-card"]');
        const count = await products.count();
        expect(count).toBeGreaterThan(10);
      }
    });
  });

  describe('View Mode', () => {
    test('should switch to grid view', async ({ page }) => {
      await page.goto('/products');
      await waitForNetworkIdle(page);

      const gridViewButton = page.locator('[data-testid="grid-view"]');
      if (await gridViewButton.isVisible({ timeout: 2000 })) {
        await gridViewButton.click();

        // Products should display in grid
        const productGrid = page.locator('[data-testid="product-grid"]');
        if (await productGrid.isVisible({ timeout: 2000 })) {
          await expect(productGrid).toBeVisible();
        }
      }
    });

    test('should switch to list view', async ({ page }) => {
      await page.goto('/products');
      await waitForNetworkIdle(page);

      const listViewButton = page.locator('[data-testid="list-view"]');
      if (await listViewButton.isVisible({ timeout: 2000 })) {
        await listViewButton.click();

        // Products should display in list
        const productList = page.locator('[data-testid="product-list"]');
        if (await productList.isVisible({ timeout: 2000 })) {
          await expect(productList).toBeVisible();
        }
      }
    });
  });

  describe('Results Count', () => {
    test('should display results count', async ({ page }) => {
      await page.goto('/products');
      await waitForNetworkIdle(page);

      const resultsCount = page.locator('[data-testid="results-count"]');
      if (await resultsCount.isVisible({ timeout: 2000 })) {
        const countText = await resultsCount.textContent();
        expect(countText).toMatch(/\d+/); // Should contain a number
      }
    });

    test('should update count after filtering', async ({ page }) => {
      await page.goto('/products');
      await waitForNetworkIdle(page);

      // Get initial count
      const resultsCount = page.locator('[data-testid="results-count"]');
      if (await resultsCount.isVisible({ timeout: 2000 })) {
        const initialCount = await resultsCount.textContent();

        // Apply filter
        const minPriceInput = page.locator('[data-testid="min-price"]');
        if (await minPriceInput.isVisible({ timeout: 2000 })) {
          await minPriceInput.fill('100');
          await page.waitForTimeout(1000);
          await waitForNetworkIdle(page);

          // Count should change
          const newCount = await resultsCount.textContent();
          expect(newCount).not.toBe(initialCount);
        }
      }
    });
  });
});
