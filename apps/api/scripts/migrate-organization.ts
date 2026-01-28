#!/usr/bin/env ts-node

/**
 * Organization Module Migration Script
 *
 * This script:
 * 1. Checks if the organization migration has been applied
 * 2. Runs the migration if needed
 * 3. Seeds default organization data
 *
 * Usage:
 *   npm run migrate:organization
 *   or
 *   ts-node scripts/migrate-organization.ts
 */

import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';
import { seedOrganizations } from '../prisma/seeds/organization.seed';

const prisma = new PrismaClient();

interface MigrationStatus {
  applied: boolean;
  tablesExist: string[];
  tablesMissing: string[];
}

const REQUIRED_TABLES = [
  'organizations',
  'organization_members',
  'departments',
  'teams',
  'organization_roles',
  'permissions',
  'kyc_applications',
  'organization_invitations',
  'organization_api_keys',
  'organization_audit_logs',
  'organization_billing',
  'organization_invoices',
];

async function checkMigrationStatus(): Promise<MigrationStatus> {
  console.log('🔍 Checking migration status...');

  const tablesExist: string[] = [];
  const tablesMissing: string[] = [];

  for (const table of REQUIRED_TABLES) {
    try {
      // Try to query the table to see if it exists
      await prisma.$queryRawUnsafe(`SELECT 1 FROM ${table} LIMIT 1`);
      tablesExist.push(table);
      console.log(`  ✅ ${table} exists`);
    } catch (error) {
      tablesMissing.push(table);
      console.log(`  ❌ ${table} missing`);
    }
  }

  const applied = tablesMissing.length === 0;

  return {
    applied,
    tablesExist,
    tablesMissing,
  };
}

async function checkEnumsExist(): Promise<boolean> {
  console.log('🔍 Checking enums...');

  const enums = [
    'OrganizationType',
    'OrganizationStatus',
    'MemberStatus',
    'KycStatus',
  ];

  try {
    for (const enumName of enums) {
      const result = await prisma.$queryRawUnsafe(`
        SELECT EXISTS (
          SELECT 1
          FROM pg_type
          WHERE typname = '${enumName}'
        ) as exists
      `);

      const exists = (result as any)[0]?.exists;
      if (exists) {
        console.log(`  ✅ ${enumName} exists`);
      } else {
        console.log(`  ❌ ${enumName} missing`);
        return false;
      }
    }
    return true;
  } catch (error) {
    console.error('  ❌ Error checking enums:', error);
    return false;
  }
}

async function runMigration(): Promise<boolean> {
  console.log('\n📦 Running organization migration...\n');

  try {
    const migrationPath = path.join(
      __dirname,
      '..',
      'prisma',
      'migrations',
      'organization_module',
      'migration.sql',
    );

    if (!fs.existsSync(migrationPath)) {
      console.error(`❌ Migration file not found: ${migrationPath}`);
      return false;
    }

    const migrationSQL = fs.readFileSync(migrationPath, 'utf-8');

    console.log('📝 Migration file loaded');
    console.log('🚀 Executing migration...\n');

    // Split the SQL into individual statements and execute them
    const statements = migrationSQL
      .split(';')
      .map((s) => s.trim())
      .filter((s) => s.length > 0 && !s.startsWith('--'));

    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      try {
        await prisma.$executeRawUnsafe(statement);

        // Log progress
        if (statement.includes('CreateEnum')) {
          const match = statement.match(/CREATE TYPE "(\w+)"/);
          if (match) console.log(`  ✅ Created enum: ${match[1]}`);
        } else if (statement.includes('CreateTable')) {
          const match = statement.match(/CREATE TABLE "(\w+)"/);
          if (match) console.log(`  ✅ Created table: ${match[1]}`);
        } else if (statement.includes('CreateIndex')) {
          const match = statement.match(/CREATE.*INDEX "(\w+)"/);
          if (match) console.log(`  ✅ Created index: ${match[1]}`);
        } else if (statement.includes('AddForeignKey')) {
          const match = statement.match(/ALTER TABLE "(\w+)"/);
          if (match) console.log(`  ✅ Added foreign key to: ${match[1]}`);
        }
      } catch (error) {
        // Check if error is because object already exists
        if (
          error instanceof Error &&
          (error.message.includes('already exists') ||
            error.message.includes('duplicate key'))
        ) {
          console.log(`  ⚠️  Skipping (already exists)`);
        } else {
          console.error(`  ❌ Error executing statement:`, error);
          throw error;
        }
      }
    }

    console.log('\n✅ Migration executed successfully!\n');
    return true;
  } catch (error) {
    console.error('❌ Migration failed:', error);
    return false;
  }
}

async function seedData(): Promise<boolean> {
  console.log('\n🌱 Seeding organization data...\n');

  try {
    // Check if data already exists
    const orgCount = await prisma.organization.count();

    if (orgCount > 0) {
      console.log(`⚠️  Organizations already exist (${orgCount} found)`);
      console.log('Skipping seed to avoid duplicates');
      console.log('To re-seed, delete existing organizations first\n');
      return true;
    }

    await seedOrganizations();

    console.log('\n✅ Organization data seeded successfully!\n');
    return true;
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    return false;
  }
}

async function main() {
  console.log(`
╔════════════════════════════════════════════════════════════════╗
║         Organization Module Migration & Seed Script            ║
╚════════════════════════════════════════════════════════════════╝
  `);

  try {
    // Step 1: Check migration status
    const status = await checkMigrationStatus();

    if (status.applied) {
      console.log('\n✅ All organization tables already exist!\n');

      // Check if enums exist
      const enumsExist = await checkEnumsExist();

      if (!enumsExist) {
        console.log('⚠️  Some enums are missing. Migration may be incomplete.\n');
      }

      console.log('Migration is already applied. Proceeding to seed...\n');
    } else {
      console.log('\n⚠️  Migration not yet applied');
      console.log(`Missing tables: ${status.tablesMissing.join(', ')}\n`);

      // Step 2: Run migration
      const migrationSuccess = await runMigration();

      if (!migrationSuccess) {
        console.error('\n❌ Migration failed. Cannot proceed with seeding.\n');
        process.exit(1);
      }

      // Verify migration
      const verifyStatus = await checkMigrationStatus();
      if (!verifyStatus.applied) {
        console.error('\n❌ Migration verification failed!\n');
        process.exit(1);
      }
    }

    // Step 3: Seed data
    const seedSuccess = await seedData();

    if (!seedSuccess) {
      console.warn('\n⚠️  Seeding completed with warnings\n');
    }

    console.log(`
╔════════════════════════════════════════════════════════════════╗
║              ✅ Organization Module Setup Complete!             ║
╚════════════════════════════════════════════════════════════════╝

Next steps:
  1. Restart your API server
  2. Test organization endpoints
  3. Check the API documentation at /api/docs

For more information, see the Organization Module documentation.
    `);

  } catch (error) {
    console.error('\n❌ Script failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
main()
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
