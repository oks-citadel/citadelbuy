import * as crypto from 'crypto';
import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '@/common/prisma/prisma.service';
import {
  InviteMemberDto,
  BulkInviteMembersDto,
  UpdateMemberDto,
  MemberQueryDto,
} from '../dto';

@Injectable()
export class OrganizationMemberService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  // ==================== LIST MEMBERS ====================

  async findAll(organizationId: string, query: MemberQueryDto) {
    const where: any = {
      organizationId,
      status: { not: 'REMOVED' },
    };

    if (query.search) {
      where.user = {
        OR: [
          { name: { contains: query.search, mode: 'insensitive' } },
          { email: { contains: query.search, mode: 'insensitive' } },
        ],
      };
    }

    if (query.roleId) {
      where.roleId = query.roleId;
    }

    if (query.teamId) {
      where.teamId = query.teamId;
    }

    if (query.departmentId) {
      where.departmentId = query.departmentId;
    }

    const [data, total] = await Promise.all([
      this.prisma.organizationMember.findMany({
        where,
        take: query.limit,
        skip: query.offset,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          role: true,
          team: true,
          department: true,
        },
      }),
      this.prisma.organizationMember.count({ where }),
    ]);

    return {
      data,
      total,
      limit: query.limit,
      offset: query.offset,
    };
  }

  async findOne(organizationId: string, userId: string) {
    const member = await this.prisma.organizationMember.findUnique({
      where: {
        organizationId_userId: {
          organizationId,
          userId,
        },
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        role: true,
        team: true,
        department: true,
      },
    });

    if (!member) {
      throw new NotFoundException('Member not found');
    }

    return member;
  }

  // ==================== INVITE MEMBERS ====================

  async invite(
    organizationId: string,
    inviterId: string,
    dto: InviteMemberDto,
  ) {
    // Check if organization exists and get member count
    const organization = await this.prisma.organization.findUnique({
      where: { id: organizationId },
      include: {
        _count: {
          select: { members: true },
        },
      },
    });

    if (!organization) {
      throw new NotFoundException('Organization not found');
    }

    // Check member limit
    if (
      organization.maxTeamMembers &&
      organization._count.members >= organization.maxTeamMembers
    ) {
      throw new BadRequestException('Maximum team members limit reached');
    }

    // Check if user is already a member
    const existingMember = await this.prisma.organizationMember.findFirst({
      where: {
        organizationId,
        user: {
          email: dto.email,
        },
      },
    });

    if (existingMember) {
      throw new ConflictException(
        'User is already a member of this organization',
      );
    }

    // Check for pending invitation
    const existingInvite = await this.prisma.organizationInvitation.findFirst({
      where: {
        organizationId,
        email: dto.email,
        status: 'pending',
      },
    });

    if (existingInvite) {
      throw new ConflictException('Invitation already pending for this email');
    }

    // Create invitation with 7-day expiry
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    // Generate unique invitation token
    const token = crypto.randomUUID();

    const invitation = await this.prisma.organizationInvitation.create({
      data: {
        organizationId,
        email: dto.email,
        roleId: dto.roleId || null,
        invitedById: inviterId,
        departmentId: dto.departmentId || null,
        teamId: dto.teamId || null,
        message: dto.message || null,
        token,
        status: 'pending',
        expiresAt,
      },
      include: {
        organization: {
          select: {
            name: true,
            slug: true,
          },
        },
      },
    });

    return invitation;
  }

  async bulkInvite(
    organizationId: string,
    inviterId: string,
    dto: BulkInviteMembersDto,
  ) {
    const successful: any[] = [];
    const failed: { email: string; reason: string }[] = [];

    for (const invitation of dto.invitations) {
      try {
        const result = await this.invite(organizationId, inviterId, invitation);
        successful.push(result);
      } catch (error) {
        failed.push({
          email: invitation.email,
          reason: error.message,
        });
      }
    }

    return {
      summary: {
        total: dto.invitations.length,
        successCount: successful.length,
        failedCount: failed.length,
      },
      successful,
      failed,
    };
  }

  // ==================== UPDATE MEMBERS ====================

  async update(
    organizationId: string,
    userId: string,
    currentUserId: string,
    dto: UpdateMemberDto,
  ) {
    // Check if member exists
    const member = await this.prisma.organizationMember.findUnique({
      where: {
        organizationId_userId: {
          organizationId,
          userId,
        },
      },
    });

    if (!member) {
      throw new NotFoundException('Member not found');
    }

    // If changing role and it's the current user
    if (dto.roleId && userId === currentUserId) {
      // Check if current user is the owner
      const organization = await this.prisma.organization.findUnique({
        where: { id: organizationId },
        select: { ownerId: true },
      });

      if (organization?.ownerId !== currentUserId) {
        throw new ForbiddenException('Cannot change your own role');
      }
    }

    const updated = await this.prisma.organizationMember.update({
      where: {
        organizationId_userId: {
          organizationId,
          userId,
        },
      },
      data: dto,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        role: true,
        team: true,
        department: true,
      },
    });

    return updated;
  }

  // ==================== REMOVE MEMBERS ====================

  async remove(
    organizationId: string,
    userId: string,
    currentUserId: string,
  ) {
    // Prevent self-removal
    if (userId === currentUserId) {
      throw new ForbiddenException('Cannot remove yourself from organization');
    }

    // Check if trying to remove owner
    const organization = await this.prisma.organization.findUnique({
      where: { id: organizationId },
      select: { ownerId: true },
    });

    if (organization?.ownerId === userId) {
      throw new ForbiddenException('Cannot remove organization owner');
    }

    // Check if member exists
    const member = await this.prisma.organizationMember.findUnique({
      where: {
        organizationId_userId: {
          organizationId,
          userId,
        },
      },
    });

    if (!member) {
      throw new NotFoundException('Member not found');
    }

    // Soft delete by setting status to REMOVED
    await this.prisma.organizationMember.update({
      where: {
        organizationId_userId: {
          organizationId,
          userId,
        },
      },
      data: {
        status: 'REMOVED',
      },
    });

    // Emit event
    this.eventEmitter.emit('organization.member.removed', {
      organizationId,
      userId,
      removedBy: currentUserId,
    });

    return { success: true };
  }

  // ==================== PERMISSIONS ====================

  async getPermissions(organizationId: string, userId: string) {
    const member = await this.prisma.organizationMember.findUnique({
      where: {
        organizationId_userId: {
          organizationId,
          userId,
        },
      },
      include: {
        role: true,
      },
    });

    if (!member || member.status !== 'ACTIVE') {
      return { permissions: [] };
    }

    if (!member.role) {
      return { permissions: [] };
    }

    return {
      roleId: member.role.id,
      roleName: member.role.name,
      permissions: member.role.permissions || [],
    };
  }
}
