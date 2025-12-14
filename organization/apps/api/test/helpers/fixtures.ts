import { randomString, randomEmail, randomNumber } from './test-utils';

/**
 * Test Fixtures - Sample data for testing
 */

// ============================================
// User Fixtures
// ============================================

export const userFixtures = {
  customer: {
    email: 'customer@example.com',
    password: 'Customer123!',
    name: 'Test Customer',
    role: 'CUSTOMER',
  },
  vendor: {
    email: 'vendor@example.com',
    password: 'Vendor123!',
    name: 'Test Vendor',
    role: 'VENDOR',
  },
  admin: {
    email: 'admin@broxiva.com',
    password: 'Admin123!',
    name: 'Test Admin',
    role: 'ADMIN',
  },
  multipleCustomers: [
    {
      email: 'customer1@example.com',
      password: 'Password123!',
      name: 'Customer One',
      role: 'CUSTOMER',
    },
    {
      email: 'customer2@example.com',
      password: 'Password123!',
      name: 'Customer Two',
      role: 'CUSTOMER',
    },
    {
      email: 'customer3@example.com',
      password: 'Password123!',
      name: 'Customer Three',
      role: 'CUSTOMER',
    },
  ],
};

/**
 * Generate random user data
 */
export function generateUserFixture(overrides: any = {}) {
  return {
    email: randomEmail(),
    password: 'Test123!@#',
    name: `Test User ${randomString(5)}`,
    role: 'CUSTOMER',
    ...overrides,
  };
}

// ============================================
// Category Fixtures
// ============================================

export const categoryFixtures = {
  electronics: {
    name: 'Electronics',
    slug: 'electronics',
    description: 'Electronic devices and accessories',
    level: 0,
    sortOrder: 1,
    status: 'ACTIVE',
    isFeatured: true,
  },
  computers: {
    name: 'Computers',
    slug: 'computers',
    description: 'Desktop and laptop computers',
    level: 1,
    sortOrder: 1,
    status: 'ACTIVE',
    isFeatured: false,
  },
  phones: {
    name: 'Phones & Tablets',
    slug: 'phones-tablets',
    description: 'Smartphones and tablets',
    level: 1,
    sortOrder: 2,
    status: 'ACTIVE',
    isFeatured: true,
  },
  clothing: {
    name: 'Clothing',
    slug: 'clothing',
    description: 'Fashion and apparel',
    level: 0,
    sortOrder: 2,
    status: 'ACTIVE',
    isFeatured: false,
  },
  mensClothing: {
    name: "Men's Clothing",
    slug: 'mens-clothing',
    description: "Men's fashion and apparel",
    level: 1,
    sortOrder: 1,
    status: 'ACTIVE',
    isFeatured: false,
  },
};

/**
 * Generate random category data
 */
export function generateCategoryFixture(overrides: any = {}) {
  const slug = randomString(8);
  return {
    name: `Test Category ${randomString(5)}`,
    slug: `test-category-${slug}`,
    description: `Test category description for ${slug}`,
    level: 0,
    sortOrder: randomNumber(1, 100),
    status: 'ACTIVE',
    isFeatured: false,
    ...overrides,
  };
}

// ============================================
// Product Fixtures
// ============================================

