/**
 * Seed data for Multi-Tenant Global Marketplace
 *
 * This seed file creates sample data for:
 * - Tenant domains (custom domains for storefronts)
 * - Tenant locales (supported languages)
 * - Tenant currencies (supported currencies)
 * - Tenant geo rules (geographic restrictions and settings)
 * - FX rates (foreign exchange rates)
 * - User preferences (locale/currency preferences)
 *
 * Run with: npx prisma db seed
 * Or standalone: npx ts-node prisma/seed-marketplace.ts
 */

import { PrismaClient, DomainType, DomainStatus, SslStatus, TranslationStatus } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

const prisma = new PrismaClient();

// ============================================================================
// SAMPLE DATA DEFINITIONS
// ============================================================================

// Sample currencies with metadata
const CURRENCIES = [
  { code: 'USD', symbol: '$', displayName: 'US Dollar' },
  { code: 'EUR', symbol: '\u20AC', displayName: 'Euro' },
  { code: 'GBP', symbol: '\u00A3', displayName: 'British Pound' },
  { code: 'NGN', symbol: '\u20A6', displayName: 'Nigerian Naira' },
  { code: 'CAD', symbol: 'C$', displayName: 'Canadian Dollar' },
  { code: 'AUD', symbol: 'A$', displayName: 'Australian Dollar' },
  { code: 'JPY', symbol: '\u00A5', displayName: 'Japanese Yen' },
  { code: 'INR', symbol: '\u20B9', displayName: 'Indian Rupee' },
  { code: 'ZAR', symbol: 'R', displayName: 'South African Rand' },
  { code: 'BRL', symbol: 'R$', displayName: 'Brazilian Real' },
  { code: 'MXN', symbol: 'MX$', displayName: 'Mexican Peso' },
  { code: 'KES', symbol: 'KSh', displayName: 'Kenyan Shilling' },
  { code: 'GHS', symbol: 'GH\u20B5', displayName: 'Ghanaian Cedi' },
];

// Sample locales with labels
const LOCALES = [
  { code: 'en-US', label: 'English (United States)' },
  { code: 'en-GB', label: 'English (United Kingdom)' },
  { code: 'en-NG', label: 'English (Nigeria)' },
  { code: 'fr-FR', label: 'Fran\u00E7ais (France)' },
  { code: 'fr-CA', label: 'Fran\u00E7ais (Canada)' },
  { code: 'es-ES', label: 'Espa\u00F1ol (Espa\u00F1a)' },
  { code: 'es-MX', label: 'Espa\u00F1ol (M\u00E9xico)' },
  { code: 'pt-BR', label: 'Portugu\u00EAs (Brasil)' },
  { code: 'de-DE', label: 'Deutsch (Deutschland)' },
  { code: 'ja-JP', label: '\u65E5\u672C\u8A9E' },
  { code: 'zh-CN', label: '\u7B80\u4F53\u4E2D\u6587' },
  { code: 'ar-SA', label: '\u0627\u0644\u0639\u0631\u0628\u064A\u0629' },
  { code: 'hi-IN', label: '\u0939\u093F\u0928\u094D\u0926\u0940' },
  { code: 'sw-KE', label: 'Kiswahili' },
];

// Sample countries with default settings
const COUNTRIES = [
  { code: 'US', name: 'United States', currency: 'USD', locale: 'en-US', taxRate: 0.0750, zone: 'north_america' },
  { code: 'CA', name: 'Canada', currency: 'CAD', locale: 'en-US', taxRate: 0.1300, zone: 'north_america' },
  { code: 'GB', name: 'United Kingdom', currency: 'GBP', locale: 'en-GB', taxRate: 0.2000, zone: 'europe' },
  { code: 'DE', name: 'Germany', currency: 'EUR', locale: 'de-DE', taxRate: 0.1900, zone: 'europe' },
  { code: 'FR', name: 'France', currency: 'EUR', locale: 'fr-FR', taxRate: 0.2000, zone: 'europe' },
  { code: 'NG', name: 'Nigeria', currency: 'NGN', locale: 'en-NG', taxRate: 0.0750, zone: 'africa' },
  { code: 'ZA', name: 'South Africa', currency: 'ZAR', locale: 'en-GB', taxRate: 0.1500, zone: 'africa' },
  { code: 'KE', name: 'Kenya', currency: 'KES', locale: 'sw-KE', taxRate: 0.1600, zone: 'africa' },
  { code: 'GH', name: 'Ghana', currency: 'GHS', locale: 'en-GB', taxRate: 0.1250, zone: 'africa' },
  { code: 'JP', name: 'Japan', currency: 'JPY', locale: 'ja-JP', taxRate: 0.1000, zone: 'asia' },
  { code: 'AU', name: 'Australia', currency: 'AUD', locale: 'en-US', taxRate: 0.1000, zone: 'oceania' },
  { code: 'BR', name: 'Brazil', currency: 'BRL', locale: 'pt-BR', taxRate: 0.1700, zone: 'south_america' },
  { code: 'MX', name: 'Mexico', currency: 'MXN', locale: 'es-MX', taxRate: 0.1600, zone: 'north_america' },
  { code: 'IN', name: 'India', currency: 'INR', locale: 'hi-IN', taxRate: 0.1800, zone: 'asia' },
];

