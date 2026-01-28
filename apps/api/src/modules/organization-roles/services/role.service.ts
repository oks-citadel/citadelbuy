import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';
import { PermissionService } from './permission.service';
import { CreateRoleDto, UpdateRoleDto } from '../dto';

@Injectable()
export class RoleService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly permissionService: PermissionService,
  ) {}

  /**
   * Get all roles for an organization (including system roles)
   */
  async findAll(organizationId: string) {
    const roles = await this.prisma.organizationRole.findMany({
      where: {
        OR: [
          { organizationId },
          { organizationId: null, isSystem: true },
        ],
      },
      orderBy: [{ isSystem: 'desc' }, { name: 'asc' }],
    });

    return roles;
  }

  /**
   * Get a specific role
   */
  async findOne(organizationId: string, roleId: string) {
    const role = await this.prisma.organizationRole.findFirst({
      where: {
        id: roleId,
        OR: [
          { organizationId },
          { organizationId: null, isSystem: true },
        ],
      },
      include: {
        _count: {
          select: {
            members: {
              where: { organizationId },
            },
          },
        },
      },
    });

    if (!role) {
      throw new NotFoundException('Role not found');
    }

    return role;
  }

  /**
   * Create a custom role for an organization
   */
  async create(organizationId: string, dto: CreateRoleDto) {
    // Check for duplicate name
    const existing = await this.prisma.organizationRole.findFirst({
      where: {
        organizationId,
        name: dto.name,
      },
    });

    if (existing) {
      throw new ConflictException('Role with this name already exists');
    }

    // Validate permissions
    const allPermissions = await this.permissionService.getAllPermissions();
    const validCodes = allPermissions.map((p) => p.code);

    for (const permission of dto.permissions) {
      if (!validCodes.includes(permission)) {
        throw new BadRequestException(`Invalid permission: ${permission}`);
      }
    }

    const role = await this.prisma.organizationRole.create({
      data: {
        organizationId,
        name: dto.name,
        description: dto.description,
        permissions: dto.permissions,
        isSystem: false,
        isDefault: dto.isDefault || false,
      },
    });

    // If this is set as default, unset other defaults
    if (dto.isDefault) {
      await this.prisma.organizationRole.updateMany({
        where: {
          organizationId,
          id: { not: role.id },
          isDefault: true,
        },
        data: { isDefault: false },
      });
    }

    return role;
  }

  /**
   * Update a custom role
   */
  async update(organizationId: string, roleId: string, dto: UpdateRoleDto) {
    const role = await this.findOne(organizationId, roleId);

    // Cannot update system roles
    if (role.isSystem) {
      throw new BadRequestException('Cannot modify system roles');
    }

    // Check for duplicate name if changing
    if (dto.name && dto.name !== role.name) {
      const existing = await this.prisma.organizationRole.findFirst({
        where: {
          organizationId,
          name: dto.name,
          id: { not: roleId },
        },
      });

      if (existing) {
        throw new ConflictException('Role with this name already exists');
      }
    }

    // Validate permissions if changing
    if (dto.permissions) {
      const allPermissions = await this.permissionService.getAllPermissions();
      const validCodes = allPermissions.map((p) => p.code);

      for (const permission of dto.permissions) {
        if (!validCodes.includes(permission)) {
          throw new BadRequestException(`Invalid permission: ${permission}`);
        }
      }
    }

    const updated = await this.prisma.organizationRole.update({
      where: { id: roleId },
      data: {
        name: dto.name,
        description: dto.description,
        permissions: dto.permissions,
        isDefault: dto.isDefault,
      },
    });

    // If this is set as default, unset other defaults
    if (dto.isDefault) {
      await this.prisma.organizationRole.updateMany({
        where: {
          organizationId,
          id: { not: roleId },
          isDefault: true,
        },
        data: { isDefault: false },
      });
    }

    // Invalidate permission cache for all members with this role
    await this.permissionService.invalidateOrgCache(organizationId);

    return updated;
  }

  /**
   * Delete a custom role
   */
  async remove(organizationId: string, roleId: string) {
    const role = await this.findOne(organizationId, roleId);

    // Cannot delete system roles
    if (role.isSystem) {
      throw new BadRequestException('Cannot delete system roles');
    }

    // Check if role is in use
    const memberCount = await this.prisma.organizationMember.count({
      where: {
        organizationId,
        roleId,
      },
    });

    if (memberCount > 0) {
      throw new BadRequestException(
        `Cannot delete role: ${memberCount} members are assigned to this role`,
      );
    }

    await this.prisma.organizationRole.delete({
      where: { id: roleId },
    });

    return { success: true };
  }

  /**
   * Get members with a specific role
   */
  async getRoleMembers(organizationId: string, roleId: string) {
    await this.findOne(organizationId, roleId);

    const members = await this.prisma.organizationMember.findMany({
      where: {
        organizationId,
        roleId,
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
      },
    });

    return members;
  }

  /**
   * Get system roles
   */
  async getSystemRoles() {
    return this.prisma.organizationRole.findMany({
      where: {
        organizationId: null,
        isSystem: true,
      },
      orderBy: { name: 'asc' },
    });
  }
}
