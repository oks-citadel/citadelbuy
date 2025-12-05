import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { PermissionService } from '../services/permission.service';
import { PrismaService } from '@/common/prisma/prisma.service';
import { RedisService } from '@/common/redis/redis.service';

describe('PermissionService', () => {
  let service: PermissionService;
  let prisma: PrismaService;
  let redis: RedisService;

  const mockPrismaService = {
    organizationMember: {
      findUnique: jest.fn(),
    },
    organization: {
      findFirst: jest.fn(),
    },
    permission: {
      findMany: jest.fn(),
    },
  };

  const mockRedisService = {
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
    keys: jest.fn(),
  };

  const mockUserId = 'user-123';
  const mockOrgId = 'org-123';

  const mockMember = {
    organizationId: mockOrgId,
    userId: mockUserId,
    status: 'ACTIVE',
    roleId: 'role-123',
    role: {
      id: 'role-123',
      name: 'Admin',
      permissions: [
        'org:read',
        'org:update',
        'members:read',
        'members:invite',
        'teams:create',
      ],
    },
  };

  const mockOrganization = {
    id: mockOrgId,
    name: 'Test Organization',
    slug: 'test-org',
    deletedAt: null,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PermissionService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: RedisService,
          useValue: mockRedisService,
        },
      ],
    }).compile();

    service = module.get<PermissionService>(PermissionService);
    prisma = module.get<PrismaService>(PrismaService);
    redis = module.get<RedisService>(RedisService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // ==================== CHECK PERMISSIONS TESTS ====================

  describe('checkPermissions', () => {
    it('should return true when user has all required permissions', async () => {
      mockRedisService.get.mockResolvedValue(null);
      mockPrismaService.organizationMember.findUnique.mockResolvedValue(
        mockMember,
      );

      const result = await service.checkPermissions(mockUserId, mockOrgId, [
        'org:read',
        'members:read',
      ]);

      expect(result).toBe(true);
    });

    it('should return false when user lacks any required permission', async () => {
      mockRedisService.get.mockResolvedValue(null);
      mockPrismaService.organizationMember.findUnique.mockResolvedValue(
        mockMember,
      );

      const result = await service.checkPermissions(mockUserId, mockOrgId, [
        'org:read',
        'org:delete', // User doesn't have this permission
      ]);

      expect(result).toBe(false);
    });

    it('should return false when user has no permissions', async () => {
      mockRedisService.get.mockResolvedValue(null);
      mockPrismaService.organizationMember.findUnique.mockResolvedValue({
        ...mockMember,
        role: {
          id: 'role-123',
          name: 'NoPerms',
          permissions: [],
        },
      });

      const result = await service.checkPermissions(mockUserId, mockOrgId, [
        'org:read',
      ]);

      expect(result).toBe(false);
    });

    it('should return true when no permissions are required', async () => {
      mockRedisService.get.mockResolvedValue(null);
      mockPrismaService.organizationMember.findUnique.mockResolvedValue(
        mockMember,
      );

      const result = await service.checkPermissions(mockUserId, mockOrgId, []);

      expect(result).toBe(true);
    });

    it('should use cached permissions when available', async () => {
      const cachedPermissions = JSON.stringify([
        'org:read',
        'org:update',
        'members:read',
      ]);
      mockRedisService.get.mockResolvedValue(cachedPermissions);

      const result = await service.checkPermissions(mockUserId, mockOrgId, [
        'org:read',
        'members:read',
      ]);

      expect(result).toBe(true);
      expect(mockPrismaService.organizationMember.findUnique).not.toHaveBeenCalled();
    });
  });

  // ==================== HAS ANY PERMISSION TESTS ====================

  describe('hasAnyPermission', () => {
    it('should return true when user has at least one permission', async () => {
      mockRedisService.get.mockResolvedValue(null);
      mockPrismaService.organizationMember.findUnique.mockResolvedValue(
        mockMember,
      );

      const result = await service.hasAnyPermission(mockUserId, mockOrgId, [
        'org:delete', // User doesn't have this
        'org:read', // But has this
      ]);

      expect(result).toBe(true);
    });

    it('should return false when user has none of the permissions', async () => {
      mockRedisService.get.mockResolvedValue(null);
      mockPrismaService.organizationMember.findUnique.mockResolvedValue(
        mockMember,
      );

      const result = await service.hasAnyPermission(mockUserId, mockOrgId, [
        'org:delete',
        'settings:update',
        'billing:manage',
      ]);

      expect(result).toBe(false);
    });

    it('should return false when checking empty permission list', async () => {
      mockRedisService.get.mockResolvedValue(null);
      mockPrismaService.organizationMember.findUnique.mockResolvedValue(
        mockMember,
      );

      const result = await service.hasAnyPermission(mockUserId, mockOrgId, []);

      expect(result).toBe(false);
    });
  });

  // ==================== GET USER PERMISSIONS TESTS ====================

  describe('getUserPermissions', () => {
    it('should return user permissions from role', async () => {
      mockRedisService.get.mockResolvedValue(null);
      mockPrismaService.organizationMember.findUnique.mockResolvedValue(
        mockMember,
      );

      const result = await service.getUserPermissions(mockUserId, mockOrgId);

      expect(result).toEqual(mockMember.role.permissions);
      expect(result).toContain('org:read');
      expect(result).toContain('org:update');
    });

    it('should return empty array when user is not a member', async () => {
      mockRedisService.get.mockResolvedValue(null);
      mockPrismaService.organizationMember.findUnique.mockResolvedValue(null);

      const result = await service.getUserPermissions(mockUserId, mockOrgId);

      expect(result).toEqual([]);
    });

    it('should return empty array when member status is not active', async () => {
      mockRedisService.get.mockResolvedValue(null);
      mockPrismaService.organizationMember.findUnique.mockResolvedValue({
        ...mockMember,
        status: 'REMOVED',
      });

      const result = await service.getUserPermissions(mockUserId, mockOrgId);

      expect(result).toEqual([]);
    });

    it('should return empty array when role has no permissions', async () => {
      mockRedisService.get.mockResolvedValue(null);
      mockPrismaService.organizationMember.findUnique.mockResolvedValue({
        ...mockMember,
        role: null,
      });

      const result = await service.getUserPermissions(mockUserId, mockOrgId);

      expect(result).toEqual([]);
    });

    it('should cache permissions after fetching', async () => {
      mockRedisService.get.mockResolvedValue(null);
      mockPrismaService.organizationMember.findUnique.mockResolvedValue(
        mockMember,
      );

      await service.getUserPermissions(mockUserId, mockOrgId);

      expect(mockRedisService.set).toHaveBeenCalledWith(
        `perms:${mockOrgId}:${mockUserId}`,
        JSON.stringify(mockMember.role.permissions),
        30, // CACHE_TTL
      );
    });

    it('should return cached permissions when available', async () => {
      const cachedPermissions = JSON.stringify(['org:read', 'org:update']);
      mockRedisService.get.mockResolvedValue(cachedPermissions);

      const result = await service.getUserPermissions(mockUserId, mockOrgId);

      expect(result).toEqual(['org:read', 'org:update']);
      expect(mockPrismaService.organizationMember.findUnique).not.toHaveBeenCalled();
    });

    it('should use correct cache key format', async () => {
      mockRedisService.get.mockResolvedValue(null);
      mockPrismaService.organizationMember.findUnique.mockResolvedValue(
        mockMember,
      );

      await service.getUserPermissions(mockUserId, mockOrgId);

      expect(mockRedisService.get).toHaveBeenCalledWith(
        `perms:${mockOrgId}:${mockUserId}`,
      );
    });
  });

  // ==================== CACHE BEHAVIOR TESTS ====================

  describe('cache behavior', () => {
    it('should invalidate cache for specific user and organization', async () => {
      await service.invalidateCache(mockUserId, mockOrgId);

      expect(mockRedisService.del).toHaveBeenCalledWith(
        `perms:${mockOrgId}:${mockUserId}`,
      );
    });

    it('should invalidate all caches for an organization', async () => {
      const mockKeys = [
        `perms:${mockOrgId}:user-1`,
        `perms:${mockOrgId}:user-2`,
        `perms:${mockOrgId}:user-3`,
      ];

      mockRedisService.keys.mockResolvedValue(mockKeys);

      await service.invalidateOrgCache(mockOrgId);

      expect(mockRedisService.keys).toHaveBeenCalledWith(
        `perms:${mockOrgId}:*`,
      );
      expect(mockRedisService.del).toHaveBeenCalledTimes(3);
      mockKeys.forEach((key) => {
        expect(mockRedisService.del).toHaveBeenCalledWith(key);
      });
    });

    it('should handle invalidating organization cache with no keys', async () => {
      mockRedisService.keys.mockResolvedValue([]);

      await service.invalidateOrgCache(mockOrgId);

      expect(mockRedisService.keys).toHaveBeenCalledWith(
        `perms:${mockOrgId}:*`,
      );
      expect(mockRedisService.del).not.toHaveBeenCalled();
    });

    it('should use 30 second TTL for permission cache', async () => {
      mockRedisService.get.mockResolvedValue(null);
      mockPrismaService.organizationMember.findUnique.mockResolvedValue(
        mockMember,
      );

      await service.getUserPermissions(mockUserId, mockOrgId);

      expect(mockRedisService.set).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(String),
        30,
      );
    });
  });

  // ==================== PERMISSION AGGREGATION TESTS ====================

  describe('permission aggregation from roles', () => {
    it('should aggregate all permissions from role', async () => {
      const roleWithManyPermissions = {
        ...mockMember,
        role: {
          id: 'role-admin',
          name: 'Administrator',
          permissions: [
            'org:read',
            'org:update',
            'org:delete',
            'members:read',
            'members:invite',
            'members:remove',
            'teams:read',
            'teams:create',
            'teams:update',
            'teams:delete',
          ],
        },
      };

      mockRedisService.get.mockResolvedValue(null);
      mockPrismaService.organizationMember.findUnique.mockResolvedValue(
        roleWithManyPermissions,
      );

      const result = await service.getUserPermissions(mockUserId, mockOrgId);

      expect(result).toHaveLength(10);
      expect(result).toContain('org:read');
      expect(result).toContain('org:delete');
      expect(result).toContain('teams:delete');
    });

    it('should handle role with single permission', async () => {
      const roleWithOnePermission = {
        ...mockMember,
        role: {
          id: 'role-viewer',
          name: 'Viewer',
          permissions: ['org:read'],
        },
      };

      mockRedisService.get.mockResolvedValue(null);
      mockPrismaService.organizationMember.findUnique.mockResolvedValue(
        roleWithOnePermission,
      );

      const result = await service.getUserPermissions(mockUserId, mockOrgId);

      expect(result).toEqual(['org:read']);
      expect(result).toHaveLength(1);
    });

    it('should handle empty permissions array', async () => {
      const roleWithNoPermissions = {
        ...mockMember,
        role: {
          id: 'role-none',
          name: 'No Permissions',
          permissions: [],
        },
      };

      mockRedisService.get.mockResolvedValue(null);
      mockPrismaService.organizationMember.findUnique.mockResolvedValue(
        roleWithNoPermissions,
      );

      const result = await service.getUserPermissions(mockUserId, mockOrgId);

      expect(result).toEqual([]);
    });
  });

  // ==================== GET ORGANIZATION TESTS ====================

  describe('getOrganization', () => {
    it('should find organization by ID', async () => {
      mockPrismaService.organization.findFirst.mockResolvedValue(
        mockOrganization,
      );

      const result = await service.getOrganization(mockOrgId);

      expect(result).toEqual(mockOrganization);
      expect(mockPrismaService.organization.findFirst).toHaveBeenCalledWith({
        where: {
          OR: [{ id: mockOrgId }, { slug: mockOrgId }],
          deletedAt: null,
        },
      });
    });

    it('should find organization by slug', async () => {
      mockPrismaService.organization.findFirst.mockResolvedValue(
        mockOrganization,
      );

      const result = await service.getOrganization('test-org');

      expect(result).toEqual(mockOrganization);
      expect(mockPrismaService.organization.findFirst).toHaveBeenCalledWith({
        where: {
          OR: [{ id: 'test-org' }, { slug: 'test-org' }],
          deletedAt: null,
        },
      });
    });

    it('should throw NotFoundException when organization does not exist', async () => {
      mockPrismaService.organization.findFirst.mockResolvedValue(null);

      await expect(service.getOrganization('non-existent')).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.getOrganization('non-existent')).rejects.toThrow(
        'Organization not found',
      );
    });

    it('should exclude soft-deleted organizations', async () => {
      mockPrismaService.organization.findFirst.mockResolvedValue(null);

      await expect(service.getOrganization(mockOrgId)).rejects.toThrow(
        NotFoundException,
      );

      expect(mockPrismaService.organization.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            deletedAt: null,
          }),
        }),
      );
    });
  });

  // ==================== GET ALL PERMISSIONS TESTS ====================

  describe('getAllPermissions', () => {
    it('should return all available permissions ordered by category', async () => {
      const mockPermissions = [
        {
          id: 'perm-1',
          name: 'org:read',
          category: 'organization',
          description: 'Read organization',
        },
        {
          id: 'perm-2',
          name: 'members:read',
          category: 'members',
          description: 'Read members',
        },
        {
          id: 'perm-3',
          name: 'org:update',
          category: 'organization',
          description: 'Update organization',
        },
      ];

      mockPrismaService.permission.findMany.mockResolvedValue(mockPermissions);

      const result = await service.getAllPermissions();

      expect(result).toEqual(mockPermissions);
      expect(mockPrismaService.permission.findMany).toHaveBeenCalledWith({
        orderBy: [{ category: 'asc' }, { name: 'asc' }],
      });
    });

    it('should return empty array when no permissions exist', async () => {
      mockPrismaService.permission.findMany.mockResolvedValue([]);

      const result = await service.getAllPermissions();

      expect(result).toEqual([]);
    });
  });

  // ==================== GET PERMISSIONS BY CATEGORY TESTS ====================

  describe('getPermissionsByCategory', () => {
    it('should group permissions by category', async () => {
      const mockPermissions = [
        {
          id: 'perm-1',
          name: 'org:read',
          category: 'organization',
          description: 'Read organization',
        },
        {
          id: 'perm-2',
          name: 'org:update',
          category: 'organization',
          description: 'Update organization',
        },
        {
          id: 'perm-3',
          name: 'members:read',
          category: 'members',
          description: 'Read members',
        },
        {
          id: 'perm-4',
          name: 'members:invite',
          category: 'members',
          description: 'Invite members',
        },
      ];

      mockPrismaService.permission.findMany.mockResolvedValue(mockPermissions);

      const result = await service.getPermissionsByCategory();

      expect(result).toHaveProperty('organization');
      expect(result).toHaveProperty('members');
      expect(result.organization).toHaveLength(2);
      expect(result.members).toHaveLength(2);
      expect(result.organization[0].name).toBe('org:read');
      expect(result.members[0].name).toBe('members:read');
    });

    it('should handle empty permissions list', async () => {
      mockPrismaService.permission.findMany.mockResolvedValue([]);

      const result = await service.getPermissionsByCategory();

      expect(result).toEqual({});
    });

    it('should handle single category', async () => {
      const mockPermissions = [
        {
          id: 'perm-1',
          name: 'org:read',
          category: 'organization',
          description: 'Read organization',
        },
        {
          id: 'perm-2',
          name: 'org:update',
          category: 'organization',
          description: 'Update organization',
        },
      ];

      mockPrismaService.permission.findMany.mockResolvedValue(mockPermissions);

      const result = await service.getPermissionsByCategory();

      expect(Object.keys(result)).toHaveLength(1);
      expect(result).toHaveProperty('organization');
      expect(result.organization).toHaveLength(2);
    });
  });

  // ==================== EDGE CASES ====================

  describe('edge cases', () => {
    it('should handle wildcard permissions correctly', async () => {
      const roleWithWildcard = {
        ...mockMember,
        role: {
          id: 'role-super',
          name: 'SuperAdmin',
          permissions: ['*', 'org:read', 'members:read'],
        },
      };

      mockRedisService.get.mockResolvedValue(null);
      mockPrismaService.organizationMember.findUnique.mockResolvedValue(
        roleWithWildcard,
      );

      const result = await service.getUserPermissions(mockUserId, mockOrgId);

      expect(result).toContain('*');
      expect(result).toHaveLength(3);
    });

    it('should handle duplicate permissions in role', async () => {
      const roleWithDuplicates = {
        ...mockMember,
        role: {
          id: 'role-dup',
          name: 'DuplicateRole',
          permissions: ['org:read', 'org:read', 'members:read'],
        },
      };

      mockRedisService.get.mockResolvedValue(null);
      mockPrismaService.organizationMember.findUnique.mockResolvedValue(
        roleWithDuplicates,
      );

      const result = await service.getUserPermissions(mockUserId, mockOrgId);

      // Service should return permissions as-is from role
      expect(result).toEqual(['org:read', 'org:read', 'members:read']);
    });

    it('should handle checking permissions with special characters', async () => {
      const roleWithSpecial = {
        ...mockMember,
        role: {
          id: 'role-special',
          name: 'SpecialRole',
          permissions: ['org:read:all', 'members:invite:external'],
        },
      };

      mockRedisService.get.mockResolvedValue(null);
      mockPrismaService.organizationMember.findUnique.mockResolvedValue(
        roleWithSpecial,
      );

      const result = await service.checkPermissions(mockUserId, mockOrgId, [
        'org:read:all',
      ]);

      expect(result).toBe(true);
    });
  });
});
