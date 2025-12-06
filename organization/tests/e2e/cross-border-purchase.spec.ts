import { test, expect } from '@playwright/test';

/**
 * Cross-Border Purchase E2E Tests
 *
 * Tests international purchasing workflow including:
 * - Multi-currency display and conversion
 * - International shipping calculations
 * - Cross-border tax calculations
 * - International payment processing
 * - Currency-specific pricing
 * - Localized checkout experience
 */

test.describe('Cross-Border Purchase Workflow', () => {
  test.describe('Multi-Currency Shopping', () => {
    test('should display prices in user currency', async ({ page }) => {
      // Set user location to UK
      await page.addInitScript(() => {
        Object.defineProperty(navigator, 'language', { value: 'en-GB' });
      });

      await page.goto('/');

      // Change currency
      await page.getByRole('button', { name: /currency/i }).click();
      await page.getByText('GBP (£)').click();

      // Verify prices in GBP
      await page.goto('/products');
      const priceElement = page.locator('[data-testid="product-price"]').first();
      const price = await priceElement.textContent();
      expect(price).toMatch(/£\d+\.\d{2}/);

      // Verify conversion tooltip
      await priceElement.hover();
      await expect(page.getByText(/approx.*USD/i)).toBeVisible();
    });

    test('should maintain currency throughout checkout', async ({ page }) => {
      await page.goto('/');

      // Set currency to EUR
      await page.getByRole('button', { name: /currency/i }).click();
      await page.getByText('EUR (€)').click();

      // Add product to cart
      await page.goto('/products');
      const product = page.locator('[data-testid="product-card"]').first();
      await product.click();
      await page.getByRole('button', { name: /add to cart/i }).click();

      // Proceed to checkout
      await page.getByRole('button', { name: /cart/i }).click();
      await page.getByRole('button', { name: /checkout/i }).click();

      // Verify all prices in EUR
      await expect(page.getByText(/subtotal.*€/i)).toBeVisible();
      await expect(page.getByText(/shipping.*€/i)).toBeVisible();
      await expect(page.getByText(/total.*€/i)).toBeVisible();
    });
  });

  test.describe('International Shipping', () => {
    test('should calculate international shipping rates', async ({ page }) => {
      // Login as customer
      await page.goto('/auth/login');
      await page.getByLabel(/email/i).fill('international@customer.com');
      await page.getByLabel(/password/i).fill('password123');
      await page.getByRole('button', { name: /login/i }).click();

      // Add product to cart
      await page.goto('/products/wireless-headphones');
      await page.getByRole('button', { name: /add to cart/i }).click();

      // Go to checkout
      await page.goto('/checkout');

      // Enter international shipping address
      await page.getByLabel(/country/i).selectOption('GB'); // United Kingdom
      await page.getByLabel(/full name/i).fill('John Smith');
      await page.getByLabel(/address line 1/i).fill('10 Downing Street');
      await page.getByLabel(/city/i).fill('London');
      await page.getByLabel(/postal code/i).fill('SW1A 2AA');
      await page.getByLabel(/phone/i).fill('+447700900000');

      // Calculate shipping
      await page.getByRole('button', { name: /calculate shipping/i }).click();

      // Verify shipping options
      await expect(page.getByText(/international shipping/i)).toBeVisible();

      const shippingOptions = page.locator('[data-testid="shipping-option"]');
      await expect(shippingOptions).toHaveCount(3); // Standard, Express, Priority

      // Select shipping method
      await page.getByLabel(/DHL Express/i).check();

      // Verify shipping cost
      const shippingCost = await page.locator('[data-testid="shipping-cost"]').textContent();
      expect(parseFloat(shippingCost?.replace(/[^0-9.]/g, '') || '0')).toBeGreaterThan(0);

      // Verify estimated delivery
      await expect(page.getByText(/estimated delivery.*days/i)).toBeVisible();
    });

    test('should show customs and import fees', async ({ page }) => {
      await page.goto('/checkout');

      // Enter address for country with customs fees
      await page.getByLabel(/country/i).selectOption('AU'); // Australia
      await page.getByLabel(/address/i).fill('123 Sydney Road');
      await page.getByLabel(/city/i).fill('Sydney');
      await page.getByLabel(/state/i).selectOption('NSW');
      await page.getByLabel(/postal code/i).fill('2000');

      await page.getByRole('button', { name: /calculate shipping/i }).click();

      // Verify customs info displayed
      await expect(page.getByText(/customs duty/i)).toBeVisible();
      await expect(page.getByText(/import fees/i)).toBeVisible();

      // Verify breakdown tooltip
      await page.getByRole('button', { name: /customs info/i }).click();
      await expect(page.getByText(/duty rate.*%/i)).toBeVisible();
      await expect(page.getByText(/VAT/i)).toBeVisible();
    });
  });

  test.describe('Cross-Border Tax Calculation', () => {
    test('should calculate VAT for EU destinations', async ({ page }) => {
      await page.goto('/checkout');

      // Enter German shipping address
      await page.getByLabel(/country/i).selectOption('DE'); // Germany
      await page.getByLabel(/address/i).fill('Hauptstraße 1');
      await page.getByLabel(/city/i).fill('Berlin');
      await page.getByLabel(/postal code/i).fill('10115');

      await page.getByRole('button', { name: /continue/i }).click();

      // Verify VAT applied
      await expect(page.getByText(/VAT \(19%\)/i)).toBeVisible();

      const subtotal = parseFloat(await page.locator('[data-testid="subtotal"]').textContent() || '0');
      const vat = parseFloat(await page.locator('[data-testid="vat"]').textContent() || '0');

      expect(vat).toBeCloseTo(subtotal * 0.19, 2);
    });

    test('should calculate GST for Canada', async ({ page }) => {
      await page.goto('/checkout');

      // Enter Canadian address
      await page.getByLabel(/country/i).selectOption('CA');
      await page.getByLabel(/address/i).fill('123 Maple Street');
      await page.getByLabel(/city/i).fill('Toronto');
      await page.getByLabel(/province/i).selectOption('ON');
      await page.getByLabel(/postal code/i).fill('M5H 2N2');

      await page.getByRole('button', { name: /continue/i }).click();

      // Verify GST and PST/HST applied
      await expect(page.getByText(/GST|HST/i)).toBeVisible();

      // Ontario has 13% HST
      const hst = parseFloat(await page.locator('[data-testid="tax"]').textContent() || '0');
      const subtotal = parseFloat(await page.locator('[data-testid="subtotal"]').textContent() || '0');

      expect(hst).toBeCloseTo(subtotal * 0.13, 2);
    });

    test('should handle tax-free purchases for certain countries', async ({ page }) => {
      await page.goto('/checkout');

      // Enter address for tax-free zone (e.g., Hong Kong)
      await page.getByLabel(/country/i).selectOption('HK');
      await page.getByLabel(/address/i).fill('123 Nathan Road');
      await page.getByLabel(/city/i).fill('Kowloon');

      await page.getByRole('button', { name: /continue/i }).click();

      // Verify no tax applied
      const taxElement = page.locator('[data-testid="tax"]');
      if (await taxElement.isVisible()) {
        const tax = await taxElement.textContent();
        expect(tax).toMatch(/0\.00/);
      }
    });
  });

  test.describe('International Payment Processing', () => {
    test('should process payment in customer currency', async ({ page }) => {
      await page.goto('/checkout');

      // Set currency to GBP
      await page.getByRole('button', { name: /currency/i }).click();
      await page.getByText('GBP (£)').click();

      // Complete checkout
      await page.getByLabel(/country/i).selectOption('GB');
      await page.getByLabel(/address/i).fill('10 Downing Street');
      await page.getByLabel(/city/i).fill('London');
      await page.getByLabel(/postal code/i).fill('SW1A 2AA');

      await page.getByRole('button', { name: /continue to payment/i }).click();

      // Verify payment amount in GBP
      const paymentAmount = page.locator('[data-testid="payment-amount"]');
      await expect(paymentAmount).toHaveText(/£\d+\.\d{2}/);

      // Fill payment details (Stripe test card)
      const stripeFrame = page.frameLocator('iframe[name*="stripe"]');
      await stripeFrame.getByPlaceholder(/card number/i).fill('4242424242424242');
      await stripeFrame.getByPlaceholder(/mm\/yy/i).fill('12/25');
      await stripeFrame.getByPlaceholder(/cvc/i).fill('123');

      // Complete payment
      await page.getByRole('button', { name: /pay now/i }).click();

      // Verify success
      await expect(page.getByText(/order confirmed/i)).toBeVisible({ timeout: 10000 });

      // Verify order total in GBP
      await expect(page.getByText(/total.*£/i)).toBeVisible();
    });

    test('should support alternative payment methods by region', async ({ page }) => {
      await page.goto('/checkout');

      // Enter Netherlands address
      await page.getByLabel(/country/i).selectOption('NL');
      await page.getByLabel(/address/i).fill('Damstraat 1');
      await page.getByLabel(/city/i).fill('Amsterdam');
      await page.getByLabel(/postal code/i).fill('1012 JL');

      await page.getByRole('button', { name: /continue to payment/i }).click();

      // Verify iDEAL payment option available
      await expect(page.getByText(/iDEAL/i)).toBeVisible();

      // Select iDEAL
      await page.getByLabel(/payment method/i).click();
      await page.getByText(/iDEAL/i).click();

      // Verify bank selection
      await expect(page.getByLabel(/select your bank/i)).toBeVisible();
    });
  });

  test.describe('Localized Checkout Experience', () => {
    test('should display checkout in user language', async ({ page }) => {
      // Set language to German
      await page.addInitScript(() => {
        localStorage.setItem('language', 'de');
      });

      await page.goto('/checkout');

      // Verify German language
      await expect(page.getByText(/Versandadresse/i)).toBeVisible(); // Shipping address
      await expect(page.getByRole('button', { name: /Weiter/i })).toBeVisible(); // Continue
    });

    test('should format dates and numbers by locale', async ({ page }) => {
      await page.goto('/order-confirmation');

      // Check date format (European: DD/MM/YYYY)
      const dateElement = page.locator('[data-testid="order-date"]');
      const date = await dateElement.textContent();
      expect(date).toMatch(/\d{2}\/\d{2}\/\d{4}/);

      // Check number format (European: 1.234,56)
      const priceElement = page.locator('[data-testid="order-total"]');
      const price = await priceElement.textContent();
      expect(price).toMatch(/\d{1,3}(?:\.\d{3})*,\d{2}/);
    });

    test('should validate address format by country', async ({ page }) => {
      await page.goto('/checkout');

      // Test UK postcode validation
      await page.getByLabel(/country/i).selectOption('GB');
      await page.getByLabel(/postal code/i).fill('12345'); // Invalid UK postcode

      await page.getByRole('button', { name: /continue/i }).click();

      await expect(page.getByText(/invalid UK postcode/i)).toBeVisible();

      // Correct format
      await page.getByLabel(/postal code/i).fill('SW1A 1AA');
      await expect(page.getByText(/invalid UK postcode/i)).not.toBeVisible();
    });
  });

  test.describe('Order Tracking - International', () => {
    test('should track international shipment', async ({ page }) => {
      await page.goto('/orders');

      // Select an international order
      await page.locator('[data-testid="order-card"]').first().click();

      // Verify international shipping details
      await expect(page.getByText(/international shipping/i)).toBeVisible();
      await expect(page.getByText(/tracking number/i)).toBeVisible();

      // Click track shipment
      await page.getByRole('button', { name: /track shipment/i }).click();

      // Verify tracking events
      await expect(page.getByText(/departed origin country/i)).toBeVisible();
      await expect(page.getByText(/customs clearance/i)).toBeVisible();
      await expect(page.getByText(/in transit/i)).toBeVisible();

      // Verify estimated delivery with timezone
      await expect(page.getByText(/estimated delivery.*GMT/i)).toBeVisible();
    });
  });
});
