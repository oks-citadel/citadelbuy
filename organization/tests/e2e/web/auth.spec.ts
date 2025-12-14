import { test, expect } from '@playwright/test';

test.describe('Authentication Flow', () => {
  test.describe('Login', () => {
    test('should display login page', async ({ page }) => {
      await page.goto('/auth/login');
      await expect(page).toHaveTitle(/Login|Sign In/i);
      await expect(page.getByRole('textbox', { name: /email/i })).toBeVisible();
      await expect(page.getByRole('textbox', { name: /password/i })).toBeVisible();
    });

    test('should show validation errors for empty form', async ({ page }) => {
      await page.goto('/auth/login');
      await page.getByRole('button', { name: /sign in|login/i }).click();
      await expect(page.getByText(/email is required|please enter/i)).toBeVisible();
    });

    test('should show error for invalid credentials', async ({ page }) => {
      await page.goto('/auth/login');
      await page.getByRole('textbox', { name: /email/i }).fill('invalid@example.com');
      await page.getByRole('textbox', { name: /password/i }).fill('wrongpassword');
      await page.getByRole('button', { name: /sign in|login/i }).click();
      await expect(page.getByText(/invalid|incorrect|error/i)).toBeVisible({ timeout: 10000 });
    });

    test('should login successfully with valid credentials', async ({ page }) => {
      await page.goto('/auth/login');
      await page.getByRole('textbox', { name: /email/i }).fill('customer@broxiva.com');
      await page.getByRole('textbox', { name: /password/i }).fill('password123');
      await page.getByRole('button', { name: /sign in|login/i }).click();

      // Should redirect to home or account page
      await expect(page).toHaveURL(/\/(account|home|$)/, { timeout: 10000 });
    });

    test('should have forgot password link', async ({ page }) => {
      await page.goto('/auth/login');
      const forgotLink = page.getByRole('link', { name: /forgot|reset/i });
      await expect(forgotLink).toBeVisible();
      await forgotLink.click();
      await expect(page).toHaveURL(/forgot-password|reset/);
    });
  });

  test.describe('Registration', () => {
    test('should display registration page', async ({ page }) => {
      await page.goto('/auth/register');
      await expect(page.getByRole('textbox', { name: /name/i })).toBeVisible();
      await expect(page.getByRole('textbox', { name: /email/i })).toBeVisible();
      await expect(page.getByRole('textbox', { name: /password/i })).toBeVisible();
    });

    test('should show validation errors for weak password', async ({ page }) => {
      await page.goto('/auth/register');
      await page.getByRole('textbox', { name: /name/i }).fill('Test User');
      await page.getByRole('textbox', { name: /email/i }).fill('test@example.com');
      await page.getByRole('textbox', { name: /password/i }).fill('weak');
      await page.getByRole('button', { name: /sign up|register|create/i }).click();
      await expect(page.getByText(/password.*8|characters|weak/i)).toBeVisible();
    });

    test('should show error for existing email', async ({ page }) => {
      await page.goto('/auth/register');
      await page.getByRole('textbox', { name: /name/i }).fill('Test User');
      await page.getByRole('textbox', { name: /email/i }).fill('customer@broxiva.com');
      await page.getByRole('textbox', { name: /password/i }).fill('SecurePass123!');
      await page.getByRole('button', { name: /sign up|register|create/i }).click();
      await expect(page.getByText(/already exists|already registered|in use/i)).toBeVisible({ timeout: 10000 });
    });
  });

  test.describe('Logout', () => {
    test('should logout successfully', async ({ page }) => {
      // Login first
      await page.goto('/auth/login');
      await page.getByRole('textbox', { name: /email/i }).fill('customer@broxiva.com');
      await page.getByRole('textbox', { name: /password/i }).fill('password123');
      await page.getByRole('button', { name: /sign in|login/i }).click();
      await page.waitForURL(/\/(account|home|$)/, { timeout: 10000 });

      // Logout
      await page.getByRole('button', { name: /account|profile|menu/i }).click();
      await page.getByRole('menuitem', { name: /logout|sign out/i }).click();

      // Should redirect to home or login
      await expect(page).toHaveURL(/\/(login|$)/);
    });
  });
});
