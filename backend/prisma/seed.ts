import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');

  // Clear existing data (optional - comment out if you want to keep existing data)
  console.log('📦 Clearing existing data...');
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.review.deleteMany();
  await prisma.product.deleteMany();
  await prisma.category.deleteMany();
  await prisma.user.deleteMany();

  // Hash password for all test users (password: "password123")
  const hashedPassword = await bcrypt.hash('password123', 10);

  // Create Users
  console.log('👥 Creating users...');
  const admin = await prisma.user.create({
    data: {
      email: 'admin@citadelbuy.com',
      password: hashedPassword,
      name: 'Admin User',
      role: 'ADMIN',
    },
  });

  const vendor1 = await prisma.user.create({
    data: {
      email: 'vendor1@citadelbuy.com',
      password: hashedPassword,
      name: 'TechStore Vendor',
      role: 'VENDOR',
    },
  });

  const vendor2 = await prisma.user.create({
    data: {
      email: 'vendor2@citadelbuy.com',
      password: hashedPassword,
      name: 'Fashion Boutique',
      role: 'VENDOR',
    },
  });

  const customer1 = await prisma.user.create({
    data: {
      email: 'customer@citadelbuy.com',
      password: hashedPassword,
      name: 'John Customer',
      role: 'CUSTOMER',
    },
  });

  const customer2 = await prisma.user.create({
    data: {
      email: 'jane@example.com',
      password: hashedPassword,
      name: 'Jane Smith',
      role: 'CUSTOMER',
    },
  });

  console.log('✅ Users created');

  // Create Categories
  console.log('📁 Creating categories...');
  const electronics = await prisma.category.create({
    data: {
      name: 'Electronics',
      slug: 'electronics',
      description: 'Electronic devices and accessories',
    },
  });

  const clothing = await prisma.category.create({
    data: {
      name: 'Clothing',
      slug: 'clothing',
      description: 'Fashion and apparel',
    },
  });

  const books = await prisma.category.create({
    data: {
      name: 'Books',
      slug: 'books',
      description: 'Books and reading materials',
    },
  });

  const home = await prisma.category.create({
    data: {
      name: 'Home & Garden',
      slug: 'home-garden',
      description: 'Home improvement and garden supplies',
    },
  });

  const sports = await prisma.category.create({
    data: {
      name: 'Sports & Outdoors',
      slug: 'sports-outdoors',
      description: 'Sports equipment and outdoor gear',
    },
  });

  console.log('✅ Categories created');

  // Create Products
  console.log('📦 Creating products...');

  // Electronics products (vendor1)
  const laptop = await prisma.product.create({
    data: {
      name: 'Professional Laptop Pro 15',
      slug: 'professional-laptop-pro-15',
      description: 'High-performance laptop with 16GB RAM, 512GB SSD, and Intel i7 processor. Perfect for professionals and content creators.',
      price: 1299.99,
      stock: 25,
      images: [
        'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=800',
        'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=800',
      ],
      vendorId: vendor1.id,
      categoryId: electronics.id,
    },
  });

  const smartphone = await prisma.product.create({
    data: {
      name: 'SmartPhone X Pro',
      slug: 'smartphone-x-pro',
      description: '6.5" OLED display, 128GB storage, 5G capable. Capture stunning photos with triple camera system.',
      price: 899.99,
      stock: 50,
      images: [
        'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=800',
        'https://images.unsplash.com/photo-1510557880182-3d4d3cba35a5?w=800',
      ],
      vendorId: vendor1.id,
      categoryId: electronics.id,
    },
  });

  const headphones = await prisma.product.create({
    data: {
      name: 'Wireless Noise-Cancelling Headphones',
      slug: 'wireless-noise-cancelling-headphones',
      description: 'Premium audio quality with active noise cancellation. 30-hour battery life and comfortable over-ear design.',
      price: 299.99,
      stock: 75,
      images: [
        'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800',
      ],
      vendorId: vendor1.id,
      categoryId: electronics.id,
    },
  });

  const smartwatch = await prisma.product.create({
    data: {
      name: 'Fitness SmartWatch',
      slug: 'fitness-smartwatch',
      description: 'Track your fitness goals with GPS, heart rate monitor, and sleep tracking. Water-resistant design.',
      price: 249.99,
      stock: 40,
      images: [
        'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800',
      ],
      vendorId: vendor1.id,
      categoryId: electronics.id,
    },
  });

  // Clothing products (vendor2)
  const tshirt = await prisma.product.create({
    data: {
      name: 'Classic Cotton T-Shirt',
      slug: 'classic-cotton-tshirt',
      description: '100% premium cotton t-shirt. Available in multiple colors. Comfortable and durable.',
      price: 29.99,
      stock: 200,
      images: [
        'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=800',
      ],
      vendorId: vendor2.id,
      categoryId: clothing.id,
    },
  });

  const jeans = await prisma.product.create({
    data: {
      name: 'Slim Fit Denim Jeans',
      slug: 'slim-fit-denim-jeans',
      description: 'Modern slim fit jeans with stretch denim. Classic 5-pocket design.',
      price: 79.99,
      stock: 150,
      images: [
        'https://images.unsplash.com/photo-1542272604-787c3835535d?w=800',
      ],
      vendorId: vendor2.id,
      categoryId: clothing.id,
    },
  });

  const jacket = await prisma.product.create({
    data: {
      name: 'Leather Jacket',
      slug: 'leather-jacket',
      description: 'Genuine leather jacket with quilted lining. Timeless style and superior quality.',
      price: 299.99,
      stock: 30,
      images: [
        'https://images.unsplash.com/photo-1551028719-00167b16eac5?w=800',
      ],
      vendorId: vendor2.id,
      categoryId: clothing.id,
    },
  });

  const sneakers = await prisma.product.create({
    data: {
      name: 'Running Sneakers Pro',
      slug: 'running-sneakers-pro',
      description: 'Lightweight running shoes with responsive cushioning and breathable mesh upper.',
      price: 129.99,
      stock: 100,
      images: [
        'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800',
      ],
      vendorId: vendor2.id,
      categoryId: sports.id,
    },
  });

  // Books
  const novel = await prisma.product.create({
    data: {
      name: 'The Art of Programming',
      slug: 'art-of-programming',
      description: 'Comprehensive guide to software development best practices and design patterns.',
      price: 49.99,
      stock: 80,
      images: [
        'https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=800',
      ],
      vendorId: vendor1.id,
      categoryId: books.id,
    },
  });

  // Home & Garden
  const coffeeMaker = await prisma.product.create({
    data: {
      name: 'Automatic Coffee Maker',
      slug: 'automatic-coffee-maker',
      description: 'Programmable coffee maker with 12-cup capacity. Built-in grinder and thermal carafe.',
      price: 159.99,
      stock: 45,
      images: [
        'https://images.unsplash.com/photo-1517668808822-9ebb02f2a0e6?w=800',
      ],
      vendorId: vendor1.id,
      categoryId: home.id,
    },
  });

  // Low stock items for testing
  const limitedEdition = await prisma.product.create({
    data: {
      name: 'Limited Edition Watch',
      slug: 'limited-edition-watch',
      description: 'Exclusive limited edition timepiece. Only 5 remaining!',
      price: 499.99,
      stock: 5,
      images: [
        'https://images.unsplash.com/photo-1524592094714-0f0654e20314?w=800',
      ],
      vendorId: vendor2.id,
      categoryId: electronics.id,
    },
  });

  // Out of stock item
  const outOfStock = await prisma.product.create({
    data: {
      name: 'Vintage Camera',
      slug: 'vintage-camera',
      description: 'Classic film camera. Currently out of stock - check back soon!',
      price: 399.99,
      stock: 0,
      images: [
        'https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?w=800',
      ],
      vendorId: vendor1.id,
      categoryId: electronics.id,
    },
  });

  console.log('✅ Products created');

  // Create Sample Orders
  console.log('📋 Creating sample orders...');

  const order1 = await prisma.order.create({
    data: {
      userId: customer1.id,
      status: 'DELIVERED',
      subtotal: 1599.98,
      tax: 160.00,
      shipping: 15.00,
      total: 1774.98,
      paymentMethod: 'card',
      paymentIntentId: 'pi_test_123456',
      shippingAddress: JSON.stringify({
        fullName: 'John Customer',
        addressLine1: '123 Main Street',
        addressLine2: 'Apt 4B',
        city: 'New York',
        state: 'NY',
        zipCode: '10001',
        country: 'USA',
        phone: '+1-555-0123',
      }),
      items: {
        create: [
          {
            productId: laptop.id,
            quantity: 1,
            price: 1299.99,
          },
          {
            productId: headphones.id,
            quantity: 1,
            price: 299.99,
          },
        ],
      },
    },
  });

  const order2 = await prisma.order.create({
    data: {
      userId: customer2.id,
      status: 'SHIPPED',
      subtotal: 409.97,
      tax: 41.00,
      shipping: 10.00,
      total: 460.97,
      paymentMethod: 'card',
      paymentIntentId: 'pi_test_234567',
      shippingAddress: JSON.stringify({
        fullName: 'Jane Smith',
        addressLine1: '456 Oak Avenue',
        addressLine2: '',
        city: 'Los Angeles',
        state: 'CA',
        zipCode: '90001',
        country: 'USA',
        phone: '+1-555-0456',
      }),
      items: {
        create: [
          {
            productId: smartphone.id,
            quantity: 1,
            price: 899.99,
          },
          {
            productId: tshirt.id,
            quantity: 2,
            price: 29.99,
          },
        ],
      },
    },
  });

  const order3 = await prisma.order.create({
    data: {
      userId: customer1.id,
      status: 'PROCESSING',
      subtotal: 459.97,
      tax: 46.00,
      shipping: 10.00,
      total: 515.97,
      paymentMethod: 'card',
      paymentIntentId: 'pi_test_345678',
      shippingAddress: JSON.stringify({
        fullName: 'John Customer',
        addressLine1: '123 Main Street',
        addressLine2: 'Apt 4B',
        city: 'New York',
        state: 'NY',
        zipCode: '10001',
        country: 'USA',
        phone: '+1-555-0123',
      }),
      items: {
        create: [
          {
            productId: jacket.id,
            quantity: 1,
            price: 299.99,
          },
          {
            productId: coffeeMaker.id,
            quantity: 1,
            price: 159.99,
          },
        ],
      },
    },
  });

  const order4 = await prisma.order.create({
    data: {
      userId: customer2.id,
      status: 'PENDING',
      subtotal: 379.97,
      tax: 38.00,
      shipping: 10.00,
      total: 427.97,
      shippingAddress: JSON.stringify({
        fullName: 'Jane Smith',
        addressLine1: '456 Oak Avenue',
        addressLine2: '',
        city: 'Los Angeles',
        state: 'CA',
        zipCode: '90001',
        country: 'USA',
        phone: '+1-555-0456',
      }),
      items: {
        create: [
          {
            productId: smartwatch.id,
            quantity: 1,
            price: 249.99,
          },
          {
            productId: sneakers.id,
            quantity: 1,
            price: 129.99,
          },
        ],
      },
    },
  });

  const order5 = await prisma.order.create({
    data: {
      userId: customer1.id,
      status: 'CANCELLED',
      subtotal: 79.99,
      tax: 8.00,
      shipping: 5.00,
      total: 92.99,
      shippingAddress: JSON.stringify({
        fullName: 'John Customer',
        addressLine1: '123 Main Street',
        addressLine2: 'Apt 4B',
        city: 'New York',
        state: 'NY',
        zipCode: '10001',
        country: 'USA',
        phone: '+1-555-0123',
      }),
      items: {
        create: [
          {
            productId: jeans.id,
            quantity: 1,
            price: 79.99,
          },
        ],
      },
    },
  });

  console.log('✅ Orders created');

  console.log(`
╔════════════════════════════════════════════════════════════════╗
║                  🎉 Database Seeded Successfully! 🎉            ║
╚════════════════════════════════════════════════════════════════╝

📊 Summary:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

👥 Users Created: 5
   - Admin: 1
   - Vendors: 2
   - Customers: 2

📁 Categories Created: 5
   - Electronics
   - Clothing
   - Books
   - Home & Garden
   - Sports & Outdoors

📦 Products Created: 13
   - In Stock: 11
   - Low Stock (≤10): 1
   - Out of Stock: 1

📋 Orders Created: 5
   - Delivered: 1
   - Shipped: 1
   - Processing: 1
   - Pending: 1
   - Cancelled: 1

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🔐 TEST LOGIN CREDENTIALS:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

ADMIN:
  Email: admin@citadelbuy.com
  Password: password123
  Role: ADMIN

VENDOR 1 (TechStore):
  Email: vendor1@citadelbuy.com
  Password: password123
  Role: VENDOR

VENDOR 2 (Fashion Boutique):
  Email: vendor2@citadelbuy.com
  Password: password123
  Role: VENDOR

CUSTOMER 1:
  Email: customer@citadelbuy.com
  Password: password123
  Role: CUSTOMER

CUSTOMER 2:
  Email: jane@example.com
  Password: password123
  Role: CUSTOMER

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📚 API Documentation (Swagger):
   http://localhost:4000/api/docs

🚀 Backend API:
   http://localhost:4000/api

💻 Frontend:
   http://localhost:3000

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✨ You can now:
   1. Login with any of the above credentials
   2. Browse products in the catalog
   3. Add items to cart and checkout
   4. View orders (customer accounts)
   5. Manage products and orders (admin account)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  `);
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
