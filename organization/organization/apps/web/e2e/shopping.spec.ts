import { test, expect } from '@playwright/test';
import {
  generateTestUser,
  registerUser,
  addToCart,
  goToCart,
  waitForNetworkIdle,
} from './helpers/test-helpers';

test.describe('Shopping Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Register and login user
    const credentials = generateTestUser();
    await registerUser(page, credentials);
  });

  test.describe('Browse Products', () => {
    test('should display product list', async ({ page }) => {
      await page.goto('/products');

      // Wait for products to load
      await waitForNetworkIdle(page);

      // Should show products
      await expect(page.locator('[data-testid="product-card"]')).toHaveCount(
        { min: 1 },
        { timeout: 10000 },
      );
    });

    test('should filter products by category', async ({ page }) => {
      await page.goto('/products');
      await waitForNetworkIdle(page);

      // Click on category filter
      await page.click('[data-testid="category-filter"]');
      await page.click('text=Electronics');

      // Wait for filtered results
      await waitForNetworkIdle(page);

      // URL should update with category
      await expect(page).toHaveURL(/category=electronics/i);
    });

    test('should search for products', async ({ page }) => {
      await page.goto('/products');

      // Enter search query
      await page.fill('[data-testid="search-input"]', 'laptop');
      await page.click('[data-testid="search-button"]');

      // Wait for results
      await waitForNetworkIdle(page);

      // Should show search results
      await expect(page.locator('[data-testid="product-card"]')).toHaveCount({
        min: 1,
      });
    });

    test('should sort products by price', async ({ page }) => {
      await page.goto('/products');
      await waitForNetworkIdle(page);

      // Open sort dropdown
      await page.click('[data-testid="sort-dropdown"]');
      await page.click('text=Price: Low to High');

      // Wait for sorted results
      await waitForNetworkIdle(page);

      // Verify URL has sort parameter
      await expect(page).toHaveURL(/sort=price/i);
    });

    test('should view product details', async ({ page }) => {
      await page.goto('/products');
      await waitForNetworkIdle(page);

      // Click first product
      await page.click('[data-testid="product-card"]');

      // Should navigate to product detail page
      await page.waitForURL(/\/products\/[^\/]+$/);

      // Should show product details
      await expect(page.locator('[data-testid="product-name"]')).toBeVisible();
      await expect(page.locator('[data-testid="product-price"]')).toBeVisible();
      await expect(page.locator('[data-testid="product-description"]')).toBeVisible();
    });

    test('should paginate through products', async ({ page }) => {
      await page.goto('/products');
      await waitForNetworkIdle(page);

      // Check if pagination exists
      const nextButton = page.locator('[data-testid="next-page"]');

      if (await nextButton.isVisible()) {
        await nextButton.click();
        await waitForNetworkIdle(page);

        // URL should update with page parameter
        await expect(page).toHaveURL(/page=2/);
      }
    });
  });

  test.describe('Product Details', () => {
    test('should add product to cart from detail page', async ({ page }) => {
      await page.goto('/products');
      await waitForNetworkIdle(page);

      // Go to product detail
      await page.click('[data-testid="product-card"]');
      await page.waitForURL(/\/products\/[^\/]+$/);

      // Click add to cart
      await page.click('button:has-text("Add to Cart")');

      // Should show success message
      await expect(page.locator('text=Added to cart')).toBeVisible();

      // Cart count should update
      const cartBadge = page.locator('[data-testid="cart-badge"]');
      await expect(cartBadge).toHaveText('1');
    });

    test('should select product quantity', async ({ page }) => {
      await page.goto('/products');
      await waitForNetworkIdle(page);

      await page.click('[data-testid="product-card"]');
      await page.waitForURL(/\/products\/[^\/]+$/);

      // Change quantity
      await page.click('[data-testid="quantity-input"]');
      await page.fill('[data-testid="quantity-input"]', '3');

      // Add to cart
      await page.click('button:has-text("Add to Cart")');

      // Go to cart
      await goToCart(page);

      // Should have 3 items
      const quantity = await page.locator('[data-testid="cart-item-quantity"]').first();
      await expect(quantity).toHaveValue('3');
    });

    test('should show product images in gallery', async ({ page }) => {
      await page.goto('/products');
      await waitForNetworkIdle(page);

      await page.click('[data-testid="product-card"]');
      await page.waitForURL(/\/products\/[^\/]+$/);

      // Should show main image
      await expect(page.locator('[data-testid="product-main-image"]')).toBeVisible();

      // Should show thumbnail gallery
      const thumbnails = page.locator('[data-testid="product-thumbnail"]');
      await expect(thumbnails).toHaveCount({ min: 1 });
    });

    test('should show product reviews', async ({ page }) => {
      await page.goto('/products');
      await waitForNetworkIdle(page);

      await page.click('[data-testid="product-card"]');
      await page.waitForURL(/\/products\/[^\/]+$/);

      // Scroll to reviews section
      await page.locator('[data-testid="reviews-section"]').scrollIntoViewIfNeeded();

      // Should show reviews or "no reviews" message
      const reviews = page.locator('[data-testid="review-item"]');
      const count = await reviews.count();

      if (count === 0) {
        await expect(page.locator('text=/no reviews/i')).toBeVisible();
      } else {
        await expect(reviews.first()).toBeVisible();
      }
    });
  });

  test.describe('Shopping Cart', () => {
    test('should add item to cart', async ({ page }) => {
      await page.goto('/products');
      await waitForNetworkIdle(page);

      // Add product to cart
      const productCard = page.locator('[data-testid="product-card"]').first();
      await productCard.click();
      await page.click('button:has-text("Add to Cart")');

      // Cart count should increase
      const cartBadge = page.locator('[data-testid="cart-badge"]');
      await expect(cartBadge).toHaveText('1');
    });

    test('should view cart', async ({ page }) => {
      await page.goto('/products');
      await waitForNetworkIdle(page);

      // Add item to cart
      await page.click('[data-testid="product-card"]');
      await page.click('button:has-text("Add to Cart")');

      // Go to cart
      await goToCart(page);

      // Should show cart items
      await expect(page.locator('[data-testid="cart-item"]')).toHaveCount(1);
    });

    test('should update cart quantity', async ({ page }) => {
      await page.goto('/products');
      await waitForNetworkIdle(page);

      // Add item to cart
      await page.click('[data-testid="product-card"]');
      await page.click('button:has-text("Add to Cart")');

      // Go to cart
      await goToCart(page);

      // Update quantity
      const quantityInput = page.locator('[data-testid="cart-item-quantity"]').first();
      await quantityInput.fill('3');
      await page.click('[data-testid="update-quantity"]');

      // Wait for update
      await waitForNetworkIdle(page);

      // Total should update
      const total = page.locator('[data-testid="cart-total"]');
      await expect(total).toBeVisible();
    });

    test('should remove item from cart', async ({ page }) => {
      await page.goto('/products');
      await waitForNetworkIdle(page);

      // Add item
      await page.click('[data-testid="product-card"]');
      await page.click('button:has-text("Add to Cart")');

      // Go to cart
      await goToCart(page);

      // Remove item
      await page.click('[data-testid="remove-cart-item"]');

      // Confirm removal if modal appears
      const confirmButton = page.locator('button:has-text("Remove")');
      if (await confirmButton.isVisible({ timeout: 2000 })) {
        await confirmButton.click();
      }

      // Cart should be empty
      await expect(page.locator('text=/empty.*cart|no items/i')).toBeVisible();
    });

    test('should clear entire cart', async ({ page }) => {
      await page.goto('/products');
      await waitForNetworkIdle(page);

      // Add multiple items
      await page.click('[data-testid="product-card"]');
      await page.click('button:has-text("Add to Cart")');

      await page.goto('/products');
      await page.locator('[data-testid="product-card"]').nth(1).click();
      await page.click('button:has-text("Add to Cart")');

      // Go to cart
      await goToCart(page);

      // Clear cart
      await page.click('[data-testid="clear-cart"]');

      // Confirm if modal appears
      const confirmButton = page.locator('button:has-text("Clear")');
      if (await confirmButton.isVisible({ timeout: 2000 })) {
        await confirmButton.click();
      }

      // Cart should be empty
      await expect(page.locator('text=/empty.*cart|no items/i')).toBeVisible();
    });

    test('should apply coupon code', async ({ page }) => {
      await page.goto('/products');
      await waitForNetworkIdle(page);

      // Add item
      await page.click('[data-testid="product-card"]');
      await page.click('button:has-text("Add to Cart")');

      // Go to cart
      await goToCart(page);

      // Apply coupon
      await page.fill('[data-testid="coupon-input"]', 'SAVE10');
      await page.click('[data-testid="apply-coupon"]');

      // Should show success or error message
      await expect(
        page.locator('text=/applied|invalid.*coupon/i'),
      ).toBeVisible({ timeout: 5000 });
    });

    test('should calculate cart total correctly', async ({ page }) => {
      await page.goto('/products');
      await waitForNetworkIdle(page);

      // Add item
      await page.click('[data-testid="product-card"]');
      await page.waitForURL(/\/products\/[^\/]+$/);

      // Get product price
      const priceText = await page.locator('[data-testid="product-price"]').textContent();
      const price = parseFloat(priceText?.replace(/[^0-9.]/g, '') || '0');

      // Add to cart with quantity 2
      await page.fill('[data-testid="quantity-input"]', '2');
      await page.click('button:has-text("Add to Cart")');

      // Go to cart
      await goToCart(page);

      // Check total
      const totalText = await page.locator('[data-testid="cart-total"]').textContent();
      const total = parseFloat(totalText?.replace(/[^0-9.]/g, '') || '0');

      // Total should be price * quantity
      expect(total).toBeCloseTo(price * 2, 2);
    });
  });

  test.describe('Wishlist', () => {
    test('should add product to wishlist', async ({ page }) => {
      await page.goto('/products');
      await waitForNetworkIdle(page);

      // Click wishlist button
      await page.locator('[data-testid="add-to-wishlist"]').first().click();

      // Should show success message
      await expect(page.locator('text=/added.*wishlist/i')).toBeVisible();
    });

    test('should view wishlist', async ({ page }) => {
      await page.goto('/products');
      await waitForNetworkIdle(page);

      // Add to wishlist
      await page.locator('[data-testid="add-to-wishlist"]').first().click();

      // Go to wishlist
      await page.goto('/wishlist');

      // Should show wishlist items
      await expect(page.locator('[data-testid="wishlist-item"]')).toHaveCount(1);
    });

    test('should remove product from wishlist', async ({ page }) => {
      await page.goto('/products');
      await waitForNetworkIdle(page);

      // Add to wishlist
      await page.locator('[data-testid="add-to-wishlist"]').first().click();

      // Go to wishlist
      await page.goto('/wishlist');

      // Remove from wishlist
      await page.click('[data-testid="remove-from-wishlist"]');

      // Wishlist should be empty
      await expect(page.locator('text=/empty.*wishlist|no items/i')).toBeVisible();
    });

    test('should move wishlist item to cart', async ({ page }) => {
      await page.goto('/products');
      await waitForNetworkIdle(page);

      // Add to wishlist
      await page.locator('[data-testid="add-to-wishlist"]').first().click();

      // Go to wishlist
      await page.goto('/wishlist');

      // Move to cart
      await page.click('[data-testid="move-to-cart"]');

      // Should be in cart
      await goToCart(page);
      await expect(page.locator('[data-testid="cart-item"]')).toHaveCount(1);
    });
  });

  test.describe('Product Quick View', () => {
    test('should open quick view modal', async ({ page }) => {
      await page.goto('/products');
      await waitForNetworkIdle(page);

      // Click quick view button
      await page.locator('[data-testid="quick-view"]').first().click();

      // Should show modal
      await expect(page.locator('[data-testid="quick-view-modal"]')).toBeVisible();
    });

    test('should add to cart from quick view', async ({ page }) => {
      await page.goto('/products');
      await waitForNetworkIdle(page);

      // Open quick view
      await page.locator('[data-testid="quick-view"]').first().click();

      // Add to cart
      await page.locator('[data-testid="quick-view-modal"] button:has-text("Add to Cart")').click();

      // Should show success message
      await expect(page.locator('text=Added to cart')).toBeVisible();

      // Cart count should update
      const cartBadge = page.locator('[data-testid="cart-badge"]');
      await expect(cartBadge).toHaveText('1');
    });

    test('should close quick view modal', async ({ page }) => {
      await page.goto('/products');
      await waitForNetworkIdle(page);

      // Open quick view
      await page.locator('[data-testid="quick-view"]').first().click();

      // Close modal
      await page.click('[data-testid="close-modal"]');

      // Modal should be hidden
      await expect(page.locator('[data-testid="quick-view-modal"]')).not.toBeVisible();
    });
  });
});
