import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function seedOrganizations() {
  console.log('🏢 Seeding organizations...');

  // Get existing users to use as organization owners
  const admin = await prisma.user.findUnique({
    where: { email: 'admin@citadelbuy.com' },
  });

  const vendor1 = await prisma.user.findUnique({
    where: { email: 'vendor1@citadelbuy.com' },
  });

  const vendor2 = await prisma.user.findUnique({
    where: { email: 'vendor2@citadelbuy.com' },
  });

  if (!admin || !vendor1 || !vendor2) {
    console.log('⚠️  Users not found. Skipping organization seeding.');
    return;
  }

  // Create System Roles
  console.log('👔 Creating system roles...');
  const ownerRole = await prisma.organizationRole.create({
    data: {
      name: 'Owner',
      description: 'Full access to all organization features',
      isSystem: true,
      isDefault: false,
      permissions: [
        'org:admin',
        'org:read',
        'org:write',
        'org:delete',
        'members:admin',
        'billing:admin',
        'settings:admin',
        'products:admin',
        'orders:admin',
        'analytics:admin',
      ],
    },
  });

  const adminRole = await prisma.organizationRole.create({
    data: {
      name: 'Admin',
      description: 'Administrative access to organization',
      isSystem: true,
      isDefault: false,
      permissions: [
        'org:read',
        'org:write',
        'members:write',
        'products:admin',
        'orders:admin',
        'analytics:read',
      ],
    },
  });

  const memberRole = await prisma.organizationRole.create({
    data: {
      name: 'Member',
      description: 'Basic member access',
      isSystem: true,
      isDefault: true,
      permissions: [
        'org:read',
        'products:read',
        'orders:read',
      ],
    },
  });

  const managerRole = await prisma.organizationRole.create({
    data: {
      name: 'Manager',
      description: 'Manager with team oversight',
      isSystem: true,
      isDefault: false,
      permissions: [
        'org:read',
        'members:read',
        'products:write',
        'orders:write',
        'analytics:read',
      ],
    },
  });

  console.log('✅ System roles created');

  // Create Permissions Registry
  console.log('🔐 Creating permissions...');
  const permissionsList = [
    // Organization permissions
    { code: 'org:admin', name: 'Organization Admin', category: 'organization', description: 'Full organization control' },
    { code: 'org:read', name: 'View Organization', category: 'organization', description: 'View organization details' },
    { code: 'org:write', name: 'Edit Organization', category: 'organization', description: 'Edit organization settings' },
    { code: 'org:delete', name: 'Delete Organization', category: 'organization', description: 'Delete organization' },

    // Member permissions
    { code: 'members:admin', name: 'Members Admin', category: 'members', description: 'Full member management' },
    { code: 'members:read', name: 'View Members', category: 'members', description: 'View organization members' },
    { code: 'members:write', name: 'Manage Members', category: 'members', description: 'Add/edit members' },
    { code: 'members:delete', name: 'Remove Members', category: 'members', description: 'Remove members' },

    // Product permissions
    { code: 'products:admin', name: 'Products Admin', category: 'products', description: 'Full product management' },
    { code: 'products:read', name: 'View Products', category: 'products', description: 'View products' },
    { code: 'products:write', name: 'Manage Products', category: 'products', description: 'Add/edit products' },
    { code: 'products:delete', name: 'Delete Products', category: 'products', description: 'Delete products' },

    // Order permissions
    { code: 'orders:admin', name: 'Orders Admin', category: 'orders', description: 'Full order management' },
    { code: 'orders:read', name: 'View Orders', category: 'orders', description: 'View orders' },
    { code: 'orders:write', name: 'Manage Orders', category: 'orders', description: 'Process orders' },
    { code: 'orders:refund', name: 'Refund Orders', category: 'orders', description: 'Issue refunds' },

    // Billing permissions
    { code: 'billing:admin', name: 'Billing Admin', category: 'billing', description: 'Full billing access' },
    { code: 'billing:read', name: 'View Billing', category: 'billing', description: 'View billing info' },
    { code: 'billing:write', name: 'Manage Billing', category: 'billing', description: 'Update billing' },

    // Settings permissions
    { code: 'settings:admin', name: 'Settings Admin', category: 'settings', description: 'Full settings access' },
    { code: 'settings:read', name: 'View Settings', category: 'settings', description: 'View settings' },
    { code: 'settings:write', name: 'Manage Settings', category: 'settings', description: 'Update settings' },

    // Analytics permissions
    { code: 'analytics:admin', name: 'Analytics Admin', category: 'analytics', description: 'Full analytics access' },
    { code: 'analytics:read', name: 'View Analytics', category: 'analytics', description: 'View reports' },
  ];

  for (const perm of permissionsList) {
    await prisma.permission.create({ data: perm });
  }

  console.log('✅ Permissions created');

  // Create Organizations
  console.log('🏢 Creating organizations...');

  // 1. CitadelBuy Platform Organization
  const platformOrg = await prisma.organization.create({
    data: {
      name: 'CitadelBuy Platform',
      slug: 'citadelbuy-platform',
      type: 'MARKETPLACE',
      status: 'ACTIVE',
      legalName: 'CitadelBuy Inc.',
      registrationNumber: 'CB-2024-001',
      taxId: 'ENC-TAX-123456789', // Should be encrypted in production
      industry: 'E-Commerce',
      website: 'https://citadelbuy.com',
      primaryEmail: 'contact@citadelbuy.com',
      primaryPhone: '+1-800-CITADEL',
      address: {
        street: '100 Commerce Drive',
        city: 'San Francisco',
        state: 'CA',
        zip: '94105',
        country: 'USA',
      },
      description: 'Leading multi-vendor e-commerce marketplace platform',
      features: ['multi-vendor', 'analytics', 'ai-powered', 'advanced-search'],
      subscriptionTier: 'enterprise',
      maxTeamMembers: 100,
      maxProducts: 100000,
      maxApiCalls: 1000000,
      verifiedAt: new Date(),
      ownerId: admin.id,
    },
  });

  // 2. TechStore Organization
  const techStoreOrg = await prisma.organization.create({
    data: {
      name: 'TechStore',
      slug: 'techstore',
      type: 'SMALL_BUSINESS',
      status: 'ACTIVE',
      legalName: 'TechStore LLC',
      registrationNumber: 'TS-2024-002',
      taxId: 'ENC-TAX-987654321',
      industry: 'Electronics Retail',
      website: 'https://techstore.example.com',
      primaryEmail: 'vendor1@citadelbuy.com',
      primaryPhone: '+1-555-TECH-001',
      address: {
        street: '456 Tech Boulevard',
        city: 'Austin',
        state: 'TX',
        zip: '78701',
        country: 'USA',
      },
      description: 'Premium electronics and gadgets retailer',
      features: ['product-management', 'inventory-tracking', 'analytics'],
      subscriptionTier: 'professional',
      maxTeamMembers: 20,
      maxProducts: 5000,
      maxApiCalls: 50000,
      verifiedAt: new Date(),
      ownerId: vendor1.id,
    },
  });

  // 3. Fashion Boutique Organization
  const fashionOrg = await prisma.organization.create({
    data: {
      name: 'Fashion Boutique',
      slug: 'fashion-boutique',
      type: 'SMALL_BUSINESS',
      status: 'ACTIVE',
      legalName: 'Fashion Boutique Co.',
      registrationNumber: 'FB-2024-003',
      industry: 'Fashion & Apparel',
      website: 'https://fashionboutique.example.com',
      primaryEmail: 'vendor2@citadelbuy.com',
      primaryPhone: '+1-555-FASH-002',
      address: {
        street: '789 Fashion Avenue',
        city: 'New York',
        state: 'NY',
        zip: '10001',
        country: 'USA',
      },
      description: 'Curated fashion and accessories collection',
      features: ['product-management', 'seasonal-collections'],
      subscriptionTier: 'professional',
      maxTeamMembers: 15,
      maxProducts: 3000,
      maxApiCalls: 30000,
      verifiedAt: new Date(),
      ownerId: vendor2.id,
    },
  });

  console.log('✅ Organizations created');

  // Create Departments for Platform Org
  console.log('🏛️ Creating departments...');
  const engineeringDept = await prisma.department.create({
    data: {
      organizationId: platformOrg.id,
      name: 'Engineering',
      description: 'Product development and engineering',
      level: 0,
      headId: admin.id,
    },
  });

  const marketingDept = await prisma.department.create({
    data: {
      organizationId: platformOrg.id,
      name: 'Marketing',
      description: 'Marketing and growth',
      level: 0,
    },
  });

  const supportDept = await prisma.department.create({
    data: {
      organizationId: platformOrg.id,
      name: 'Customer Support',
      description: 'Customer service and support',
      level: 0,
    },
  });

  // Create Teams
  console.log('👥 Creating teams...');
  await prisma.team.create({
    data: {
      organizationId: platformOrg.id,
      departmentId: engineeringDept.id,
      name: 'Backend Team',
      description: 'API and backend services',
      leadId: admin.id,
    },
  });

  await prisma.team.create({
    data: {
      organizationId: platformOrg.id,
      departmentId: engineeringDept.id,
      name: 'Frontend Team',
      description: 'UI/UX development',
    },
  });

  await prisma.team.create({
    data: {
      organizationId: platformOrg.id,
      departmentId: marketingDept.id,
      name: 'Content Team',
      description: 'Content creation and management',
    },
  });

  console.log('✅ Teams created');

  // Create Organization Members
  console.log('👤 Creating organization members...');
  await prisma.organizationMember.create({
    data: {
      organizationId: platformOrg.id,
      userId: admin.id,
      status: 'ACTIVE',
      roleId: ownerRole.id,
      departmentId: engineeringDept.id,
      title: 'Chief Technology Officer',
      joinedAt: new Date(),
    },
  });

  await prisma.organizationMember.create({
    data: {
      organizationId: techStoreOrg.id,
      userId: vendor1.id,
      status: 'ACTIVE',
      roleId: ownerRole.id,
      title: 'Founder & CEO',
      joinedAt: new Date(),
    },
  });

  await prisma.organizationMember.create({
    data: {
      organizationId: fashionOrg.id,
      userId: vendor2.id,
      status: 'ACTIVE',
      roleId: ownerRole.id,
      title: 'Owner',
      joinedAt: new Date(),
    },
  });

  console.log('✅ Organization members created');

  // Create KYC Applications
  console.log('📋 Creating KYC applications...');
  await prisma.kycApplication.create({
    data: {
      organizationId: techStoreOrg.id,
      status: 'APPROVED',
      idType: 'passport',
      idVerified: true,
      addressVerified: true,
      businessVerified: true,
      verificationScore: 95.5,
      verificationData: {
        verifiedBy: 'AI-Engine',
        verifiedAt: new Date().toISOString(),
        confidence: 0.955,
      },
      reviewerId: admin.id,
      reviewNotes: 'All documents verified successfully',
      submittedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
      reviewedAt: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000), // 6 days ago
      expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year from now
    },
  });

  await prisma.kycApplication.create({
    data: {
      organizationId: fashionOrg.id,
      status: 'APPROVED',
      idType: 'drivers_license',
      idVerified: true,
      addressVerified: true,
      businessVerified: true,
      verificationScore: 92.8,
      verificationData: {
        verifiedBy: 'AI-Engine',
        verifiedAt: new Date().toISOString(),
        confidence: 0.928,
      },
      reviewerId: admin.id,
      reviewNotes: 'Verified successfully',
      submittedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
      reviewedAt: new Date(Date.now() - 9 * 24 * 60 * 60 * 1000),
      expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
    },
  });

  console.log('✅ KYC applications created');

  // Create Organization Billing
  console.log('💳 Creating billing records...');
  await prisma.organizationBilling.create({
    data: {
      organizationId: platformOrg.id,
      planId: 'enterprise',
      planName: 'Enterprise',
      billingCycle: 'yearly',
      status: 'active',
      currentPeriodStart: new Date(),
      currentPeriodEnd: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      balance: 0,
      creditBalance: 1000,
    },
  });

  await prisma.organizationBilling.create({
    data: {
      organizationId: techStoreOrg.id,
      planId: 'professional',
      planName: 'Professional',
      billingCycle: 'monthly',
      status: 'active',
      currentPeriodStart: new Date(),
      currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      balance: 0,
      creditBalance: 100,
    },
  });

  await prisma.organizationBilling.create({
    data: {
      organizationId: fashionOrg.id,
      planId: 'professional',
      planName: 'Professional',
      billingCycle: 'monthly',
      status: 'active',
      currentPeriodStart: new Date(),
      currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      balance: 0,
      creditBalance: 50,
    },
  });

  console.log('✅ Billing records created');

  // Create Audit Logs
  console.log('📝 Creating audit logs...');
  await prisma.organizationAuditLog.create({
    data: {
      organizationId: platformOrg.id,
      userId: admin.id,
      action: 'organization.created',
      resource: 'organization',
      resourceId: platformOrg.id,
      newValue: { name: 'CitadelBuy Platform' },
      metadata: { source: 'seed' },
    },
  });

  await prisma.organizationAuditLog.create({
    data: {
      organizationId: techStoreOrg.id,
      userId: vendor1.id,
      action: 'organization.created',
      resource: 'organization',
      resourceId: techStoreOrg.id,
      newValue: { name: 'TechStore' },
      metadata: { source: 'seed' },
    },
  });

  console.log('✅ Audit logs created');

  console.log(`
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🏢 Organization Module Seeded Successfully!
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📊 Organizations Created: 3
   - CitadelBuy Platform (Marketplace)
   - TechStore (Small Business)
   - Fashion Boutique (Small Business)

👔 System Roles: 4
   - Owner
   - Admin
   - Manager
   - Member

🔐 Permissions: 25 permission codes

🏛️ Departments: 3 (Platform org)
👥 Teams: 3 (Platform org)
👤 Members: 3
📋 KYC Applications: 2 (both approved)
💳 Billing Records: 3

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  `);
}
