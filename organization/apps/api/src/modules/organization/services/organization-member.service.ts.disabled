import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '@/common/prisma/prisma.service';
import { EmailService } from '../../email/email.service';
import {
  InviteMemberDto,
  BulkInviteMembersDto,
  UpdateMemberDto,
  MemberQueryDto,
} from '../dto';
import { MemberJoinedEvent, MemberRemovedEvent } from '../events';
import * as crypto from 'crypto';

@Injectable()
export class OrganizationMemberService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
    private readonly emailService: EmailService,
    private readonly configService: ConfigService,
  ) {}

  // ==================== LIST MEMBERS ====================

  async findAll(orgId: string, query: MemberQueryDto) {
    const where: any = {
      organizationId: orgId,
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

    const [members, total] = await Promise.all([
      this.prisma.organizationMember.findMany({
        where,
        take: query.limit,
        skip: query.offset,
        orderBy: { joinedAt: 'desc' },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          role: {
            select: {
              id: true,
              name: true,
            },
          },
          team: {
            select: {
              id: true,
              name: true,
            },
          },
          department: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      }),
      this.prisma.organizationMember.count({ where }),
    ]);

    return {
      data: members,
      total,
      limit: query.limit,
      offset: query.offset,
    };
  }

  async findOne(orgId: string, userId: string) {
    const member = await this.prisma.organizationMember.findUnique({
      where: {
        organizationId_userId: {
          organizationId: orgId,
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

  async invite(orgId: string, invitedById: string, dto: InviteMemberDto) {
    // Check if organization exists
    const org = await this.prisma.organization.findUnique({
      where: { id: orgId },
      include: { _count: { select: { members: true } } },
    });

    if (!org) {
      throw new NotFoundException('Organization not found');
    }

    // Check member limit
    if (org._count.members >= org.maxTeamMembers) {
      throw new BadRequestException('Maximum team members limit reached');
    }

    // Check if user is already a member
    const existingMember = await this.prisma.organizationMember.findFirst({
      where: {
        organizationId: orgId,
        user: { email: dto.email },
      },
    });

    if (existingMember) {
      throw new ConflictException('User is already a member of this organization');
    }

    // Check for existing pending invitation
    const existingInvite = await this.prisma.organizationInvitation.findFirst({
      where: {
        organizationId: orgId,
        email: dto.email,
        status: 'pending',
      },
    });

    if (existingInvite) {
      throw new ConflictException('Invitation already pending for this email');
    }

    // Create invitation
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days expiry

    const invitation = await this.prisma.organizationInvitation.create({
      data: {
        organizationId: orgId,
        email: dto.email,
        roleId: dto.roleId,
        departmentId: dto.departmentId,
        teamId: dto.teamId,
        token,
        invitedById,
        message: dto.message,
        expiresAt,
      },
      include: {
        organization: {
          select: {
            name: true,
            slug: true,
          },
        },
        invitedBy: {
          select: {
            name: true,
            email: true,
          },
        },
      },
    });

    // Send invitation email via email service
    try {
      const frontendUrl = this.configService.get<string>('FRONTEND_URL') || 'http://localhost:3000';
      const invitationUrl = `${frontendUrl}/organizations/invite/${token}`;

      await this.emailService.sendEmail({
        to: dto.email,
        subject: `You've been invited to join ${invitation.organization.name} on CitadelBuy`,
        template: 'organization-invitation',
        context: {
          organizationName: invitation.organization.name,
          inviterName: invitation.invitedBy.name,
          invitationUrl,
          message: dto.message,
          expiresAt: invitation.expiresAt,
        },
      });
    } catch (error) {
      // Log error but don't fail the invitation creation
      // Email error logged by EmailService
    }

    return {
      id: invitation.id,
      email: invitation.email,
      status: invitation.status,
      expiresAt: invitation.expiresAt,
      organization: invitation.organization,
    };
  }

  async bulkInvite(orgId: string, invitedById: string, dto: BulkInviteMembersDto) {
    const results = await Promise.allSettled(
      dto.invitations.map((invite) => this.invite(orgId, invitedById, invite)),
    );

    const successful = results
      .filter((r) => r.status === 'fulfilled')
      .map((r: any) => r.value);

    const failed = results
      .filter((r) => r.status === 'rejected')
      .map((r: any, i) => ({
        email: dto.invitations[i].email,
        error: r.reason.message,
      }));

    return {
      successful,
      failed,
      summary: {
        total: dto.invitations.length,
        successCount: successful.length,
        failedCount: failed.length,
      },
    };
  }

  // ==================== UPDATE MEMBERS ====================

  async update(orgId: string, userId: string, currentUserId: string, dto: UpdateMemberDto) {
    const member = await this.findOne(orgId, userId);

    // Cannot change own role (except owner)
    if (userId === currentUserId && dto.roleId) {
      const isOwner = await this.isOwner(orgId, currentUserId);
      if (!isOwner) {
        throw new ForbiddenException('Cannot change your own role');
      }
    }

    const updated = await this.prisma.organizationMember.update({
      where: {
        organizationId_userId: {
          organizationId: orgId,
          userId,
        },
      },
      data: {
        roleId: dto.roleId,
        departmentId: dto.departmentId,
        teamId: dto.teamId,
        title: dto.title,
        status: dto.status,
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
      },
    });

    return updated;
  }

  // ==================== REMOVE MEMBERS ====================

  async remove(orgId: string, userId: string, currentUserId: string) {
    // Cannot remove yourself
    if (userId === currentUserId) {
      throw new ForbiddenException('Cannot remove yourself from organization');
    }

    // Cannot remove owner
    const isOwner = await this.isOwner(orgId, userId);
    if (isOwner) {
      throw new ForbiddenException('Cannot remove organization owner');
    }

    // Check member exists
    await this.findOne(orgId, userId);

    // Soft delete by setting status
    await this.prisma.organizationMember.update({
      where: {
        organizationId_userId: {
          organizationId: orgId,
          userId,
        },
      },
      data: {
        status: 'REMOVED',
      },
    });

    // Emit event
    this.eventEmitter.emit(
      'organization.member.removed',
      new MemberRemovedEvent(orgId, userId, currentUserId),
    );

    return { success: true };
  }

  // ==================== PERMISSIONS ====================

  async getPermissions(orgId: string, userId: string) {
    const member = await this.prisma.organizationMember.findUnique({
      where: {
        organizationId_userId: {
          organizationId: orgId,
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

    return {
      roleId: member.roleId,
      roleName: member.role?.name,
      permissions: member.role?.permissions || [],
    };
  }

  // ==================== HELPERS ====================

  private async isOwner(orgId: string, userId: string): Promise<boolean> {
    const org = await this.prisma.organization.findUnique({
      where: { id: orgId },
      select: { ownerId: true },
    });
    return org?.ownerId === userId;
  }
}
