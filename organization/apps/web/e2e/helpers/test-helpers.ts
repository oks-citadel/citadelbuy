import { Page, expect } from '@playwright/test';

export interface TestCredentials {
  email: string;
  password: string;
  name?: string;
}

/**
 * Generate unique test email
 */
export function generateTestEmail(): string {
  return `test-${Date.now()}-${Math.random().toString(36).substring(7)}@example.com`;
}

/**
 * Generate test user credentials
 */
export function generateTestUser(): TestCredentials {
  return {
    email: generateTestEmail(),
    password: 'Test123!@#',
    name: 'Test User',
  };
}

/**
 * Register a new user via UI
 */
export async function registerUser(
  page: Page,
  credentials: TestCredentials,
): Promise<void> {
  await page.goto('/auth/register');

  await page.fill('input[name="name"]', credentials.name || 'Test User');
  await page.fill('input[name="email"]', credentials.email);
  await page.fill('input[name="password"]', credentials.password);

  await page.click('button[type="submit"]');

  // Wait for redirect or success message
  await page.waitForURL(/\/(dashboard|products|home)/, { timeout: 10000 });
}

/**
 * Login user via UI
 */
export async function loginUser(
  page: Page,
  credentials: TestCredentials,
): Promise<void> {
  await page.goto('/auth/login');

  await page.fill('input[name="email"]', credentials.email);
  await page.fill('input[name="password"]', credentials.password);

  await page.click('button[type="submit"]');

  // Wait for redirect after login
  await page.waitForURL(/\/(dashboard|products|home)/, { timeout: 10000 });
}

/**
 * Login user via API (faster for setup)
 */
export async function loginUserAPI(
  page: Page,
  credentials: TestCredentials,
): Promise<string> {
  const apiUrl = process.env.PLAYWRIGHT_API_URL || 'http://localhost:4000';

  const response = await page.request.post(`${apiUrl}/auth/login`, {
    data: {
      email: credentials.email,
      password: credentials.password,
    },
  });

  expect(response.ok()).toBeTruthy();

  const data = await response.json();
  const token = data.access_token;

  // Set token in localStorage
  await page.goto('/');
  await page.evaluate((token) => {
    localStorage.setItem('auth_token', token);
  }, token);

  return token;
}

/**
 * Register user via API (faster for setup)
 */
export async function registerUserAPI(
  page: Page,
  credentials: TestCredentials,
): Promise<string> {
  const apiUrl = process.env.PLAYWRIGHT_API_URL || 'http://localhost:4000';

  const response = await page.request.post(`${apiUrl}/auth/register`, {
    data: {
      email: credentials.email,
      password: credentials.password,
      name: credentials.name || 'Test User',
    },
  });

  expect(response.ok()).toBeTruthy();

  const data = await response.json();
  return data.access_token;
}

/**
 * Logout user
 */
export async function logoutUser(page: Page): Promise<void> {
  await page.click('[data-testid="user-menu"]');
  await page.click('[data-testid="logout-button"]');
  await page.waitForURL('/auth/login', { timeout: 5000 });
}

/**
 * Add product to cart via UI
 */
export async function addToCart(
  page: Page,
  productName?: string,
): Promise<void> {
  if (productName) {
    // Go to specific product
    await page.goto('/products');
    await page.click(`text=${productName}`);
  }

  // Click add to cart button
  await page.click('button:has-text("Add to Cart")');

  // Wait for success message or cart update
  await page.waitForSelector('text=Added to cart', { timeout: 5000 });
}

/**
 * Navigate to cart
 */
export async function goToCart(page: Page): Promise<void> {
  await page.click('[data-testid="cart-icon"]');
  await page.waitForURL('/cart');
}

/**
 * Navigate to checkout
 */
export async function goToCheckout(page: Page): Promise<void> {
  await page.click('button:has-text("Proceed to Checkout")');
  await page.waitForURL('/checkout');
}

/**
 * Fill shipping address form
 */
export async function fillShippingAddress(
  page: Page,
  address: {
    firstName?: string;
    lastName?: string;
    address?: string;
    city?: string;
    state?: string;
    zipCode?: string;
    country?: string;
    phone?: string;
  },
): Promise<void> {
  const defaultAddress = {
    firstName: 'John',
    lastName: 'Doe',
    address: '123 Main St',
    city: 'New York',
    state: 'NY',
    zipCode: '10001',
    country: 'US',
    phone: '5551234567',
    ...address,
  };

  await page.fill('input[name="shippingAddress.firstName"]', defaultAddress.firstName);
  await page.fill('input[name="shippingAddress.lastName"]', defaultAddress.lastName);
  await page.fill('input[name="shippingAddress.address"]', defaultAddress.address);
  await page.fill('input[name="shippingAddress.city"]', defaultAddress.city);
  await page.fill('input[name="shippingAddress.state"]', defaultAddress.state);
  await page.fill('input[name="shippingAddress.zipCode"]', defaultAddress.zipCode);
  await page.fill('input[name="shippingAddress.phone"]', defaultAddress.phone);
}

/**
 * Fill payment information (test mode)
 */
export async function fillPaymentInfo(page: Page): Promise<void> {
  // Switch to Stripe iframe if present
  const stripeFrame = page.frameLocator('iframe[name^="__privateStripeFrame"]');

  if (await stripeFrame.locator('input[name="cardnumber"]').count() > 0) {
    await stripeFrame.locator('input[name="cardnumber"]').fill('4242424242424242');
    await stripeFrame.locator('input[name="exp-date"]').fill('12/30');
    await stripeFrame.locator('input[name="cvc"]').fill('123');
    await stripeFrame.locator('input[name="postal"]').fill('10001');
  } else {
    // Fallback for test mode
    await page.fill('input[name="cardNumber"]', '4242424242424242');
    await page.fill('input[name="expiry"]', '12/30');
    await page.fill('input[name="cvc"]', '123');
  }
}

/**
 * Wait for element with text
 */
export async function waitForText(
  page: Page,
  text: string,
  timeout = 5000,
): Promise<void> {
  await page.waitForSelector(`text=${text}`, { timeout });
}

/**
 * Check if user is logged in
 */
export async function isLoggedIn(page: Page): Promise<boolean> {
  const token = await page.evaluate(() => localStorage.getItem('auth_token'));
  return !!token;
}

/**
 * Clear all test data (requires API access)
 */
export async function cleanupTestData(
  page: Page,
  authToken: string,
): Promise<void> {
  const apiUrl = process.env.PLAYWRIGHT_API_URL || 'http://localhost:4000';

  // Delete cart items
  await page.request.delete(`${apiUrl}/cart`, {
    headers: {
      Authorization: `Bearer ${authToken}`,
    },
  });

  // Can add more cleanup as needed
}

/**
 * Take screenshot with timestamp
 */
export async function takeScreenshot(
  page: Page,
  name: string,
): Promise<void> {
  const timestamp = Date.now();
  await page.screenshot({
    path: `screenshots/${name}-${timestamp}.png`,
    fullPage: true,
  });
}

/**
 * Wait for network idle
 */
export async function waitForNetworkIdle(page: Page): Promise<void> {
  await page.waitForLoadState('networkidle');
}
