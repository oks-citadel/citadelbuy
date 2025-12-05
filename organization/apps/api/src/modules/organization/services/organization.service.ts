import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '@/common/prisma/prisma.service';
import { RedisService } from '@/common/redis/redis.service';
import {
  CreateOrganizationDto,
  UpdateOrganizationDto,
  OrganizationQueryDto,
} from '../dto';
import { OrganizationCreatedEvent } from '../events/organization-created.event';
import { Organization, Prisma } from '@prisma/client';

// Type for organization with count
type OrganizationWithCount = Organization & {
  _count: {
    members: number;
    teams: number;
    departments: number;
  };
};

@Injectable()
export class OrganizationService {
  private readonly CACHE_TTL = 300; // 5 minutes

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  // ==================== CREATE ====================

  async create(userId: string, dto: CreateOrganizationDto) {
    // Check if slug already exists
    const existingOrg = await this.prisma.organization.findUnique({
      where: { slug: dto.slug },
    });

    if (existingOrg) {
      throw new ConflictException('Organization slug already exists');
    }

    // Create organization and owner membership in transaction
    const result = await this.prisma.$transaction(async (tx) => {
      // Create organization
      const organization = await tx.organization.create({
        data: {
          name: dto.name,
          slug: dto.slug,
          type: dto.type || 'SMALL_BUSINESS',
          legalName: dto.legalName,
          registrationNumber: dto.registrationNumber,
          taxId: dto.taxId,
          industry: dto.industry,
          website: dto.website,
          primaryEmail: dto.primaryEmail,
          primaryPhone: dto.primaryPhone,
          address: dto.address as any,
          logoUrl: dto.logoUrl,
          bannerUrl: dto.bannerUrl,
          primaryColor: dto.primaryColor,
          description: dto.description,
          ownerId: userId,
          status: 'PENDING_VERIFICATION',
        },
      });

      // Get or create owner role
      let ownerRole = await tx.organizationRole.findFirst({
        where: {
          organizationId: null,
          name: 'Owner',
          isSystem: true,
        },
      });

      if (!ownerRole) {
        ownerRole = await tx.organizationRole.create({
          data: {
            name: 'Owner',
            description: 'Full access to all organization features',
            isSystem: true,
            permissions: [
              'org:read', 'org:update', 'org:delete', 'org:billing',
              'members:read', 'members:invite', 'members:remove', 'members:manage_roles',
              'teams:read', 'teams:create', 'teams:update', 'teams:delete',
              'products:read', 'products:create', 'products:update', 'products:delete', 'products:publish',
              'orders:read', 'orders:update', 'orders:fulfill', 'orders:refund',
              'analytics:read', 'analytics:export',
              'settings:read', 'settings:update',
            ],
          },
        });
      }

      // Add owner as first member
      await tx.organizationMember.create({
        data: {
          organizationId: organization.id,
          userId: userId,
          roleId: ownerRole.id,
          status: 'ACTIVE',
          title: 'Owner',
        },
      });

      return organization;
    });

    // Emit event
    this.eventEmitter.emit(
      'organization.created',
      new OrganizationCreatedEvent(result.id, userId),
    );

    return result;
  }

  // ==================== READ ====================

  async findOne(idOrSlug: string) {
    // Try cache first
    const cacheKey = `org:${idOrSlug}`;
    const cached = await this.redis.get<OrganizationWithCount>(cacheKey);
    if (cached) {
      return cached;
    }

    // Query by ID or slug
    const organization = await this.prisma.organization.findFirst({
      where: {
        OR: [
          { id: idOrSlug },
          { slug: idOrSlug },
        ],
        deletedAt: null,
      },
      include: {
        _count: {
          select: {
            members: true,
            teams: true,
            departments: true,
          },
        },
      },
    });

    if (!organization) {
      throw new NotFoundException('Organization not found');
    }

    // Cache result
    await this.redis.set(cacheKey, JSON.stringify(organization), this.CACHE_TTL);

    return organization;
  }

