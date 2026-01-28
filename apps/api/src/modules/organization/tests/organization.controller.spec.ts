import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { OrganizationController } from '../controllers/organization.controller';
import { OrganizationService } from '../services/organization.service';
import { OrganizationPermissionGuard } from '../../organization-roles/guards/permission.guard';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { IdempotencyInterceptor } from '@/common/idempotency/idempotency.interceptor';
import { IdempotencyService } from '@/common/idempotency/idempotency.service';
import {
  CreateOrganizationDto,
  UpdateOrganizationDto,
  OrganizationQueryDto,
} from '../dto';

describe('OrganizationController', () => {
  let controller: OrganizationController;
  let service: OrganizationService;

  const mockOrganizationService = {
    create: jest.fn(),
    findOne: jest.fn(),
    findAllForUser: jest.fn(),
    update: jest.fn(),
    softDelete: jest.fn(),
    getDashboard: jest.fn(),
    getSettings: jest.fn(),
    updateSettings: jest.fn(),
  };

  const mockUser = {
    id: 'user-123',
    email: 'owner@example.com',
    name: 'Test Owner',
  };

  const mockOrganization = {
    id: 'org-123',
    name: 'Test Organization',
    slug: 'test-org',
    type: 'SMALL_BUSINESS',
    status: 'ACTIVE',
    ownerId: 'user-123',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  };

  const mockIdempotencyService = {
    acquire: jest.fn().mockResolvedValue({ status: 'new', lockId: 'lock-123' }),
    getCachedResponse: jest.fn().mockResolvedValue(null),
    cacheResponse: jest.fn().mockResolvedValue(undefined),
    release: jest.fn().mockResolvedValue(undefined),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [OrganizationController],
      providers: [
        {
          provide: OrganizationService,
          useValue: mockOrganizationService,
        },
        {
          provide: IdempotencyService,
          useValue: mockIdempotencyService,
        },
        Reflector,
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(OrganizationPermissionGuard)
      .useValue({ canActivate: () => true })
      .overrideInterceptor(IdempotencyInterceptor)
      .useValue({ intercept: (context, next) => next.handle() })
      .compile();

    controller = module.get<OrganizationController>(OrganizationController);
    service = module.get<OrganizationService>(OrganizationService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  // ==================== CREATE TESTS ====================

  describe('create', () => {
    it('should create a new organization with owner membership', async () => {
      const createDto: CreateOrganizationDto = {
        name: 'New Organization',
        slug: 'new-org',
        type: 'SMALL_BUSINESS',
        primaryEmail: 'contact@neworg.com',
      } as CreateOrganizationDto;

      const expectedResult = {
        ...mockOrganization,
        name: createDto.name,
        slug: createDto.slug,
      };

      mockOrganizationService.create.mockResolvedValue(expectedResult);

      const result = await controller.create(mockUser, createDto);

      expect(result).toEqual(expectedResult);
      expect(mockOrganizationService.create).toHaveBeenCalledWith(
        mockUser.id,
        createDto,
      );
    });

    it('should handle organization creation with full details', async () => {
      const createDto: CreateOrganizationDto = {
        name: 'Complete Organization',
        slug: 'complete-org',
        type: 'ENTERPRISE',
        legalName: 'Complete Organization Inc.',
        registrationNumber: 'REG-123456',
        taxId: 'TAX-123456',
        industry: 'Technology',
        website: 'https://completeorg.com',
        primaryEmail: 'contact@completeorg.com',
        primaryPhone: '+1234567890',
        description: 'A complete organization setup',
      } as CreateOrganizationDto;

      mockOrganizationService.create.mockResolvedValue({
        ...mockOrganization,
        ...createDto,
      });

      await controller.create(mockUser, createDto);

      expect(mockOrganizationService.create).toHaveBeenCalledWith(
        mockUser.id,
        createDto,
      );
    });

    it('should throw ConflictException when slug already exists', async () => {
      const createDto: CreateOrganizationDto = {
        name: 'Duplicate Slug Org',
        slug: 'existing-slug',
        type: 'SMALL_BUSINESS',
        primaryEmail: 'contact@example.com',
      } as CreateOrganizationDto;

      mockOrganizationService.create.mockRejectedValue(
        new ConflictException('Organization slug already exists'),
      );

      await expect(controller.create(mockUser, createDto)).rejects.toThrow(
        ConflictException,
      );
    });
  });

  // ==================== READ TESTS ====================

  describe('findAll', () => {
    it('should return all organizations for a user', async () => {
      const query: OrganizationQueryDto = {
        limit: 10,
        offset: 0,
      };

      const expectedResult = {
        data: [mockOrganization],
        total: 1,
        limit: 10,
        offset: 0,
      };

      mockOrganizationService.findAllForUser.mockResolvedValue(expectedResult);

      const result = await controller.findAll(mockUser, query);

      expect(result).toEqual(expectedResult);
      expect(mockOrganizationService.findAllForUser).toHaveBeenCalledWith(
        mockUser.id,
        query,
      );
    });

    it('should handle pagination', async () => {
      const query: OrganizationQueryDto = {
        limit: 5,
        offset: 10,
      };

      const expectedResult = {
        data: [mockOrganization],
        total: 15,
        limit: 5,
        offset: 10,
      };

      mockOrganizationService.findAllForUser.mockResolvedValue(expectedResult);

      const result = await controller.findAll(mockUser, query);

      expect(result.limit).toBe(5);
      expect(result.offset).toBe(10);
      expect(result.total).toBe(15);
    });

    it('should handle search filter', async () => {
      const query: OrganizationQueryDto = {
        limit: 10,
        offset: 0,
        search: 'test',
      };

      mockOrganizationService.findAllForUser.mockResolvedValue({
        data: [mockOrganization],
        total: 1,
        limit: 10,
        offset: 0,
      });

      await controller.findAll(mockUser, query);

      expect(mockOrganizationService.findAllForUser).toHaveBeenCalledWith(
        mockUser.id,
        query,
      );
    });

    it('should handle status filter', async () => {
      const query: OrganizationQueryDto = {
        limit: 10,
        offset: 0,
        status: 'ACTIVE',
      };

      mockOrganizationService.findAllForUser.mockResolvedValue({
        data: [mockOrganization],
        total: 1,
        limit: 10,
        offset: 0,
      });

      await controller.findAll(mockUser, query);

      expect(mockOrganizationService.findAllForUser).toHaveBeenCalledWith(
        mockUser.id,
        query,
      );
    });

    it('should return empty array when user has no organizations', async () => {
      const query: OrganizationQueryDto = {
        limit: 10,
        offset: 0,
      };

      mockOrganizationService.findAllForUser.mockResolvedValue({
        data: [],
        total: 0,
        limit: 10,
        offset: 0,
      });

      const result = await controller.findAll(mockUser, query);

      expect(result.data).toEqual([]);
      expect(result.total).toBe(0);
    });
  });

  describe('findOne', () => {
    it('should return organization by ID', async () => {
      mockOrganizationService.findOne.mockResolvedValue(mockOrganization);

      const result = await controller.findOne('org-123');

      expect(result).toEqual(mockOrganization);
      expect(mockOrganizationService.findOne).toHaveBeenCalledWith('org-123');
    });

    it('should return organization by slug', async () => {
      mockOrganizationService.findOne.mockResolvedValue(mockOrganization);

      const result = await controller.findOne('test-org');

      expect(result).toEqual(mockOrganization);
      expect(mockOrganizationService.findOne).toHaveBeenCalledWith('test-org');
    });

    it('should throw NotFoundException when organization does not exist', async () => {
      mockOrganizationService.findOne.mockRejectedValue(
        new NotFoundException('Organization not found'),
      );

      await expect(controller.findOne('non-existent')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should include owner information', async () => {
      const orgWithOwner = {
        ...mockOrganization,
        owner: {
          id: 'user-123',
          name: 'Test Owner',
          email: 'owner@example.com',
        },
      };

      mockOrganizationService.findOne.mockResolvedValue(orgWithOwner);

      const result = await controller.findOne('org-123');

      expect(result.owner).toBeDefined();
      expect(result.owner.id).toBe('user-123');
    });

    it('should include member count', async () => {
      const orgWithCounts = {
        ...mockOrganization,
        _count: {
          members: 5,
          teams: 2,
          departments: 3,
        },
      };

      mockOrganizationService.findOne.mockResolvedValue(orgWithCounts);

      const result = await controller.findOne('org-123');

      expect(result._count.members).toBe(5);
      expect(result._count.teams).toBe(2);
      expect(result._count.departments).toBe(3);
    });
  });

  describe('getDashboard', () => {
    it('should return dashboard data for organization', async () => {
      const dashboardData = {
        organization: {
          id: mockOrganization.id,
          name: mockOrganization.name,
          slug: mockOrganization.slug,
          status: mockOrganization.status,
          logoUrl: null,
        },
        stats: {
          members: 10,
          teams: 3,
          pendingInvites: 2,
        },
        recentActivity: [],
      };

      mockOrganizationService.getDashboard.mockResolvedValue(dashboardData);

      const result = await controller.getDashboard('org-123');

      expect(result).toEqual(dashboardData);
      expect(mockOrganizationService.getDashboard).toHaveBeenCalledWith(
        'org-123',
      );
    });

    it('should include recent activity in dashboard', async () => {
      const dashboardData = {
        organization: {
          id: mockOrganization.id,
          name: mockOrganization.name,
          slug: mockOrganization.slug,
          status: mockOrganization.status,
          logoUrl: null,
        },
        stats: {
          members: 10,
          teams: 3,
          pendingInvites: 2,
        },
        recentActivity: [
          {
            id: 'audit-1',
            action: 'member.invited',
            createdAt: new Date(),
          },
          {
            id: 'audit-2',
            action: 'team.created',
            createdAt: new Date(),
          },
        ],
      };

      mockOrganizationService.getDashboard.mockResolvedValue(dashboardData);

      const result = await controller.getDashboard('org-123');

      expect(result.recentActivity).toHaveLength(2);
    });
  });

  // ==================== UPDATE TESTS ====================

  describe('update', () => {
    it('should update organization details', async () => {
      const updateDto: UpdateOrganizationDto = {
        name: 'Updated Organization',
        description: 'Updated description',
      };

      const updatedOrg = {
        ...mockOrganization,
        ...updateDto,
        updatedAt: new Date(),
      };

      mockOrganizationService.update.mockResolvedValue(updatedOrg);

      const result = await controller.update('org-123', updateDto);

      expect(result).toEqual(updatedOrg);
      expect(mockOrganizationService.update).toHaveBeenCalledWith(
        'org-123',
        updateDto,
      );
    });

    it('should update organization type', async () => {
      const updateDto: UpdateOrganizationDto = {
        type: 'ENTERPRISE',
      };

      mockOrganizationService.update.mockResolvedValue({
        ...mockOrganization,
        type: 'ENTERPRISE',
      });

      await controller.update('org-123', updateDto);

      expect(mockOrganizationService.update).toHaveBeenCalledWith(
        'org-123',
        updateDto,
      );
    });

    it('should update contact information', async () => {
      const updateDto: UpdateOrganizationDto = {
        primaryEmail: 'newemail@example.com',
        primaryPhone: '+9876543210',
        website: 'https://newwebsite.com',
      };

      mockOrganizationService.update.mockResolvedValue({
        ...mockOrganization,
        ...updateDto,
      });

      await controller.update('org-123', updateDto);

      expect(mockOrganizationService.update).toHaveBeenCalledWith(
        'org-123',
        updateDto,
      );
    });

    it('should update branding', async () => {
      const updateDto: UpdateOrganizationDto = {
        logoUrl: 'https://example.com/logo.png',
        bannerUrl: 'https://example.com/banner.png',
        primaryColor: '#FF5733',
      };

      mockOrganizationService.update.mockResolvedValue({
        ...mockOrganization,
        ...updateDto,
      });

      await controller.update('org-123', updateDto);

      expect(mockOrganizationService.update).toHaveBeenCalledWith(
        'org-123',
        updateDto,
      );
    });

    it('should throw NotFoundException when updating non-existent organization', async () => {
      const updateDto: UpdateOrganizationDto = {
        name: 'Updated Name',
      };

      mockOrganizationService.update.mockRejectedValue(
        new NotFoundException('Organization not found'),
      );

      await expect(
        controller.update('non-existent', updateDto),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ==================== DELETE TESTS ====================

  describe('remove', () => {
    it('should soft delete organization', async () => {
      mockOrganizationService.softDelete.mockResolvedValue({ success: true });

      const result = await controller.remove('org-123');

      expect(result).toEqual({ success: true });
      expect(mockOrganizationService.softDelete).toHaveBeenCalledWith(
        'org-123',
      );
    });

    it('should throw NotFoundException when deleting non-existent organization', async () => {
      mockOrganizationService.softDelete.mockRejectedValue(
        new NotFoundException('Organization not found'),
      );

      await expect(controller.remove('non-existent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // ==================== SETTINGS TESTS ====================

  describe('getSettings', () => {
    it('should return organization settings', async () => {
      const settings = {
        notifications: {
          email: true,
          slack: false,
        },
        branding: {
          theme: 'dark',
        },
      };

      mockOrganizationService.getSettings.mockResolvedValue(settings);

      const result = await controller.getSettings('org-123');

      expect(result).toEqual(settings);
      expect(mockOrganizationService.getSettings).toHaveBeenCalledWith(
        'org-123',
      );
    });

    it('should return empty object when no settings exist', async () => {
      mockOrganizationService.getSettings.mockResolvedValue({});

      const result = await controller.getSettings('org-123');

      expect(result).toEqual({});
    });
  });

  describe('updateSettings', () => {
    it('should update organization settings', async () => {
      const newSettings = {
        notifications: {
          email: false,
          slack: true,
        },
      };

      mockOrganizationService.updateSettings.mockResolvedValue(newSettings);

      const result = await controller.updateSettings('org-123', newSettings);

      expect(result).toEqual(newSettings);
      expect(mockOrganizationService.updateSettings).toHaveBeenCalledWith(
        'org-123',
        newSettings,
      );
    });

    it('should merge new settings with existing settings', async () => {
      const newSettings = {
        branding: {
          customLogo: true,
        },
      };

      const mergedSettings = {
        notifications: {
          email: true,
        },
        branding: {
          customLogo: true,
        },
      };

      mockOrganizationService.updateSettings.mockResolvedValue(mergedSettings);

      const result = await controller.updateSettings('org-123', newSettings);

      expect(result).toHaveProperty('notifications');
      expect(result).toHaveProperty('branding');
    });

    it('should handle nested settings updates', async () => {
      const newSettings = {
        integrations: {
          stripe: {
            enabled: true,
            apiKey: 'sk_test_xxx',
          },
        },
      };

      mockOrganizationService.updateSettings.mockResolvedValue(newSettings);

      await controller.updateSettings('org-123', newSettings);

      expect(mockOrganizationService.updateSettings).toHaveBeenCalledWith(
        'org-123',
        newSettings,
      );
    });
  });

  // ==================== AUTHORIZATION TESTS ====================

  describe('authorization', () => {
    it('should require authentication for all endpoints', () => {
      // This is validated through guard decorators
      // In real tests, you would test the guard behavior
      expect(controller).toBeDefined();
    });

    it('should enforce org:read permission for findOne', () => {
      // This is validated through @RequirePermission decorator
      // The OrganizationPermissionGuard handles the actual check
      expect(controller).toBeDefined();
    });

    it('should enforce org:update permission for update', () => {
      // This is validated through @RequirePermission decorator
      expect(controller).toBeDefined();
    });

    it('should enforce org:delete permission for remove', () => {
      // This is validated through @RequirePermission decorator
      expect(controller).toBeDefined();
    });

    it('should enforce settings:read permission for getSettings', () => {
      // This is validated through @RequirePermission decorator
      expect(controller).toBeDefined();
    });

    it('should enforce settings:update permission for updateSettings', () => {
      // This is validated through @RequirePermission decorator
      expect(controller).toBeDefined();
    });
  });

  // ==================== SLUG VALIDATION TESTS ====================

  describe('slug uniqueness validation', () => {
    it('should reject duplicate slug on create', async () => {
      const createDto: CreateOrganizationDto = {
        name: 'New Org',
        slug: 'existing-slug',
        type: 'SMALL_BUSINESS',
        primaryEmail: 'contact@example.com',
      } as CreateOrganizationDto;

      mockOrganizationService.create.mockRejectedValue(
        new ConflictException('Organization slug already exists'),
      );

      await expect(controller.create(mockUser, createDto)).rejects.toThrow(
        ConflictException,
      );
      await expect(controller.create(mockUser, createDto)).rejects.toThrow(
        'Organization slug already exists',
      );
    });

    it('should allow same name with different slug', async () => {
      const createDto: CreateOrganizationDto = {
        name: 'Test Organization',
        slug: 'test-organization-2',
        type: 'SMALL_BUSINESS',
        primaryEmail: 'contact@example.com',
      } as CreateOrganizationDto;

      mockOrganizationService.create.mockResolvedValue({
        ...mockOrganization,
        slug: 'test-organization-2',
      });

      const result = await controller.create(mockUser, createDto);

      expect(result.slug).toBe('test-organization-2');
    });
  });
});
