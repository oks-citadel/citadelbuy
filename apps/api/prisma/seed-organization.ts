import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Default permissions
const DEFAULT_PERMISSIONS = [
  // Organization permissions
  { code: 'org:read', name: 'Read Organization', description: 'View organization details' },
  { code: 'org:update', name: 'Update Organization', description: 'Update organization settings' },
  { code: 'org:delete', name: 'Delete Organization', description: 'Delete organization' },
  { code: 'org:billing', name: 'Manage Billing', description: 'Manage organization billing and subscriptions' },

  // Member permissions
  { code: 'members:read', name: 'Read Members', description: 'View organization members' },
  { code: 'members:invite', name: 'Invite Members', description: 'Invite new members to organization' },
  { code: 'members:remove', name: 'Remove Members', description: 'Remove members from organization' },
  { code: 'members:manage_roles', name: 'Manage Member Roles', description: 'Assign and modify member roles' },

  // Team permissions
  { code: 'teams:read', name: 'Read Teams', description: 'View teams' },
  { code: 'teams:create', name: 'Create Teams', description: 'Create new teams' },
  { code: 'teams:update', name: 'Update Teams', description: 'Update team details' },
  { code: 'teams:delete', name: 'Delete Teams', description: 'Delete teams' },

  // Product permissions
  { code: 'products:read', name: 'Read Products', description: 'View products' },
  { code: 'products:create', name: 'Create Products', description: 'Create new products' },
  { code: 'products:update', name: 'Update Products', description: 'Update product details' },
  { code: 'products:delete', name: 'Delete Products', description: 'Delete products' },
  { code: 'products:publish', name: 'Publish Products', description: 'Publish or unpublish products' },

  // Order permissions
  { code: 'orders:read', name: 'Read Orders', description: 'View orders' },
  { code: 'orders:update', name: 'Update Orders', description: 'Update order details' },
  { code: 'orders:fulfill', name: 'Fulfill Orders', description: 'Process and fulfill orders' },
  { code: 'orders:refund', name: 'Refund Orders', description: 'Issue order refunds' },

  // Analytics permissions
  { code: 'analytics:read', name: 'Read Analytics', description: 'View analytics and reports' },
  { code: 'analytics:export', name: 'Export Analytics', description: 'Export analytics data' },

  // Settings permissions
  { code: 'settings:read', name: 'Read Settings', description: 'View settings' },
  { code: 'settings:update', name: 'Update Settings', description: 'Update settings' },
];

// Default roles with their permissions
const DEFAULT_ROLES = [
  {
    name: 'Owner',
    description: 'Full access to all features and settings',
    permissions: [
      'org:read', 'org:update', 'org:delete', 'org:billing',
      'members:read', 'members:invite', 'members:remove', 'members:manage_roles',
      'teams:read', 'teams:create', 'teams:update', 'teams:delete',
      'products:read', 'products:create', 'products:update', 'products:delete', 'products:publish',
      'orders:read', 'orders:update', 'orders:fulfill', 'orders:refund',
      'analytics:read', 'analytics:export',
      'settings:read', 'settings:update',
    ],
  },
  {
    name: 'Admin',
    description: 'Administrative access except organization deletion and billing',
    permissions: [
      'org:read', 'org:update',
      'members:read', 'members:invite', 'members:remove', 'members:manage_roles',
      'teams:read', 'teams:create', 'teams:update', 'teams:delete',
      'products:read', 'products:create', 'products:update', 'products:delete', 'products:publish',
      'orders:read', 'orders:update', 'orders:fulfill', 'orders:refund',
      'analytics:read', 'analytics:export',
      'settings:read', 'settings:update',
    ],
  },
  {
    name: 'Manager',
    description: 'Manage products, orders, and view members, teams, and analytics',
    permissions: [
      'members:read',
      'teams:read',
      'products:read', 'products:create', 'products:update', 'products:delete', 'products:publish',
      'orders:read', 'orders:update', 'orders:fulfill', 'orders:refund',
      'analytics:read',
    ],
  },
  {
    name: 'Staff',
    description: 'Create and update products, view and update orders',
    permissions: [
      'products:read', 'products:create', 'products:update',
      'orders:read', 'orders:update',
    ],
  },
  {
    name: 'Viewer',
    description: 'Read-only access to organization data',
    permissions: [
      'org:read',
      'members:read',
      'teams:read',
      'products:read',
      'orders:read',
      'analytics:read',
      'settings:read',
    ],
  },
];

async function seedOrganizationPermissionsAndRoles() {
  console.log('🌱 Seeding organization permissions and roles...');

  try {
    // Seed permissions
    console.log('Creating default permissions...');
    const createdPermissions = [];

    for (const permission of DEFAULT_PERMISSIONS) {
      const created = await prisma.organizationPermission.upsert({
        where: { code: permission.code },
        update: {
          name: permission.name,
          description: permission.description,
        },
        create: {
          code: permission.code,
          name: permission.name,
          description: permission.description,
        },
      });
      createdPermissions.push(created);
      console.log(`  ✓ ${permission.code}`);
    }

    console.log(`✅ Created ${createdPermissions.length} permissions`);

    // Seed roles
    console.log('\nCreating default roles...');

    for (const role of DEFAULT_ROLES) {
      // Get permission IDs for this role
      const permissions = await prisma.organizationPermission.findMany({
        where: {
          code: {
            in: role.permissions,
          },
        },
      });

      const permissionIds = permissions.map(p => p.id);

      // Create or update role
      const createdRole = await prisma.organizationRole.upsert({
        where: { name: role.name },
        update: {
          description: role.description,
        },
        create: {
          name: role.name,
          description: role.description,
          isDefault: role.name === 'Viewer', // Set Viewer as default role
        },
      });

      // Update role permissions (remove existing and add new ones)
      await prisma.rolePermission.deleteMany({
        where: { roleId: createdRole.id },
      });

      await prisma.rolePermission.createMany({
        data: permissionIds.map(permissionId => ({
          roleId: createdRole.id,
          permissionId,
        })),
      });

      console.log(`  ✓ ${role.name} (${role.permissions.length} permissions)`);
    }

    console.log(`✅ Created ${DEFAULT_ROLES.length} roles`);
    console.log('\n🎉 Organization seed completed successfully!');
  } catch (error) {
    console.error('❌ Error seeding organization data:', error);
    throw error;
  }
}

// Run seed if executed directly
if (require.main === module) {
  seedOrganizationPermissionsAndRoles()
    .catch((error) => {
      console.error(error);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}

export { seedOrganizationPermissionsAndRoles, DEFAULT_PERMISSIONS, DEFAULT_ROLES };
