import {
  Injectable,
  NotFoundException,
  BadRequestException,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';
import { AuditService } from '../../organization-audit/services/audit.service';
import * as crypto from 'crypto';
import * as bcrypt from 'bcryptjs';

export interface CreateApiKeyDto {
  name: string;
  permissions: string[];
  expiresInDays?: number;
}

export interface ApiKeyInfo {
  id: string;
  name: string;
  keyPrefix: string;
  permissions: string[];
  createdAt: Date;
  expiresAt: Date | null;
  lastUsedAt: Date | null;
  isActive: boolean;
}

export interface GeneratedApiKey {
  id: string;
  name: string;
  apiKey: string; // Full key shown only once
  keyPrefix: string;
  permissions: string[];
  expiresAt: Date | null;
  createdAt: Date;
}

@Injectable()
export class OrganizationApiKeyService {
  private readonly logger = new Logger(OrganizationApiKeyService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  /**
   * Generate a new API key for an organization
   * Format: cb_org_{organizationId}_{randomBytes}
   */
  async generateApiKey(
    organizationId: string,
    userId: string,
    dto: CreateApiKeyDto,
    ipAddress?: string,
  ): Promise<GeneratedApiKey> {
    // Validate organization exists
    const organization = await this.prisma.organization.findUnique({
      where: { id: organizationId },
    });

    if (!organization) {
      throw new NotFoundException('Organization not found');
    }

    // Check if API key with same name already exists
    const existingKey = await this.prisma.organizationApiKey.findFirst({
      where: {
        organizationId,
        name: dto.name,
        isActive: true,
      },
    });

    if (existingKey) {
      throw new BadRequestException('API key with this name already exists');
    }

    // Generate secure API key
    const randomBytes = crypto.randomBytes(32).toString('hex');
    const fullKey = `cb_org_${organizationId.substring(0, 8)}_${randomBytes}`;
    const keyPrefix = `cb_org_${organizationId.substring(0, 8)}_${randomBytes.substring(0, 8)}`;

    // Hash the key for storage
    const keyHash = await bcrypt.hash(fullKey, 10);

    // Calculate expiration date
    let expiresAt: Date | null = null;
    if (dto.expiresInDays && dto.expiresInDays > 0) {
      expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + dto.expiresInDays);
    }

    // Create API key record
    const apiKey = await this.prisma.organizationApiKey.create({
      data: {
        organizationId,
        name: dto.name,
        keyPrefix,
        keyHash,
        permissions: dto.permissions,
        createdById: userId,
        expiresAt,
        isActive: true,
      },
    });

    // Log audit event
    await this.auditService.log({
      organizationId,
      userId,
      action: 'api_key.created',
      resource: 'api_key',
      resourceId: apiKey.id,
      metadata: {
        name: dto.name,
        keyPrefix,
        permissions: dto.permissions,
        expiresAt,
      },
      ipAddress,
    });

    this.logger.log(`API key created for organization ${organizationId}: ${keyPrefix}`);

    return {
      id: apiKey.id,
      name: apiKey.name,
      apiKey: fullKey, // Return full key only once
      keyPrefix: apiKey.keyPrefix,
      permissions: apiKey.permissions as string[],
      expiresAt: apiKey.expiresAt,
      createdAt: apiKey.createdAt,
    };
  }

  /**
   * Validate an API key and return organization info
   */
  async validateApiKey(
    fullKey: string,
  ): Promise<{ organizationId: string; permissions: string[] } | null> {
    // Extract key prefix for faster lookup
    const keyPrefix = this.extractKeyPrefix(fullKey);

    if (!keyPrefix) {
      return null;
    }

    // Find API key by prefix
    const apiKey = await this.prisma.organizationApiKey.findFirst({
      where: {
        keyPrefix,
        isActive: true,
      },
    });

    if (!apiKey) {
      return null;
    }

    // Check expiration
    if (apiKey.expiresAt && apiKey.expiresAt < new Date()) {
      this.logger.warn(`Expired API key used: ${keyPrefix}`);
      return null;
    }

    // Verify key hash
    const isValid = await bcrypt.compare(fullKey, apiKey.keyHash);

    if (!isValid) {
      this.logger.warn(`Invalid API key attempt: ${keyPrefix}`);
      return null;
    }

    // Update last used timestamp
    await this.prisma.organizationApiKey.update({
      where: { id: apiKey.id },
      data: { lastUsedAt: new Date() },
    });

    return {
      organizationId: apiKey.organizationId,
      permissions: apiKey.permissions as string[],
    };
  }

  /**
   * Extract key prefix from full key
   */
  private extractKeyPrefix(fullKey: string): string | null {
    // Format: cb_org_{orgId}_{randomBytes}
    const parts = fullKey.split('_');

    if (parts.length < 4 || parts[0] !== 'cb' || parts[1] !== 'org') {
      return null;
    }

    // Return first 3 parts + first 8 chars of random bytes
    const randomPart = parts[3].substring(0, 8);
    return `${parts[0]}_${parts[1]}_${parts[2]}_${randomPart}`;
  }

  /**
   * List all API keys for an organization
   */
  async listApiKeys(organizationId: string): Promise<ApiKeyInfo[]> {
    const apiKeys = await this.prisma.organizationApiKey.findMany({
      where: {
        organizationId,
        isActive: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
      include: {
        createdBy: {
          select: {
            name: true,
            email: true,
          },
        },
      },
    });

    return apiKeys.map((key) => ({
      id: key.id,
      name: key.name,
      keyPrefix: key.keyPrefix,
      permissions: key.permissions as string[],
      createdAt: key.createdAt,
      expiresAt: key.expiresAt,
      lastUsedAt: key.lastUsedAt,
      isActive: key.isActive,
    }));
  }

  /**
   * Get a specific API key by ID
   */
  async getApiKey(organizationId: string, keyId: string): Promise<ApiKeyInfo> {
    const apiKey = await this.prisma.organizationApiKey.findFirst({
      where: {
        id: keyId,
        organizationId,
      },
      include: {
        createdBy: {
          select: {
            name: true,
            email: true,
          },
        },
      },
    });

    if (!apiKey) {
      throw new NotFoundException('API key not found');
    }

    return {
      id: apiKey.id,
      name: apiKey.name,
      keyPrefix: apiKey.keyPrefix,
      permissions: apiKey.permissions as string[],
      createdAt: apiKey.createdAt,
      expiresAt: apiKey.expiresAt,
      lastUsedAt: apiKey.lastUsedAt,
      isActive: apiKey.isActive,
    };
  }

  /**
   * Revoke an API key
   */
  async revokeApiKey(
    organizationId: string,
    keyId: string,
    userId: string,
    ipAddress?: string,
  ): Promise<void> {
    const apiKey = await this.prisma.organizationApiKey.findFirst({
      where: {
        id: keyId,
        organizationId,
      },
    });

    if (!apiKey) {
      throw new NotFoundException('API key not found');
    }

    if (!apiKey.isActive) {
      throw new BadRequestException('API key is already revoked');
    }

    // Mark as inactive
    await this.prisma.organizationApiKey.update({
      where: { id: keyId },
      data: {
        isActive: false,
        revokedAt: new Date(),
      },
    });

    // Log audit event
    await this.auditService.log({
      organizationId,
      userId,
      action: 'api_key.revoked',
      resource: 'api_key',
      resourceId: keyId,
      metadata: {
        name: apiKey.name,
        keyPrefix: apiKey.keyPrefix,
      },
      ipAddress,
    });

    this.logger.log(`API key revoked: ${apiKey.keyPrefix}`);
  }

  /**
   * Rotate an API key (revoke old, generate new with same permissions)
   */
  async rotateApiKey(
    organizationId: string,
    keyId: string,
    userId: string,
    ipAddress?: string,
  ): Promise<GeneratedApiKey> {
    const oldKey = await this.prisma.organizationApiKey.findFirst({
      where: {
        id: keyId,
        organizationId,
      },
    });

    if (!oldKey) {
      throw new NotFoundException('API key not found');
    }

    if (!oldKey.isActive) {
      throw new BadRequestException('Cannot rotate an inactive API key');
    }

    // Revoke old key
    await this.revokeApiKey(organizationId, keyId, userId, ipAddress);

    // Generate new key with same name and permissions
    const newKey = await this.generateApiKey(
      organizationId,
      userId,
      {
        name: `${oldKey.name} (rotated)`,
        permissions: oldKey.permissions as string[],
        expiresInDays: oldKey.expiresAt
          ? Math.ceil((oldKey.expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
          : undefined,
      },
      ipAddress,
    );

    // Log audit event
    await this.auditService.log({
      organizationId,
      userId,
      action: 'api_key.rotated',
      resource: 'api_key',
      resourceId: newKey.id,
      metadata: {
        oldKeyId: keyId,
        oldKeyPrefix: oldKey.keyPrefix,
        newKeyPrefix: newKey.keyPrefix,
      },
      ipAddress,
    });

    this.logger.log(`API key rotated: ${oldKey.keyPrefix} -> ${newKey.keyPrefix}`);

    return newKey;
  }

  /**
   * Update API key permissions
   */
  async updatePermissions(
    organizationId: string,
    keyId: string,
    permissions: string[],
    userId: string,
    ipAddress?: string,
  ): Promise<ApiKeyInfo> {
    const apiKey = await this.prisma.organizationApiKey.findFirst({
      where: {
        id: keyId,
        organizationId,
      },
    });

    if (!apiKey) {
      throw new NotFoundException('API key not found');
    }

    if (!apiKey.isActive) {
      throw new BadRequestException('Cannot update permissions for inactive API key');
    }

    // Update permissions
    const updatedKey = await this.prisma.organizationApiKey.update({
      where: { id: keyId },
      data: { permissions },
    });

    // Log audit event
    await this.auditService.log({
      organizationId,
      userId,
      action: 'api_key.permissions_updated',
      resource: 'api_key',
      resourceId: keyId,
      metadata: {
        name: apiKey.name,
        keyPrefix: apiKey.keyPrefix,
        oldPermissions: apiKey.permissions,
        newPermissions: permissions,
      },
      ipAddress,
    });

    return {
      id: updatedKey.id,
      name: updatedKey.name,
      keyPrefix: updatedKey.keyPrefix,
      permissions: updatedKey.permissions as string[],
      createdAt: updatedKey.createdAt,
      expiresAt: updatedKey.expiresAt,
      lastUsedAt: updatedKey.lastUsedAt,
      isActive: updatedKey.isActive,
    };
  }

  /**
   * Clean up expired API keys (can be run as a cron job)
   */
  async cleanupExpiredKeys(): Promise<number> {
    const result = await this.prisma.organizationApiKey.updateMany({
      where: {
        expiresAt: {
          lt: new Date(),
        },
        isActive: true,
      },
      data: {
        isActive: false,
        revokedAt: new Date(),
      },
    });

    this.logger.log(`Cleaned up ${result.count} expired API keys`);

    return result.count;
  }

  /**
   * Get API key usage statistics
   */
  async getUsageStats(organizationId: string): Promise<{
    total: number;
    active: number;
    expired: number;
    revoked: number;
    recentlyUsed: number;
  }> {
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    const [total, active, expired, revoked, recentlyUsed] = await Promise.all([
      this.prisma.organizationApiKey.count({
        where: { organizationId },
      }),
      this.prisma.organizationApiKey.count({
        where: {
          organizationId,
          isActive: true,
          OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
        },
      }),
      this.prisma.organizationApiKey.count({
        where: {
          organizationId,
          expiresAt: { lt: now },
        },
      }),
      this.prisma.organizationApiKey.count({
        where: {
          organizationId,
          isActive: false,
        },
      }),
      this.prisma.organizationApiKey.count({
        where: {
          organizationId,
          lastUsedAt: { gte: oneDayAgo },
        },
      }),
    ]);

    return {
      total,
      active,
      expired,
      revoked,
      recentlyUsed,
    };
  }
}
