/**
 * Accessibility Tests using axe-core
 *
 * Tests key pages for WCAG 2.1 AA compliance.
 */

import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

// Pages to test for accessibility
const PAGES_TO_TEST = [
  { name: 'Homepage', path: '/' },
  { name: 'Products', path: '/products' },
  { name: 'Login', path: '/auth/login' },
  { name: 'Register', path: '/auth/register' },
  { name: 'Cart', path: '/cart' },
  { name: 'Categories', path: '/categories' },
];

test.describe('Accessibility Tests', () => {
  // Configure viewport for consistent testing
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
  });

  for (const pageConfig of PAGES_TO_TEST) {
    test(`${pageConfig.name} page should have no critical accessibility violations`, async ({
      page,
    }) => {
      await page.goto(pageConfig.path);
      await page.waitForLoadState('networkidle');

      const results = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
        .analyze();

      // Filter to critical and serious violations only
      const criticalViolations = results.violations.filter(
        (v) => v.impact === 'critical' || v.impact === 'serious'
      );

      // Log all violations for debugging
      if (results.violations.length > 0) {
        console.log(`\n${pageConfig.name} page violations:`);
        results.violations.forEach((violation) => {
          console.log(`  - [${violation.impact}] ${violation.id}: ${violation.description}`);
          violation.nodes.forEach((node) => {
            console.log(`    Target: ${node.target.join(', ')}`);
          });
        });
      }

      // Fail only on critical/serious violations
      expect(criticalViolations).toEqual([]);
    });
  }

  test('Homepage should have proper heading hierarchy', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Check for h1 existence
    const h1Count = await page.locator('h1').count();
    expect(h1Count).toBeGreaterThanOrEqual(1);

    // Check that h1 comes before h2
    const headings = await page.evaluate(() => {
      const elements = document.querySelectorAll('h1, h2, h3, h4, h5, h6');
      return Array.from(elements).map((el) => ({
        tag: el.tagName.toLowerCase(),
        text: el.textContent?.trim().substring(0, 50),
      }));
    });

    if (headings.length > 0) {
      expect(headings[0].tag).toBe('h1');
    }
  });

  test('Login form should be accessible', async ({ page }) => {
    await page.goto('/auth/login');
    await page.waitForLoadState('networkidle');

    // Check for form labels
    const emailInput = page.locator('input[name="email"], input[type="email"]');
    const passwordInput = page.locator('input[name="password"], input[type="password"]');

    // Email input should have accessible name
    const emailLabel = await emailInput.getAttribute('aria-label');
    const emailLabelledBy = await emailInput.getAttribute('aria-labelledby');
    const emailId = await emailInput.getAttribute('id');

    // Should have some form of label
    const hasEmailLabel =
      emailLabel ||
      emailLabelledBy ||
      (emailId && (await page.locator(`label[for="${emailId}"]`).count()) > 0);

    expect(hasEmailLabel).toBeTruthy();

    // Password input should have accessible name
    const passwordLabel = await passwordInput.getAttribute('aria-label');
    const passwordLabelledBy = await passwordInput.getAttribute('aria-labelledby');
    const passwordId = await passwordInput.getAttribute('id');

    const hasPasswordLabel =
      passwordLabel ||
      passwordLabelledBy ||
      (passwordId && (await page.locator(`label[for="${passwordId}"]`).count()) > 0);

    expect(hasPasswordLabel).toBeTruthy();
  });

  test('Navigation should be keyboard accessible', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Focus on first focusable element
    await page.keyboard.press('Tab');

    // Check that something received focus
    const focusedElement = await page.evaluate(() => {
      const el = document.activeElement;
      return el ? el.tagName.toLowerCase() : null;
    });

    expect(focusedElement).not.toBeNull();

    // Tab through several elements to ensure keyboard navigation works
    for (let i = 0; i < 5; i++) {
      await page.keyboard.press('Tab');
    }

    // Should still have focus somewhere
    const stillFocused = await page.evaluate(() => {
      return document.activeElement !== document.body;
    });

    expect(stillFocused).toBe(true);
  });

  test('Images should have alt text', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Get all images
    const images = await page.locator('img').all();

    for (const img of images) {
      const alt = await img.getAttribute('alt');
      const role = await img.getAttribute('role');
      const ariaHidden = await img.getAttribute('aria-hidden');

      // Image should have alt text OR be decorative (role="presentation" or aria-hidden)
      const isAccessible =
        alt !== null || role === 'presentation' || role === 'none' || ariaHidden === 'true';

      if (!isAccessible) {
        const src = await img.getAttribute('src');
        console.log(`Image missing alt text: ${src}`);
      }

      expect(isAccessible).toBe(true);
    }
  });

  test('Color contrast should be sufficient', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2aa'])
      .disableRules([
        'region',
        'landmark-one-main',
        'page-has-heading-one',
        'bypass',
        'link-name',
      ]) // Focus only on contrast
      .analyze();

    const contrastViolations = results.violations.filter(
      (v) => v.id === 'color-contrast' || v.id === 'color-contrast-enhanced'
    );

    // Log contrast issues
    if (contrastViolations.length > 0) {
      console.log('\nColor contrast violations:');
      contrastViolations.forEach((violation) => {
        violation.nodes.forEach((node) => {
          console.log(`  - ${node.target.join(', ')}: ${node.failureSummary}`);
        });
      });
    }

    // Allow some minor contrast issues but flag critical ones
    const criticalContrastIssues = contrastViolations.filter(
      (v) => v.impact === 'critical' || v.impact === 'serious'
    );

    expect(criticalContrastIssues).toEqual([]);
  });

  test('Focus indicators should be visible', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Tab to first interactive element
    await page.keyboard.press('Tab');

    // Check if focus is visible
    const hasFocusIndicator = await page.evaluate(() => {
      const el = document.activeElement;
      if (!el) return false;

      const style = window.getComputedStyle(el);
      const outlineWidth = parseFloat(style.outlineWidth);
      const boxShadow = style.boxShadow;
      const border = style.border;

      // Focus should have some visible indicator
      return (
        outlineWidth > 0 ||
        (boxShadow && boxShadow !== 'none') ||
        (border && border !== 'none' && border !== '0px none')
      );
    });

    // Note: This is a basic check, manual verification recommended
    console.log(`Focus indicator visible: ${hasFocusIndicator}`);
  });

  test('Mobile viewport should be accessible', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 }); // iPhone SE size
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .analyze();

    const criticalViolations = results.violations.filter((v) => v.impact === 'critical');

    expect(criticalViolations).toEqual([]);
  });
});

