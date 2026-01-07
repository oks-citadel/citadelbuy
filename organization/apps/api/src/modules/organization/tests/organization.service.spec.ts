import { Test, TestingModule } from '@nestjs/testing';
import {
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { OrganizationService } from '../services/organization.service';
import { PrismaService } from '@/common/prisma/prisma.service';
import { RedisService } from '@/common/redis/redis.service';
import {
  CreateOrganizationDto,
  UpdateOrganizationDto,
  OrganizationQueryDto,
} from '../dto';

describe('OrganizationService', () => {
  let service: OrganizationService;
  let prisma: PrismaService;
  let redis: RedisService;
  let eventEmitter: EventEmitter2;

  const mockPrismaService = {
    organization: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      update: jest.fn(),
    },
    organizationRole: {
      findFirst: jest.fn(),
      create: jest.fn(),
    },
    organizationMember: {
      create: jest.fn(),
      findUnique: jest.fn(),
      count: jest.fn(),
    },
    team: {
      count: jest.fn(),
    },
    organizationInvitation: {
      count: jest.fn(),
    },
    organizationAuditLog: {
      findMany: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  const mockRedisService = {
    get: jest.fn().mockImplementation(async (key: string) => {
      // Return null by default - tests can override this
      return null;
    }),
    set: jest.fn().mockResolvedValue('OK'),
    del: jest.fn().mockResolvedValue(1),
  };

  const mockEventEmitter = {
    emit: jest.fn(),
  };

  const mockUserId = 'user-123';
  const mockOrgId = 'org-123';
  const mockOrganization = {
    id: mockOrgId,
    name: 'Test Organization',
    slug: 'test-org',
    type: 'SMALL_BUSINESS',
    status: 'ACTIVE',
    ownerId: mockUserId,
    legalName: null,
    registrationNumber: null,
    taxId: null,
    industry: null,
    website: null,
    primaryEmail: 'contact@testorg.com',
    primaryPhone: null,
    address: null,
    logoUrl: null,
    bannerUrl: null,
    primaryColor: null,
    description: null,
    settings: null,
    maxTeamMembers: 10,
    maxTeams: 5,
    deletedAt: null,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrganizationService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: RedisService,
          useValue: mockRedisService,
        },
        {
          provide: EventEmitter2,
          useValue: mockEventEmitter,
        },
      ],
    }).compile();

    service = module.get<OrganizationService>(OrganizationService);
    prisma = module.get<PrismaService>(PrismaService);
    redis = module.get<RedisService>(RedisService);
    eventEmitter = module.get<EventEmitter2>(EventEmitter2);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // ==================== CREATE TESTS ====================

  describe('create', () => {
    it('should create organization with owner membership', async () => {
      const createDto: CreateOrganizationDto = {
        name: 'New Organization',
        slug: 'new-org',
        type: 'SMALL_BUSINESS',
        primaryEmail: 'contact@neworg.com',
      } as CreateOrganizationDto;

      const mockOwnerRole = {
        id: 'role-owner',
        name: 'Owner',
        isSystem: true,
        permissions: ['org:read', 'org:update'],
      };

      mockPrismaService.organization.findUnique.mockResolvedValue(null);
      mockPrismaService.$transaction.mockImplementation(async (callback) => {
        const tx = {
          organization: {
            create: jest.fn().mockResolvedValue(mockOrganization),
          },
          organizationRole: {
            findFirst: jest.fn().mockResolvedValue(mockOwnerRole),
          },
          organizationMember: {
            create: jest.fn().mockResolvedValue({
              organizationId: mockOrgId,
              userId: mockUserId,
              roleId: mockOwnerRole.id,
              status: 'ACTIVE',
            }),
          },
        };
        return callback(tx);
      });

      const result = await service.create(mockUserId, createDto);

      expect(result).toEqual(mockOrganization);
      expect(mockPrismaService.organization.findUnique).toHaveBeenCalledWith({
        where: { slug: createDto.slug },
      });
      expect(mockEventEmitter.emit).toHaveBeenCalledWith(
        'organization.created',
        expect.any(Object),
      );
    });

    it('should create owner role if it does not exist', async () => {
      const createDto: CreateOrganizationDto = {
        name: 'New Organization',
        slug: 'new-org',
        type: 'SMALL_BUSINESS',
        primaryEmail: 'contact@neworg.com',
      } as CreateOrganizationDto;

      mockPrismaService.organization.findUnique.mockResolvedValue(null);
      mockPrismaService.$transaction.mockImplementation(async (callback) => {
        const tx = {
          organization: {
            create: jest.fn().mockResolvedValue(mockOrganization),
          },
          organizationRole: {
            findFirst: jest.fn().mockResolvedValue(null),
            create: jest.fn().mockResolvedValue({
              id: 'role-owner',
              name: 'Owner',
              isSystem: true,
              permissions: ['org:read', 'org:update'],
            }),
          },
          organizationMember: {
            create: jest.fn().mockResolvedValue({}),
          },
        };
        return callback(tx);
      });

      await service.create(mockUserId, createDto);

      expect(mockEventEmitter.emit).toHaveBeenCalled();
    });

    it('should throw ConflictException if slug already exists', async () => {
      const createDto: CreateOrganizationDto = {
        name: 'New Organization',
        slug: 'existing-slug',
        type: 'SMALL_BUSINESS',
        primaryEmail: 'contact@neworg.com',
      } as CreateOrganizationDto;

      mockPrismaService.organization.findUnique.mockResolvedValue(
        mockOrganization,
      );

      await expect(service.create(mockUserId, createDto)).rejects.toThrow(
        ConflictException,
      );
      await expect(service.create(mockUserId, createDto)).rejects.toThrow(
        'Organization slug already exists',
      );
    });

    it('should set default status to PENDING_VERIFICATION', async () => {
      const createDto: CreateOrganizationDto = {
        name: 'New Organization',
        slug: 'new-org',
        type: 'SMALL_BUSINESS',
        primaryEmail: 'contact@neworg.com',
      } as CreateOrganizationDto;

      mockPrismaService.organization.findUnique.mockResolvedValue(null);
      mockPrismaService.$transaction.mockImplementation(async (callback) => {
        const tx = {
          organization: {
            create: jest.fn().mockImplementation((data) => {
              expect(data.data.status).toBe('PENDING_VERIFICATION');
              return Promise.resolve(mockOrganization);
            }),
          },
          organizationRole: {
            findFirst: jest.fn().mockResolvedValue({ id: 'role-owner' }),
          },
          organizationMember: {
            create: jest.fn().mockResolvedValue({}),
          },
        };
        return callback(tx);
      });

      await service.create(mockUserId, createDto);
    });

    it('should set ownerId to the creating user', async () => {
      const createDto: CreateOrganizationDto = {
        name: 'New Organization',
        slug: 'new-org',
        type: 'SMALL_BUSINESS',
        primaryEmail: 'contact@neworg.com',
      } as CreateOrganizationDto;

      mockPrismaService.organization.findUnique.mockResolvedValue(null);
      mockPrismaService.$transaction.mockImplementation(async (callback) => {
        const tx = {
          organization: {
            create: jest.fn().mockImplementation((data) => {
              expect(data.data.ownerId).toBe(mockUserId);
              return Promise.resolve(mockOrganization);
            }),
          },
          organizationRole: {
            findFirst: jest.fn().mockResolvedValue({ id: 'role-owner' }),
          },
          organizationMember: {
            create: jest.fn().mockResolvedValue({}),
          },
        };
        return callback(tx);
      });

      await service.create(mockUserId, createDto);
    });

    it('should emit organization.created event', async () => {
      const createDto: CreateOrganizationDto = {
        name: 'New Organization',
        slug: 'new-org',
        type: 'SMALL_BUSINESS',
        primaryEmail: 'contact@neworg.com',
      } as CreateOrganizationDto;

      mockPrismaService.organization.findUnique.mockResolvedValue(null);
      mockPrismaService.$transaction.mockImplementation(async (callback) => {
        const tx = {
          organization: {
            create: jest.fn().mockResolvedValue(mockOrganization),
          },
          organizationRole: {
            findFirst: jest.fn().mockResolvedValue({ id: 'role-owner' }),
          },
          organizationMember: {
            create: jest.fn().mockResolvedValue({}),
          },
        };
        return callback(tx);
      });

      await service.create(mockUserId, createDto);

      expect(mockEventEmitter.emit).toHaveBeenCalledWith(
        'organization.created',
        expect.objectContaining({
          organizationId: mockOrgId,
          ownerId: mockUserId,
        }),
      );
    });
  });

  // ==================== FIND ONE TESTS ====================

  describe('findOne', () => {
    it('should find organization by ID', async () => {
      mockRedisService.get.mockResolvedValue(null);
      mockPrismaService.organization.findFirst.mockResolvedValue({
        ...mockOrganization,
        owner: {
          id: mockUserId,
          name: 'Test Owner',
          email: 'owner@example.com',
        },
        _count: {
          members: 5,
          teams: 2,
          departments: 1,
        },
      });

      const result = await service.findOne(mockOrgId);

      expect(result).toBeDefined();
      expect(result.id).toBe(mockOrgId);
      expect(mockPrismaService.organization.findFirst).toHaveBeenCalledWith({
        where: {
          OR: [{ id: mockOrgId }, { slug: mockOrgId }],
          deletedAt: null,
        },
        include: expect.any(Object),
      });
    });

    it('should find organization by slug', async () => {
      mockRedisService.get.mockResolvedValue(null);
      mockPrismaService.organization.findFirst.mockResolvedValue(
        mockOrganization,
      );

      const result = await service.findOne('test-org');

      expect(result).toBeDefined();
      expect(mockPrismaService.organization.findFirst).toHaveBeenCalledWith({
        where: {
          OR: [{ id: 'test-org' }, { slug: 'test-org' }],
          deletedAt: null,
        },
        include: expect.any(Object),
      });
    });

    it('should return cached organization if available', async () => {
      // Redis.get returns parsed JSON, not string
      mockRedisService.get.mockResolvedValue(mockOrganization);

      const result = await service.findOne(mockOrgId);

      expect(result).toEqual(mockOrganization);
      expect(mockPrismaService.organization.findFirst).not.toHaveBeenCalled();
    });

    it('should cache organization after fetching from database', async () => {
      mockRedisService.get.mockResolvedValue(null);
      mockPrismaService.organization.findFirst.mockResolvedValue(
        mockOrganization,
      );

      await service.findOne(mockOrgId);

      expect(mockRedisService.set).toHaveBeenCalledWith(
        `org:${mockOrgId}`,
        JSON.stringify(mockOrganization),
        300, // CACHE_TTL
      );
    });

    it('should throw NotFoundException when organization does not exist', async () => {
      mockRedisService.get.mockResolvedValue(null);
      mockPrismaService.organization.findFirst.mockResolvedValue(null);

      await expect(service.findOne('non-existent')).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.findOne('non-existent')).rejects.toThrow(
        'Organization not found',
      );
    });

    it('should exclude soft-deleted organizations', async () => {
      mockRedisService.get.mockResolvedValue(null);
      mockPrismaService.organization.findFirst.mockResolvedValue(null);

      await expect(service.findOne(mockOrgId)).rejects.toThrow(
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

  // ==================== FIND ALL FOR USER TESTS ====================

  describe('findAllForUser', () => {
    it('should return all organizations for a user', async () => {
      const query: OrganizationQueryDto = {
        limit: 10,
        offset: 0,
      };

      mockPrismaService.organization.findMany.mockResolvedValue([
        mockOrganization,
      ]);
      mockPrismaService.organization.count.mockResolvedValue(1);

      const result = await service.findAllForUser(mockUserId, query);

      expect(result.data).toEqual([mockOrganization]);
      expect(result.total).toBe(1);
      expect(result.limit).toBe(10);
      expect(result.offset).toBe(0);
    });

    it('should filter by search term', async () => {
      const query: OrganizationQueryDto = {
        limit: 10,
        offset: 0,
        search: 'test',
      };

      mockPrismaService.organization.findMany.mockResolvedValue([
        mockOrganization,
      ]);
      mockPrismaService.organization.count.mockResolvedValue(1);

      await service.findAllForUser(mockUserId, query);

      expect(mockPrismaService.organization.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: expect.any(Array),
          }),
        }),
      );
    });

    it('should filter by status', async () => {
      const query: OrganizationQueryDto = {
        limit: 10,
        offset: 0,
        status: 'ACTIVE',
      };

      mockPrismaService.organization.findMany.mockResolvedValue([
        mockOrganization,
      ]);
      mockPrismaService.organization.count.mockResolvedValue(1);

      await service.findAllForUser(mockUserId, query);

      expect(mockPrismaService.organization.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: 'ACTIVE',
          }),
        }),
      );
    });

    it('should only return active memberships', async () => {
      const query: OrganizationQueryDto = {
        limit: 10,
        offset: 0,
      };

      mockPrismaService.organization.findMany.mockResolvedValue([
        mockOrganization,
      ]);
      mockPrismaService.organization.count.mockResolvedValue(1);

      await service.findAllForUser(mockUserId, query);

      expect(mockPrismaService.organization.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            members: {
              some: {
                userId: mockUserId,
                status: 'ACTIVE',
              },
            },
          }),
        }),
      );
    });

    it('should exclude soft-deleted organizations', async () => {
      const query: OrganizationQueryDto = {
        limit: 10,
        offset: 0,
      };

      mockPrismaService.organization.findMany.mockResolvedValue([]);
      mockPrismaService.organization.count.mockResolvedValue(0);

      await service.findAllForUser(mockUserId, query);

      expect(mockPrismaService.organization.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            deletedAt: null,
          }),
        }),
      );
    });

    it('should handle pagination', async () => {
      const query: OrganizationQueryDto = {
        limit: 5,
        offset: 10,
      };

      mockPrismaService.organization.findMany.mockResolvedValue([]);
      mockPrismaService.organization.count.mockResolvedValue(15);

      const result = await service.findAllForUser(mockUserId, query);

      expect(mockPrismaService.organization.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 5,
          skip: 10,
        }),
      );
      expect(result.total).toBe(15);
    });
  });

  // ==================== UPDATE TESTS ====================

  describe('update', () => {
    it('should update organization details', async () => {
      const updateDto: UpdateOrganizationDto = {
        name: 'Updated Organization',
        description: 'Updated description',
      };

      mockRedisService.get.mockResolvedValue(null);
      mockPrismaService.organization.findFirst.mockResolvedValue(
        mockOrganization,
      );
      mockPrismaService.organization.update.mockResolvedValue({
        ...mockOrganization,
        ...updateDto,
      });

      const result = await service.update(mockOrgId, updateDto);

      expect(result.name).toBe('Updated Organization');
      expect(mockPrismaService.organization.update).toHaveBeenCalledWith({
        where: { id: mockOrgId },
        data: expect.objectContaining(updateDto),
      });
    });

    it('should invalidate cache after update', async () => {
      const updateDto: UpdateOrganizationDto = {
        name: 'Updated Organization',
      };

      mockRedisService.get.mockResolvedValue(null);
      mockPrismaService.organization.findFirst.mockResolvedValue(
        mockOrganization,
      );
      mockPrismaService.organization.update.mockResolvedValue({
        ...mockOrganization,
        ...updateDto,
      });

      await service.update(mockOrgId, updateDto);

      expect(mockRedisService.del).toHaveBeenCalledWith(`org:${mockOrgId}`);
      expect(mockRedisService.del).toHaveBeenCalledWith(
        `org:${mockOrganization.slug}`,
      );
    });

    it('should throw NotFoundException when updating non-existent organization', async () => {
      const updateDto: UpdateOrganizationDto = {
        name: 'Updated Name',
      };

      mockRedisService.get.mockResolvedValue(null);
      mockPrismaService.organization.findFirst.mockResolvedValue(null);

      await expect(service.update('non-existent', updateDto)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // ==================== SOFT DELETE TESTS ====================

  describe('softDelete', () => {
    it('should soft delete organization by setting deletedAt', async () => {
      mockRedisService.get.mockResolvedValue(null);
      mockPrismaService.organization.findFirst.mockResolvedValue(
        mockOrganization,
      );
      mockPrismaService.organization.update.mockResolvedValue({
        ...mockOrganization,
        deletedAt: new Date(),
      });

      const result = await service.softDelete(mockOrgId);

      expect(result).toEqual({ success: true });
      expect(mockPrismaService.organization.update).toHaveBeenCalledWith({
        where: { id: mockOrgId },
        data: { deletedAt: expect.any(Date) },
      });
    });

    it('should invalidate cache after soft delete', async () => {
      mockRedisService.get.mockResolvedValue(null);
      mockPrismaService.organization.findFirst.mockResolvedValue(
        mockOrganization,
      );
      mockPrismaService.organization.update.mockResolvedValue({
        ...mockOrganization,
        deletedAt: new Date(),
      });

      await service.softDelete(mockOrgId);

      expect(mockRedisService.del).toHaveBeenCalledWith(`org:${mockOrgId}`);
      expect(mockRedisService.del).toHaveBeenCalledWith(
        `org:${mockOrganization.slug}`,
      );
    });

    it('should throw NotFoundException when deleting non-existent organization', async () => {
      mockRedisService.get.mockResolvedValue(null);
      mockPrismaService.organization.findFirst.mockResolvedValue(null);

      await expect(service.softDelete('non-existent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // ==================== SETTINGS TESTS ====================

  describe('getSettings', () => {
    it('should return organization settings', async () => {
      const settings = {
        notifications: { email: true },
        branding: { theme: 'dark' },
      };

      mockRedisService.get.mockResolvedValue(null);
      mockPrismaService.organization.findFirst.mockResolvedValue({
        ...mockOrganization,
        settings,
      });

      const result = await service.getSettings(mockOrgId);

      expect(result).toEqual(settings);
    });

    it('should return empty object when settings are null', async () => {
      mockRedisService.get.mockResolvedValue(null);
      mockPrismaService.organization.findFirst.mockResolvedValue({
        ...mockOrganization,
        settings: null,
      });

      const result = await service.getSettings(mockOrgId);

      expect(result).toEqual({});
    });
  });

  describe('updateSettings', () => {
    it('should merge new settings with existing settings', async () => {
      const existingSettings = {
        notifications: { email: true },
      };

      const newSettings = {
        branding: { theme: 'dark' },
      };

      const expectedSettings = {
        notifications: { email: true },
        branding: { theme: 'dark' },
      };

      mockRedisService.get.mockResolvedValue(null);
      mockPrismaService.organization.findFirst.mockResolvedValue({
        ...mockOrganization,
        settings: existingSettings,
      });
      mockPrismaService.organization.update.mockResolvedValue({
        ...mockOrganization,
        settings: expectedSettings,
      });

      const result = await service.updateSettings(mockOrgId, newSettings);

      expect(result).toEqual(expectedSettings);
    });

    it('should invalidate cache after updating settings', async () => {
      mockRedisService.get.mockResolvedValue(null);
      mockPrismaService.organization.findFirst.mockResolvedValue({
        ...mockOrganization,
        settings: {},
      });
      mockPrismaService.organization.update.mockResolvedValue(
        mockOrganization,
      );

      await service.updateSettings(mockOrgId, { test: 'value' });

      expect(mockRedisService.del).toHaveBeenCalledWith(`org:${mockOrgId}`);
      expect(mockRedisService.del).toHaveBeenCalledWith(
        `org:${mockOrganization.slug}`,
      );
    });
  });

  // ==================== HELPER METHODS TESTS ====================

  describe('isMember', () => {
    it('should return true when user is an active member', async () => {
      mockPrismaService.organizationMember.findUnique.mockResolvedValue({
        organizationId: mockOrgId,
        userId: mockUserId,
        status: 'ACTIVE',
      });

      const result = await service.isMember(mockOrgId, mockUserId);

      expect(result).toBe(true);
    });

    it('should return false when user is not a member', async () => {
      mockPrismaService.organizationMember.findUnique.mockResolvedValue(null);

      const result = await service.isMember(mockOrgId, mockUserId);

      expect(result).toBe(false);
    });

    it('should return false when membership is not active', async () => {
      mockPrismaService.organizationMember.findUnique.mockResolvedValue({
        organizationId: mockOrgId,
        userId: mockUserId,
        status: 'REMOVED',
      });

      const result = await service.isMember(mockOrgId, mockUserId);

      expect(result).toBe(false);
    });
  });

  describe('isOwner', () => {
    it('should return true when user is the owner', async () => {
      mockPrismaService.organization.findUnique.mockResolvedValue({
        id: mockOrgId,
        ownerId: mockUserId,
      });

      const result = await service.isOwner(mockOrgId, mockUserId);

      expect(result).toBe(true);
    });

    it('should return false when user is not the owner', async () => {
      mockPrismaService.organization.findUnique.mockResolvedValue({
        id: mockOrgId,
        ownerId: 'different-user',
      });

      const result = await service.isOwner(mockOrgId, mockUserId);

      expect(result).toBe(false);
    });

    it('should return false when organization does not exist', async () => {
      mockPrismaService.organization.findUnique.mockResolvedValue(null);

      const result = await service.isOwner(mockOrgId, mockUserId);

      expect(result).toBe(false);
    });
  });

  // ==================== DASHBOARD TESTS ====================

  describe('getDashboard', () => {
    it('should return dashboard data with stats', async () => {
      mockRedisService.get.mockResolvedValue(null);
      mockPrismaService.organization.findFirst.mockResolvedValue(
        mockOrganization,
      );
      mockPrismaService.organizationMember.count.mockResolvedValue(10);
      mockPrismaService.team.count.mockResolvedValue(3);
      mockPrismaService.organizationInvitation.count.mockResolvedValue(2);
      mockPrismaService.organizationAuditLog.findMany.mockResolvedValue([]);

      const result = await service.getDashboard(mockOrgId);

      expect(result).toHaveProperty('organization');
      expect(result).toHaveProperty('stats');
      expect(result).toHaveProperty('recentActivity');
      expect(result.stats.members).toBe(10);
      expect(result.stats.teams).toBe(3);
      expect(result.stats.pendingInvites).toBe(2);
    });

    it('should include recent activity in dashboard', async () => {
      const recentActivity = [
        { id: 'audit-1', action: 'member.invited', createdAt: new Date() },
        { id: 'audit-2', action: 'team.created', createdAt: new Date() },
      ];

      mockRedisService.get.mockResolvedValue(null);
      mockPrismaService.organization.findFirst.mockResolvedValue(
        mockOrganization,
      );
      mockPrismaService.organizationMember.count.mockResolvedValue(10);
      mockPrismaService.team.count.mockResolvedValue(3);
      mockPrismaService.organizationInvitation.count.mockResolvedValue(2);
      mockPrismaService.organizationAuditLog.findMany.mockResolvedValue(
        recentActivity,
      );

      const result = await service.getDashboard(mockOrgId);

      expect(result.recentActivity).toEqual(recentActivity);
      expect(result.recentActivity).toHaveLength(2);
    });
  });
});
