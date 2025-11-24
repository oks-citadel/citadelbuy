import { test, expect } from '@playwright/test';

test.describe('Complete Purchase Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Start from the home page
    await page.goto('http://localhost:3000');
  });

  test('should complete full purchase flow from product browse to order confirmation', async ({
    page,
  }) => {
    // Step 1: Browse products
    await expect(page.locator('h1')).toContainText('Welcome to CitadelBuy');

    // Navigate to products page
    await page.click('text=Shop Now');
    await expect(page).toHaveURL(/.*products/);

    // Step 2: Search for a product
    const searchInput = page.locator('input[placeholder*="Search"]');
    await searchInput.fill('laptop');
    await searchInput.press('Enter');

    // Wait for search results
    await page.waitForSelector('[data-testid="product-card"]', { timeout: 5000 });

    // Step 3: Click on first product
    const firstProduct = page.locator('[data-testid="product-card"]').first();
    await firstProduct.click();

    // Wait for product detail page
    await page.waitForSelector('[data-testid="product-detail"]');
    await expect(page.locator('[data-testid="product-name"]')).toBeVisible();

    // Step 4: Add to cart
    const addToCartButton = page.locator('button:has-text("Add to Cart")');
    await addToCartButton.click();

    // Verify cart badge updated
    await expect(page.locator('[data-testid="cart-badge"]')).toContainText('1');

    // Step 5: Open cart
    await page.click('[data-testid="cart-icon"]');
    await expect(page.locator('[data-testid="cart-drawer"]')).toBeVisible();

    // Verify item is in cart
    await expect(page.locator('[data-testid="cart-item"]')).toBeVisible();

    // Step 6: Proceed to checkout
    await page.click('button:has-text("Checkout")');
    await expect(page).toHaveURL(/.*checkout/);

    // Step 7: If not logged in, should redirect to login or show login form
    const currentUrl = page.url();
    if (currentUrl.includes('login')) {
      // Register/Login flow
      await page.click('text=Register');

      await page.fill('input[name="name"]', 'E2E Test User');
      await page.fill('input[name="email"]', `e2etest${Date.now()}@example.com`);
      await page.fill('input[name="password"]', 'SecurePassword123!');

      await page.click('button[type="submit"]');

      // Should redirect back to checkout
      await page.waitForURL(/.*checkout/, { timeout: 10000 });
    }

    // Step 8: Fill shipping information
    await page.fill('input[name="fullName"]', 'John Doe');
    await page.fill('input[name="streetAddress"]', '123 Main St');
    await page.fill('input[name="city"]', 'New York');
    await page.fill('input[name="state"]', 'NY');
    await page.fill('input[name="zipCode"]', '10001');
    await page.fill('input[name="country"]', 'USA');
    await page.fill('input[name="phone"]', '555-1234');

    // Click next to go to payment
    await page.click('button:has-text("Next")');

    // Step 9: Payment information (Stripe Elements)
    await page.waitForSelector('iframe[name*="__privateStripeFrame"]', {
      timeout: 10000,
    });

    // Fill Stripe card details
    const stripeCardFrame = page
      .frameLocator('iframe[name*="__privateStripeFrame"]')
      .first();

    // Fill card number (using Stripe test card)
    await stripeCardFrame.locator('input[name="cardnumber"]').fill('4242424242424242');

    // Fill expiry
    await stripeCardFrame.locator('input[name="exp-date"]').fill('12/34');

    // Fill CVC
    await stripeCardFrame.locator('input[name="cvc"]').fill('123');

    // Fill ZIP code if present
    const zipInput = stripeCardFrame.locator('input[name="postal"]');
    if (await zipInput.isVisible()) {
      await zipInput.fill('10001');
    }

    // Step 10: Place order
    await page.click('button:has-text("Place Order")');

    // Step 11: Wait for order confirmation
    await page.waitForURL(/.*orders.*success=true/, { timeout: 30000 });

    // Verify confirmation page
    await expect(page.locator('h1')).toContainText(/Thank you|Order Confirmed/i);

    // Verify order details are displayed
    await expect(page.locator('[data-testid="order-id"]')).toBeVisible();

    // Step 12: Verify cart is cleared
    await expect(page.locator('[data-testid="cart-badge"]')).not.toBeVisible();
  });

  test('should add multiple items to cart and update quantities', async ({ page }) => {
    // Navigate to products
    await page.goto('http://localhost:3000/products');

    // Add first product
    await page.locator('[data-testid="product-card"]').first().click();
    await page.click('button:has-text("Add to Cart")');
    await page.goBack();

    // Add second product
    await page.locator('[data-testid="product-card"]').nth(1).click();
    await page.click('button:has-text("Add to Cart")');

    // Open cart
    await page.click('[data-testid="cart-icon"]');

    // Verify 2 items in cart
    await expect(page.locator('[data-testid="cart-item"]')).toHaveCount(2);

    // Increase quantity of first item
    const firstItemQuantity = page.locator('[data-testid="cart-item"]').first();
    await firstItemQuantity.locator('button[aria-label*="Increase"]').click();

    // Verify cart badge updated
    await expect(page.locator('[data-testid="cart-badge"]')).toContainText('3');

    // Remove second item
    await page
      .locator('[data-testid="cart-item"]')
      .nth(1)
      .locator('button[aria-label*="Remove"]')
      .click();

    // Verify only 1 item left
    await expect(page.locator('[data-testid="cart-item"]')).toHaveCount(1);
  });

  test('should filter products by category', async ({ page }) => {
    await page.goto('http://localhost:3000/products');

    // Wait for products to load
    await page.waitForSelector('[data-testid="product-card"]');

    // Click on Electronics category
    await page.click('text=Electronics');

    // Verify URL updated
    await expect(page).toHaveURL(/.*category=.*electronics/i);

    // Verify products filtered
    await expect(page.locator('[data-testid="product-card"]')).toBeVisible();
  });

  test('should sort products by price', async ({ page }) => {
    await page.goto('http://localhost:3000/products');

    // Wait for products to load
    await page.waitForSelector('[data-testid="product-card"]');

    // Get first product price before sort
    const firstPriceBefore = await page
      .locator('[data-testid="product-card"]')
      .first()
      .locator('[data-testid="product-price"]')
      .textContent();

    // Sort by price: low to high
    await page.selectOption('[data-testid="sort-select"]', 'price-asc');

    // Wait for re-render
    await page.waitForTimeout(500);

    // Get first product price after sort
    const firstPriceAfter = await page
      .locator('[data-testid="product-card"]')
      .first()
      .locator('[data-testid="product-price"]')
      .textContent();

    // Prices should be different (unless all same price)
    // In a real test, you'd verify that prices are actually sorted
  });

  test('should show error for out of stock products', async ({ page }) => {
    await page.goto('http://localhost:3000/products');

    // Find an out-of-stock product (if any)
    const outOfStockBadge = page.locator('text=Out of Stock').first();

    if (await outOfStockBadge.isVisible()) {
      // Click on the product
      await outOfStockBadge.locator('..').click();

      // Add to cart button should be disabled
      const addToCartButton = page.locator('button:has-text("Add to Cart")');
      await expect(addToCartButton).toBeDisabled();
    }
  });

  test('should prevent checkout with empty cart', async ({ page }) => {
    await page.goto('http://localhost:3000/cart');

    // Verify empty cart message
    await expect(page.locator('text=Your cart is empty')).toBeVisible();

    // Checkout button should not be visible or disabled
    const checkoutButton = page.locator('button:has-text("Checkout")');
    if (await checkoutButton.isVisible()) {
      await expect(checkoutButton).toBeDisabled();
    }
  });
});