export const productFixtures = {
  laptop: {
    name: 'MacBook Pro 16"',
    slug: 'macbook-pro-16',
    description: 'High-performance laptop for professionals',
    price: 2499.99,
    compareAtPrice: 2799.99,
    stock: 50,
    sku: 'MBP-16-2024',
    isActive: true,
    isFeatured: true,
    images: [
      'https://example.com/images/macbook-pro-1.jpg',
      'https://example.com/images/macbook-pro-2.jpg',
    ],
    specifications: {
      brand: 'Apple',
      processor: 'M3 Max',
      ram: '32GB',
      storage: '1TB SSD',
      display: '16-inch Liquid Retina XDR',
    },
    weight: 2.15,
    dimensions: {
      length: 35.57,
      width: 24.81,
      height: 1.68,
    },
  },
  phone: {
    name: 'iPhone 15 Pro',
    slug: 'iphone-15-pro',
    description: 'Latest flagship smartphone',
    price: 999.99,
    compareAtPrice: 1099.99,
    stock: 100,
    sku: 'IPH-15-PRO-256',
    isActive: true,
    isFeatured: true,
    images: [
      'https://example.com/images/iphone-15-pro-1.jpg',
      'https://example.com/images/iphone-15-pro-2.jpg',
    ],
    specifications: {
      brand: 'Apple',
      processor: 'A17 Pro',
      storage: '256GB',
      display: '6.1-inch Super Retina XDR',
      camera: '48MP Main',
    },
    weight: 0.187,
  },
  tshirt: {
    name: 'Classic Cotton T-Shirt',
    slug: 'classic-cotton-tshirt',
    description: 'Comfortable 100% cotton t-shirt',
    price: 29.99,
    stock: 200,
    sku: 'TSH-CLR-BLK-M',
    isActive: true,
    isFeatured: false,
    images: ['https://example.com/images/tshirt-black.jpg'],
    specifications: {
      brand: 'BasicWear',
      material: '100% Cotton',
      size: 'Medium',
      color: 'Black',
      fit: 'Regular',
    },
    weight: 0.2,
  },
  outOfStock: {
    name: 'Out of Stock Product',
    slug: 'out-of-stock-product',
    description: 'This product is out of stock',
    price: 99.99,
    stock: 0,
    sku: 'OOS-PROD-001',
    isActive: true,
    isFeatured: false,
    images: ['https://example.com/images/oos-product.jpg'],
  },
  inactive: {
    name: 'Inactive Product',
    slug: 'inactive-product',
    description: 'This product is inactive',
    price: 49.99,
    stock: 10,
    sku: 'INACT-PROD-001',
    isActive: false,
    isFeatured: false,
    images: ['https://example.com/images/inactive-product.jpg'],
  },
};

/**
 * Generate random product data
 */
export function generateProductFixture(categoryId: string, overrides: any = {}) {
  const slug = randomString(8);
  return {
    name: `Test Product ${randomString(5)}`,
    slug: `test-product-${slug}`,
    description: `Test product description for ${slug}`,
    price: randomNumber(10, 1000),
    stock: randomNumber(0, 100),
    sku: `SKU-${randomString(8).toUpperCase()}`,
    isActive: true,
    isFeatured: false,
    images: ['https://example.com/images/test-product.jpg'],
    categoryId,
    ...overrides,
  };
}

// ============================================
// Order Fixtures
// ============================================

export const orderFixtures = {
  pending: {
    status: 'PENDING',
    total: 2999.97,
    subtotal: 2529.97,
    tax: 253.00,
    shipping: 217.00,
    discount: 0,
    shippingAddress: {
      firstName: 'John',
      lastName: 'Doe',
      street: '123 Main St',
      city: 'New York',
      state: 'NY',
      zipCode: '10001',
      country: 'US',
      phone: '+1234567890',
    },
    billingAddress: {
      firstName: 'John',
      lastName: 'Doe',
      street: '123 Main St',
      city: 'New York',
      state: 'NY',
      zipCode: '10001',
      country: 'US',
      phone: '+1234567890',
    },
  },
  processing: {
    status: 'PROCESSING',
    total: 1029.98,
    subtotal: 999.99,
    tax: 30.00,
    shipping: 0,
    discount: 0,
    shippingAddress: {
      firstName: 'Jane',
      lastName: 'Smith',
      street: '456 Oak Ave',
      city: 'Los Angeles',
      state: 'CA',
      zipCode: '90001',
      country: 'US',
      phone: '+1987654321',
    },
    billingAddress: {
      firstName: 'Jane',
      lastName: 'Smith',
      street: '456 Oak Ave',
      city: 'Los Angeles',
      state: 'CA',
      zipCode: '90001',
      country: 'US',
      phone: '+1987654321',
    },
  },
  shipped: {
    status: 'SHIPPED',
    total: 59.98,
    subtotal: 49.98,
    tax: 5.00,
    shipping: 5.00,
    discount: 0,
    trackingNumber: 'TRACK123456789',
    carrier: 'UPS',
    shippingAddress: {
      firstName: 'Bob',
      lastName: 'Johnson',
      street: '789 Pine Rd',
      city: 'Chicago',
      state: 'IL',
      zipCode: '60601',
      country: 'US',
      phone: '+1555666777',
    },
    billingAddress: {
      firstName: 'Bob',
      lastName: 'Johnson',
      street: '789 Pine Rd',
      city: 'Chicago',
      state: 'IL',
      zipCode: '60601',
      country: 'US',
      phone: '+1555666777',
    },
  },
};

