/**
 * E2E Test Setup
 *
 * This file is run once before all E2E tests.
 * It sets up the test environment and database.
 */

import { PrismaClient } from '@prisma/client';
import { execSync } from 'child_process';

// Set test environment
process.env.NODE_ENV = 'test';

// Use test database URL if not already set
if (!process.env.DATABASE_URL?.includes('_test')) {
  const originalDbUrl = process.env.DATABASE_URL || 'postgresql://broxiva:password@localhost:5432/broxiva_dev';
  const testDbUrl = originalDbUrl.replace(/\/([^/?]+)(\?|$)/, '/$1_test$2');
  process.env.DATABASE_URL = testDbUrl;
  console.log('Using test database:', testDbUrl.replace(/:[^:@]+@/, ':***@'));
}

// Disable external services in test environment
process.env.REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
process.env.ELASTICSEARCH_NODE = process.env.ELASTICSEARCH_NODE || 'http://localhost:9200';
process.env.SEARCH_PROVIDER = 'internal'; // Use internal search for tests

// Set JWT secrets for tests if not provided
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret-key-for-e2e-tests-only';
process.env.JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'test-jwt-refresh-secret-key-for-e2e-tests-only';

// Email configuration for tests
process.env.EMAIL_HOST = process.env.EMAIL_HOST || 'smtp.mailtrap.io';
process.env.EMAIL_PORT = process.env.EMAIL_PORT || '587';
process.env.EMAIL_USER = process.env.EMAIL_USER || 'test';
process.env.EMAIL_PASSWORD = process.env.EMAIL_PASSWORD || 'test';
process.env.EMAIL_FROM = process.env.EMAIL_FROM || 'test@broxiva.com';

// Disable rate limiting in tests
process.env.THROTTLE_LIMIT = '1000000';

/**
 * Initialize test database
 * This runs migrations on the test database
 */
export async function initializeTestDatabase(): Promise<void> {
  try {
    console.log('Initializing test database...');

    // Use db push for test database - it's more forgiving than migrations
    // and will update the schema to match without requiring migration history
    execSync('npx prisma db push --skip-generate --accept-data-loss', {
      stdio: 'inherit',
      env: { ...process.env },
    });

    console.log('Test database initialized successfully');
  } catch (error) {
    console.error('Failed to initialize test database:', error);
    console.warn('Tests will continue but may fail due to schema mismatch');
    // Don't throw - let tests run even if migrations fail
    // This allows tests to work even if database is already set up
  }
}

/**
 * Clean test database
 * This removes all data from the test database
 */
export async function cleanTestDatabase(): Promise<void> {
  const prisma = new PrismaClient();

  try {
    // Delete data in reverse order of dependencies
    await prisma.orderItem.deleteMany();
    await prisma.order.deleteMany();
    await prisma.cartItem.deleteMany();
    await prisma.cart.deleteMany();
    await prisma.coupon.deleteMany();
    await prisma.review.deleteMany();
    await prisma.wishlistItem.deleteMany();
    await prisma.wishlist.deleteMany();
    await prisma.product.deleteMany();
    await prisma.category.deleteMany();

    // Organization-related cleanup
    await prisma.organizationMember.deleteMany().catch(() => {});
    await prisma.organizationInvitation.deleteMany().catch(() => {});
    await prisma.organizationRole.deleteMany().catch(() => {});
    await prisma.organization.deleteMany().catch(() => {});

    await prisma.user.deleteMany();

    console.log('Test database cleaned');
  } catch (error) {
    console.error('Failed to clean test database:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Initialize database before tests
beforeAll(async () => {
  await initializeTestDatabase();
}, 60000); // 60 second timeout for database setup

// Global teardown
afterAll(async () => {
  // Give time for connections to close
  await new Promise(resolve => setTimeout(resolve, 500));
});
