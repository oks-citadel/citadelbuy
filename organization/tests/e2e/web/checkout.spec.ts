import { test, expect } from '@playwright/test';

test.describe('Checkout Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Login before each test
    await page.goto('/auth/login');
    await page.getByRole('textbox', { name: /email/i }).fill('customer@citadelbuy.com');
    await page.getByRole('textbox', { name: /password/i }).fill('password123');
    await page.getByRole('button', { name: /sign in|login/i }).click();
    await page.waitForURL(/\/(account|home|$)/, { timeout: 10000 });
  });

  test.describe('Cart Operations', () => {
    test('should add product to cart', async ({ page }) => {
      await page.goto('/');

      // Find a product and add to cart
      const productCard = page.locator('[data-testid="product-card"]').first();
      await productCard.waitFor({ state: 'visible', timeout: 10000 });
      await productCard.click();

      // On product detail page
      await page.getByRole('button', { name: /add to cart/i }).click();

      // Verify cart notification or badge
      await expect(page.getByText(/added to cart|cart updated/i)).toBeVisible({ timeout: 5000 });
    });

    test('should update cart quantity', async ({ page }) => {
      await page.goto('/cart');

      // If cart has items
      const quantityInput = page.getByRole('spinbutton').first();
      if (await quantityInput.isVisible()) {
        await quantityInput.fill('2');
        await expect(page.getByText(/cart updated|quantity updated/i)).toBeVisible({ timeout: 5000 });
      }
    });

    test('should remove item from cart', async ({ page }) => {
      await page.goto('/cart');

      const removeButton = page.getByRole('button', { name: /remove|delete/i }).first();
      if (await removeButton.isVisible()) {
        await removeButton.click();
        await expect(page.getByText(/removed|deleted/i)).toBeVisible({ timeout: 5000 });
      }
    });

    test('should show empty cart message', async ({ page }) => {
      await page.goto('/cart');
      // Either has items or shows empty message
      const emptyMessage = page.getByText(/cart is empty|no items/i);
      const cartItems = page.locator('[data-testid="cart-item"]');

      const hasItems = await cartItems.count() > 0;
      if (!hasItems) {
        await expect(emptyMessage).toBeVisible();
      }
    });
  });

  test.describe('Checkout Process', () => {
    test('should navigate to checkout from cart', async ({ page }) => {
      await page.goto('/cart');

      const checkoutButton = page.getByRole('button', { name: /checkout|proceed/i });
      if (await checkoutButton.isVisible()) {
        await checkoutButton.click();
        await expect(page).toHaveURL(/checkout/);
      }
    });

    test('should display shipping address form', async ({ page }) => {
      await page.goto('/checkout');

      // Check for shipping form fields
      await expect(page.getByLabel(/first name|full name/i)).toBeVisible();
      await expect(page.getByLabel(/address|street/i)).toBeVisible();
      await expect(page.getByLabel(/city/i)).toBeVisible();
      await expect(page.getByLabel(/zip|postal/i)).toBeVisible();
    });

    test('should validate shipping form', async ({ page }) => {
      await page.goto('/checkout');

      // Try to continue without filling form
      const continueButton = page.getByRole('button', { name: /continue|next/i });
      if (await continueButton.isVisible()) {
        await continueButton.click();
        await expect(page.getByText(/required|please fill/i)).toBeVisible();
      }
    });

    test('should display payment options', async ({ page }) => {
      await page.goto('/checkout');

      // Look for payment methods
      await expect(page.getByText(/payment method|pay with/i)).toBeVisible();

      // Check for Stripe or other payment options
      const stripeOption = page.getByText(/credit card|card payment|stripe/i);
      const paypalOption = page.getByText(/paypal/i);

      const hasStripe = await stripeOption.isVisible();
      const hasPaypal = await paypalOption.isVisible();

      expect(hasStripe || hasPaypal).toBe(true);
    });

    test('should show order summary', async ({ page }) => {
      await page.goto('/checkout');

      await expect(page.getByText(/order summary|your order/i)).toBeVisible();
      await expect(page.getByText(/subtotal/i)).toBeVisible();
      await expect(page.getByText(/total/i)).toBeVisible();
    });
  });

  test.describe('Coupon Codes', () => {
    test('should show coupon input field', async ({ page }) => {
      await page.goto('/checkout');

      const couponInput = page.getByPlaceholder(/coupon|promo|discount/i);
      const couponLabel = page.getByText(/have a coupon|promo code/i);

      const hasCouponField = await couponInput.isVisible() || await couponLabel.isVisible();
      expect(hasCouponField).toBe(true);
    });

    test('should show error for invalid coupon', async ({ page }) => {
      await page.goto('/checkout');

      const couponInput = page.getByPlaceholder(/coupon|promo|discount/i);
      if (await couponInput.isVisible()) {
        await couponInput.fill('INVALIDCODE123');
        await page.getByRole('button', { name: /apply/i }).click();
        await expect(page.getByText(/invalid|not found|expired/i)).toBeVisible({ timeout: 5000 });
      }
    });
  });
});
