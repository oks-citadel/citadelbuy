import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';
import { CreateDepartmentDto, UpdateDepartmentDto } from '../dto';

@Injectable()
export class OrganizationDepartmentService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(orgId: string) {
    const departments = await this.prisma.department.findMany({
      where: { organizationId: orgId },
      orderBy: [{ level: 'asc' }, { name: 'asc' }],
      include: {
        parent: {
          select: {
            id: true,
            name: true,
          },
        },
        _count: {
          select: {
            children: true,
            members: true,
            teams: true,
          },
        },
      },
    });

    return departments;
  }

  async getTree(orgId: string) {
    const departments = await this.prisma.department.findMany({
      where: { organizationId: orgId },
      orderBy: [{ level: 'asc' }, { name: 'asc' }],
      include: {
        _count: {
          select: {
            members: true,
            teams: true,
          },
        },
      },
    });

    // Build tree structure
    const buildTree = (parentId: string | null): any[] => {
      return departments
        .filter((d) => d.parentId === parentId)
        .map((dept) => ({
          id: dept.id,
          name: dept.name,
          description: dept.description,
          level: dept.level,
          memberCount: dept._count.members,
          teamCount: dept._count.teams,
          children: buildTree(dept.id),
        }));
    };

    return buildTree(null);
  }

  async findOne(orgId: string, deptId: string) {
    const department = await this.prisma.department.findFirst({
      where: {
        id: deptId,
        organizationId: orgId,
      },
      include: {
        parent: true,
        children: true,
        teams: true,
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

    if (!department) {
      throw new NotFoundException('Department not found');
    }

    return department;
  }

  async create(orgId: string, dto: CreateDepartmentDto) {
    // Check for duplicate name at same level
    const existing = await this.prisma.department.findFirst({
      where: {
        organizationId: orgId,
        name: dto.name,
        parentId: dto.parentId || null,
      },
    });

    if (existing) {
      throw new ConflictException('Department with this name already exists at this level');
    }

    // Calculate level
    let level = 0;
    if (dto.parentId) {
      const parent = await this.prisma.department.findUnique({
        where: { id: dto.parentId },
      });
      if (!parent || parent.organizationId !== orgId) {
        throw new BadRequestException('Invalid parent department');
      }
      level = parent.level + 1;
    }

    const department = await this.prisma.department.create({
      data: {
        organizationId: orgId,
        name: dto.name,
        description: dto.description,
        parentId: dto.parentId,
        headId: dto.headId,
        level,
      },
    });

    return department;
  }

  async update(orgId: string, deptId: string, dto: UpdateDepartmentDto) {
    const department = await this.findOne(orgId, deptId);

    // Prevent circular reference
    if (dto.parentId === deptId) {
      throw new BadRequestException('Department cannot be its own parent');
    }

    // Check for duplicate name if changing
    if (dto.name) {
      const existing = await this.prisma.department.findFirst({
        where: {
          organizationId: orgId,
          name: dto.name,
          parentId: dto.parentId ?? department.parentId,
          id: { not: deptId },
        },
      });

      if (existing) {
        throw new ConflictException('Department with this name already exists at this level');
      }
    }

    // Recalculate level if parent changes
    let level = department.level;
    if (dto.parentId !== undefined) {
      if (dto.parentId === null) {
        level = 0;
      } else {
        const parent = await this.prisma.department.findUnique({
          where: { id: dto.parentId },
        });
        if (!parent || parent.organizationId !== orgId) {
          throw new BadRequestException('Invalid parent department');
        }
        level = parent.level + 1;
      }
    }

    const updated = await this.prisma.department.update({
      where: { id: deptId },
      data: {
        name: dto.name,
        description: dto.description,
        parentId: dto.parentId,
        headId: dto.headId,
        level,
      },
    });

    return updated;
  }

  async remove(orgId: string, deptId: string) {
    const department = await this.findOne(orgId, deptId);

    // Check for children
    if (department.children.length > 0) {
      throw new BadRequestException('Cannot delete department with child departments');
    }

    // Remove department assignments from members
    await this.prisma.organizationMember.updateMany({
      where: { departmentId: deptId },
      data: { departmentId: null },
    });

    // Remove team assignments
    await this.prisma.team.updateMany({
      where: { departmentId: deptId },
      data: { departmentId: null },
    });

    await this.prisma.department.delete({
      where: { id: deptId },
    });

    return { success: true };
  }
}
