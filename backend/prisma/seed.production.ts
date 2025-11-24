import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting production database seed...');

  // Check if admin already exists
  const existingAdmin = await prisma.user.findUnique({
    where: { email: 'admin@citadelbuy.com' },
  });

  if (existingAdmin) {
    console.log('⏭️  Admin user already exists, skipping user creation...');
  } else {
    // Get secure admin password from environment
    const adminPassword = process.env.ADMIN_PASSWORD;
    if (!adminPassword) {
      throw new Error('ADMIN_PASSWORD environment variable is required for production seeding');
    }

    if (adminPassword.length < 12) {
      throw new Error('ADMIN_PASSWORD must be at least 12 characters long');
    }

    // Create admin user
    console.log('👤 Creating admin user...');
    const hashedPassword = await bcrypt.hash(adminPassword, 12); // Higher salt rounds for production

    await prisma.user.create({
      data: {
        email: 'admin@citadelbuy.com',
        password: hashedPassword,
        name: 'Admin',
        role: 'ADMIN',
      },
    });

    console.log('✅ Admin user created');
  }

  // Create essential categories
  console.log('📁 Creating essential categories...');
  const categories = [
    {
      name: 'Electronics',
      slug: 'electronics',
      description: 'Electronic devices and accessories',
      image: null,
      parentId: null,
    },
    {
      name: 'Clothing',
      slug: 'clothing',
      description: 'Fashion and apparel',
      image: null,
      parentId: null,
    },
    {
      name: 'Home & Garden',
      slug: 'home-garden',
      description: 'Home improvement and garden supplies',
      image: null,
      parentId: null,
    },
    {
      name: 'Books',
      slug: 'books',
      description: 'Books and reading materials',
      image: null,
      parentId: null,
    },
    {
      name: 'Sports & Outdoors',
      slug: 'sports-outdoors',
      description: 'Sports equipment and outdoor gear',
      image: null,
      parentId: null,
    },
    {
      name: 'Toys & Games',
      slug: 'toys-games',
      description: 'Toys and games for all ages',
      image: null,
      parentId: null,
    },
  ];

  for (const category of categories) {
    const existing = await prisma.category.findUnique({
      where: { slug: category.slug },
    });

    if (!existing) {
      await prisma.category.create({ data: category });
      console.log(`  ✅ Created category: ${category.name}`);
    } else {
      console.log(`  ⏭️  Category already exists: ${category.name}`);
    }
  }

  // Create default loyalty program
  console.log('🎁 Creating default loyalty program...');
  const existingProgram = await prisma.loyaltyProgram.findFirst();
  if (!existingProgram) {
    await prisma.loyaltyProgram.create({
      data: {
        name: 'CitadelBuy Rewards',
        description: 'Earn points on every purchase and unlock exclusive rewards',
        pointsPerDollar: 1,
        isActive: true,
        reviewRewardPoints: 10,
        birthdayRewardPoints: 50,
        referrerRewardPoints: 100,
        refereeRewardPoints: 50,
        referralMinPurchase: 50,
        pointsExpiryDays: null, // Points never expire
      },
    });
    console.log('  ✅ Created default loyalty program');
  } else {
    console.log('  ⏭️  Loyalty program already exists');
  }

  // Create default loyalty tiers
  console.log('🏆 Creating loyalty tiers...');
  const tiers = [
    {
      name: 'Bronze',
      minPoints: 0,
      minSpending: 0,
      pointsMultiplier: 1.0,
      discountPercentage: 0,
      freeShipping: false,
      prioritySupport: false,
      earlyAccess: false,
    },
    {
      name: 'Silver',
      minPoints: 500,
      minSpending: 500,
      pointsMultiplier: 1.25,
      discountPercentage: 5,
      freeShipping: false,
      prioritySupport: false,
      earlyAccess: false,
    },
    {
      name: 'Gold',
      minPoints: 1000,
      minSpending: 1000,
      pointsMultiplier: 1.5,
      discountPercentage: 10,
      freeShipping: true,
      prioritySupport: true,
      earlyAccess: false,
    },
    {
      name: 'Platinum',
      minPoints: 5000,
      minSpending: 5000,
      pointsMultiplier: 2.0,
      discountPercentage: 15,
      freeShipping: true,
      prioritySupport: true,
      earlyAccess: true,
    },
    {
      name: 'Diamond',
      minPoints: 10000,
      minSpending: 10000,
      pointsMultiplier: 2.5,
      discountPercentage: 20,
      freeShipping: true,
      prioritySupport: true,
      earlyAccess: true,
    },
  ];

  for (const tier of tiers) {
    const existing = await prisma.loyaltyTier.findFirst({
      where: { name: tier.name },
    });

    if (!existing) {
      await prisma.loyaltyTier.create({ data: tier });
      console.log(`  ✅ Created loyalty tier: ${tier.name}`);
    } else {
      console.log(`  ⏭️  Loyalty tier already exists: ${tier.name}`);
    }
  }

  console.log('\n✅ Production seeding complete!');
  console.log('\n📊 Summary:');
  console.log('  - Admin user: admin@citadelbuy.com');
  console.log('  - Categories: 6 essential categories');
  console.log('  - Loyalty program: CitadelBuy Rewards');
  console.log('  - Loyalty tiers: Bronze, Silver, Gold, Platinum, Diamond');
  console.log('\n⚠️  Remember to:');
  console.log('  1. Change admin password after first login');
  console.log('  2. Configure email service for notifications');
  console.log('  3. Set up Stripe for payments');
  console.log('  4. Add your first products through the admin panel');
}

main()
  .catch((e) => {
    console.error('\n❌ Seeding failed:', e.message);
    console.error('\nStack trace:', e.stack);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
