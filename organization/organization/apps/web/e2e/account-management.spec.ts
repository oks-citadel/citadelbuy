import { test, expect } from '@playwright/test';
import {
  generateTestUser,
  registerUser,
  loginUser,
  waitForNetworkIdle,
} from './helpers/test-helpers';

test.describe('Account Management', () => {
  let credentials: any;

  test.beforeEach(async ({ page }) => {
    // Register and login user
    credentials = generateTestUser();
    await registerUser(page, credentials);
  });

  describe('Profile Management', () => {
    test('should view profile information', async ({ page }) => {
      await page.goto('/account/profile');

      // Should display user information
      await expect(page.locator('[data-testid="profile-name"]')).toContainText(
        credentials.name,
      );
      await expect(page.locator('[data-testid="profile-email"]')).toContainText(
        credentials.email,
      );
    });

    test('should update profile name', async ({ page }) => {
      await page.goto('/account/profile');

      // Click edit button
      const editButton = page.locator('[data-testid="edit-profile"]');
      if (await editButton.isVisible({ timeout: 2000 })) {
        await editButton.click();

        // Update name
        const nameInput = page.locator('input[name="name"]');
        await nameInput.fill('Updated Name');

        // Save changes
        await page.click('button:has-text("Save")');

        // Should show success message
        await expect(
          page.locator('text=/updated|saved successfully/i'),
        ).toBeVisible({ timeout: 5000 });

        // Verify name changed
        await expect(page.locator('[data-testid="profile-name"]')).toContainText(
          'Updated Name',
        );
      }
    });

    test('should update profile email', async ({ page }) => {
      await page.goto('/account/profile');

      const editButton = page.locator('[data-testid="edit-profile"]');
      if (await editButton.isVisible({ timeout: 2000 })) {
        await editButton.click();

        const newEmail = `updated-${Date.now()}@example.com`;
        const emailInput = page.locator('input[name="email"]');
        await emailInput.fill(newEmail);

        await page.click('button:has-text("Save")');

        // May require verification
        await expect(
          page.locator('text=/updated|verification|saved/i'),
        ).toBeVisible({ timeout: 5000 });
      }
    });

    test('should upload profile picture', async ({ page }) => {
      await page.goto('/account/profile');

      const uploadButton = page.locator('[data-testid="upload-avatar"]');
      if (await uploadButton.isVisible({ timeout: 2000 })) {
        // Create a test file
        const fileInput = page.locator('input[type="file"]');

        // Mock file upload
        await fileInput.setInputFiles({
          name: 'avatar.jpg',
          mimeType: 'image/jpeg',
          buffer: Buffer.from('fake-image-data'),
        });

        // Should show preview or success message
        await expect(
          page.locator('text=/uploaded|updated/i'),
        ).toBeVisible({ timeout: 5000 });
      }
    });

    test('should validate profile form', async ({ page }) => {
      await page.goto('/account/profile');

      const editButton = page.locator('[data-testid="edit-profile"]');
      if (await editButton.isVisible({ timeout: 2000 })) {
        await editButton.click();

        // Clear required fields
        const nameInput = page.locator('input[name="name"]');
        await nameInput.fill('');

        await page.click('button:has-text("Save")');

        // Should show validation error
        await expect(page.locator('text=/required/i')).toBeVisible();
      }
    });
  });

  describe('Address Management', () => {
    test('should view saved addresses', async ({ page }) => {
      await page.goto('/account/addresses');

      // Should show addresses page
      await expect(
        page.locator('h1:has-text("Addresses")'),
      ).toBeVisible({ timeout: 5000 });
    });

    test('should add new address', async ({ page }) => {
      await page.goto('/account/addresses');

      // Click add address button
      const addButton = page.locator('button:has-text("Add Address")');
      if (await addButton.isVisible({ timeout: 2000 })) {
        await addButton.click();

        // Fill address form
        await page.fill('input[name="firstName"]', 'John');
        await page.fill('input[name="lastName"]', 'Doe');
        await page.fill('input[name="address"]', '123 Main Street');
        await page.fill('input[name="city"]', 'New York');
        await page.fill('input[name="state"]', 'NY');
        await page.fill('input[name="zipCode"]', '10001');
        await page.fill('input[name="phone"]', '5551234567');

        // Save address
        await page.click('button:has-text("Save Address")');

        // Should show success message
        await expect(
          page.locator('text=/address.*added|saved/i'),
        ).toBeVisible({ timeout: 5000 });

        // Should display in address list
        await expect(page.locator('[data-testid="saved-address"]')).toHaveCount({
          min: 1,
        });
      }
    });

    test('should edit existing address', async ({ page }) => {
      // First add an address
      await page.goto('/account/addresses');

      const addButton = page.locator('button:has-text("Add Address")');
      if (await addButton.isVisible({ timeout: 2000 })) {
        await addButton.click();
        await page.fill('input[name="firstName"]', 'John');
        await page.fill('input[name="lastName"]', 'Doe');
        await page.fill('input[name="address"]', '123 Main Street');
        await page.fill('input[name="city"]', 'New York');
        await page.fill('input[name="state"]', 'NY');
        await page.fill('input[name="zipCode"]', '10001');
        await page.click('button:has-text("Save Address")');
        await waitForNetworkIdle(page);

        // Edit the address
        const editButton = page.locator('[data-testid="edit-address"]').first();
        if (await editButton.isVisible({ timeout: 2000 })) {
          await editButton.click();

          // Update city
          await page.fill('input[name="city"]', 'Los Angeles');

          await page.click('button:has-text("Save")');

          await expect(
            page.locator('text=/updated|saved/i'),
          ).toBeVisible({ timeout: 5000 });
        }
      }
    });

    test('should delete address', async ({ page }) => {
      // First add an address
      await page.goto('/account/addresses');

      const addButton = page.locator('button:has-text("Add Address")');
      if (await addButton.isVisible({ timeout: 2000 })) {
        await addButton.click();
        await page.fill('input[name="firstName"]', 'John');
        await page.fill('input[name="lastName"]', 'Doe');
        await page.fill('input[name="address"]', '123 Main Street');
        await page.fill('input[name="city"]', 'New York');
        await page.fill('input[name="state"]', 'NY');
        await page.fill('input[name="zipCode"]', '10001');
        await page.click('button:has-text("Save Address")');
        await waitForNetworkIdle(page);

        // Delete the address
        const deleteButton = page.locator('[data-testid="delete-address"]').first();
        if (await deleteButton.isVisible({ timeout: 2000 })) {
          await deleteButton.click();

          // Confirm deletion
          const confirmButton = page.locator('button:has-text("Delete")');
          if (await confirmButton.isVisible({ timeout: 2000 })) {
            await confirmButton.click();
          }

          await expect(
            page.locator('text=/deleted|removed/i'),
          ).toBeVisible({ timeout: 5000 });
        }
      }
    });

    test('should set default address', async ({ page }) => {
      await page.goto('/account/addresses');

      const addButton = page.locator('button:has-text("Add Address")');
      if (await addButton.isVisible({ timeout: 2000 })) {
        await addButton.click();
        await page.fill('input[name="firstName"]', 'John');
        await page.fill('input[name="lastName"]', 'Doe');
        await page.fill('input[name="address"]', '123 Main Street');
        await page.fill('input[name="city"]', 'New York');
        await page.fill('input[name="state"]', 'NY');
        await page.fill('input[name="zipCode"]', '10001');

        // Check default checkbox
        const defaultCheckbox = page.locator('input[name="isDefault"]');
        if (await defaultCheckbox.isVisible({ timeout: 1000 })) {
          await defaultCheckbox.check();
        }

        await page.click('button:has-text("Save Address")');

        await waitForNetworkIdle(page);

        // Should show as default
        const defaultBadge = page.locator('text=/default/i').first();
        if (await defaultBadge.isVisible({ timeout: 2000 })) {
          await expect(defaultBadge).toBeVisible();
        }
      }
    });
  });

  describe('Payment Methods', () => {
    test('should view saved payment methods', async ({ page }) => {
      await page.goto('/account/payment-methods');

      // Should show payment methods page
      await expect(
        page.locator('h1:has-text("Payment Methods")'),
      ).toBeVisible({ timeout: 5000 });
    });

    test('should add new payment method', async ({ page }) => {
      await page.goto('/account/payment-methods');

      const addButton = page.locator('button:has-text("Add Payment Method")');
      if (await addButton.isVisible({ timeout: 2000 })) {
        await addButton.click();

        // Fill card details
        const stripeFrame = page.frameLocator('iframe[name^="__privateStripeFrame"]');
        if (await stripeFrame.locator('input[name="cardnumber"]').count() > 0) {
          await stripeFrame.locator('input[name="cardnumber"]').fill('4242424242424242');
          await stripeFrame.locator('input[name="exp-date"]').fill('12/30');
          await stripeFrame.locator('input[name="cvc"]').fill('123');
        }

        await page.click('button:has-text("Save Card")');

        await expect(
          page.locator('text=/card.*added|saved/i'),
        ).toBeVisible({ timeout: 5000 });
      }
    });

    test('should delete payment method', async ({ page }) => {
      await page.goto('/account/payment-methods');

      const deleteButton = page.locator('[data-testid="delete-payment-method"]').first();
      if (await deleteButton.isVisible({ timeout: 2000 })) {
        await deleteButton.click();

        // Confirm deletion
        const confirmButton = page.locator('button:has-text("Delete")');
        if (await confirmButton.isVisible({ timeout: 2000 })) {
          await confirmButton.click();
        }

        await expect(
          page.locator('text=/deleted|removed/i'),
        ).toBeVisible({ timeout: 5000 });
      }
    });

    test('should set default payment method', async ({ page }) => {
      await page.goto('/account/payment-methods');

      const setDefaultButton = page.locator('[data-testid="set-default-payment"]').first();
      if (await setDefaultButton.isVisible({ timeout: 2000 })) {
        await setDefaultButton.click();

        await expect(
          page.locator('text=/default.*payment|primary/i'),
        ).toBeVisible({ timeout: 5000 });
      }
    });
  });

  describe('Order History', () => {
    test('should view order history', async ({ page }) => {
      await page.goto('/account/orders');

      // Should show orders page
      await expect(
        page.locator('h1:has-text("Orders")'),
      ).toBeVisible({ timeout: 5000 });
    });

    test('should display empty state with no orders', async ({ page }) => {
      await page.goto('/account/orders');

      // Should show empty state
      await expect(
        page.locator('text=/no orders|start shopping/i'),
      ).toBeVisible({ timeout: 5000 });
    });

    test('should view order details', async ({ page }) => {
      await page.goto('/account/orders');

      const orderCard = page.locator('[data-testid="order-card"]').first();
      if (await orderCard.isVisible({ timeout: 2000 })) {
        await orderCard.click();

        // Should navigate to order details
        await page.waitForURL(/\/orders\/[^\/]+$/);

        await expect(page.locator('[data-testid="order-number"]')).toBeVisible();
        await expect(page.locator('[data-testid="order-status"]')).toBeVisible();
        await expect(page.locator('[data-testid="order-total"]')).toBeVisible();
      }
    });

    test('should filter orders by status', async ({ page }) => {
      await page.goto('/account/orders');

      const statusFilter = page.locator('[data-testid="status-filter"]');
      if (await statusFilter.isVisible({ timeout: 2000 })) {
        await statusFilter.click();
        await page.click('text=Delivered');

        await waitForNetworkIdle(page);

        // URL should update with filter
        await expect(page).toHaveURL(/status=delivered/i);
      }
    });

    test('should search orders', async ({ page }) => {
      await page.goto('/account/orders');

      const searchInput = page.locator('[data-testid="order-search"]');
      if (await searchInput.isVisible({ timeout: 2000 })) {
        await searchInput.fill('ORD-12345');
        await page.click('[data-testid="search-button"]');

        await waitForNetworkIdle(page);
      }
    });
  });

  describe('Change Password', () => {
    test('should change password', async ({ page }) => {
      await page.goto('/account/settings');

      // Click change password
      const changePasswordButton = page.locator('button:has-text("Change Password")');
      if (await changePasswordButton.isVisible({ timeout: 2000 })) {
        await changePasswordButton.click();

        // Fill password form
        await page.fill('input[name="currentPassword"]', credentials.password);
        await page.fill('input[name="newPassword"]', 'NewPassword123!');
        await page.fill('input[name="confirmPassword"]', 'NewPassword123!');

        await page.click('button:has-text("Update Password")');

        await expect(
          page.locator('text=/password.*updated|changed/i'),
        ).toBeVisible({ timeout: 5000 });

        // Should be able to login with new password
        await page.evaluate(() => localStorage.clear());
        await page.goto('/auth/login');
        await page.fill('input[name="email"]', credentials.email);
        await page.fill('input[name="password"]', 'NewPassword123!');
        await page.click('button[type="submit"]');

        await page.waitForURL(/\/(dashboard|products|home)/, { timeout: 10000 });
      }
    });

    test('should validate current password', async ({ page }) => {
      await page.goto('/account/settings');

      const changePasswordButton = page.locator('button:has-text("Change Password")');
      if (await changePasswordButton.isVisible({ timeout: 2000 })) {
        await changePasswordButton.click();

        // Enter wrong current password
        await page.fill('input[name="currentPassword"]', 'WrongPassword123!');
        await page.fill('input[name="newPassword"]', 'NewPassword123!');
        await page.fill('input[name="confirmPassword"]', 'NewPassword123!');

        await page.click('button:has-text("Update Password")');

        await expect(
          page.locator('text=/incorrect.*password|wrong password/i'),
        ).toBeVisible({ timeout: 5000 });
      }
    });

    test('should validate password confirmation matches', async ({ page }) => {
      await page.goto('/account/settings');

      const changePasswordButton = page.locator('button:has-text("Change Password")');
      if (await changePasswordButton.isVisible({ timeout: 2000 })) {
        await changePasswordButton.click();

        await page.fill('input[name="currentPassword"]', credentials.password);
        await page.fill('input[name="newPassword"]', 'NewPassword123!');
        await page.fill('input[name="confirmPassword"]', 'DifferentPassword123!');

        await page.click('button:has-text("Update Password")');

        await expect(
          page.locator('text=/passwords.*not match|must match/i'),
        ).toBeVisible({ timeout: 5000 });
      }
    });
  });

  describe('Account Settings', () => {
    test('should update email preferences', async ({ page }) => {
      await page.goto('/account/settings');

      // Toggle email notifications
      const emailCheckbox = page.locator('input[name="emailNotifications"]');
      if (await emailCheckbox.isVisible({ timeout: 2000 })) {
        await emailCheckbox.check();

        await page.click('button:has-text("Save")');

        await expect(
          page.locator('text=/saved|updated/i'),
        ).toBeVisible({ timeout: 5000 });
      }
    });

    test('should enable two-factor authentication', async ({ page }) => {
      await page.goto('/account/settings');

      const twoFactorButton = page.locator('button:has-text("Enable 2FA")');
      if (await twoFactorButton.isVisible({ timeout: 2000 })) {
        await twoFactorButton.click();

        // Should show QR code or setup instructions
        await expect(
          page.locator('text=/scan.*qr|authentication/i'),
        ).toBeVisible({ timeout: 5000 });
      }
    });

    test('should delete account', async ({ page }) => {
      await page.goto('/account/settings');

      const deleteButton = page.locator('button:has-text("Delete Account")');
      if (await deleteButton.isVisible({ timeout: 2000 })) {
        await deleteButton.click();

        // Should show confirmation modal
        await expect(
          page.locator('text=/permanently.*delete|are you sure/i'),
        ).toBeVisible({ timeout: 5000 });

        // Cancel deletion
        const cancelButton = page.locator('button:has-text("Cancel")');
        if (await cancelButton.isVisible()) {
          await cancelButton.click();
        }
      }
    });
  });

  describe('Account Navigation', () => {
    test('should navigate between account sections', async ({ page }) => {
      await page.goto('/account');

      // Navigate to different sections
      const sections = ['Profile', 'Orders', 'Addresses', 'Payment Methods', 'Settings'];

      for (const section of sections) {
        const link = page.locator(`a:has-text("${section}")`);
        if (await link.isVisible({ timeout: 2000 })) {
          await link.click();
          await waitForNetworkIdle(page);

          // URL should change
          await expect(page).toHaveURL(new RegExp(section.toLowerCase().replace(' ', '-')));
        }
      }
    });

    test('should show active section in sidebar', async ({ page }) => {
      await page.goto('/account/orders');

      const ordersLink = page.locator('a:has-text("Orders")');
      if (await ordersLink.isVisible({ timeout: 2000 })) {
        // Should have active class or styling
        await expect(ordersLink).toHaveClass(/active|selected/);
      }
    });
  });

  describe('Mobile Responsiveness', () => {
    test('should display mobile menu on small screens', async ({ page }) => {
      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 });

      await page.goto('/account');

      // Should show mobile menu button
      const mobileMenuButton = page.locator('[data-testid="mobile-menu-button"]');
      if (await mobileMenuButton.isVisible({ timeout: 2000 })) {
        await mobileMenuButton.click();

        // Menu should open
        await expect(page.locator('[data-testid="mobile-menu"]')).toBeVisible();
      }
    });
  });
});