// ============================================
// Coupon Fixtures
// ============================================

export const couponFixtures = {
  percentage: {
    code: 'SAVE10',
    discountType: 'PERCENTAGE',
    discountValue: 10,
    minPurchase: 50,
    maxDiscount: 100,
    maxUses: 1000,
    currentUses: 0,
    isActive: true,
    startDate: new Date('2024-01-01'),
    endDate: new Date('2025-12-31'),
    description: '10% off orders over $50',
  },
  fixed: {
    code: 'FIXED20',
    discountType: 'FIXED',
    discountValue: 20,
    minPurchase: 100,
    maxDiscount: null,
    maxUses: 500,
    currentUses: 0,
    isActive: true,
    startDate: new Date('2024-01-01'),
    endDate: new Date('2025-12-31'),
    description: '$20 off orders over $100',
  },
  freeShipping: {
    code: 'FREESHIP',
    discountType: 'FREE_SHIPPING',
    discountValue: 0,
    minPurchase: 0,
    maxDiscount: null,
    maxUses: null,
    currentUses: 0,
    isActive: true,
    startDate: new Date('2024-01-01'),
    endDate: new Date('2025-12-31'),
    description: 'Free shipping on all orders',
  },
  expired: {
    code: 'EXPIRED',
    discountType: 'PERCENTAGE',
    discountValue: 25,
    minPurchase: 0,
    maxDiscount: 50,
    maxUses: 100,
    currentUses: 0,
    isActive: true,
    startDate: new Date('2023-01-01'),
    endDate: new Date('2023-12-31'),
    description: 'Expired 25% off coupon',
  },
  maxedOut: {
    code: 'MAXEDOUT',
    discountType: 'PERCENTAGE',
    discountValue: 15,
    minPurchase: 0,
    maxDiscount: 30,
    maxUses: 10,
    currentUses: 10,
    isActive: true,
    startDate: new Date('2024-01-01'),
    endDate: new Date('2025-12-31'),
    description: 'Maxed out 15% off coupon',
  },
};

/**
 * Generate random coupon data
 */
export function generateCouponFixture(overrides: any = {}) {
  return {
    code: `COUPON${randomString(6).toUpperCase()}`,
    discountType: 'PERCENTAGE',
    discountValue: randomNumber(5, 30),
    minPurchase: randomNumber(0, 100),
    maxDiscount: randomNumber(50, 200),
    maxUses: randomNumber(10, 1000),
    currentUses: 0,
    isActive: true,
    startDate: new Date(),
    endDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 90 days from now
    ...overrides,
  };
}

// ============================================
// Organization Fixtures
// ============================================

export const organizationFixtures = {
  business: {
    name: 'Test Business Corp',
    slug: 'test-business-corp',
    type: 'BUSINESS',
    description: 'A test business organization',
    website: 'https://testbusiness.com',
    settings: {
      allowPublicProfile: true,
      enableBilling: true,
      maxMembers: 10,
    },
  },
  enterprise: {
    name: 'Enterprise Solutions Inc',
    slug: 'enterprise-solutions',
    type: 'ENTERPRISE',
    description: 'An enterprise organization',
    website: 'https://enterprise.com',
    settings: {
      allowPublicProfile: false,
      enableBilling: true,
      maxMembers: 100,
      customBranding: true,
    },
  },
  individual: {
    name: 'John Doe',
    slug: 'john-doe',
    type: 'INDIVIDUAL',
    description: 'Individual account',
    settings: {
      allowPublicProfile: true,
      enableBilling: false,
      maxMembers: 1,
    },
  },
};

/**
 * Generate random organization data
 */
export function generateOrganizationFixture(ownerId: string, overrides: any = {}) {
  const slug = randomString(8);
  return {
    name: `Test Organization ${randomString(5)}`,
    slug: `test-org-${slug}`,
    type: 'BUSINESS',
    ownerId,
    description: `Test organization description for ${slug}`,
    settings: {
      allowPublicProfile: true,
      enableBilling: false,
    },
    ...overrides,
  };
}

