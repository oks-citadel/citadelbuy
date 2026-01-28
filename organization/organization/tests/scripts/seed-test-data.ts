/**
 * Test Data Seeding Script
 *
 * Creates deterministic test data for QA testing.
 * Run with: npx ts-node tests/scripts/seed-test-data.ts
 */

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:4000';

interface TestUser {
  email: string;
  password: string;
  name: string;
  role: string;
}

interface TestProduct {
  name: string;
  description: string;
  price: number;
  category: string;
  stock: number;
}

// Test Users
const TEST_USERS: TestUser[] = [
  {
    email: 'customer@broxiva.com',
    password: 'password123',
    name: 'Test Customer',
    role: 'CUSTOMER',
  },
  {
    email: 'vendor@broxiva.com',
    password: 'password123',
    name: 'Test Vendor',
    role: 'VENDOR',
  },
  {
    email: 'admin@broxiva.com',
    password: 'password123',
    name: 'Test Admin',
    role: 'ADMIN',
  },
  {
    email: 'support@broxiva.com',
    password: 'password123',
    name: 'Test Support',
    role: 'SUPPORT',
  },
];

// Test Products
const TEST_PRODUCTS: TestProduct[] = [
  {
    name: 'Test Wireless Headphones',
    description: 'Premium wireless headphones with noise cancellation',
    price: 199.99,
    category: 'Electronics',
    stock: 100,
  },
  {
    name: 'Test Smart Watch',
    description: 'Feature-rich smartwatch with health monitoring',
    price: 299.99,
    category: 'Electronics',
    stock: 50,
  },
  {
    name: 'Test Running Shoes',
    description: 'Comfortable running shoes for all terrains',
    price: 89.99,
    category: 'Sports',
    stock: 200,
  },
  {
    name: 'Test Coffee Maker',
    description: 'Automatic coffee maker with programmable timer',
    price: 79.99,
    category: 'Home & Kitchen',
    stock: 75,
  },
  {
    name: 'Test Laptop Stand',
    description: 'Ergonomic laptop stand for better posture',
    price: 49.99,
    category: 'Office',
    stock: 150,
  },
];

async function checkApiHealth(): Promise<boolean> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/health`);
    return response.ok;
  } catch (error) {
    return false;
  }
}

async function seedUsers(): Promise<void> {
  console.log('\nSeeding test users...');

  for (const user of TEST_USERS) {
    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: user.email,
          password: user.password,
          name: user.name,
        }),
      });

      if (response.status === 201) {
        console.log(`  Created user: ${user.email}`);
      } else if (response.status === 400) {
        const body = await response.json();
        if (body.message?.includes('exist')) {
          console.log(`  User exists: ${user.email}`);
        } else {
          console.log(`  Failed to create ${user.email}: ${body.message}`);
        }
      } else {
        console.log(`  Failed to create ${user.email}: ${response.status}`);
      }
    } catch (error) {
      console.log(`  Error creating ${user.email}: ${error}`);
    }
  }
}

async function getAuthToken(): Promise<string | null> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'admin@broxiva.com',
        password: 'password123',
      }),
    });

    if (response.ok) {
      const body = await response.json();
      return body.accessToken;
    }
  } catch (error) {
    console.log('Failed to get auth token');
  }
  return null;
}

async function seedProducts(token: string): Promise<void> {
  console.log('\nSeeding test products...');

  for (const product of TEST_PRODUCTS) {
    try {
      const response = await fetch(`${API_BASE_URL}/api/products`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(product),
      });

      if (response.status === 201) {
        console.log(`  Created product: ${product.name}`);
      } else if (response.status === 400) {
        console.log(`  Product may exist: ${product.name}`);
      } else if (response.status === 401 || response.status === 403) {
        console.log(`  Not authorized to create products (this is expected for customer accounts)`);
        break;
      } else {
        console.log(`  Failed to create ${product.name}: ${response.status}`);
      }
    } catch (error) {
      console.log(`  Error creating ${product.name}: ${error}`);
    }
  }
}

async function verifySeeding(): Promise<void> {
  console.log('\nVerifying seeded data...');

  // Verify users by attempting login
  for (const user of TEST_USERS.slice(0, 2)) {
    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: user.email,
          password: user.password,
        }),
      });

      if (response.ok) {
        console.log(`  Login verified: ${user.email}`);
      } else {
        console.log(`  Login failed: ${user.email}`);
      }
    } catch (error) {
      console.log(`  Error verifying ${user.email}: ${error}`);
    }
  }

  // Verify products exist
  try {
    const response = await fetch(`${API_BASE_URL}/api/products?limit=5`);
    if (response.ok) {
      const body = await response.json();
      const products = Array.isArray(body) ? body : body.data;
      console.log(`  Products in database: ${products?.length || 0}`);
    }
  } catch (error) {
    console.log(`  Error verifying products: ${error}`);
  }
}

async function main(): Promise<void> {
  console.log('='.repeat(60));
  console.log('Broxiva Test Data Seeding Script');
  console.log('='.repeat(60));
  console.log(`API URL: ${API_BASE_URL}`);

  // Check API health
  console.log('\nChecking API health...');
  const isHealthy = await checkApiHealth();
  if (!isHealthy) {
    console.error('API is not available. Please start the API server first.');
    process.exit(1);
  }
  console.log('API is healthy!');

  // Seed data
  await seedUsers();

  const token = await getAuthToken();
  if (token) {
    await seedProducts(token);
  } else {
    console.log('\nSkipping product seeding (no admin token)');
  }

  // Verify
  await verifySeeding();

  console.log('\n' + '='.repeat(60));
  console.log('Seeding complete!');
  console.log('='.repeat(60));
}

main().catch(console.error);
