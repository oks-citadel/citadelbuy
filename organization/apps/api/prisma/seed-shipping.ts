import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function seedShipping() {
  console.log('🚚 Seeding shipping providers, zones, and rules...\n');

  // ==================== 1. SHIPPING PROVIDERS ====================
  console.log('📦 Creating shipping providers...');

  // UPS Provider
  const upsProvider = await prisma.shippingProvider.upsert({
    where: { carrier: 'UPS' },
    update: {},
    create: {
      carrier: 'UPS',
      name: 'UPS Shipping',
      apiKey: process.env.UPS_API_KEY || 'test_ups_api_key',
      apiSecret: process.env.UPS_API_SECRET || 'test_ups_api_secret',
      accountNumber: process.env.UPS_ACCOUNT_NUMBER || 'test_ups_account',
      isActive: true,
      testMode: true, // Set to false in production with real credentials
      config: {
        defaultPackageType: 'SMALL_PACKAGE',
        insuranceEnabled: true,
        signatureEnabled: true,
      },
    },
  });
  console.log(`  ✅ Created UPS provider (${upsProvider.id})`);

  // FedEx Provider
  const fedexProvider = await prisma.shippingProvider.upsert({
    where: { carrier: 'FEDEX' },
    update: {},
    create: {
      carrier: 'FEDEX',
      name: 'FedEx Shipping',
      apiKey: process.env.FEDEX_API_KEY || 'test_fedex_api_key',
      apiSecret: process.env.FEDEX_API_SECRET || 'test_fedex_api_secret',
      accountNumber: process.env.FEDEX_ACCOUNT_NUMBER || 'test_fedex_account',
      meterNumber: process.env.FEDEX_METER_NUMBER || 'test_fedex_meter',
      isActive: true,
      testMode: true,
      config: {
        defaultPackageType: 'SMALL_PACKAGE',
        insuranceEnabled: true,
        signatureEnabled: true,
      },
    },
  });
  console.log(`  ✅ Created FedEx provider (${fedexProvider.id})`);

  // USPS Provider
  const uspsProvider = await prisma.shippingProvider.upsert({
    where: { carrier: 'USPS' },
    update: {},
    create: {
      carrier: 'USPS',
      name: 'USPS Shipping',
      apiKey: process.env.USPS_API_KEY || 'test_usps_api_key',
      accountNumber: process.env.USPS_ACCOUNT_NUMBER || 'test_usps_account',
      isActive: true,
      testMode: true,
      config: {
        defaultPackageType: 'SMALL_PACKAGE',
        insuranceEnabled: true,
      },
    },
  });
  console.log(`  ✅ Created USPS provider (${uspsProvider.id})\n`);

  // ==================== 2. SHIPPING ZONES ====================
  console.log('🗺️  Creating shipping zones...');

  // Zone 1: Continental US
  const zoneUS = await prisma.shippingZone.create({
    data: {
      providerId: upsProvider.id,
      name: 'Continental United States',
      description: 'All 48 contiguous US states',
      countries: ['US', 'USA'],
      states: [
        'AL', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA', 'ID', 'IL', 'IN', 'IA',
        'KS', 'KY', 'LA', 'ME', 'MD', 'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV',
        'NH', 'NJ', 'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC', 'SD',
        'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY',
      ],
      postalCodes: [],
      isActive: true,
      priority: 1,
    },
  });
  console.log(`  ✅ Created zone: ${zoneUS.name}`);

  // Zone 2: Alaska & Hawaii
  const zoneNonContiguous = await prisma.shippingZone.create({
    data: {
      providerId: upsProvider.id,
      name: 'Alaska & Hawaii',
      description: 'Non-contiguous US states',
      countries: ['US', 'USA'],
      states: ['AK', 'HI'],
      postalCodes: [],
      isActive: true,
      priority: 2,
    },
  });
  console.log(`  ✅ Created zone: ${zoneNonContiguous.name}`);

  // Zone 3: Canada
  const zoneCanada = await prisma.shippingZone.create({
    data: {
      providerId: upsProvider.id,
      name: 'Canada',
      description: 'All Canadian provinces',
      countries: ['CA', 'CAN'],
      states: ['AB', 'BC', 'MB', 'NB', 'NL', 'NS', 'NT', 'NU', 'ON', 'PE', 'QC', 'SK', 'YT'],
      postalCodes: [],
      isActive: true,
      priority: 3,
    },
  });
  console.log(`  ✅ Created zone: ${zoneCanada.name}`);

  // Zone 4: International
  const zoneInternational = await prisma.shippingZone.create({
    data: {
      providerId: upsProvider.id,
      name: 'International',
      description: 'All other countries',
      countries: ['*'], // Wildcard for all other countries
      states: [],
      postalCodes: [],
      isActive: true,
      priority: 10,
    },
  });
  console.log(`  ✅ Created zone: ${zoneInternational.name}\n`);

  // ==================== 3. SHIPPING RULES ====================
  console.log('📋 Creating shipping rules...');

  // Rules for Continental US
  await prisma.shippingRule.create({
    data: {
      zoneId: zoneUS.id,
      name: 'US Ground Shipping',
      description: 'Standard ground shipping for continental US',
      minWeight: 0,
      maxWeight: 150,
      minValue: 0,
      maxValue: null,
      serviceLevel: 'GROUND',
      baseRate: 7.99,
      perPoundRate: 0.50,
      perItemRate: null,
      freeThreshold: 50.00, // Free shipping over $50
      isActive: true,
      priority: 1,
    },
  });
  console.log('  ✅ US Ground Shipping');

  await prisma.shippingRule.create({
    data: {
      zoneId: zoneUS.id,
      name: 'US 2-Day Shipping',
      description: '2-day air shipping for continental US',
      minWeight: 0,
      maxWeight: 150,
      minValue: 0,
      maxValue: null,
      serviceLevel: 'TWO_DAY',
      baseRate: 15.99,
      perPoundRate: 1.00,
      perItemRate: null,
      freeThreshold: 100.00,
      isActive: true,
      priority: 2,
    },
  });
  console.log('  ✅ US 2-Day Shipping');

  await prisma.shippingRule.create({
    data: {
      zoneId: zoneUS.id,
      name: 'US Next Day Shipping',
      description: 'Next-day air shipping for continental US',
      minWeight: 0,
      maxWeight: 150,
      minValue: 0,
      maxValue: null,
      serviceLevel: 'NEXT_DAY',
      baseRate: 29.99,
      perPoundRate: 2.00,
      perItemRate: null,
      freeThreshold: null,
      isActive: true,
      priority: 3,
    },
  });
  console.log('  ✅ US Next Day Shipping');

  // Rules for Alaska & Hawaii
  await prisma.shippingRule.create({
    data: {
      zoneId: zoneNonContiguous.id,
      name: 'AK/HI Ground Shipping',
      description: 'Ground shipping for Alaska and Hawaii',
      minWeight: 0,
      maxWeight: 150,
      minValue: 0,
      maxValue: null,
      serviceLevel: 'GROUND',
      baseRate: 15.99,
      perPoundRate: 1.00,
      perItemRate: null,
      freeThreshold: 75.00,
      isActive: true,
      priority: 1,
    },
  });
  console.log('  ✅ AK/HI Ground Shipping');

  await prisma.shippingRule.create({
    data: {
      zoneId: zoneNonContiguous.id,
      name: 'AK/HI 2-Day Shipping',
      description: '2-day shipping for Alaska and Hawaii',
      minWeight: 0,
      maxWeight: 150,
      minValue: 0,
      maxValue: null,
      serviceLevel: 'TWO_DAY',
      baseRate: 25.99,
      perPoundRate: 1.50,
      perItemRate: null,
      freeThreshold: null,
      isActive: true,
      priority: 2,
    },
  });
  console.log('  ✅ AK/HI 2-Day Shipping');

  // Rules for Canada
  await prisma.shippingRule.create({
    data: {
      zoneId: zoneCanada.id,
      name: 'Canada Standard',
      description: 'Standard shipping to Canada',
      minWeight: 0,
      maxWeight: 150,
      minValue: 0,
      maxValue: null,
      serviceLevel: 'INTERNATIONAL',
      baseRate: 19.99,
      perPoundRate: 1.25,
      perItemRate: null,
      freeThreshold: 100.00,
      isActive: true,
      priority: 1,
    },
  });
  console.log('  ✅ Canada Standard Shipping');

  // Rules for International
  await prisma.shippingRule.create({
    data: {
      zoneId: zoneInternational.id,
      name: 'International Standard',
      description: 'Standard international shipping',
      minWeight: 0,
      maxWeight: 150,
      minValue: 0,
      maxValue: null,
      serviceLevel: 'INTERNATIONAL',
      baseRate: 29.99,
      perPoundRate: 2.50,
      perItemRate: null,
      freeThreshold: null,
      isActive: true,
      priority: 1,
    },
  });
  console.log('  ✅ International Standard Shipping\n');

  // ==================== SUMMARY ====================
  const providerCount = await prisma.shippingProvider.count();
  const zoneCount = await prisma.shippingZone.count();
  const ruleCount = await prisma.shippingRule.count();

  console.log('✨ Shipping seeding complete!');
  console.log(`📦 Providers: ${providerCount}`);
  console.log(`🗺️  Zones: ${zoneCount}`);
  console.log(`📋 Rules: ${ruleCount}\n`);

  console.log('💡 Next steps:');
  console.log('  1. Update provider credentials in production');
  console.log('  2. Test rate calculation: POST /shipping/rates/calculate');
  console.log('  3. Test label generation: POST /shipping/shipments');
  console.log('  4. Configure webhook endpoints for delivery confirmations\n');
}

seedShipping()
  .catch((e) => {
    console.error('❌ Error seeding shipping:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
