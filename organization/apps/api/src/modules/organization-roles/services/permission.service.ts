import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';
import { RedisService } from '@/common/redis/redis.service';

@Injectable()
export class PermissionService {
  private readonly CACHE_TTL = 30; // 30 seconds for permission cache

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  /**
   * Check if a user has all the required permissions in an organization
   */
  async checkPermissions(
    userId: string,
    organizationId: string,
    requiredPermissions: string[],
  ): Promise<boolean> {
    const userPermissions = await this.getUserPermissions(userId, organizationId);

    // Check if user has all required permissions
    return requiredPermissions.every((permission) =>
      userPermissions.includes(permission),
    );
  }

  /**
   * Check if a user has any of the specified permissions
   */
  async hasAnyPermission(
    userId: string,
    organizationId: string,
    permissions: string[],
  ): Promise<boolean> {
    const userPermissions = await this.getUserPermissions(userId, organizationId);
    return permissions.some((permission) => userPermissions.includes(permission));
  }

  /**
   * Get all permissions for a user in an organization
   */
  async getUserPermissions(userId: string, organizationId: string): Promise<string[]> {
    // Try cache first
    const cacheKey = `perms:${organizationId}:${userId}`;
    const cached = await this.redis.get<string[]>(cacheKey);
    if (cached) {
      return cached;
    }

    // Get member with role
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

    // No membership = no permissions
    if (!member || member.status !== 'ACTIVE') {
      return [];
    }

    // Get permissions from role
    const permissions = member.role?.permissions || [];

    // Cache result
    await this.redis.set(cacheKey, permissions, this.CACHE_TTL);

    return permissions;
  }

  /**
   * Get organization by ID or slug
   */
  async getOrganization(idOrSlug: string) {
    const organization = await this.prisma.organization.findFirst({
      where: {
        OR: [{ id: idOrSlug }, { slug: idOrSlug }],
        deletedAt: null,
      },
    });

    if (!organization) {
      throw new NotFoundException('Organization not found');
    }

    return organization;
  }

  /**
   * Invalidate permission cache for a user in an organization
   */
  async invalidateCache(userId: string, organizationId: string): Promise<void> {
    const cacheKey = `perms:${organizationId}:${userId}`;
    await this.redis.del(cacheKey);
  }

  /**
   * Invalidate all permission caches for an organization
   */
  async invalidateOrgCache(organizationId: string): Promise<void> {
    const pattern = `perms:${organizationId}:*`;
    const keys = await this.redis.keys(pattern);
    if (keys.length > 0) {
      await Promise.all(keys.map((key) => this.redis.del(key)));
    }
  }

  /**
   * Get all available permissions in the system
   */
  async getAllPermissions() {
    return this.prisma.permission.findMany({
      orderBy: [{ category: 'asc' }, { name: 'asc' }],
    });
  }

  /**
   * Get permissions grouped by category
   */
  async getPermissionsByCategory() {
    const permissions = await this.getAllPermissions();

    const grouped: Record<string, any[]> = {};
    for (const permission of permissions) {
      if (!grouped[permission.category]) {
        grouped[permission.category] = [];
      }
      grouped[permission.category].push(permission);
    }

    return grouped;
  }
}