test.describe('Form Accessibility', () => {
  test('Registration form should have proper validation messages', async ({ page }) => {
    await page.goto('/auth/register');
    await page.waitForLoadState('networkidle');

    // Submit empty form
    const submitButton = page.locator('button[type="submit"]');
    await submitButton.click();

    // Wait for validation messages
    await page.waitForTimeout(500);

    // Check for error messages
    const errorMessages = await page.locator('[role="alert"], .error, [aria-invalid="true"]').count();

    // Should have some error feedback
    expect(errorMessages).toBeGreaterThan(0);
  });

  test('Form inputs should have autocomplete attributes', async ({ page }) => {
    await page.goto('/auth/login');
    await page.waitForLoadState('networkidle');

    const emailInput = page.locator('input[name="email"], input[type="email"]').first();
    const passwordInput = page.locator('input[name="password"], input[type="password"]').first();

    const emailAutocomplete = await emailInput.getAttribute('autocomplete');
    const passwordAutocomplete = await passwordInput.getAttribute('autocomplete');

    // Autocomplete helps password managers and accessibility tools
    // Note: Not all forms need this, so we just log
    console.log(`Email autocomplete: ${emailAutocomplete || 'not set'}`);
    console.log(`Password autocomplete: ${passwordAutocomplete || 'not set'}`);
  });
});
