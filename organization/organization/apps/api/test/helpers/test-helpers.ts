import { PrismaService } from '../../src/common/prisma/prisma.service';
import * as bcrypt from 'bcryptjs';

export interface TestUser {
  id: string;
  email: string;
  password: string;
  name: string;
  role: string;
  token?: string;
}

export interface TestProduct {
  id: string;
  name: string;
  slug: string;
  price: number;
  categoryId: string;
  stock: number;
}

export interface TestCategory {
  id: string;
  name: string;
  slug: string;
}

export interface TestOrganization {
  id: string;
  name: string;
  slug: string;
  ownerId: string;
}

/**
 * Clean up all test data from the database
 */
export async function cleanupDatabase(prisma: PrismaService): Promise<void> {
  // Delete in reverse order of dependencies
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
}

/**
 * Create a test user with hashed password
 */
export async function createTestUser(
  prisma: PrismaService,
  data?: Partial<TestUser>,
): Promise<TestUser> {
  const hashedPassword = await bcrypt.hash(data?.password || 'password123', 10);

  const user = await prisma.user.create({
    data: {
      email: data?.email || `test-${Date.now()}@example.com`,
      password: hashedPassword,
      name: data?.name || 'Test User',
      role: data?.role || 'CUSTOMER',
    },
  });

  return {
    id: user.id,
    email: user.email,
    password: data?.password || 'password123',
    name: user.name,
    role: user.role,
  };
}

/**
 * Create a test category
 */
export async function createTestCategory(
  prisma: PrismaService,
  data?: Partial<TestCategory>,
): Promise<TestCategory> {
  const timestamp = Date.now();
  const category = await prisma.category.create({
    data: {
      name: data?.name || `Test Category ${timestamp}`,
      slug: data?.slug || `test-category-${timestamp}`,
      description: 'Test category description',
    },
  });

  return {
    id: category.id,
    name: category.name,
    slug: category.slug,
  };
}

/**
 * Create a test product
 */
export async function createTestProduct(
  prisma: PrismaService,
  categoryId: string,
  data?: Partial<TestProduct>,
): Promise<TestProduct> {
  const timestamp = Date.now();
  const product = await prisma.product.create({
    data: {
      name: data?.name || `Test Product ${timestamp}`,
      slug: data?.slug || `test-product-${timestamp}`,
      description: 'Test product description',
      price: data?.price || 99.99,
      categoryId: categoryId,
      stock: data?.stock ?? 100,
      isActive: true,
      images: ['https://example.com/image.jpg'],
    },
  });

  return {
    id: product.id,
    name: product.name,
    slug: product.slug,
    price: Number(product.price),
    categoryId: product.categoryId,
    stock: product.stock,
  };
}

/**
 * Create a test coupon
 */
export async function createTestCoupon(
  prisma: PrismaService,
  data?: {
    code?: string;
    discountType?: string;
    discountValue?: number;
    minPurchase?: number;
    maxDiscount?: number;
  },
) {
  const timestamp = Date.now();
  return await prisma.coupon.create({
    data: {
      code: data?.code || `TEST${timestamp}`,
      discountType: data?.discountType || 'PERCENTAGE',
      discountValue: data?.discountValue || 10,
      minPurchase: data?.minPurchase || 0,
      maxDiscount: data?.maxDiscount || 100,
      maxUses: 100,
      currentUses: 0,
      isActive: true,
      startDate: new Date(),
      endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
    },
  });
}

/**
 * Create a test organization
 */
export async function createTestOrganization(
  prisma: PrismaService,
  ownerId: string,
  data?: Partial<TestOrganization>,
): Promise<TestOrganization> {
  const timestamp = Date.now();

  try {
    const organization = await prisma.organization.create({
      data: {
        name: data?.name || `Test Organization ${timestamp}`,
        slug: data?.slug || `test-org-${timestamp}`,
        ownerId: ownerId,
        type: 'BUSINESS',
        settings: {},
      },
    });

    return {
      id: organization.id,
      name: organization.name,
      slug: organization.slug,
      ownerId: organization.ownerId,
    };
  } catch (error) {
    // If organization model doesn't exist, return mock data
    console.warn('Organization model not available:', error);
    return {
      id: `mock-org-${timestamp}`,
      name: data?.name || `Test Organization ${timestamp}`,
      slug: data?.slug || `test-org-${timestamp}`,
      ownerId: ownerId,
    };
  }
}

/**
 * Wait for a condition to be true
 */
export async function waitFor(
  condition: () => Promise<boolean>,
  timeout = 5000,
  interval = 100,
): Promise<void> {
  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    if (await condition()) {
      return;
    }
    await new Promise(resolve => setTimeout(resolve, interval));
  }

  throw new Error(`Timeout waiting for condition after ${timeout}ms`);
}

/**
 * Generate unique email for testing
 */
export function generateTestEmail(): string {
  return `test-${Date.now()}-${Math.random().toString(36).substring(7)}@example.com`;
}

/**
 * Generate unique slug for testing
 */
export function generateTestSlug(prefix = 'test'): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substring(7)}`;
}