// ============================================
// Review Fixtures
// ============================================

export const reviewFixtures = {
  positive: {
    rating: 5,
    title: 'Excellent product!',
    content: 'This product exceeded my expectations. Highly recommended!',
    isVerifiedPurchase: true,
  },
  negative: {
    rating: 2,
    title: 'Not what I expected',
    content: 'Quality could be better. Disappointed with the purchase.',
    isVerifiedPurchase: true,
  },
  neutral: {
    rating: 3,
    title: 'Average product',
    content: 'It works as advertised but nothing special.',
    isVerifiedPurchase: false,
  },
};

/**
 * Generate random review data
 */
export function generateReviewFixture(productId: string, userId: string, overrides: any = {}) {
  return {
    productId,
    userId,
    rating: randomNumber(1, 5),
    title: `Review Title ${randomString(5)}`,
    content: `Review content for product ${productId}. ${randomString(20)}`,
    isVerifiedPurchase: Math.random() > 0.3,
    ...overrides,
  };
}

// ============================================
// Cart Fixtures
// ============================================

export const cartItemFixtures = {
  single: {
    quantity: 1,
  },
  multiple: {
    quantity: 3,
  },
  bulk: {
    quantity: 10,
  },
};

// ============================================
// Shipping Address Fixtures
// ============================================

export const shippingAddressFixtures = {
  us: {
    firstName: 'John',
    lastName: 'Doe',
    street: '123 Main Street',
    street2: 'Apt 4B',
    city: 'New York',
    state: 'NY',
    zipCode: '10001',
    country: 'US',
    phone: '+1234567890',
  },
  canada: {
    firstName: 'Jane',
    lastName: 'Smith',
    street: '456 Maple Avenue',
    city: 'Toronto',
    state: 'ON',
    zipCode: 'M5H 2N2',
    country: 'CA',
    phone: '+14165551234',
  },
  uk: {
    firstName: 'Bob',
    lastName: 'Johnson',
    street: '789 Oxford Street',
    city: 'London',
    state: 'Greater London',
    zipCode: 'W1D 1BS',
    country: 'GB',
    phone: '+442012345678',
  },
};

/**
 * Generate random shipping address
 */
export function generateShippingAddressFixture(overrides: any = {}) {
  return {
    firstName: `First${randomString(4)}`,
    lastName: `Last${randomString(4)}`,
    street: `${randomNumber(100, 999)} ${randomString(8)} Street`,
    city: `City${randomString(5)}`,
    state: 'CA',
    zipCode: `${randomNumber(10000, 99999)}`,
    country: 'US',
    phone: `+1${randomNumber(1000000000, 9999999999)}`,
    ...overrides,
  };
}

// ============================================
// Payment Fixtures
// ============================================

export const paymentFixtures = {
  creditCard: {
    paymentMethod: 'CREDIT_CARD',
    paymentIntentId: 'pi_test_1234567890',
    paymentStatus: 'SUCCEEDED',
  },
  paypal: {
    paymentMethod: 'PAYPAL',
    paymentIntentId: 'pp_test_1234567890',
    paymentStatus: 'SUCCEEDED',
  },
  pending: {
    paymentMethod: 'CREDIT_CARD',
    paymentIntentId: 'pi_test_pending',
    paymentStatus: 'PENDING',
  },
  failed: {
    paymentMethod: 'CREDIT_CARD',
    paymentIntentId: 'pi_test_failed',
    paymentStatus: 'FAILED',
  },
};

// ============================================
// Error Fixtures
// ============================================

export const errorFixtures = {
  notFound: {
    statusCode: 404,
    message: 'Resource not found',
    error: 'Not Found',
  },
  badRequest: {
    statusCode: 400,
    message: 'Bad request',
    error: 'Bad Request',
  },
  unauthorized: {
    statusCode: 401,
    message: 'Unauthorized',
    error: 'Unauthorized',
  },
  forbidden: {
    statusCode: 403,
    message: 'Forbidden',
    error: 'Forbidden',
  },
  conflict: {
    statusCode: 409,
    message: 'Conflict',
    error: 'Conflict',
  },
  internalServerError: {
    statusCode: 500,
    message: 'Internal server error',
    error: 'Internal Server Error',
  },
};
