import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';
import { CreateTeamDto, UpdateTeamDto } from '../dto';

@Injectable()
export class OrganizationTeamService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(orgId: string) {
    const teams = await this.prisma.team.findMany({
      where: { organizationId: orgId },
      orderBy: { name: 'asc' },
      include: {
        department: {
          select: {
            id: true,
            name: true,
          },
        },
        _count: {
          select: {
            members: true,
          },
        },
      },
    });

    return teams;
  }

  async findOne(orgId: string, teamId: string) {
    const team = await this.prisma.team.findFirst({
      where: {
        id: teamId,
        organizationId: orgId,
      },
      include: {
        department: true,
        members: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
      },
    });

    if (!team) {
      throw new NotFoundException('Team not found');
    }

    return team;
  }

  async create(orgId: string, dto: CreateTeamDto) {
    // Check for duplicate name
    const existing = await this.prisma.team.findFirst({
      where: {
        organizationId: orgId,
        name: dto.name,
      },
    });

    if (existing) {
      throw new ConflictException('Team with this name already exists');
    }

    const team = await this.prisma.team.create({
      data: {
        organizationId: orgId,
        name: dto.name,
        description: dto.description,
        departmentId: dto.departmentId,
        leadId: dto.leadId,
      },
    });

    return team;
  }

  async update(orgId: string, teamId: string, dto: UpdateTeamDto) {
    await this.findOne(orgId, teamId);

    // Check for duplicate name if changing
    if (dto.name) {
      const existing = await this.prisma.team.findFirst({
        where: {
          organizationId: orgId,
          name: dto.name,
          id: { not: teamId },
        },
      });

      if (existing) {
        throw new ConflictException('Team with this name already exists');
      }
    }

    const updated = await this.prisma.team.update({
      where: { id: teamId },
      data: {
        name: dto.name,
        description: dto.description,
        departmentId: dto.departmentId,
        leadId: dto.leadId,
      },
    });

    return updated;
  }

  async remove(orgId: string, teamId: string) {
    await this.findOne(orgId, teamId);

    // Remove team members' team assignment first
    await this.prisma.organizationMember.updateMany({
      where: { teamId },
      data: { teamId: null },
    });

    await this.prisma.team.delete({
      where: { id: teamId },
    });

    return { success: true };
  }

  async getMembers(orgId: string, teamId: string) {
    await this.findOne(orgId, teamId);

    const members = await this.prisma.organizationMember.findMany({
      where: {
        organizationId: orgId,
        teamId,
        status: 'ACTIVE',
      },
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
      },
    });

    return members;
  }

  async addMembers(orgId: string, teamId: string, memberIds: string[]) {
    await this.findOne(orgId, teamId);

    // Validate that all members exist in the organization
    const members = await this.prisma.organizationMember.findMany({
      where: {
        organizationId: orgId,
        id: { in: memberIds },
        status: 'ACTIVE',
      },
    });

    if (members.length !== memberIds.length) {
      throw new NotFoundException('One or more members not found');
    }

    // Update members to assign them to the team
    await this.prisma.organizationMember.updateMany({
      where: {
        id: { in: memberIds },
        organizationId: orgId,
      },
      data: {
        teamId,
      },
    });

    return {
      success: true,
      addedCount: memberIds.length,
    };
  }

  async removeMember(orgId: string, teamId: string, memberId: string) {
    await this.findOne(orgId, teamId);

    // Verify member is in this team
    const member = await this.prisma.organizationMember.findFirst({
      where: {
        id: memberId,
        organizationId: orgId,
        teamId,
      },
    });

    if (!member) {
      throw new NotFoundException('Member not found in this team');
    }

    // Remove team assignment
    await this.prisma.organizationMember.update({
      where: { id: memberId },
      data: { teamId: null },
    });

    return { success: true };
  }
}
