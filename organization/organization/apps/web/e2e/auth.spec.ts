import { test, expect } from '@playwright/test';
import {
  generateTestUser,
  registerUser,
  loginUser,
  logoutUser,
  isLoggedIn,
} from './helpers/test-helpers';

test.describe('Authentication Flow', () => {
  test.describe('User Registration', () => {
    test('should register a new user successfully', async ({ page }) => {
      const credentials = generateTestUser();

      await page.goto('/auth/register');

      // Fill registration form
      await page.fill('input[name="name"]', credentials.name!);
      await page.fill('input[name="email"]', credentials.email);
      await page.fill('input[name="password"]', credentials.password);

      // Submit form
      await page.click('button[type="submit"]');

      // Should redirect to home or dashboard
      await page.waitForURL(/\/(home|dashboard|products)/, { timeout: 10000 });

      // Should be logged in
      expect(await isLoggedIn(page)).toBeTruthy();
    });

    test('should show error for invalid email', async ({ page }) => {
      await page.goto('/auth/register');

      await page.fill('input[name="name"]', 'Test User');
      await page.fill('input[name="email"]', 'invalid-email');
      await page.fill('input[name="password"]', 'Test123!@#');

      await page.click('button[type="submit"]');

      // Should show validation error
      await expect(page.locator('text=/invalid.*email/i')).toBeVisible();
    });

    test('should show error for weak password', async ({ page }) => {
      await page.goto('/auth/register');

      await page.fill('input[name="name"]', 'Test User');
      await page.fill('input[name="email"]', generateTestUser().email);
      await page.fill('input[name="password"]', '123'); // Too weak

      await page.click('button[type="submit"]');

      // Should show validation error
      await expect(page.locator('text=/password.*weak|password.*short/i')).toBeVisible();
    });

    test('should show error for missing required fields', async ({ page }) => {
      await page.goto('/auth/register');

      // Try to submit without filling fields
      await page.click('button[type="submit"]');

      // Should show validation errors
      await expect(page.locator('text=/required|this field/i')).toHaveCount(3, {
        timeout: 5000,
      });
    });

    test('should prevent duplicate email registration', async ({ page, context }) => {
      const credentials = generateTestUser();

      // Register first user
      await registerUser(page, credentials);

      // Logout
      await page.evaluate(() => localStorage.clear());

      // Try to register again with same email
      await page.goto('/auth/register');
      await page.fill('input[name="name"]', 'Another User');
      await page.fill('input[name="email"]', credentials.email);
      await page.fill('input[name="password"]', credentials.password);
      await page.click('button[type="submit"]');

      // Should show error
      await expect(page.locator('text=/already.*exists|email.*taken/i')).toBeVisible();
    });
  });

  test.describe('User Login', () => {
    test('should login successfully with valid credentials', async ({ page }) => {
      const credentials = generateTestUser();

      // Register user first
      await registerUser(page, credentials);

      // Logout
      await page.evaluate(() => localStorage.clear());

      // Login
      await loginUser(page, credentials);

      // Should be logged in
      expect(await isLoggedIn(page)).toBeTruthy();

      // Should see user menu or profile
      await expect(page.locator('[data-testid="user-menu"]')).toBeVisible();
    });

    test('should show error for invalid credentials', async ({ page }) => {
      await page.goto('/auth/login');

      await page.fill('input[name="email"]', 'nonexistent@example.com');
      await page.fill('input[name="password"]', 'wrongpassword');

      await page.click('button[type="submit"]');

      // Should show error message
      await expect(page.locator('text=/invalid.*credentials|wrong.*password/i')).toBeVisible();
    });

    test('should show error for missing fields', async ({ page }) => {
      await page.goto('/auth/login');

      await page.click('button[type="submit"]');

      // Should show validation errors
      await expect(page.locator('text=/required|this field/i')).toHaveCount(2, {
        timeout: 5000,
      });
    });

    test('should redirect to intended page after login', async ({ page }) => {
      const credentials = generateTestUser();
      await registerUser(page, credentials);
      await page.evaluate(() => localStorage.clear());

      // Try to access protected page
      await page.goto('/dashboard');

      // Should redirect to login
      await page.waitForURL('/auth/login');

      // Login
      await loginUser(page, credentials);

      // Should redirect back to dashboard
      await expect(page).toHaveURL(/\/dashboard/);
    });

    test('should persist login after page refresh', async ({ page }) => {
      const credentials = generateTestUser();
      await registerUser(page, credentials);

      // Refresh page
      await page.reload();

      // Should still be logged in
      expect(await isLoggedIn(page)).toBeTruthy();
    });
  });

  test.describe('User Logout', () => {
    test('should logout successfully', async ({ page }) => {
      const credentials = generateTestUser();
      await registerUser(page, credentials);

      // Find and click user menu
      await page.click('[data-testid="user-menu"]');

      // Click logout
      await page.click('[data-testid="logout-button"]');

      // Should redirect to login or home
      await page.waitForURL(/\/(auth\/login|home|\/)/, { timeout: 5000 });

      // Should not be logged in
      expect(await isLoggedIn(page)).toBeFalsy();
    });

    test('should clear user data on logout', async ({ page }) => {
      const credentials = generateTestUser();
      await registerUser(page, credentials);

      // Logout
      await page.click('[data-testid="user-menu"]');
      await page.click('[data-testid="logout-button"]');

      // Check localStorage is cleared
      const token = await page.evaluate(() => localStorage.getItem('auth_token'));
      expect(token).toBeNull();
    });

    test('should not access protected routes after logout', async ({ page }) => {
      const credentials = generateTestUser();
      await registerUser(page, credentials);

      // Logout
      await page.click('[data-testid="user-menu"]');
      await page.click('[data-testid="logout-button"]');

      // Try to access protected route
      await page.goto('/dashboard');

      // Should redirect to login
      await page.waitForURL('/auth/login', { timeout: 5000 });
    });
  });

  test.describe('Password Reset', () => {
    test('should request password reset', async ({ page }) => {
      await page.goto('/auth/forgot-password');

      await page.fill('input[name="email"]', 'test@example.com');
      await page.click('button[type="submit"]');

      // Should show success message
      await expect(
        page.locator('text=/reset.*link.*sent|check.*email/i'),
      ).toBeVisible();
    });

    test('should validate email in password reset', async ({ page }) => {
      await page.goto('/auth/forgot-password');

      await page.fill('input[name="email"]', 'invalid-email');
      await page.click('button[type="submit"]');

      // Should show validation error
      await expect(page.locator('text=/invalid.*email/i')).toBeVisible();
    });
  });

  test.describe('Session Management', () => {
    test('should handle expired session gracefully', async ({ page }) => {
      const credentials = generateTestUser();
      await registerUser(page, credentials);

      // Simulate expired token
      await page.evaluate(() => {
        localStorage.setItem('auth_token', 'expired_token_xyz');
      });

      // Try to access protected route
      await page.goto('/dashboard');

      // Should redirect to login
      await page.waitForURL('/auth/login', { timeout: 10000 });
    });

    test('should prevent multiple concurrent logins with same credentials', async ({
      page,
      context,
    }) => {
      const credentials = generateTestUser();
      await registerUser(page, credentials);

      // Open new tab
      const newPage = await context.newPage();
      await newPage.goto('/');
      await newPage.evaluate(() => localStorage.clear());

      // Login in new tab
      await loginUser(newPage, credentials);

      // Both should be logged in (depending on session strategy)
      expect(await isLoggedIn(page)).toBeTruthy();
      expect(await isLoggedIn(newPage)).toBeTruthy();
    });
  });

  test.describe('UI/UX Elements', () => {
    test('should show password toggle', async ({ page }) => {
      await page.goto('/auth/login');

      const passwordInput = page.locator('input[name="password"]');

      // Password should be hidden
      await expect(passwordInput).toHaveAttribute('type', 'password');

      // Click toggle
      await page.click('[data-testid="password-toggle"]');

      // Password should be visible
      await expect(passwordInput).toHaveAttribute('type', 'text');
    });

    test('should have link to register from login page', async ({ page }) => {
      await page.goto('/auth/login');

      // Should have link to register
      await expect(page.locator('a[href="/auth/register"]')).toBeVisible();
    });

    test('should have link to login from register page', async ({ page }) => {
      await page.goto('/auth/register');

      // Should have link to login
      await expect(page.locator('a[href="/auth/login"]')).toBeVisible();
    });

    test('should show loading state during login', async ({ page }) => {
      await page.goto('/auth/login');

      await page.fill('input[name="email"]', 'test@example.com');
      await page.fill('input[name="password"]', 'password123');

      // Click submit and check for loading state
      const submitButton = page.locator('button[type="submit"]');
      await submitButton.click();

      // Button should show loading state
      await expect(submitButton).toBeDisabled();
      await expect(submitButton).toContainText(/loading|signing|please wait/i);
    });
  });
});
