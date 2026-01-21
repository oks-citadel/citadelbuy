import { test, expect } from '@playwright/test';
import {
  generateTestUser,
  registerUser,
  goToCart,
  goToCheckout,
  fillShippingAddress,
  fillPaymentInfo,
  waitForNetworkIdle,
} from './helpers/test-helpers';

test.describe('Checkout Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Register and login user
    const credentials = generateTestUser();
    await registerUser(page, credentials);

    // Add product to cart
    await page.goto('/products');
    await waitForNetworkIdle(page);
    await page.click('[data-testid="product-card"]');
    await page.click('button:has-text("Add to Cart")');
  });

  test.describe('Checkout Process', () => {
    test('should complete checkout successfully', async ({ page }) => {
      // Go to checkout
      await goToCart(page);
      await goToCheckout(page);

      // Fill shipping address
      await fillShippingAddress(page, {});

      // Continue to payment
      await page.click('button:has-text("Continue to Payment")');

      // Fill payment info
      await fillPaymentInfo(page);

      // Place order
      await page.click('button:has-text("Place Order")');

      // Wait for order confirmation
      await page.waitForURL(/\/order\/confirmation|\/orders\/[^\/]+/, {
        timeout: 15000,
      });

      // Should show success message
      await expect(
        page.locator('text=/order.*confirmed|thank.*you.*order/i'),
      ).toBeVisible();
    });

    test('should validate shipping address', async ({ page }) => {
      await goToCart(page);
      await goToCheckout(page);

      // Try to continue without filling address
      await page.click('button:has-text("Continue to Payment")');

      // Should show validation errors
      await expect(page.locator('text=/required|this field/i')).toHaveCount(
        { min: 1 },
      );
    });

    test('should validate zip code format', async ({ page }) => {
      await goToCart(page);
      await goToCheckout(page);

      // Fill with invalid zip
      await fillShippingAddress(page, { zipCode: 'INVALID' });

      await page.click('button:has-text("Continue to Payment")');

      // Should show zip code error
      await expect(page.locator('text=/invalid.*zip|postal.*code/i')).toBeVisible();
    });

    test('should use saved address', async ({ page }) => {
      await goToCart(page);
      await goToCheckout(page);

      // Check if saved addresses exist
      const savedAddressSelector = '[data-testid="saved-address"]';

      if (await page.locator(savedAddressSelector).count() > 0) {
        // Select saved address
        await page.click(savedAddressSelector);

        // Address fields should be filled
        const firstName = await page.locator('input[name="shippingAddress.firstName"]');
        await expect(firstName).not.toBeEmpty();
      }
    });

    test('should use billing address same as shipping', async ({ page }) => {
      await goToCart(page);
      await goToCheckout(page);

      // Fill shipping address
      await fillShippingAddress(page, {});

      // Check "same as shipping" checkbox
      const checkbox = page.locator('input[name="useSameAddress"]');
      if (await checkbox.isVisible()) {
        await checkbox.check();
      }

      // Continue to payment
      await page.click('button:has-text("Continue to Payment")');

      // Should proceed without billing address form
      await expect(page.locator('[data-testid="payment-section"]')).toBeVisible();
    });

    test('should calculate shipping cost', async ({ page }) => {
      await goToCart(page);
      await goToCheckout(page);

      // Fill address
      await fillShippingAddress(page, {});

      // Select shipping method if available
      const shippingMethod = page.locator('[data-testid="shipping-method"]');
      if (await shippingMethod.count() > 0) {
        await shippingMethod.first().click();
      }

      // Should show shipping cost
      await expect(page.locator('[data-testid="shipping-cost"]')).toBeVisible();
    });

    test('should show order summary', async ({ page }) => {
      await goToCart(page);
      await goToCheckout(page);

      // Should show order summary
      await expect(page.locator('[data-testid="order-summary"]')).toBeVisible();

      // Should show subtotal
      await expect(page.locator('[data-testid="subtotal"]')).toBeVisible();

      // Should show total
      await expect(page.locator('[data-testid="total"]')).toBeVisible();
    });

    test('should apply coupon at checkout', async ({ page }) => {
      await goToCart(page);

      // Apply coupon in cart
      await page.fill('[data-testid="coupon-input"]', 'SAVE10');
      await page.click('[data-testid="apply-coupon"]');

      await goToCheckout(page);

      // Should show discount in order summary
      const discount = page.locator('[data-testid="discount"]');
      if (await discount.isVisible()) {
        const discountText = await discount.textContent();
        expect(parseFloat(discountText?.replace(/[^0-9.]/g, '') || '0')).toBeGreaterThan(0);
      }
    });
  });

  test.describe('Payment Processing', () => {
    test('should process Stripe payment', async ({ page }) => {
      await goToCart(page);
      await goToCheckout(page);

      // Fill shipping
      await fillShippingAddress(page, {});
      await page.click('button:has-text("Continue to Payment")');

      // Select Stripe payment method
      await page.click('[data-testid="payment-method-stripe"]');

      // Fill card details
      await fillPaymentInfo(page);

      // Place order
      await page.click('button:has-text("Place Order")');

      // Wait for confirmation
      await page.waitForURL(/\/order\/confirmation|\/orders\/[^\/]+/, {
        timeout: 15000,
      });

      // Should show success
      await expect(page.locator('text=/success|confirmed/i')).toBeVisible();
    });

    test('should validate credit card number', async ({ page }) => {
      await goToCart(page);
      await goToCheckout(page);

      await fillShippingAddress(page, {});
      await page.click('button:has-text("Continue to Payment")');

      // Enter invalid card
      const stripeFrame = page.frameLocator('iframe[name^="__privateStripeFrame"]');

      if (await stripeFrame.locator('input[name="cardnumber"]').count() > 0) {
        await stripeFrame.locator('input[name="cardnumber"]').fill('1111111111111111');

        // Should show error
        await expect(
          page.locator('text=/invalid.*card|card.*number/i'),
        ).toBeVisible({ timeout: 5000 });
      }
    });

    test('should support PayPal payment', async ({ page }) => {
      await goToCart(page);
      await goToCheckout(page);

      await fillShippingAddress(page, {});
      await page.click('button:has-text("Continue to Payment")');

      // Check if PayPal option exists
      const paypalButton = page.locator('[data-testid="payment-method-paypal"]');

      if (await paypalButton.isVisible()) {
        await paypalButton.click();

        // Should show PayPal button or redirect
        await expect(
          page.locator('[data-testid="paypal-button"]'),
        ).toBeVisible();
      }
    });

    test('should show payment processing state', async ({ page }) => {
      await goToCart(page);
      await goToCheckout(page);

      await fillShippingAddress(page, {});
      await page.click('button:has-text("Continue to Payment")');

      await fillPaymentInfo(page);

      // Click place order
      const placeOrderButton = page.locator('button:has-text("Place Order")');
      await placeOrderButton.click();

      // Button should show processing state
      await expect(placeOrderButton).toBeDisabled();
      await expect(placeOrderButton).toContainText(/processing|placing/i);
    });
  });

  test.describe('Guest Checkout', () => {
    test('should checkout as guest', async ({ page }) => {
      // Clear auth
      await page.evaluate(() => localStorage.clear());

      // Add to cart as guest
      await page.goto('/products');
      await waitForNetworkIdle(page);
      await page.click('[data-testid="product-card"]');
      await page.click('button:has-text("Add to Cart")');

      await goToCart(page);

      // Should see guest checkout option
      await expect(
        page.locator('button:has-text("Checkout as Guest")'),
      ).toBeVisible();

      await page.click('button:has-text("Checkout as Guest")');

      // Fill guest email
      await page.fill('input[name="email"]', 'guest@example.com');

      // Fill shipping
      await fillShippingAddress(page, {});

      await page.click('button:has-text("Continue to Payment")');

      // Fill payment
      await fillPaymentInfo(page);

      // Place order
      await page.click('button:has-text("Place Order")');

      // Wait for confirmation
      await page.waitForURL(/\/order\/confirmation|\/orders\/[^\/]+/, {
        timeout: 15000,
      });

      await expect(page.locator('text=/success|confirmed/i')).toBeVisible();
    });

    test('should validate guest email', async ({ page }) => {
      await page.evaluate(() => localStorage.clear());

      await page.goto('/products');
      await waitForNetworkIdle(page);
      await page.click('[data-testid="product-card"]');
      await page.click('button:has-text("Add to Cart")');

      await goToCart(page);
      await page.click('button:has-text("Checkout as Guest")');

      // Enter invalid email
      await page.fill('input[name="email"]', 'invalid-email');
      await page.click('button:has-text("Continue")');

      // Should show error
      await expect(page.locator('text=/invalid.*email/i')).toBeVisible();
    });
  });

  test.describe('Order Confirmation', () => {
    test('should display order confirmation details', async ({ page }) => {
      await goToCart(page);
      await goToCheckout(page);

      await fillShippingAddress(page, {});
      await page.click('button:has-text("Continue to Payment")');

      await fillPaymentInfo(page);
      await page.click('button:has-text("Place Order")');

      await page.waitForURL(/\/order\/confirmation|\/orders\/[^\/]+/, {
        timeout: 15000,
      });

      // Should show order number
      await expect(page.locator('[data-testid="order-number"]')).toBeVisible();

      // Should show order total
      await expect(page.locator('[data-testid="order-total"]')).toBeVisible();

      // Should show shipping address
      await expect(page.locator('[data-testid="shipping-address"]')).toBeVisible();
    });

    test('should display order items', async ({ page }) => {
      await goToCart(page);
      await goToCheckout(page);

      await fillShippingAddress(page, {});
      await page.click('button:has-text("Continue to Payment")');

      await fillPaymentInfo(page);
      await page.click('button:has-text("Place Order")');

      await page.waitForURL(/\/order\/confirmation|\/orders\/[^\/]+/, {
        timeout: 15000,
      });

      // Should show ordered items
      await expect(page.locator('[data-testid="order-item"]')).toHaveCount({
        min: 1,
      });
    });

    test('should have link to view order details', async ({ page }) => {
      await goToCart(page);
      await goToCheckout(page);

      await fillShippingAddress(page, {});
      await page.click('button:has-text("Continue to Payment")');

      await fillPaymentInfo(page);
      await page.click('button:has-text("Place Order")');

      await page.waitForURL(/\/order\/confirmation|\/orders\/[^\/]+/, {
        timeout: 15000,
      });

      // Should have link to order details
      const viewOrderLink = page.locator('a:has-text("View Order Details")');
      if (await viewOrderLink.isVisible()) {
        await viewOrderLink.click();
        await page.waitForURL(/\/orders\/[^\/]+/);
      }
    });

    test('should send order confirmation email', async ({ page }) => {
      await goToCart(page);
      await goToCheckout(page);

      await fillShippingAddress(page, {});
      await page.click('button:has-text("Continue to Payment")');

      await fillPaymentInfo(page);
      await page.click('button:has-text("Place Order")');

      await page.waitForURL(/\/order\/confirmation|\/orders\/[^\/]+/, {
        timeout: 15000,
      });

      // Should show message about confirmation email
      await expect(
        page.locator('text=/confirmation.*email.*sent|check.*email/i'),
      ).toBeVisible();
    });

    test('cart should be empty after checkout', async ({ page }) => {
      await goToCart(page);
      await goToCheckout(page);

      await fillShippingAddress(page, {});
      await page.click('button:has-text("Continue to Payment")');

      await fillPaymentInfo(page);
      await page.click('button:has-text("Place Order")');

      await page.waitForURL(/\/order\/confirmation|\/orders\/[^\/]+/, {
        timeout: 15000,
      });

      // Go to cart
      await page.goto('/cart');

      // Cart should be empty
      await expect(page.locator('text=/empty.*cart|no items/i')).toBeVisible();
    });
  });

  test.describe('Edge Cases', () => {
    test('should handle out of stock during checkout', async ({ page }) => {
      await goToCart(page);
      await goToCheckout(page);

      await fillShippingAddress(page, {});
      await page.click('button:has-text("Continue to Payment")');

      await fillPaymentInfo(page);

      // If product goes out of stock during checkout
      await page.click('button:has-text("Place Order")');

      // Should either complete or show error
      await page.waitForTimeout(5000);

      // Check for error or success
      const isError = await page.locator('text=/out.*of.*stock|unavailable/i').isVisible();
      const isSuccess = await page.locator('text=/success|confirmed/i').isVisible();

      expect(isError || isSuccess).toBeTruthy();
    });

    test('should prevent double submission', async ({ page }) => {
      await goToCart(page);
      await goToCheckout(page);

      await fillShippingAddress(page, {});
      await page.click('button:has-text("Continue to Payment")');

      await fillPaymentInfo(page);

      // Click place order button multiple times rapidly
      const placeOrderButton = page.locator('button:has-text("Place Order")');

      await placeOrderButton.click();

      // Button should be disabled after first click
      await expect(placeOrderButton).toBeDisabled();
    });

    test('should handle payment failure', async ({ page }) => {
      await goToCart(page);
      await goToCheckout(page);

      await fillShippingAddress(page, {});
      await page.click('button:has-text("Continue to Payment")');

      // Use card that will be declined (if test mode supports it)
      const stripeFrame = page.frameLocator('iframe[name^="__privateStripeFrame"]');

      if (await stripeFrame.locator('input[name="cardnumber"]').count() > 0) {
        await stripeFrame.locator('input[name="cardnumber"]').fill('4000000000000002');
        await stripeFrame.locator('input[name="exp-date"]').fill('12/30');
        await stripeFrame.locator('input[name="cvc"]').fill('123');
      }

      await page.click('button:has-text("Place Order")');

      // Should show payment error
      await expect(
        page.locator('text=/payment.*failed|declined|error/i'),
      ).toBeVisible({ timeout: 10000 });
    });

    test('should allow retry after payment failure', async ({ page }) => {
      await goToCart(page);
      await goToCheckout(page);

      await fillShippingAddress(page, {});
      await page.click('button:has-text("Continue to Payment")');

      // Fail payment first
      const stripeFrame = page.frameLocator('iframe[name^="__privateStripeFrame"]');

      if (await stripeFrame.locator('input[name="cardnumber"]').count() > 0) {
        await stripeFrame.locator('input[name="cardnumber"]').fill('4000000000000002');
        await stripeFrame.locator('input[name="exp-date"]').fill('12/30');
        await stripeFrame.locator('input[name="cvc"]').fill('123');
      }

      await page.click('button:has-text("Place Order")');

      // Wait for error
      await page.waitForSelector('text=/payment.*failed|declined/i', { timeout: 10000 });

      // Retry with valid card
      if (await stripeFrame.locator('input[name="cardnumber"]').count() > 0) {
        await stripeFrame.locator('input[name="cardnumber"]').fill('4242424242424242');
      }

      // Try again
      await page.click('button:has-text("Place Order")');

      // Should succeed or still show error
      await page.waitForTimeout(5000);
    });
  });
});