  async findAllForUser(userId: string, query: OrganizationQueryDto) {
    const where: any = {
      members: {
        some: {
          userId,
          status: 'ACTIVE',
        },
      },
      deletedAt: null,
    };

    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { slug: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    if (query.status) {
      where.status = query.status;
    }

    const [organizations, total] = await Promise.all([
      this.prisma.organization.findMany({
        where,
        take: query.limit,
        skip: query.offset,
        orderBy: { createdAt: 'desc' },
        include: {
          _count: {
            select: {
              members: true,
              teams: true,
            },
          },
        },
      }),
      this.prisma.organization.count({ where }),
    ]);

    return {
      data: organizations,
      total,
      limit: query.limit,
      offset: query.offset,
    };
  }

  async getDashboard(orgId: string) {
    const organization = await this.findOne(orgId);

    // Get various stats
    const [memberCount, teamCount, pendingInvites] = await Promise.all([
      this.prisma.organizationMember.count({
        where: { organizationId: organization.id, status: 'ACTIVE' },
      }),
      this.prisma.team.count({
        where: { organizationId: organization.id },
      }),
      this.prisma.organizationInvitation.count({
        where: { organizationId: organization.id, status: 'pending' },
      }),
    ]);

    // Get recent activity
    const recentActivity = await this.prisma.organizationAuditLog.findMany({
      where: { organizationId: organization.id },
      take: 10,
      orderBy: { createdAt: 'desc' },
    });

    return {
      organization: {
        id: organization.id,
        name: organization.name,
        slug: organization.slug,
        status: organization.status,
        logoUrl: organization.logoUrl,
      },
      stats: {
        members: memberCount,
        teams: teamCount,
        pendingInvites,
      },
      recentActivity,
    };
  }

  // ==================== UPDATE ====================

  async update(id: string, dto: UpdateOrganizationDto) {
    const organization = await this.findOne(id);

    const updated = await this.prisma.organization.update({
      where: { id: organization.id },
      data: {
        name: dto.name,
        type: dto.type,
        legalName: dto.legalName,
        registrationNumber: dto.registrationNumber,
        taxId: dto.taxId,
        industry: dto.industry,
        website: dto.website,
        primaryEmail: dto.primaryEmail,
        primaryPhone: dto.primaryPhone,
        address: dto.address as any,
        logoUrl: dto.logoUrl,
        bannerUrl: dto.bannerUrl,
        primaryColor: dto.primaryColor,
        description: dto.description,
      },
    });

    // Invalidate cache
    await this.invalidateCache(organization.id, organization.slug);

    return updated;
  }

  // ==================== DELETE ====================

  async softDelete(id: string) {
    const organization = await this.findOne(id);

    await this.prisma.organization.update({
      where: { id: organization.id },
      data: { deletedAt: new Date() },
    });

    // Invalidate cache
    await this.invalidateCache(organization.id, organization.slug);

    return { success: true };
  }

  // ==================== SETTINGS ====================

  async getSettings(id: string) {
    const organization = await this.findOne(id);
    return organization.settings || {};
  }

  async updateSettings(id: string, settings: Record<string, any>) {
    const organization = await this.findOne(id);

    const currentSettings = (organization.settings as Record<string, any>) || {};
    const newSettings = { ...currentSettings, ...settings };

    await this.prisma.organization.update({
      where: { id: organization.id },
      data: { settings: newSettings },
    });

    // Invalidate cache
    await this.invalidateCache(organization.id, organization.slug);

    return newSettings;
  }

  // ==================== HELPERS ====================

  private async invalidateCache(id: string, slug: string) {
    await Promise.all([
      this.redis.del(`org:${id}`),
      this.redis.del(`org:${slug}`),
    ]);
  }

  async isMember(orgId: string, userId: string): Promise<boolean> {
    const member = await this.prisma.organizationMember.findUnique({
      where: {
        organizationId_userId: {
          organizationId: orgId,
          userId,
        },
      },
    });
    return !!member && member.status === 'ACTIVE';
  }

  async isOwner(orgId: string, userId: string): Promise<boolean> {
    const org = await this.prisma.organization.findUnique({
      where: { id: orgId },
      select: { ownerId: true },
    });
    return org?.ownerId === userId;
  }
}