// Sample FX rates (base: USD)
const FX_RATES_FROM_USD = [
  { quote: 'EUR', rate: '0.92', inverse: '1.09' },
  { quote: 'GBP', rate: '0.79', inverse: '1.27' },
  { quote: 'NGN', rate: '1550.00', inverse: '0.000645' },
  { quote: 'CAD', rate: '1.36', inverse: '0.74' },
  { quote: 'AUD', rate: '1.54', inverse: '0.65' },
  { quote: 'JPY', rate: '149.50', inverse: '0.0067' },
  { quote: 'INR', rate: '83.10', inverse: '0.012' },
  { quote: 'ZAR', rate: '18.75', inverse: '0.053' },
  { quote: 'BRL', rate: '4.97', inverse: '0.20' },
  { quote: 'MXN', rate: '17.15', inverse: '0.058' },
  { quote: 'KES', rate: '153.50', inverse: '0.0065' },
  { quote: 'GHS', rate: '12.45', inverse: '0.080' },
];

// ============================================================================
// SEED FUNCTIONS
// ============================================================================

/**
 * Seed FX rates from a single base currency
 */
async function seedFxRates(): Promise<void> {
  console.log('Seeding FX rates...');

  const now = new Date();
  const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24 hours

  // USD to other currencies
  for (const fx of FX_RATES_FROM_USD) {
    await prisma.fxRate.upsert({
      where: {
        baseCurrency_quoteCurrency: {
          baseCurrency: 'USD',
          quoteCurrency: fx.quote,
        },
      },
      update: {
        rate: new Decimal(fx.rate),
        inverseRate: new Decimal(fx.inverse),
        fetchedAt: now,
        expiresAt,
      },
      create: {
        baseCurrency: 'USD',
        quoteCurrency: fx.quote,
        rate: new Decimal(fx.rate),
        inverseRate: new Decimal(fx.inverse),
        source: 'seed_data',
        fetchedAt: now,
        expiresAt,
        metadata: { seedVersion: '1.0.0' },
      },
    });

    // Also create inverse rate
    await prisma.fxRate.upsert({
      where: {
        baseCurrency_quoteCurrency: {
          baseCurrency: fx.quote,
          quoteCurrency: 'USD',
        },
      },
      update: {
        rate: new Decimal(fx.inverse),
        inverseRate: new Decimal(fx.rate),
        fetchedAt: now,
        expiresAt,
      },
      create: {
        baseCurrency: fx.quote,
        quoteCurrency: 'USD',
        rate: new Decimal(fx.inverse),
        inverseRate: new Decimal(fx.rate),
        source: 'seed_data',
        fetchedAt: now,
        expiresAt,
        metadata: { seedVersion: '1.0.0' },
      },
    });
  }

  console.log(`  Created ${FX_RATES_FROM_USD.length * 2} FX rate pairs`);
}

/**
 * Seed tenant domains, locales, currencies, and geo rules for an organization
 */
