#!/usr/bin/env ts-node

/**
 * Organization Migration Verification Script
 *
 * This script verifies that the organization migration has been successfully applied
 * by checking tables, enums, indexes, and data integrity.
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface VerificationResult {
  passed: boolean;
  message: string;
  details?: any;
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

const REQUIRED_ENUMS = [
  'OrganizationType',
  'OrganizationStatus',
  'MemberStatus',
  'KycStatus',
];

async function verifyTables(): Promise<VerificationResult> {
  console.log('\n🔍 Verifying tables...');

  try {
    const missingTables: string[] = [];
    const existingTables: string[] = [];

    for (const table of REQUIRED_TABLES) {
      try {
        await prisma.$queryRawUnsafe(`SELECT 1 FROM ${table} LIMIT 1`);
        existingTables.push(table);
      } catch (error) {
        missingTables.push(table);
      }
    }

    if (missingTables.length > 0) {
      return {
        passed: false,
        message: `Missing ${missingTables.length} table(s)`,
        details: { missingTables, existingTables },
      };
    }

    return {
      passed: true,
      message: `All ${REQUIRED_TABLES.length} tables exist`,
      details: { tables: existingTables },
    };
  } catch (error) {
    return {
      passed: false,
      message: 'Error checking tables',
      details: error,
    };
  }
}

async function verifyEnums(): Promise<VerificationResult> {
  console.log('\n🔍 Verifying enums...');

  try {
    const result = await prisma.$queryRawUnsafe<Array<{ typname: string }>>(
      `SELECT typname FROM pg_type WHERE typtype = 'e' AND typname = ANY($1)`,
      REQUIRED_ENUMS,
    );

    const existingEnums = result.map((r) => r.typname);
    const missingEnums = REQUIRED_ENUMS.filter(
      (e) => !existingEnums.includes(e),
    );

    if (missingEnums.length > 0) {
      return {
        passed: false,
        message: `Missing ${missingEnums.length} enum(s)`,
        details: { missingEnums, existingEnums },
      };
    }

    return {
      passed: true,
      message: `All ${REQUIRED_ENUMS.length} enums exist`,
      details: { enums: existingEnums },
    };
  } catch (error) {
    return {
      passed: false,
      message: 'Error checking enums',
      details: error,
    };
  }
}

async function verifyIndexes(): Promise<VerificationResult> {
  console.log('\n🔍 Verifying indexes...');

  try {
    const result = await prisma.$queryRawUnsafe<Array<{ indexname: string }>>(
      `
      SELECT indexname
      FROM pg_indexes
      WHERE schemaname = 'public'
      AND tablename LIKE 'organization%'
      OR tablename IN ('permissions', 'departments', 'teams')
    `,
    );

    const indexCount = result.length;

    return {
      passed: indexCount >= 20, // We expect at least 20 indexes
      message: `Found ${indexCount} indexes`,
      details: { indexes: result.map((r) => r.indexname) },
    };
  } catch (error) {
    return {
      passed: false,
      message: 'Error checking indexes',
      details: error,
    };
  }
}

async function verifyForeignKeys(): Promise<VerificationResult> {
  console.log('\n🔍 Verifying foreign keys...');

  try {
    const result = await prisma.$queryRawUnsafe<
      Array<{ constraint_name: string; table_name: string }>
    >(
      `
      SELECT
        tc.constraint_name,
        tc.table_name
      FROM information_schema.table_constraints tc
      WHERE tc.constraint_type = 'FOREIGN KEY'
      AND tc.table_name LIKE 'organization%'
      OR tc.table_name IN ('departments', 'teams')
    `,
    );

    const fkCount = result.length;

    return {
      passed: fkCount >= 10, // We expect at least 10 foreign keys
      message: `Found ${fkCount} foreign key constraints`,
      details: { foreignKeys: result },
    };
  } catch (error) {
    return {
      passed: false,
      message: 'Error checking foreign keys',
      details: error,
    };
  }
}

async function verifySeededData(): Promise<VerificationResult> {
  console.log('\n🔍 Verifying seeded data...');

  try {
    const [
      orgCount,
      roleCount,
      permCount,
      memberCount,
      deptCount,
      teamCount,
      kycCount,
      billingCount,
    ] = await Promise.all([
      prisma.organization.count(),
      prisma.organizationRole.count({ where: { isSystem: true } }),
      prisma.permission.count(),
      prisma.organizationMember.count(),
      prisma.department.count(),
      prisma.team.count(),
      prisma.kycApplication.count(),
      prisma.organizationBilling.count(),
    ]);

    const dataSummary = {
      organizations: orgCount,
      systemRoles: roleCount,
      permissions: permCount,
      members: memberCount,
      departments: deptCount,
      teams: teamCount,
      kycApplications: kycCount,
      billingRecords: billingCount,
    };

    const hasMinimumData =
      orgCount >= 1 && roleCount >= 3 && permCount >= 20;

    return {
      passed: hasMinimumData,
      message: hasMinimumData
        ? 'Seeded data verified'
        : 'Missing or incomplete seed data',
      details: dataSummary,
    };
  } catch (error) {
    return {
      passed: false,
      message: 'Error checking seeded data',
      details: error,
    };
  }
}

async function verifyUserRelation(): Promise<VerificationResult> {
  console.log('\n🔍 Verifying User model relation...');

  try {
    // Check if User model can access organizationMemberships
    const userWithOrgs = await prisma.user.findFirst({
      include: {
        organizationMemberships: true,
      },
    });

    if (!userWithOrgs) {
      return {
        passed: false,
        message: 'No users found in database',
        details: null,
      };
    }

    return {
      passed: true,
      message: 'User-Organization relation working',
      details: {
        userId: userWithOrgs.id,
        email: userWithOrgs.email,
        organizationCount: userWithOrgs.organizationMemberships.length,
      },
    };
  } catch (error) {
    return {
      passed: false,
      message: 'Error verifying User relation',
      details: error,
    };
  }
}

async function verifyDataIntegrity(): Promise<VerificationResult> {
  console.log('\n🔍 Verifying data integrity...');

  try {
    // Check if all organization members have valid users and organizations
    const orphanedMembers = await prisma.$queryRawUnsafe<Array<{ id: string }>>(
      `
      SELECT om.id
      FROM organization_members om
      LEFT JOIN users u ON om."userId" = u.id
      LEFT JOIN organizations o ON om."organizationId" = o.id
      WHERE u.id IS NULL OR o.id IS NULL
    `,
    );

    // Check if all departments have valid organizations
    const orphanedDepts = await prisma.$queryRawUnsafe<Array<{ id: string }>>(
      `
      SELECT d.id
      FROM departments d
      LEFT JOIN organizations o ON d."organizationId" = o.id
      WHERE o.id IS NULL
    `,
    );

    const issues = [];
    if (orphanedMembers.length > 0) {
      issues.push(`${orphanedMembers.length} orphaned members`);
    }
    if (orphanedDepts.length > 0) {
      issues.push(`${orphanedDepts.length} orphaned departments`);
    }

    return {
      passed: issues.length === 0,
      message:
        issues.length === 0
          ? 'Data integrity verified'
          : `Found integrity issues: ${issues.join(', ')}`,
      details: { orphanedMembers, orphanedDepts },
    };
  } catch (error) {
    return {
      passed: false,
      message: 'Error checking data integrity',
      details: error,
    };
  }
}

async function printResult(
  testName: string,
  result: VerificationResult,
): Promise<void> {
  const icon = result.passed ? '✅' : '❌';
  console.log(`\n${icon} ${testName}: ${result.message}`);

  if (result.details && typeof result.details === 'object') {
    if ('missingTables' in result.details && result.details.missingTables?.length > 0) {
      console.log('   Missing:', result.details.missingTables.join(', '));
    }
    if ('missingEnums' in result.details && result.details.missingEnums?.length > 0) {
      console.log('   Missing:', result.details.missingEnums.join(', '));
    }
    if ('organizations' in result.details) {
      console.log('   Data counts:', JSON.stringify(result.details, null, 2));
    }
  }
}

async function main() {
  console.log(`
╔════════════════════════════════════════════════════════════════╗
║        Organization Migration Verification Script              ║
╚════════════════════════════════════════════════════════════════╝
  `);

  const results: Array<{ name: string; result: VerificationResult }> = [];

  // Run all verifications
  const tablesResult = await verifyTables();
  results.push({ name: 'Tables', result: tablesResult });
  await printResult('Tables', tablesResult);

  const enumsResult = await verifyEnums();
  results.push({ name: 'Enums', result: enumsResult });
  await printResult('Enums', enumsResult);

  const indexesResult = await verifyIndexes();
  results.push({ name: 'Indexes', result: indexesResult });
  await printResult('Indexes', indexesResult);

  const foreignKeysResult = await verifyForeignKeys();
  results.push({ name: 'Foreign Keys', result: foreignKeysResult });
  await printResult('Foreign Keys', foreignKeysResult);

  const userRelationResult = await verifyUserRelation();
  results.push({ name: 'User Relation', result: userRelationResult });
  await printResult('User Relation', userRelationResult);

  const seededDataResult = await verifySeededData();
  results.push({ name: 'Seeded Data', result: seededDataResult });
  await printResult('Seeded Data', seededDataResult);

  const integrityResult = await verifyDataIntegrity();
  results.push({ name: 'Data Integrity', result: integrityResult });
  await printResult('Data Integrity', integrityResult);

  // Summary
  const passedCount = results.filter((r) => r.result.passed).length;
  const totalCount = results.length;
  const allPassed = passedCount === totalCount;

  console.log(`
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${allPassed ? '🎉' : '⚠️'}  Verification Summary: ${passedCount}/${totalCount} checks passed

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  `);

  if (!allPassed) {
    console.log('Failed checks:');
    results
      .filter((r) => !r.result.passed)
      .forEach((r) => {
        console.log(`  ❌ ${r.name}: ${r.result.message}`);
      });
    console.log('\n');
    process.exit(1);
  } else {
    console.log(`
✅ All verification checks passed!

The organization module migration has been successfully applied and verified.

Next steps:
  1. Restart your API server: npm run dev
  2. Test organization endpoints: http://localhost:4000/api/organizations
  3. Check Swagger docs: http://localhost:4000/api/docs
    `);
  }

  await prisma.$disconnect();
}

main()
  .catch((error) => {
    console.error('\n❌ Verification failed with error:', error);
    process.exit(1);
  });
