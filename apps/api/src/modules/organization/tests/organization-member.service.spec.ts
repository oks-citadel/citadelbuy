import { Test, TestingModule } from '@nestjs/testing';
import {
  NotFoundException,
  ConflictException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { OrganizationMemberService } from '../services/organization-member.service';
import { PrismaService } from '@/common/prisma/prisma.service';
import {
  InviteMemberDto,
  BulkInviteMembersDto,
  UpdateMemberDto,
  MemberQueryDto,
} from '../dto';

describe('OrganizationMemberService', () => {
  let service: OrganizationMemberService;
  let prisma: PrismaService;
  let eventEmitter: EventEmitter2;

  const mockPrismaService = {
    organization: {
      findUnique: jest.fn(),
    },
    organizationMember: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      count: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    organizationInvitation: {
      findFirst: jest.fn(),
      create: jest.fn(),
    },
  };

  const mockEventEmitter = {
    emit: jest.fn(),
  };

  const mockOrgId = 'org-123';
  const mockUserId = 'user-123';
  const mockInviterId = 'inviter-456';
  const mockRoleId = 'role-member';

  const mockOrganization = {
    id: mockOrgId,
    name: 'Test Organization',
    slug: 'test-org',
    ownerId: 'owner-123',
    maxTeamMembers: 10,
    _count: {
      members: 5,
    },
  };

  const mockMember = {
    organizationId: mockOrgId,
    userId: mockUserId,
    roleId: mockRoleId,
    status: 'ACTIVE',
    title: 'Developer',
    joinedAt: new Date(),
    user: {
      id: mockUserId,
      name: 'Test User',
      email: 'test@example.com',
    },
    role: {
      id: mockRoleId,
      name: 'Member',
    },
    team: null,
    department: null,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrganizationMemberService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: EventEmitter2,
          useValue: mockEventEmitter,
        },
      ],
    }).compile();

    service = module.get<OrganizationMemberService>(
      OrganizationMemberService,
    );
    prisma = module.get<PrismaService>(PrismaService);
    eventEmitter = module.get<EventEmitter2>(EventEmitter2);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // ==================== LIST MEMBERS TESTS ====================

  describe('findAll', () => {
    it('should return all active members for organization', async () => {
      const query: MemberQueryDto = {
        limit: 10,
        offset: 0,
      };

      mockPrismaService.organizationMember.findMany.mockResolvedValue([
        mockMember,
      ]);
      mockPrismaService.organizationMember.count.mockResolvedValue(1);

      const result = await service.findAll(mockOrgId, query);

      expect(result.data).toEqual([mockMember]);
      expect(result.total).toBe(1);
      expect(result.limit).toBe(10);
      expect(result.offset).toBe(0);
    });

    it('should filter members by search term', async () => {
      const query: MemberQueryDto = {
        limit: 10,
        offset: 0,
        search: 'test',
      };

      mockPrismaService.organizationMember.findMany.mockResolvedValue([
        mockMember,
      ]);
      mockPrismaService.organizationMember.count.mockResolvedValue(1);

      await service.findAll(mockOrgId, query);

      expect(mockPrismaService.organizationMember.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            user: {
              OR: expect.any(Array),
            },
          }),
        }),
      );
    });

    it('should filter members by role', async () => {
      const query: MemberQueryDto = {
        limit: 10,
        offset: 0,
        roleId: 'role-admin',
      };

      mockPrismaService.organizationMember.findMany.mockResolvedValue([]);
      mockPrismaService.organizationMember.count.mockResolvedValue(0);

      await service.findAll(mockOrgId, query);

      expect(mockPrismaService.organizationMember.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            roleId: 'role-admin',
          }),
        }),
      );
    });

    it('should filter members by team', async () => {
      const query: MemberQueryDto = {
        limit: 10,
        offset: 0,
        teamId: 'team-123',
      };

      mockPrismaService.organizationMember.findMany.mockResolvedValue([]);
      mockPrismaService.organizationMember.count.mockResolvedValue(0);

      await service.findAll(mockOrgId, query);

      expect(mockPrismaService.organizationMember.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            teamId: 'team-123',
          }),
        }),
      );
    });

    it('should filter members by department', async () => {
      const query: MemberQueryDto = {
        limit: 10,
        offset: 0,
        departmentId: 'dept-123',
      };

      mockPrismaService.organizationMember.findMany.mockResolvedValue([]);
      mockPrismaService.organizationMember.count.mockResolvedValue(0);

      await service.findAll(mockOrgId, query);

      expect(mockPrismaService.organizationMember.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            departmentId: 'dept-123',
          }),
        }),
      );
    });

    it('should exclude removed members', async () => {
      const query: MemberQueryDto = {
        limit: 10,
        offset: 0,
      };

      mockPrismaService.organizationMember.findMany.mockResolvedValue([]);
      mockPrismaService.organizationMember.count.mockResolvedValue(0);

      await service.findAll(mockOrgId, query);

      expect(mockPrismaService.organizationMember.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: { not: 'REMOVED' },
          }),
        }),
      );
    });

    it('should handle pagination', async () => {
      const query: MemberQueryDto = {
        limit: 5,
        offset: 10,
      };

      mockPrismaService.organizationMember.findMany.mockResolvedValue([]);
      mockPrismaService.organizationMember.count.mockResolvedValue(15);

      const result = await service.findAll(mockOrgId, query);

      expect(mockPrismaService.organizationMember.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 5,
          skip: 10,
        }),
      );
      expect(result.total).toBe(15);
    });
  });

  describe('findOne', () => {
    it('should return member by organization and user ID', async () => {
      mockPrismaService.organizationMember.findUnique.mockResolvedValue(
        mockMember,
      );

      const result = await service.findOne(mockOrgId, mockUserId);

      expect(result).toEqual(mockMember);
      expect(mockPrismaService.organizationMember.findUnique).toHaveBeenCalledWith({
        where: {
          organizationId_userId: {
            organizationId: mockOrgId,
            userId: mockUserId,
          },
        },
        include: expect.any(Object),
      });
    });

    it('should throw NotFoundException when member does not exist', async () => {
      mockPrismaService.organizationMember.findUnique.mockResolvedValue(null);

      await expect(service.findOne(mockOrgId, mockUserId)).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.findOne(mockOrgId, mockUserId)).rejects.toThrow(
        'Member not found',
      );
    });
  });

  // ==================== INVITE MEMBERS TESTS ====================

  describe('invite', () => {
    it('should create invitation successfully', async () => {
      const inviteDto: InviteMemberDto = {
        email: 'newmember@example.com',
        roleId: mockRoleId,
        message: 'Join our team!',
      };

      const mockInvitation = {
        id: 'invite-123',
        organizationId: mockOrgId,
        email: inviteDto.email,
        roleId: inviteDto.roleId,
        status: 'pending',
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        organization: {
          name: mockOrganization.name,
          slug: mockOrganization.slug,
        },
      };

      mockPrismaService.organization.findUnique.mockResolvedValue(
        mockOrganization,
      );
      mockPrismaService.organizationMember.findFirst.mockResolvedValue(null);
      mockPrismaService.organizationInvitation.findFirst.mockResolvedValue(null);
      mockPrismaService.organizationInvitation.create.mockResolvedValue(
        mockInvitation,
      );

      const result = await service.invite(
        mockOrgId,
        mockInviterId,
        inviteDto,
      );

      expect(result.email).toBe(inviteDto.email);
      expect(result.status).toBe('pending');
      expect(mockPrismaService.organizationInvitation.create).toHaveBeenCalled();
    });

    it('should throw NotFoundException when organization does not exist', async () => {
      const inviteDto: InviteMemberDto = {
        email: 'newmember@example.com',
        roleId: mockRoleId,
      };

      mockPrismaService.organization.findUnique.mockResolvedValue(null);

      await expect(
        service.invite(mockOrgId, mockInviterId, inviteDto),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when member limit is reached', async () => {
      const inviteDto: InviteMemberDto = {
        email: 'newmember@example.com',
        roleId: mockRoleId,
      };

      const fullOrg = {
        ...mockOrganization,
        maxTeamMembers: 5,
        _count: {
          members: 5,
        },
      };

      mockPrismaService.organization.findUnique.mockResolvedValue(fullOrg);

      await expect(
        service.invite(mockOrgId, mockInviterId, inviteDto),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.invite(mockOrgId, mockInviterId, inviteDto),
      ).rejects.toThrow('Maximum team members limit reached');
    });

    it('should throw ConflictException when user is already a member', async () => {
      const inviteDto: InviteMemberDto = {
        email: 'existing@example.com',
        roleId: mockRoleId,
      };

      mockPrismaService.organization.findUnique.mockResolvedValue(
        mockOrganization,
      );
      mockPrismaService.organizationMember.findFirst.mockResolvedValue(
        mockMember,
      );

      await expect(
        service.invite(mockOrgId, mockInviterId, inviteDto),
      ).rejects.toThrow(ConflictException);
      await expect(
        service.invite(mockOrgId, mockInviterId, inviteDto),
      ).rejects.toThrow('User is already a member of this organization');
    });

    it('should throw ConflictException when invitation already pending', async () => {
      const inviteDto: InviteMemberDto = {
        email: 'pending@example.com',
        roleId: mockRoleId,
      };

      const existingInvite = {
        id: 'invite-existing',
        email: inviteDto.email,
        status: 'pending',
      };

      mockPrismaService.organization.findUnique.mockResolvedValue(
        mockOrganization,
      );
      mockPrismaService.organizationMember.findFirst.mockResolvedValue(null);
      mockPrismaService.organizationInvitation.findFirst.mockResolvedValue(
        existingInvite,
      );

      await expect(
        service.invite(mockOrgId, mockInviterId, inviteDto),
      ).rejects.toThrow(ConflictException);
      await expect(
        service.invite(mockOrgId, mockInviterId, inviteDto),
      ).rejects.toThrow('Invitation already pending for this email');
    });

    it('should create invitation with 7 day expiry', async () => {
      const inviteDto: InviteMemberDto = {
        email: 'newmember@example.com',
        roleId: mockRoleId,
      };

      mockPrismaService.organization.findUnique.mockResolvedValue(
        mockOrganization,
      );
      mockPrismaService.organizationMember.findFirst.mockResolvedValue(null);
      mockPrismaService.organizationInvitation.findFirst.mockResolvedValue(null);
      mockPrismaService.organizationInvitation.create.mockImplementation(
        (data) => {
          const expiresAt = new Date(data.data.expiresAt);
          const now = new Date();
          const daysDiff =
            (expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);

          expect(daysDiff).toBeGreaterThanOrEqual(6.9);
          expect(daysDiff).toBeLessThanOrEqual(7.1);

          return Promise.resolve({
            id: 'invite-123',
            email: inviteDto.email,
            status: 'pending',
            expiresAt: data.data.expiresAt,
            organization: {
              name: mockOrganization.name,
              slug: mockOrganization.slug,
            },
          });
        },
      );

      await service.invite(mockOrgId, mockInviterId, inviteDto);
    });

    it('should include optional fields in invitation', async () => {
      const inviteDto: InviteMemberDto = {
        email: 'newmember@example.com',
        roleId: mockRoleId,
        departmentId: 'dept-123',
        teamId: 'team-123',
        message: 'Welcome to the team!',
      };

      mockPrismaService.organization.findUnique.mockResolvedValue(
        mockOrganization,
      );
      mockPrismaService.organizationMember.findFirst.mockResolvedValue(null);
      mockPrismaService.organizationInvitation.findFirst.mockResolvedValue(null);
      mockPrismaService.organizationInvitation.create.mockResolvedValue({
        id: 'invite-123',
        email: inviteDto.email,
        roleId: inviteDto.roleId,
        departmentId: inviteDto.departmentId,
        teamId: inviteDto.teamId,
        message: inviteDto.message,
        status: 'pending',
        expiresAt: new Date(),
        organization: {
          name: mockOrganization.name,
          slug: mockOrganization.slug,
        },
      });

      await service.invite(mockOrgId, mockInviterId, inviteDto);

      expect(mockPrismaService.organizationInvitation.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            departmentId: 'dept-123',
            teamId: 'team-123',
            message: 'Welcome to the team!',
          }),
        }),
      );
    });
  });

  describe('bulkInvite', () => {
    it('should invite multiple members successfully', async () => {
      const bulkDto: BulkInviteMembersDto = {
        invitations: [
          { email: 'user1@example.com', roleId: mockRoleId },
          { email: 'user2@example.com', roleId: mockRoleId },
        ],
      };

      mockPrismaService.organization.findUnique.mockResolvedValue(
        mockOrganization,
      );
      mockPrismaService.organizationMember.findFirst.mockResolvedValue(null);
      mockPrismaService.organizationInvitation.findFirst.mockResolvedValue(null);
      mockPrismaService.organizationInvitation.create.mockResolvedValue({
        id: 'invite-123',
        email: 'test@example.com',
        status: 'pending',
        expiresAt: new Date(),
        organization: {
          name: mockOrganization.name,
          slug: mockOrganization.slug,
        },
      });

      const result = await service.bulkInvite(
        mockOrgId,
        mockInviterId,
        bulkDto,
      );

      expect(result.summary.total).toBe(2);
      expect(result.summary.successCount).toBe(2);
      expect(result.summary.failedCount).toBe(0);
      expect(result.successful).toHaveLength(2);
      expect(result.failed).toHaveLength(0);
    });

    it('should handle partial failures in bulk invite', async () => {
      const bulkDto: BulkInviteMembersDto = {
        invitations: [
          { email: 'success@example.com', roleId: mockRoleId },
          { email: 'existing@example.com', roleId: mockRoleId },
        ],
      };

      mockPrismaService.organization.findUnique.mockResolvedValue(
        mockOrganization,
      );

      // First invite succeeds, second fails (existing member)
      mockPrismaService.organizationMember.findFirst
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(mockMember);

      mockPrismaService.organizationInvitation.findFirst.mockResolvedValue(null);
      mockPrismaService.organizationInvitation.create.mockResolvedValue({
        id: 'invite-123',
        email: 'success@example.com',
        status: 'pending',
        expiresAt: new Date(),
        organization: {
          name: mockOrganization.name,
          slug: mockOrganization.slug,
        },
      });

      const result = await service.bulkInvite(
        mockOrgId,
        mockInviterId,
        bulkDto,
      );

      expect(result.summary.total).toBe(2);
      expect(result.summary.successCount).toBe(1);
      expect(result.summary.failedCount).toBe(1);
      expect(result.successful).toHaveLength(1);
      expect(result.failed).toHaveLength(1);
      expect(result.failed[0].email).toBe('existing@example.com');
    });
  });

  // ==================== UPDATE MEMBERS TESTS ====================

  describe('update', () => {
    it('should update member details', async () => {
      const updateDto: UpdateMemberDto = {
        title: 'Senior Developer',
        departmentId: 'dept-456',
      };

      mockPrismaService.organizationMember.findUnique.mockResolvedValue(
        mockMember,
      );
      mockPrismaService.organization.findUnique.mockResolvedValue({
        id: mockOrgId,
        ownerId: 'different-owner',
      });
      mockPrismaService.organizationMember.update.mockResolvedValue({
        ...mockMember,
        ...updateDto,
      });

      const result = await service.update(
        mockOrgId,
        mockUserId,
        'current-user-456',
        updateDto,
      );

      expect(result.title).toBe('Senior Developer');
      expect(mockPrismaService.organizationMember.update).toHaveBeenCalled();
    });

    it('should allow owner to change their own role', async () => {
      const updateDto: UpdateMemberDto = {
        roleId: 'new-role-123',
      };

      mockPrismaService.organizationMember.findUnique.mockResolvedValue(
        mockMember,
      );
      mockPrismaService.organization.findUnique.mockResolvedValue({
        id: mockOrgId,
        ownerId: mockUserId,
      });
      mockPrismaService.organizationMember.update.mockResolvedValue({
        ...mockMember,
        roleId: updateDto.roleId,
      });

      await service.update(mockOrgId, mockUserId, mockUserId, updateDto);

      expect(mockPrismaService.organizationMember.update).toHaveBeenCalled();
    });

    it('should prevent non-owner from changing their own role', async () => {
      const updateDto: UpdateMemberDto = {
        roleId: 'new-role-123',
      };

      mockPrismaService.organizationMember.findUnique.mockResolvedValue(
        mockMember,
      );
      mockPrismaService.organization.findUnique.mockResolvedValue({
        id: mockOrgId,
        ownerId: 'different-owner',
      });

      await expect(
        service.update(mockOrgId, mockUserId, mockUserId, updateDto),
      ).rejects.toThrow(ForbiddenException);
      await expect(
        service.update(mockOrgId, mockUserId, mockUserId, updateDto),
      ).rejects.toThrow('Cannot change your own role');
    });

    it('should allow updating member without role change', async () => {
      const updateDto: UpdateMemberDto = {
        title: 'Team Lead',
        teamId: 'team-123',
      };

      mockPrismaService.organizationMember.findUnique.mockResolvedValue(
        mockMember,
      );
      mockPrismaService.organizationMember.update.mockResolvedValue({
        ...mockMember,
        ...updateDto,
      });

      await service.update(mockOrgId, mockUserId, mockUserId, updateDto);

      expect(mockPrismaService.organizationMember.update).toHaveBeenCalled();
    });
  });

  // ==================== REMOVE MEMBERS TESTS ====================

  describe('remove', () => {
    it('should remove member successfully', async () => {
      mockPrismaService.organizationMember.findUnique.mockResolvedValue(
        mockMember,
      );
      mockPrismaService.organization.findUnique.mockResolvedValue({
        id: mockOrgId,
        ownerId: 'different-owner',
      });
      mockPrismaService.organizationMember.update.mockResolvedValue({
        ...mockMember,
        status: 'REMOVED',
      });

      const result = await service.remove(
        mockOrgId,
        mockUserId,
        'current-user-456',
      );

      expect(result).toEqual({ success: true });
      expect(mockPrismaService.organizationMember.update).toHaveBeenCalledWith({
        where: {
          organizationId_userId: {
            organizationId: mockOrgId,
            userId: mockUserId,
          },
        },
        data: {
          status: 'REMOVED',
        },
      });
    });

    it('should prevent self-removal', async () => {
      await expect(
        service.remove(mockOrgId, mockUserId, mockUserId),
      ).rejects.toThrow(ForbiddenException);
      await expect(
        service.remove(mockOrgId, mockUserId, mockUserId),
      ).rejects.toThrow('Cannot remove yourself from organization');
    });

    it('should prevent owner removal', async () => {
      const ownerId = 'owner-123';

      mockPrismaService.organization.findUnique.mockResolvedValue({
        id: mockOrgId,
        ownerId,
      });

      await expect(
        service.remove(mockOrgId, ownerId, 'current-user-456'),
      ).rejects.toThrow(ForbiddenException);
      await expect(
        service.remove(mockOrgId, ownerId, 'current-user-456'),
      ).rejects.toThrow('Cannot remove organization owner');
    });

    it('should emit member.removed event', async () => {
      mockPrismaService.organizationMember.findUnique.mockResolvedValue(
        mockMember,
      );
      mockPrismaService.organization.findUnique.mockResolvedValue({
        id: mockOrgId,
        ownerId: 'different-owner',
      });
      mockPrismaService.organizationMember.update.mockResolvedValue({
        ...mockMember,
        status: 'REMOVED',
      });

      await service.remove(mockOrgId, mockUserId, 'current-user-456');

      expect(mockEventEmitter.emit).toHaveBeenCalledWith(
        'organization.member.removed',
        expect.objectContaining({
          organizationId: mockOrgId,
          userId: mockUserId,
          removedBy: 'current-user-456',
        }),
      );
    });

    it('should throw NotFoundException when removing non-existent member', async () => {
      mockPrismaService.organizationMember.findUnique.mockResolvedValue(null);

      await expect(
        service.remove(mockOrgId, 'non-existent', 'current-user-456'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ==================== PERMISSIONS TESTS ====================

  describe('getPermissions', () => {
    it('should return member permissions', async () => {
      const memberWithRole = {
        ...mockMember,
        role: {
          id: mockRoleId,
          name: 'Admin',
          permissions: ['org:read', 'org:update', 'members:invite'],
        },
      };

      mockPrismaService.organizationMember.findUnique.mockResolvedValue(
        memberWithRole,
      );

      const result = await service.getPermissions(mockOrgId, mockUserId);

      expect(result.roleId).toBe(mockRoleId);
      expect(result.roleName).toBe('Admin');
      expect(result.permissions).toEqual([
        'org:read',
        'org:update',
        'members:invite',
      ]);
    });

    it('should return empty permissions for non-member', async () => {
      mockPrismaService.organizationMember.findUnique.mockResolvedValue(null);

      const result = await service.getPermissions(mockOrgId, mockUserId);

      expect(result).toEqual({ permissions: [] });
    });

    it('should return empty permissions for inactive member', async () => {
      mockPrismaService.organizationMember.findUnique.mockResolvedValue({
        ...mockMember,
        status: 'REMOVED',
      });

      const result = await service.getPermissions(mockOrgId, mockUserId);

      expect(result).toEqual({ permissions: [] });
    });

    it('should handle member with no role', async () => {
      mockPrismaService.organizationMember.findUnique.mockResolvedValue({
        ...mockMember,
        role: null,
      });

      const result = await service.getPermissions(mockOrgId, mockUserId);

      expect(result.permissions).toEqual([]);
    });
  });

  // ==================== ROLE ASSIGNMENT TESTS ====================

  describe('role assignment', () => {
    it('should assign role during invitation', async () => {
      const inviteDto: InviteMemberDto = {
        email: 'newmember@example.com',
        roleId: 'role-admin',
      };

      mockPrismaService.organization.findUnique.mockResolvedValue(
        mockOrganization,
      );
      mockPrismaService.organizationMember.findFirst.mockResolvedValue(null);
      mockPrismaService.organizationInvitation.findFirst.mockResolvedValue(null);
      mockPrismaService.organizationInvitation.create.mockResolvedValue({
        id: 'invite-123',
        email: inviteDto.email,
        roleId: inviteDto.roleId,
        status: 'pending',
        expiresAt: new Date(),
        organization: {
          name: mockOrganization.name,
          slug: mockOrganization.slug,
        },
      });

      await service.invite(mockOrgId, mockInviterId, inviteDto);

      expect(mockPrismaService.organizationInvitation.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            roleId: 'role-admin',
          }),
        }),
      );
    });

    it('should change member role', async () => {
      const updateDto: UpdateMemberDto = {
        roleId: 'role-manager',
      };

      mockPrismaService.organizationMember.findUnique.mockResolvedValue(
        mockMember,
      );
      mockPrismaService.organization.findUnique.mockResolvedValue({
        id: mockOrgId,
        ownerId: 'different-owner',
      });
      mockPrismaService.organizationMember.update.mockResolvedValue({
        ...mockMember,
        roleId: 'role-manager',
      });

      await service.update(
        mockOrgId,
        mockUserId,
        'current-user-456',
        updateDto,
      );

      expect(mockPrismaService.organizationMember.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            roleId: 'role-manager',
          }),
        }),
      );
    });
  });

  // ==================== EDGE CASES ====================

  describe('edge cases', () => {
    it('should handle member with multiple team and department assignments', async () => {
      const complexMember = {
        ...mockMember,
        teamId: 'team-123',
        departmentId: 'dept-456',
        team: {
          id: 'team-123',
          name: 'Engineering',
        },
        department: {
          id: 'dept-456',
          name: 'Product Development',
        },
      };

      mockPrismaService.organizationMember.findUnique.mockResolvedValue(
        complexMember,
      );

      const result = await service.findOne(mockOrgId, mockUserId);

      expect(result.team).toBeDefined();
      expect(result.department).toBeDefined();
      expect(result.team.name).toBe('Engineering');
      expect(result.department.name).toBe('Product Development');
    });

    it('should handle invitation with all optional fields', async () => {
      const fullInviteDto: InviteMemberDto = {
        email: 'complete@example.com',
        roleId: mockRoleId,
        departmentId: 'dept-123',
        teamId: 'team-123',
        message: 'Welcome aboard!',
      };

      mockPrismaService.organization.findUnique.mockResolvedValue(
        mockOrganization,
      );
      mockPrismaService.organizationMember.findFirst.mockResolvedValue(null);
      mockPrismaService.organizationInvitation.findFirst.mockResolvedValue(null);
      mockPrismaService.organizationInvitation.create.mockResolvedValue({
        id: 'invite-123',
        ...fullInviteDto,
        status: 'pending',
        expiresAt: new Date(),
        organization: {
          name: mockOrganization.name,
          slug: mockOrganization.slug,
        },
      });

      const result = await service.invite(
        mockOrgId,
        mockInviterId,
        fullInviteDto,
      );

      expect(result.email).toBe(fullInviteDto.email);
    });

    it('should handle updating all member fields simultaneously', async () => {
      const fullUpdateDto: UpdateMemberDto = {
        roleId: 'new-role',
        departmentId: 'new-dept',
        teamId: 'new-team',
        title: 'New Title',
        status: 'ACTIVE',
      };

      mockPrismaService.organizationMember.findUnique.mockResolvedValue(
        mockMember,
      );
      mockPrismaService.organization.findUnique.mockResolvedValue({
        id: mockOrgId,
        ownerId: 'different-owner',
      });
      mockPrismaService.organizationMember.update.mockResolvedValue({
        ...mockMember,
        ...fullUpdateDto,
      });

      await service.update(
        mockOrgId,
        mockUserId,
        'current-user-456',
        fullUpdateDto,
      );

      expect(mockPrismaService.organizationMember.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: fullUpdateDto,
        }),
      );
    });
  });
});