async function seedTenantConfiguration(organizationId: string, tenantSlug: string): Promise<void> {
  console.log(`Seeding tenant configuration for: ${tenantSlug}`);

  // Create tenant domains
  await prisma.tenantDomain.upsert({
    where: { host: `${tenantSlug}.broxiva.com` },
    update: {},
    create: {
      host: `${tenantSlug}.broxiva.com`,
      tenantId: organizationId,
      domainType: DomainType.SUBDOMAIN,
      status: DomainStatus.VERIFIED,
      verifiedAt: new Date(),
      sslStatus: SslStatus.ACTIVE,
    },
  });

  // Create a sample custom domain
  await prisma.tenantDomain.upsert({
    where: { host: `shop.${tenantSlug}.example.com` },
    update: {},
    create: {
      host: `shop.${tenantSlug}.example.com`,
      tenantId: organizationId,
      domainType: DomainType.CUSTOM,
      status: DomainStatus.PENDING,
      verificationToken: `verify_${Math.random().toString(36).substring(7)}`,
      cnameTarget: 'custom.broxiva.com',
    },
  });

  console.log(`  Created 2 domains for tenant`);

  // Create tenant locales (first 5 + random selection)
  const selectedLocales = LOCALES.slice(0, 5);
  for (let i = 0; i < selectedLocales.length; i++) {
    const locale = selectedLocales[i];
    await prisma.tenantLocale.upsert({
      where: {
        tenantId_locale: {
          tenantId: organizationId,
          locale: locale.code,
        },
      },
      update: {},
      create: {
        tenantId: organizationId,
        locale: locale.code,
        label: locale.label,
        isDefault: i === 0,
        isEnabled: true,
      },
    });
  }
  console.log(`  Created ${selectedLocales.length} locales for tenant`);

  // Create tenant currencies (first 6)
  const selectedCurrencies = CURRENCIES.slice(0, 6);
  for (let i = 0; i < selectedCurrencies.length; i++) {
    const currency = selectedCurrencies[i];
    await prisma.tenantCurrency.upsert({
      where: {
        tenantId_currency: {
          tenantId: organizationId,
          currency: currency.code,
        },
      },
      update: {},
      create: {
        tenantId: organizationId,
        currency: currency.code,
        symbol: currency.symbol,
        displayName: currency.displayName,
        isDefault: i === 0,
        isEnabled: true,
      },
    });
  }
  console.log(`  Created ${selectedCurrencies.length} currencies for tenant`);

  // Create tenant geo rules
  for (const country of COUNTRIES) {
    await prisma.tenantGeoRule.upsert({
      where: {
        tenantId_countryCode: {
          tenantId: organizationId,
          countryCode: country.code,
        },
      },
      update: {},
      create: {
        tenantId: organizationId,
        countryCode: country.code,
        countryName: country.name,
        isAllowed: true,
        defaultCurrency: country.currency,
        defaultLocale: country.locale,
        shippingZone: country.zone,
        taxRate: new Decimal(country.taxRate),
      },
    });
  }
  console.log(`  Created ${COUNTRIES.length} geo rules for tenant`);
}

/**
 * Seed user preferences for sample users
 */
async function seedUserPreferences(): Promise<void> {
  console.log('Seeding user preferences...');

  // Find sample users
  const users = await prisma.user.findMany({
    take: 5,
    select: { id: true, email: true },
  });

  const preferences = [
    { country: 'US', language: 'en-US', currency: 'USD', timezone: 'America/New_York' },
    { country: 'GB', language: 'en-GB', currency: 'GBP', timezone: 'Europe/London' },
    { country: 'NG', language: 'en-NG', currency: 'NGN', timezone: 'Africa/Lagos' },
    { country: 'DE', language: 'de-DE', currency: 'EUR', timezone: 'Europe/Berlin' },
    { country: 'JP', language: 'ja-JP', currency: 'JPY', timezone: 'Asia/Tokyo' },
  ];

  for (let i = 0; i < Math.min(users.length, preferences.length); i++) {
    const user = users[i];
    const pref = preferences[i];

    await prisma.userPreference.upsert({
      where: { userId: user.id },
      update: pref,
      create: {
        userId: user.id,
        ...pref,
      },
    });
  }

  console.log(`  Created preferences for ${Math.min(users.length, preferences.length)} users`);
}

/**
 * Main seed function
 */
async function seedMarketplace(): Promise<void> {
  console.log('='.repeat(60));
  console.log('Starting Multi-Tenant Global Marketplace Seed');
  console.log('='.repeat(60));

  try {
    // Seed FX rates (global)
    await seedFxRates();

    // Find existing organizations to add tenant config
    const organizations = await prisma.organization.findMany({
      take: 3,
      where: { status: 'ACTIVE' },
      select: { id: true, slug: true },
    });

    if (organizations.length === 0) {
      console.log('No organizations found. Creating sample organization...');

      // Check if admin user exists
      const adminUser = await prisma.user.findFirst({
        where: { role: 'ADMIN' },
      });

      if (adminUser) {
        const sampleOrg = await prisma.organization.create({
          data: {
            name: 'Broxiva Global Marketplace',
            slug: 'broxiva-global',
            type: 'MARKETPLACE',
            status: 'ACTIVE',
            primaryEmail: 'admin@broxiva.com',
            ownerId: adminUser.id,
            subscriptionTier: 'enterprise',
          },
        });
        organizations.push({ id: sampleOrg.id, slug: sampleOrg.slug });
      }
    }

    // Seed tenant configuration for each organization
    for (const org of organizations) {
      await seedTenantConfiguration(org.id, org.slug);
    }

    // Seed user preferences
    await seedUserPreferences();

    console.log('='.repeat(60));
    console.log('Multi-Tenant Global Marketplace Seed Complete!');
    console.log('='.repeat(60));

  } catch (error) {
    console.error('Error seeding marketplace data:', error);
    throw error;
  }
}

// Run if executed directly
if (require.main === module) {
  seedMarketplace()
    .catch((e) => {
      console.error(e);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}

// Export for use in main seed file
export { seedMarketplace, seedFxRates, seedTenantConfiguration, seedUserPreferences };
