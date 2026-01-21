import { test, expect } from '@playwright/test';

/**
 * Enterprise Workflow E2E Tests
 *
 * Tests the complete enterprise organization workflow including:
 * - Organization creation and setup
 * - Department and team management
 * - Role-based access control
 * - Multi-user collaboration
 * - Enterprise billing and subscriptions
 * - API key management
 * - Audit logging
 */

test.describe('Enterprise Organization Workflow', () => {
  let organizationId: string;
  let apiKey: string;

  test.beforeAll(async ({ request }) => {
    // Cleanup any existing test organizations
    const cleanup = await request.delete('/api/organizations/test-cleanup', {
      data: { pattern: 'E2E Test Corp*' }
    });
  });

  test.describe('Organization Setup', () => {
    test('should create new enterprise organization', async ({ page }) => {
      // Navigate to organization creation
      await page.goto('/organizations/new');

      // Fill organization details
      await page.getByLabel(/organization name/i).fill('E2E Test Corp Ltd');
      await page.getByLabel(/slug/i).fill('e2e-test-corp');
      await page.getByLabel(/industry/i).selectOption('technology');
      await page.getByLabel(/company size/i).selectOption('201-500');
      await page.getByLabel(/website/i).fill('https://e2etest.example.com');

      // Business information
      await page.getByLabel(/business email/i).fill('billing@e2etest.com');
      await page.getByLabel(/phone/i).fill('+1234567890');

      // Address
      await page.getByLabel(/street address/i).fill('123 Enterprise Blvd');
      await page.getByLabel(/city/i).fill('San Francisco');
      await page.getByLabel(/state/i).selectOption('CA');
      await page.getByLabel(/zip code/i).fill('94105');
      await page.getByLabel(/country/i).selectOption('US');

      // Submit
      await page.getByRole('button', { name: /create organization/i }).click();

      // Verify success
      await expect(page.getByText(/organization created successfully/i)).toBeVisible();
      await expect(page).toHaveURL(/\/org\/e2e-test-corp/);

      // Extract organization ID from URL or API response
      const url = page.url();
      organizationId = url.match(/\/org\/([^\/]+)/)?.[1] || '';
      expect(organizationId).toBeTruthy();
    });

    test('should complete organization onboarding', async ({ page }) => {
      await page.goto(`/org/${organizationId}/onboarding`);

      // Step 1: Verify business information
      await page.getByRole('button', { name: /next/i }).click();

      // Step 2: Set up departments
      await page.getByRole('button', { name: /add department/i }).click();
      await page.getByLabel(/department name/i).fill('Engineering');
      await page.getByLabel(/description/i).fill('Product development team');
      await page.getByRole('button', { name: /save department/i }).click();

      await page.getByRole('button', { name: /add department/i }).click();
      await page.getByLabel(/department name/i).fill('Sales');
      await page.getByLabel(/description/i).fill('Sales and business development');
      await page.getByRole('button', { name: /save department/i }).click();

      await page.getByRole('button', { name: /next/i }).click();

      // Step 3: Invite team members
      await page.getByRole('button', { name: /invite member/i }).click();
      await page.getByLabel(/email/i).fill('engineer@e2etest.com');
      await page.getByLabel(/role/i).selectOption('member');
      await page.getByLabel(/department/i).selectOption('Engineering');
      await page.getByRole('button', { name: /send invitation/i }).click();

      await expect(page.getByText(/invitation sent/i)).toBeVisible();

      // Complete onboarding
      await page.getByRole('button', { name: /finish/i }).click();
      await expect(page.getByText(/onboarding complete/i)).toBeVisible();
    });
  });

  test.describe('Department & Team Management', () => {
    test('should create and manage departments', async ({ page }) => {
      await page.goto(`/org/${organizationId}/settings/departments`);

      // View departments
      await expect(page.getByText('Engineering')).toBeVisible();
      await expect(page.getByText('Sales')).toBeVisible();

      // Create new department
      await page.getByRole('button', { name: /add department/i }).click();
      await page.getByLabel(/department name/i).fill('Marketing');
      await page.getByLabel(/description/i).fill('Marketing and content team');
      await page.getByRole('button', { name: /create/i }).click();

      await expect(page.getByText('Marketing')).toBeVisible();

      // Edit department
      await page.getByText('Marketing').click();
      await page.getByRole('button', { name: /edit/i }).click();
      await page.getByLabel(/budget/i).fill('50000');
      await page.getByRole('button', { name: /save/i }).click();

      await expect(page.getByText(/department updated/i)).toBeVisible();
    });

    test('should manage team members within departments', async ({ page }) => {
      await page.goto(`/org/${organizationId}/settings/departments/engineering`);

      // Add team members
      await page.getByRole('button', { name: /add members/i }).click();

      // Assign existing organization members
      await page.getByLabel(/select members/i).click();
      await page.getByText('engineer@e2etest.com').click();
      await page.getByRole('button', { name: /add to department/i }).click();

      await expect(page.getByText('engineer@e2etest.com')).toBeVisible();

      // Set department lead
      await page.getByText('engineer@e2etest.com').hover();
      await page.getByRole('button', { name: /set as lead/i }).click();

      await expect(page.getByText(/department lead/i)).toBeVisible();
    });
  });

  test.describe('Role-Based Access Control (RBAC)', () => {
    test('should create custom roles with permissions', async ({ page }) => {
      await page.goto(`/org/${organizationId}/settings/roles`);

      // Create custom role
      await page.getByRole('button', { name: /create role/i }).click();
      await page.getByLabel(/role name/i).fill('Product Manager');
      await page.getByLabel(/description/i).fill('Manage products and catalog');

      // Set permissions
      await page.getByLabel(/products.create/i).check();
      await page.getByLabel(/products.update/i).check();
      await page.getByLabel(/products.delete/i).check();
      await page.getByLabel(/products.view/i).check();
      await page.getByLabel(/orders.view/i).check();
      await page.getByLabel(/analytics.view/i).check();

      await page.getByRole('button', { name: /create role/i }).click();

      await expect(page.getByText(/role created/i)).toBeVisible();
      await expect(page.getByText('Product Manager')).toBeVisible();
    });

    test('should assign roles to users', async ({ page }) => {
      await page.goto(`/org/${organizationId}/settings/members`);

      // Find user and assign role
      const userRow = page.getByText('engineer@e2etest.com').locator('..');
      await userRow.getByRole('button', { name: /manage roles/i }).click();

      await page.getByLabel(/select role/i).selectOption('Product Manager');
      await page.getByRole('button', { name: /assign role/i }).click();

      await expect(page.getByText('Product Manager')).toBeVisible();
    });

    test('should enforce permission-based access', async ({ page, context }) => {
      // Create a new page context as a limited user
      const limitedUserPage = await context.newPage();

      // Login as limited user (simulate)
      // In real test, you'd actually login with test credentials

      await limitedUserPage.goto(`/org/${organizationId}/products`);

      // Should be able to view products
      await expect(limitedUserPage.getByRole('heading', { name: /products/i })).toBeVisible();

      // Should be able to create product
      const createButton = limitedUserPage.getByRole('button', { name: /create product/i });
      await expect(createButton).toBeVisible();

      // Try to access billing (should be denied)
      await limitedUserPage.goto(`/org/${organizationId}/billing`);
      await expect(limitedUserPage.getByText(/access denied|unauthorized/i)).toBeVisible();
    });
  });

  test.describe('API Key Management', () => {
    test('should generate API key for organization', async ({ page }) => {
      await page.goto(`/org/${organizationId}/api-keys`);

      // Generate new API key
      await page.getByRole('button', { name: /create api key/i }).click();
      await page.getByLabel(/key name/i).fill('Production API Key');
      await page.getByLabel(/description/i).fill('Used for production integrations');

      // Set permissions
      await page.getByLabel(/products:read/i).check();
      await page.getByLabel(/products:write/i).check();
      await page.getByLabel(/orders:read/i).check();

      // Set rate limit
      await page.getByLabel(/rate limit/i).fill('1000');

      await page.getByRole('button', { name: /generate key/i }).click();

      // API key should be displayed once
      const apiKeyElement = page.locator('[data-testid="api-key-value"]');
      await expect(apiKeyElement).toBeVisible();

      apiKey = await apiKeyElement.textContent() || '';
      expect(apiKey).toMatch(/^org_live_[a-zA-Z0-9]{32,}/);

      // Copy API key
      await page.getByRole('button', { name: /copy/i }).click();
      await expect(page.getByText(/copied/i)).toBeVisible();

      // Acknowledge
      await page.getByRole('button', { name: /i've saved the key/i }).click();
    });

    test('should use API key for authenticated requests', async ({ request }) => {
      // Test API key authentication
      const response = await request.get('/api/products', {
        headers: {
          'X-API-Key': apiKey
        }
      });

      expect(response.status()).toBe(200);
      const data = await response.json();
      expect(data).toHaveProperty('products');
    });

    test('should manage and revoke API keys', async ({ page }) => {
      await page.goto(`/org/${organizationId}/api-keys`);

      // View API key details
      await page.getByText('Production API Key').click();
      await expect(page.getByText(/products:read/i)).toBeVisible();
      await expect(page.getByText(/last used/i)).toBeVisible();

      // Revoke API key
      await page.getByRole('button', { name: /revoke key/i }).click();
      await page.getByRole('button', { name: /confirm/i }).click();

      await expect(page.getByText(/api key revoked/i)).toBeVisible();

      // Verify revoked key doesn't work
      const { request } = await page.context();
      const response = await request.get('/api/products', {
        headers: {
          'X-API-Key': apiKey
        }
      });

      expect(response.status()).toBe(401);
    });
  });

  test.describe('Enterprise Billing', () => {
    test('should view billing overview', async ({ page }) => {
      await page.goto(`/org/${organizationId}/billing`);

      // Check billing information is displayed
      await expect(page.getByText(/current plan/i)).toBeVisible();
      await expect(page.getByText(/billing cycle/i)).toBeVisible();
      await expect(page.getByText(/payment method/i)).toBeVisible();
    });

    test('should upgrade to enterprise plan', async ({ page }) => {
      await page.goto(`/org/${organizationId}/billing/plans`);

      // Select enterprise plan
      const enterprisePlan = page.locator('[data-testid="plan-enterprise"]');
      await enterprisePlan.getByRole('button', { name: /upgrade/i }).click();

      // Confirm upgrade
      await page.getByLabel(/annual billing/i).check();
      await expect(page.getByText(/\$999\/month/i)).toBeVisible();

      // Add payment method
      await page.getByRole('button', { name: /add payment method/i }).click();

      // Stripe card element (in real test, use Stripe test card)
      // This is a simplified version
      const stripeFrame = page.frameLocator('iframe[name*="stripe"]');
      await stripeFrame.getByPlaceholder(/card number/i).fill('4242424242424242');
      await stripeFrame.getByPlaceholder(/mm\/yy/i).fill('12/25');
      await stripeFrame.getByPlaceholder(/cvc/i).fill('123');

      await page.getByRole('button', { name: /confirm upgrade/i }).click();

      // Wait for payment processing
      await expect(page.getByText(/upgrade successful/i)).toBeVisible({ timeout: 10000 });
      await expect(page.getByText(/enterprise plan/i)).toBeVisible();
    });

    test('should view invoice history', async ({ page }) => {
      await page.goto(`/org/${organizationId}/billing/invoices`);

      // Check invoices are listed
      await expect(page.getByText(/invoice/i)).toBeVisible();

      // Download invoice
      const downloadButton = page.getByRole('button', { name: /download/i }).first();
      const [download] = await Promise.all([
        page.waitForEvent('download'),
        downloadButton.click()
      ]);

      expect(download.suggestedFilename()).toMatch(/invoice.*\.pdf/i);
    });
  });

  test.describe('Audit Logging', () => {
    test('should log organization activities', async ({ page }) => {
      await page.goto(`/org/${organizationId}/audit-logs`);

      // Verify audit logs are displayed
      await expect(page.getByText(/audit log/i)).toBeVisible();

      // Check for recent actions
      await expect(page.getByText(/organization created/i)).toBeVisible();
      await expect(page.getByText(/member invited/i)).toBeVisible();
      await expect(page.getByText(/api key created/i)).toBeVisible();

      // Filter logs
      await page.getByLabel(/filter by event/i).selectOption('member.invited');
      await expect(page.getByText(/member invited/i)).toBeVisible();

      // Export logs
      await page.getByRole('button', { name: /export logs/i }).click();
      await page.getByLabel(/date range/i).fill('2025-12-01 to 2025-12-31');
      await page.getByRole('button', { name: /export csv/i }).click();

      const [download] = await Promise.all([
        page.waitForEvent('download'),
        page.getByRole('button', { name: /download/i }).click()
      ]);

      expect(download.suggestedFilename()).toMatch(/audit-logs.*\.csv/i);
    });
  });

  test.describe('Multi-User Collaboration', () => {
    test('should collaborate on product management', async ({ page, context }) => {
      // Admin user creates product
      await page.goto(`/org/${organizationId}/products/new`);

      await page.getByLabel(/product name/i).fill('Enterprise Widget Pro');
      await page.getByLabel(/sku/i).fill('EWP-001');
      await page.getByLabel(/price/i).fill('999.99');
      await page.getByLabel(/category/i).selectOption('electronics');
      await page.getByLabel(/description/i).fill('Professional-grade enterprise widget');

      await page.getByRole('button', { name: /create product/i }).click();
      await expect(page.getByText(/product created/i)).toBeVisible();

      const productId = page.url().match(/\/products\/([^\/]+)/)?.[1];

      // Product Manager (different user) edits product
      const pmPage = await context.newPage();
      await pmPage.goto(`/org/${organizationId}/products/${productId}/edit`);

      // Check concurrent editing warning
      await pmPage.getByLabel(/price/i).fill('1099.99');

      // Simulate admin also editing
      await page.goto(`/org/${organizationId}/products/${productId}/edit`);
      await page.getByLabel(/stock/i).fill('100');

      // PM tries to save
      await pmPage.getByRole('button', { name: /save/i }).click();

      // Should show conflict warning
      await expect(pmPage.getByText(/someone else is editing/i)).toBeVisible();
    });
  });

  test.afterAll(async ({ request }) => {
    // Cleanup: Delete test organization
    if (organizationId) {
      await request.delete(`/api/organizations/${organizationId}`, {
        headers: {
          'X-Confirm-Delete': 'true'
        }
      });
    }
  });
});
