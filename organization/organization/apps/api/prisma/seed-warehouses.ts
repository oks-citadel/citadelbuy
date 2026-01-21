import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function seedWarehouses() {
  console.log('🏭 Seeding warehouses...');

  // Create primary warehouse
  const primaryWarehouse = await prisma.warehouse.upsert({
    where: { code: 'WH-NYC-01' },
    update: {},
    create: {
      name: 'New York Main Warehouse',
      code: 'WH-NYC-01',
      address: '123 Industrial Blvd',
      city: 'New York',
      state: 'NY',
      country: 'United States',
      postalCode: '10001',
      phone: '+1-212-555-0100',
      email: 'nyc@broxiva.com',
      isPrimary: true,
      isActive: true,
    },
  });
  console.log('✅ Created primary warehouse:', primaryWarehouse.name);

  // Create secondary warehouses
  const warehouse2 = await prisma.warehouse.upsert({
    where: { code: 'WH-LAX-01' },
    update: {},
    create: {
      name: 'Los Angeles Distribution Center',
      code: 'WH-LAX-01',
      address: '456 Commerce Way',
      city: 'Los Angeles',
      state: 'CA',
      country: 'United States',
      postalCode: '90001',
      phone: '+1-310-555-0200',
      email: 'lax@broxiva.com',
      isPrimary: false,
      isActive: true,
    },
  });
  console.log('✅ Created warehouse:', warehouse2.name);

  const warehouse3 = await prisma.warehouse.upsert({
    where: { code: 'WH-CHI-01' },
    update: {},
    create: {
      name: 'Chicago Fulfillment Center',
      code: 'WH-CHI-01',
      address: '789 Logistics Pkwy',
      city: 'Chicago',
      state: 'IL',
      country: 'United States',
      postalCode: '60601',
      phone: '+1-312-555-0300',
      email: 'chicago@broxiva.com',
      isPrimary: false,
      isActive: true,
    },
  });
  console.log('✅ Created warehouse:', warehouse3.name);

  const warehouse4 = await prisma.warehouse.upsert({
    where: { code: 'WH-MIA-01' },
    update: {},
    create: {
      name: 'Miami Southeast Hub',
      code: 'WH-MIA-01',
      address: '321 Port Drive',
      city: 'Miami',
      state: 'FL',
      country: 'United States',
      postalCode: '33101',
      phone: '+1-305-555-0400',
      email: 'miami@broxiva.com',
      isPrimary: false,
      isActive: true,
    },
  });
  console.log('✅ Created warehouse:', warehouse4.name);

  const warehouse5 = await prisma.warehouse.upsert({
    where: { code: 'WH-SEA-01' },
    update: {},
    create: {
      name: 'Seattle Pacific Northwest Center',
      code: 'WH-SEA-01',
      address: '555 Shipping Lane',
      city: 'Seattle',
      state: 'WA',
      country: 'United States',
      postalCode: '98101',
      phone: '+1-206-555-0500',
      email: 'seattle@broxiva.com',
      isPrimary: false,
      isActive: true,
    },
  });
  console.log('✅ Created warehouse:', warehouse5.name);

  console.log('✨ Warehouse seeding complete!');
  console.log(`📦 Total warehouses: 5`);
}

async function main() {
  try {
    await seedWarehouses();
  } catch (error) {
    console.error('❌ Error seeding warehouses:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