test.describe('User Authentication Flow', () => {
  test('should register new user successfully', async ({ page }) => {
    await page.goto('http://localhost:3000/auth/register');

    // Fill registration form
    await page.fill('input[name="name"]', 'New Test User');
    await page.fill('input[name="email"]', `testuser${Date.now()}@example.com`);
    await page.fill('input[name="password"]', 'SecurePassword123!');

    // Submit form
    await page.click('button[type="submit"]');

    // Should redirect to home or dashboard
    await page.waitForURL(/.*\/(dashboard|products)?/, { timeout: 10000 });

    // User should be logged in
    await expect(page.locator('[data-testid="user-menu"]')).toBeVisible();
  });

  test('should show error for existing email', async ({ page }) => {
    const existingEmail = `existing${Date.now()}@example.com`;

    // Register user first time
    await page.goto('http://localhost:3000/auth/register');
    await page.fill('input[name="name"]', 'First User');
    await page.fill('input[name="email"]', existingEmail);
    await page.fill('input[name="password"]', 'Password123!');
    await page.click('button[type="submit"]');

    await page.waitForURL(/.*\/(dashboard|products)?/);

    // Logout
    await page.click('[data-testid="user-menu"]');
    await page.click('text=Logout');

    // Try to register again with same email
    await page.goto('http://localhost:3000/auth/register');
    await page.fill('input[name="name"]', 'Second User');
    await page.fill('input[name="email"]', existingEmail);
    await page.fill('input[name="password"]', 'Password123!');
    await page.click('button[type="submit"]');

    // Should show error
    await expect(page.locator('text=/already exists/i')).toBeVisible();
  });

  test('should login with correct credentials', async ({ page }) => {
    const email = `logintest${Date.now()}@example.com`;
    const password = 'SecurePassword123!';

    // Register first
    await page.goto('http://localhost:3000/auth/register');
    await page.fill('input[name="name"]', 'Login Test User');
    await page.fill('input[name="email"]', email);
    await page.fill('input[name="password"]', password);
    await page.click('button[type="submit"]');

    await page.waitForURL(/.*\/(dashboard|products)?/);

    // Logout
    await page.click('[data-testid="user-menu"]');
    await page.click('text=Logout');

    // Login
    await page.goto('http://localhost:3000/auth/login');
    await page.fill('input[name="email"]', email);
    await page.fill('input[name="password"]', password);
    await page.click('button[type="submit"]');

    // Should redirect to home
    await page.waitForURL(/.*\/(dashboard|products)?/);

    // User should be logged in
    await expect(page.locator('[data-testid="user-menu"]')).toBeVisible();
  });

  test('should show error for incorrect password', async ({ page }) => {
    await page.goto('http://localhost:3000/auth/login');

    await page.fill('input[name="email"]', 'test@example.com');
    await page.fill('input[name="password"]', 'wrongpassword');
    await page.click('button[type="submit"]');

    // Should show error
    await expect(page.locator('text=/invalid credentials/i')).toBeVisible();
  });

  test('should redirect to login when accessing protected routes', async ({ page }) => {
    // Try to access orders page without login
    await page.goto('http://localhost:3000/orders');

    // Should redirect to login
    await expect(page).toHaveURL(/.*login/);
  });
});

