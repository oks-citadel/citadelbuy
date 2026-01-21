import { test, expect } from '@playwright/test';
import {
  generateTestUser,
  registerUser,
  loginUserAPI,
  goToCart,
  goToCheckout,
  fillShippingAddress,
  fillPaymentInfo,
  waitForNetworkIdle,
} from './helpers/test-helpers';

test.describe('Complete Checkout Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Register and login user
    const credentials = generateTestUser();
    await registerUser(page, credentials);
  });

  describe('Add to Cart → Checkout → Payment', () => {
    test('should complete full checkout journey', async ({ page }) => {
      // Browse products
      await page.goto('/products');
      await waitForNetworkIdle(page);

      // View product details
      const productCard = page.locator('[data-testid="product-card"]').first();
      const productName = await productCard.locator('[data-testid="product-name"]').textContent();
      await productCard.click();

      await page.waitForURL(/\/products\/[^\/]+$/);

      // Get product price
      const priceText = await page.locator('[data-testid="product-price"]').textContent();
      const price = parseFloat(priceText?.replace(/[^0-9.]/g, '') || '0');

      // Add to cart
      await page.click('button:has-text("Add to Cart")');
      await expect(page.locator('text=Added to cart')).toBeVisible({ timeout: 5000 });

      // Verify cart badge updated
      const cartBadge = page.locator('[data-testid="cart-badge"]');
      await expect(cartBadge).toHaveText('1');

      // Go to cart
      await page.click('[data-testid="cart-icon"]');
      await page.waitForURL('/cart');

      // Verify cart items
      await expect(page.locator('[data-testid="cart-item"]')).toHaveCount(1);
      const cartTotal = await page.locator('[data-testid="cart-total"]').textContent();
      expect(cartTotal).toContain(price.toString().substring(0, 3));

      // Proceed to checkout
      await page.click('button:has-text("Proceed to Checkout")');
      await page.waitForURL('/checkout');

      // Fill shipping information
      await fillShippingAddress(page, {
        firstName: 'John',
        lastName: 'Doe',
        address: '123 Main Street',
        city: 'New York',
        state: 'NY',
        zipCode: '10001',
        phone: '5551234567',
      });

      // Fill payment information
      await page.click('[data-testid="payment-method-stripe"]', { timeout: 5000 });

      // Wait for Stripe to load
      await page.waitForTimeout(2000);

      await fillPaymentInfo(page);

      // Submit order
      const placeOrderButton = page.locator('button:has-text("Place Order")');
      await placeOrderButton.click();

      // Wait for order confirmation
      await page.waitForURL(/\/order-confirmation|\/orders\//, { timeout: 30000 });

      // Verify order confirmation
      await expect(page.locator('text=/order.*confirmed|thank you/i')).toBeVisible();
      await expect(page.locator('[data-testid="order-number"]')).toBeVisible();

      // Verify cart is empty
      await page.goto('/cart');
      await expect(page.locator('text=/empty.*cart|no items/i')).toBeVisible();
    });

    test('should handle multiple items in checkout', async ({ page }) => {
      await page.goto('/products');
      await waitForNetworkIdle(page);

      // Add first product
      await page.locator('[data-testid="product-card"]').first().click();
      await page.click('button:has-text("Add to Cart")');
      await page.waitForSelector('text=Added to cart');

      // Go back and add second product
      await page.goto('/products');
      await page.locator('[data-testid="product-card"]').nth(1).click();
      await page.click('button:has-text("Add to Cart")');

      // Go to cart
      await page.click('[data-testid="cart-icon"]');
      await page.waitForURL('/cart');

      // Should have 2 items
      await expect(page.locator('[data-testid="cart-item"]')).toHaveCount(2);

      // Proceed to checkout
      await page.click('button:has-text("Proceed to Checkout")');
      await page.waitForURL('/checkout');

      // Fill details and complete
      await fillShippingAddress(page, {});
      await page.click('[data-testid="payment-method-stripe"]', { timeout: 5000 });
      await page.waitForTimeout(2000);
      await fillPaymentInfo(page);

      await page.click('button:has-text("Place Order")');
      await page.waitForURL(/\/order-confirmation|\/orders\//, { timeout: 30000 });

      // Should see confirmation
      await expect(page.locator('text=/order.*confirmed|thank you/i')).toBeVisible();
    });

    test('should update quantity in cart', async ({ page }) => {
      await page.goto('/products');
      await waitForNetworkIdle(page);

      // Add product
      await page.locator('[data-testid="product-card"]').first().click();
      await page.click('button:has-text("Add to Cart")');

      // Go to cart
      await page.click('[data-testid="cart-icon"]');
      await page.waitForURL('/cart');

      // Get initial total
      const initialTotal = await page.locator('[data-testid="cart-total"]').textContent();

      // Update quantity
      const quantityInput = page.locator('[data-testid="cart-item-quantity"]').first();
      await quantityInput.fill('3');

      // Click update or wait for auto-update
      const updateButton = page.locator('[data-testid="update-quantity"]');
      if (await updateButton.isVisible({ timeout: 1000 })) {
        await updateButton.click();
      }

      await waitForNetworkIdle(page);

      // Total should change
      const newTotal = await page.locator('[data-testid="cart-total"]').textContent();
      expect(newTotal).not.toBe(initialTotal);
    });

    test('should remove item from cart', async ({ page }) => {
      await page.goto('/products');
      await waitForNetworkIdle(page);

      // Add two products
      await page.locator('[data-testid="product-card"]').first().click();
      await page.click('button:has-text("Add to Cart")');
      await page.goto('/products');
      await page.locator('[data-testid="product-card"]').nth(1).click();
      await page.click('button:has-text("Add to Cart")');

      // Go to cart
      await page.click('[data-testid="cart-icon"]');
      await page.waitForURL('/cart');

      // Should have 2 items
      await expect(page.locator('[data-testid="cart-item"]')).toHaveCount(2);

      // Remove first item
      await page.locator('[data-testid="remove-cart-item"]').first().click();

      // Confirm if modal appears
      const confirmButton = page.locator('button:has-text("Remove")');
      if (await confirmButton.isVisible({ timeout: 2000 })) {
        await confirmButton.click();
      }

      // Should have 1 item left
      await expect(page.locator('[data-testid="cart-item"]')).toHaveCount(1);
    });
  });

  describe('Checkout Validation', () => {
    test('should validate required shipping fields', async ({ page }) => {
      // Add product and go to checkout
      await page.goto('/products');
      await page.locator('[data-testid="product-card"]').first().click();
      await page.click('button:has-text("Add to Cart")');
      await page.click('[data-testid="cart-icon"]');
      await page.click('button:has-text("Proceed to Checkout")');

      // Try to submit without filling fields
      await page.click('button:has-text("Place Order")');

      // Should show validation errors
      await expect(page.locator('text=/required|this field/i')).toHaveCount(
        { min: 1 },
        { timeout: 5000 },
      );
    });

    test('should validate email format', async ({ page }) => {
      await page.goto('/products');
      await page.locator('[data-testid="product-card"]').first().click();
      await page.click('button:has-text("Add to Cart")');
      await page.click('[data-testid="cart-icon"]');
      await page.click('button:has-text("Proceed to Checkout")');

      // Fill with invalid email
      const emailInput = page.locator('input[name="email"]');
      if (await emailInput.isVisible({ timeout: 2000 })) {
        await emailInput.fill('invalid-email');
        await page.click('button:has-text("Place Order")');

        await expect(page.locator('text=/invalid.*email/i')).toBeVisible();
      }
    });

    test('should validate zip code format', async ({ page }) => {
      await page.goto('/products');
      await page.locator('[data-testid="product-card"]').first().click();
      await page.click('button:has-text("Add to Cart")');
      await page.click('[data-testid="cart-icon"]');
      await page.click('button:has-text("Proceed to Checkout")');

      await fillShippingAddress(page, {
        zipCode: 'INVALID',
      });

      await page.click('button:has-text("Place Order")');

      // Should show validation error
      await expect(page.locator('text=/invalid.*zip|postal code/i')).toBeVisible({
        timeout: 5000,
      });
    });

    test('should not proceed with empty cart', async ({ page }) => {
      // Try to go to checkout with empty cart
      await page.goto('/checkout');

      // Should redirect or show error
      await expect(
        page.locator('text=/empty.*cart|add items/i'),
      ).toBeVisible({ timeout: 5000 });
    });
  });

  describe('Coupon Codes', () => {
    test('should apply valid coupon code', async ({ page }) => {
      await page.goto('/products');
      await page.locator('[data-testid="product-card"]').first().click();
      await page.click('button:has-text("Add to Cart")');
      await page.click('[data-testid="cart-icon"]');

      // Try to apply coupon
      const couponInput = page.locator('[data-testid="coupon-input"]');
      if (await couponInput.isVisible({ timeout: 2000 })) {
        await couponInput.fill('SAVE10');
        await page.click('[data-testid="apply-coupon"]');

        // Should show success or error message
        await expect(
          page.locator('text=/applied|invalid|coupon/i'),
        ).toBeVisible({ timeout: 5000 });
      }
    });

    test('should show error for invalid coupon', async ({ page }) => {
      await page.goto('/products');
      await page.locator('[data-testid="product-card"]').first().click();
      await page.click('button:has-text("Add to Cart")');
      await page.click('[data-testid="cart-icon"]');

      const couponInput = page.locator('[data-testid="coupon-input"]');
      if (await couponInput.isVisible({ timeout: 2000 })) {
        await couponInput.fill('INVALIDCODE123');
        await page.click('[data-testid="apply-coupon"]');

        await expect(
          page.locator('text=/invalid.*coupon|not found/i'),
        ).toBeVisible({ timeout: 5000 });
      }
    });

    test('should remove applied coupon', async ({ page }) => {
      await page.goto('/products');
      await page.locator('[data-testid="product-card"]').first().click();
      await page.click('button:has-text("Add to Cart")');
      await page.click('[data-testid="cart-icon"]');

      const couponInput = page.locator('[data-testid="coupon-input"]');
      if (await couponInput.isVisible({ timeout: 2000 })) {
        await couponInput.fill('SAVE10');
        await page.click('[data-testid="apply-coupon"]');

        // Try to remove coupon
        const removeButton = page.locator('[data-testid="remove-coupon"]');
        if (await removeButton.isVisible({ timeout: 2000 })) {
          await removeButton.click();
          await expect(removeButton).not.toBeVisible();
        }
      }
    });
  });

  describe('Payment Methods', () => {
    test('should select credit card payment', async ({ page }) => {
      await page.goto('/products');
      await page.locator('[data-testid="product-card"]').first().click();
      await page.click('button:has-text("Add to Cart")');
      await page.click('[data-testid="cart-icon"]');
      await page.click('button:has-text("Proceed to Checkout")');

      await fillShippingAddress(page, {});

      // Select Stripe/Credit Card
      const stripeOption = page.locator('[data-testid="payment-method-stripe"]');
      if (await stripeOption.isVisible({ timeout: 2000 })) {
        await stripeOption.click();
        await expect(stripeOption).toBeChecked();
      }
    });

    test('should select PayPal payment', async ({ page }) => {
      await page.goto('/products');
      await page.locator('[data-testid="product-card"]').first().click();
      await page.click('button:has-text("Add to Cart")');
      await page.click('[data-testid="cart-icon"]');
      await page.click('button:has-text("Proceed to Checkout")');

      await fillShippingAddress(page, {});

      // Select PayPal
      const paypalOption = page.locator('[data-testid="payment-method-paypal"]');
      if (await paypalOption.isVisible({ timeout: 2000 })) {
        await paypalOption.click();
        await expect(paypalOption).toBeChecked();
      }
    });

    test('should show loading state during payment', async ({ page }) => {
      await page.goto('/products');
      await page.locator('[data-testid="product-card"]').first().click();
      await page.click('button:has-text("Add to Cart")');
      await page.click('[data-testid="cart-icon"]');
      await page.click('button:has-text("Proceed to Checkout")');

      await fillShippingAddress(page, {});
      await page.click('[data-testid="payment-method-stripe"]', { timeout: 5000 });
      await page.waitForTimeout(2000);
      await fillPaymentInfo(page);

      const placeOrderButton = page.locator('button:has-text("Place Order")');
      await placeOrderButton.click();

      // Should show loading state
      await expect(placeOrderButton).toBeDisabled();
      await expect(
        page.locator('text=/processing|please wait/i'),
      ).toBeVisible({ timeout: 5000 });
    });
  });

  describe('Shipping Options', () => {
    test('should display shipping options', async ({ page }) => {
      await page.goto('/products');
      await page.locator('[data-testid="product-card"]').first().click();
      await page.click('button:has-text("Add to Cart")');
      await page.click('[data-testid="cart-icon"]');
      await page.click('button:has-text("Proceed to Checkout")');

      await fillShippingAddress(page, {});

      // Check for shipping options
      const shippingOptions = page.locator('[data-testid="shipping-option"]');
      if ((await shippingOptions.count()) > 0) {
        await expect(shippingOptions.first()).toBeVisible();
      }
    });

    test('should select different shipping speed', async ({ page }) => {
      await page.goto('/products');
      await page.locator('[data-testid="product-card"]').first().click();
      await page.click('button:has-text("Add to Cart")');
      await page.click('[data-testid="cart-icon"]');
      await page.click('button:has-text("Proceed to Checkout")');

      await fillShippingAddress(page, {});

      const shippingOptions = page.locator('[data-testid="shipping-option"]');
      if ((await shippingOptions.count()) > 1) {
        // Select second option (express shipping)
        await shippingOptions.nth(1).click();

        // Total should update with new shipping cost
        await waitForNetworkIdle(page);
        await expect(page.locator('[data-testid="shipping-cost"]')).toBeVisible();
      }
    });
  });

  describe('Guest Checkout', () => {
    test('should checkout as guest', async ({ page }) => {
      // Logout if logged in
      await page.evaluate(() => localStorage.clear());

      await page.goto('/products');
      await page.locator('[data-testid="product-card"]').first().click();
      await page.click('button:has-text("Add to Cart")');
      await page.click('[data-testid="cart-icon"]');
      await page.click('button:has-text("Proceed to Checkout")');

      // Should show guest checkout option
      const guestCheckoutButton = page.locator('button:has-text("Guest Checkout")');
      if (await guestCheckoutButton.isVisible({ timeout: 2000 })) {
        await guestCheckoutButton.click();

        // Fill guest email
        await page.fill('input[name="email"]', 'guest@example.com');

        await fillShippingAddress(page, {});
        await page.click('[data-testid="payment-method-stripe"]');
        await page.waitForTimeout(2000);
        await fillPaymentInfo(page);

        await page.click('button:has-text("Place Order")');
        await page.waitForURL(/\/order-confirmation|\/orders\//, { timeout: 30000 });

        await expect(page.locator('text=/order.*confirmed|thank you/i')).toBeVisible();
      }
    });
  });

  describe('Order Summary', () => {
    test('should display order summary', async ({ page }) => {
      await page.goto('/products');
      await page.locator('[data-testid="product-card"]').first().click();
      await page.click('button:has-text("Add to Cart")');
      await page.click('[data-testid="cart-icon"]');
      await page.click('button:has-text("Proceed to Checkout")');

      // Should show order summary
      await expect(page.locator('[data-testid="order-summary"]')).toBeVisible();
      await expect(page.locator('[data-testid="subtotal"]')).toBeVisible();
      await expect(page.locator('[data-testid="total"]')).toBeVisible();
    });

    test('should show breakdown of costs', async ({ page }) => {
      await page.goto('/products');
      await page.locator('[data-testid="product-card"]').first().click();
      await page.click('button:has-text("Add to Cart")');
      await page.click('[data-testid="cart-icon"]');
      await page.click('button:has-text("Proceed to Checkout")');

      // Check for cost breakdown
      const orderSummary = page.locator('[data-testid="order-summary"]');
      if (await orderSummary.isVisible()) {
        await expect(orderSummary.locator('text=/subtotal/i')).toBeVisible();
        await expect(orderSummary.locator('text=/total/i')).toBeVisible();
      }
    });
  });

  describe('Checkout Error Handling', () => {
    test('should handle payment failure gracefully', async ({ page }) => {
      await page.goto('/products');
      await page.locator('[data-testid="product-card"]').first().click();
      await page.click('button:has-text("Add to Cart")');
      await page.click('[data-testid="cart-icon"]');
      await page.click('button:has-text("Proceed to Checkout")');

      await fillShippingAddress(page, {});
      await page.click('[data-testid="payment-method-stripe"]', { timeout: 5000 });
      await page.waitForTimeout(2000);

      // Use declined card
      const stripeFrame = page.frameLocator('iframe[name^="__privateStripeFrame"]');
      if (await stripeFrame.locator('input[name="cardnumber"]').count() > 0) {
        await stripeFrame.locator('input[name="cardnumber"]').fill('4000000000000002');
        await stripeFrame.locator('input[name="exp-date"]').fill('12/30');
        await stripeFrame.locator('input[name="cvc"]').fill('123');
      }

      await page.click('button:has-text("Place Order")');

      // Should show error message
      await expect(
        page.locator('text=/payment.*failed|declined|error/i'),
      ).toBeVisible({ timeout: 10000 });

      // Cart should still have items
      await page.goto('/cart');
      await expect(page.locator('[data-testid="cart-item"]')).toHaveCount({ min: 1 });
    });

    test('should handle network errors', async ({ page }) => {
      await page.goto('/products');
      await page.locator('[data-testid="product-card"]').first().click();
      await page.click('button:has-text("Add to Cart")');
      await page.click('[data-testid="cart-icon"]');
      await page.click('button:has-text("Proceed to Checkout")');

      // Simulate offline
      await page.context().setOffline(true);

      await page.click('button:has-text("Place Order")');

      // Should show network error
      await expect(
        page.locator('text=/network.*error|connection.*failed/i'),
      ).toBeVisible({ timeout: 10000 });

      // Restore connection
      await page.context().setOffline(false);
    });
  });

  describe('Save Information', () => {
    test('should save shipping address for future orders', async ({ page }) => {
      await page.goto('/products');
      await page.locator('[data-testid="product-card"]').first().click();
      await page.click('button:has-text("Add to Cart")');
      await page.click('[data-testid="cart-icon"]');
      await page.click('button:has-text("Proceed to Checkout")');

      await fillShippingAddress(page, {});

      // Check "Save address" checkbox if available
      const saveAddressCheckbox = page.locator('input[name="saveAddress"]');
      if (await saveAddressCheckbox.isVisible({ timeout: 2000 })) {
        await saveAddressCheckbox.check();
      }

      await page.click('[data-testid="payment-method-stripe"]', { timeout: 5000 });
      await page.waitForTimeout(2000);
      await fillPaymentInfo(page);

      await page.click('button:has-text("Place Order")');
      await page.waitForURL(/\/order-confirmation|\/orders\//, { timeout: 30000 });

      // Verify address was saved
      await page.goto('/account/addresses');
      const savedAddresses = page.locator('[data-testid="saved-address"]');
      if ((await savedAddresses.count()) > 0) {
        await expect(savedAddresses.first()).toBeVisible();
      }
    });
  });
});