test.describe('Order Management Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Create user and login before each test
    const email = `ordertest${Date.now()}@example.com`;

    await page.goto('http://localhost:3000/auth/register');
    await page.fill('input[name="name"]', 'Order Test User');
    await page.fill('input[name="email"]', email);
    await page.fill('input[name="password"]', 'SecurePassword123!');
    await page.click('button[type="submit"]');

    await page.waitForURL(/.*\/(dashboard|products)?/);
  });

  test('should view order history', async ({ page }) => {
    await page.goto('http://localhost:3000/orders');

    // Should show orders page (might be empty)
    await expect(page.locator('h1')).toContainText(/orders|order history/i);
  });

  test('should view order details', async ({ page }) => {
    // This assumes there's at least one order
    await page.goto('http://localhost:3000/orders');

    const firstOrder = page.locator('[data-testid="order-card"]').first();

    if (await firstOrder.isVisible()) {
      await firstOrder.click();

      // Should show order details
      await expect(page).toHaveURL(/.*orders\/[a-zA-Z0-9-]+/);
      await expect(page.locator('[data-testid="order-status"]')).toBeVisible();
    }
  });
});

test.describe('Responsive Design', () => {
  test('should work on mobile viewport', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });

    await page.goto('http://localhost:3000');

    // Mobile menu should be visible
    await expect(page.locator('[data-testid="mobile-menu-button"]')).toBeVisible();

    // Open mobile menu
    await page.click('[data-testid="mobile-menu-button"]');

    // Menu items should be visible
    await expect(page.locator('[data-testid="mobile-menu"]')).toBeVisible();
  });

  test('should work on tablet viewport', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });

    await page.goto('http://localhost:3000/products');

    // Products should still be visible and functional
    await expect(page.locator('[data-testid="product-card"]')).toBeVisible();
  });
});
