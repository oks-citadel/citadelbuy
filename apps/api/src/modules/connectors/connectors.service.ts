/**
 * Connectors Service
 *
 * Main service for managing product integration connectors.
 * Handles CRUD operations, connection testing, and sync orchestration.
 */

import { Injectable, Logger, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../../common/prisma/prisma.service';
import { ConnectorFactory } from './base/connector.factory';
import { SyncService } from './sync.service';
import {
  ConnectorConfig,
  ConnectionTestResult,
  ConnectorEventType,
} from './base/connector.interface';
import {
  CreateConnectorDto,
  UpdateConnectorDto,
  ConnectorResponseDto,
  ConnectorListQueryDto,
  TestConnectionResponseDto,
  ConnectorTypeEnum,
} from './dto/connector-config.dto';
import {
  TriggerSyncDto,
  SyncStatusResponseDto,
  SyncHistoryQueryDto,
  SyncHistoryResponseDto,
} from './dto/sync-result.dto';

@Injectable()
export class ConnectorsService {
  private readonly logger = new Logger(ConnectorsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly connectorFactory: ConnectorFactory,
    private readonly syncService: SyncService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  /**
   * Create a new connector
   */
  async create(tenantId: string, dto: CreateConnectorDto): Promise<ConnectorResponseDto> {
    // Check for duplicate name
    const existing = await this.prisma.connectorConfig.findFirst({
      where: {
        tenantId,
        type: dto.type,
        name: dto.name,
      },
    });

    if (existing) {
      throw new ConflictException(`Connector with name '${dto.name}' already exists for this type`);
    }

    // Validate connector configuration
    const connectorType = dto.type.toLowerCase().replace('_', '') as any;
    const configForValidation: ConnectorConfig = {
      tenantId,
      type: this.mapEnumToType(dto.type),
      name: dto.name,
      isActive: dto.isActive ?? true,
      credentials: dto.credentials as any,
      settings: dto.settings as any,
    };

    const validation = this.connectorFactory.validateConfig(configForValidation);
    if (!validation.valid) {
      throw new BadRequestException(`Invalid connector configuration: ${validation.errors.join(', ')}`);
    }

    // Create connector
    const connector = await this.prisma.connectorConfig.create({
      data: {
        tenantId,
        type: dto.type,
        name: dto.name,
        isActive: dto.isActive ?? true,
        config: JSON.parse(JSON.stringify({
          credentials: dto.credentials,
          settings: dto.settings || this.getDefaultSettings(dto.type),
        })),
      },
    });

    this.logger.log(`Connector created: ${connector.id} (${dto.type} - ${dto.name})`);

    return this.toResponseDto(connector);
  }

  /**
   * Find all connectors for a tenant
   */
  async findAll(tenantId: string, query: ConnectorListQueryDto): Promise<{
    items: ConnectorResponseDto[];
    total: number;
    page: number;
    limit: number;
  }> {
    const { type, isActive, page = 1, limit = 20 } = query;

    const where: any = { tenantId };

    if (type) {
      where.type = type;
    }

    if (isActive !== undefined) {
      where.isActive = isActive;
    }

    const [connectors, total] = await Promise.all([
      this.prisma.connectorConfig.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.connectorConfig.count({ where }),
    ]);

    return {
      items: connectors.map((c) => this.toResponseDto(c)),
      total,
      page,
      limit,
    };
  }

  /**
   * Find a single connector
   */
  async findOne(id: string, tenantId: string): Promise<ConnectorResponseDto> {
    const connector = await this.prisma.connectorConfig.findFirst({
      where: { id, tenantId },
    });

    if (!connector) {
      throw new NotFoundException('Connector not found');
    }

    return this.toResponseDto(connector);
  }

  /**
   * Update a connector
   */
  async update(id: string, tenantId: string, dto: UpdateConnectorDto): Promise<ConnectorResponseDto> {
    const existing = await this.prisma.connectorConfig.findFirst({
      where: { id, tenantId },
    });

    if (!existing) {
      throw new NotFoundException('Connector not found');
    }

    // Check for duplicate name
    if (dto.name && dto.name !== existing.name) {
      const duplicate = await this.prisma.connectorConfig.findFirst({
        where: {
          tenantId,
          type: existing.type,
          name: dto.name,
          id: { not: id },
        },
      });

      if (duplicate) {
        throw new ConflictException(`Connector with name '${dto.name}' already exists`);
      }
    }

    // Merge configurations
    const currentConfig = existing.config as any;
    const newConfig = {
      credentials: dto.credentials
        ? { ...currentConfig?.credentials, ...dto.credentials }
        : currentConfig?.credentials,
      settings: dto.settings
        ? { ...currentConfig?.settings, ...dto.settings }
        : currentConfig?.settings,
    };

    const connector = await this.prisma.connectorConfig.update({
      where: { id },
      data: {
        name: dto.name ?? existing.name,
        isActive: dto.isActive ?? existing.isActive,
        config: newConfig,
      },
    });

    this.logger.log(`Connector updated: ${id}`);

    return this.toResponseDto(connector);
  }

  /**
   * Delete a connector
   */
  async delete(id: string, tenantId: string): Promise<void> {
    const connector = await this.prisma.connectorConfig.findFirst({
      where: { id, tenantId },
    });

    if (!connector) {
      throw new NotFoundException('Connector not found');
    }

    // Remove from factory if connected
    await this.connectorFactory.remove(id);

    // Delete connector and related data
    await this.prisma.$transaction([
      this.prisma.productSource.deleteMany({ where: { connectorId: id } }),
      this.prisma.connectorConfig.delete({ where: { id } }),
    ]);

    this.logger.log(`Connector deleted: ${id}`);
  }

  /**
   * Test connector connection
   */
  async testConnection(id: string, tenantId: string): Promise<TestConnectionResponseDto> {
    const connectorConfig = await this.prisma.connectorConfig.findFirst({
      where: { id, tenantId },
    });

    if (!connectorConfig) {
      throw new NotFoundException('Connector not found');
    }

    try {
      const config = connectorConfig.config as any;

      const connectorInstance = await this.connectorFactory.create({
        id: connectorConfig.id,
        tenantId: connectorConfig.tenantId,
        type: this.mapEnumToType(connectorConfig.type as ConnectorTypeEnum),
        name: connectorConfig.name,
        isActive: connectorConfig.isActive,
        credentials: config?.credentials,
        settings: config?.settings,
      });

      const result = await connectorInstance.testConnection();

      await connectorInstance.disconnect();

      return result;
    } catch (error) {
      return {
        success: false,
        message: 'Failed to test connection',
        error: {
          code: 'TEST_FAILED',
          message: error.message,
        },
      };
    }
  }

  /**
   * Trigger a sync
   */
  async triggerSync(id: string, tenantId: string, dto: TriggerSyncDto): Promise<SyncStatusResponseDto> {
    const connector = await this.prisma.connectorConfig.findFirst({
      where: { id, tenantId },
    });

    if (!connector) {
      throw new NotFoundException('Connector not found');
    }

    return this.syncService.triggerSync(id, tenantId, dto);
  }

  /**
   * Get sync status
   */
  async getSyncStatus(id: string, tenantId: string): Promise<SyncStatusResponseDto | null> {
    return this.syncService.getSyncStatus(id, tenantId);
  }

  /**
   * Get sync history
   */
  async getSyncHistory(
    id: string,
    tenantId: string,
    query: SyncHistoryQueryDto,
  ): Promise<SyncHistoryResponseDto> {
    const history = await this.syncService.getSyncHistory(id, tenantId, query.limit);

    return {
      items: history.map((item) => ({
        id: item.jobId,
        connectorId: item.connectorId,
        type: item.type,
        status: item.status,
        startedAt: item.startedAt,
        completedAt: item.completedAt,
        durationMs: item.completedAt
          ? item.completedAt.getTime() - item.startedAt.getTime()
          : undefined,
        summary: item.result?.summary,
        errorCount: item.result?.errors.length || 0,
        warningCount: item.result?.warnings.length || 0,
      })),
      total: history.length,
      page: query.page || 1,
      limit: query.limit || 20,
      totalPages: 1,
    };
  }

  /**
   * Cancel a running sync
   */
  async cancelSync(id: string, tenantId: string): Promise<{ cancelled: boolean }> {
    const cancelled = await this.syncService.cancelSync(id, tenantId);
    return { cancelled };
  }

  /**
   * Get available connector types
   */
  getConnectorTypes(): {
    type: ConnectorTypeEnum;
    name: string;
    description: string;
    features: string[];
  }[] {
    return [
      {
        type: ConnectorTypeEnum.SHOPIFY,
        name: 'Shopify',
        description: 'Connect to Shopify stores to import products',
        features: ['oauth', 'webhooks', 'inventory_sync', 'variants', 'metafields'],
      },
      {
        type: ConnectorTypeEnum.WOOCOMMERCE,
        name: 'WooCommerce',
        description: 'Connect to WooCommerce stores to import products',
        features: ['webhooks', 'inventory_sync', 'variants', 'attributes'],
      },
      {
        type: ConnectorTypeEnum.REST_API,
        name: 'REST API',
        description: 'Connect to any REST API to import products',
        features: ['custom_mapping', 'polling', 'authentication'],
      },
      {
        type: ConnectorTypeEnum.CSV,
        name: 'CSV Import',
        description: 'Import products from CSV files',
        features: ['file_upload', 's3_integration', 'custom_mapping', 'validation'],
      },
    ];
  }

  /**
   * Get products imported from a connector
   */
  async getConnectorProducts(
    id: string,
    tenantId: string,
    page: number = 1,
    limit: number = 20,
  ): Promise<{
    items: any[];
    total: number;
    page: number;
    limit: number;
  }> {
    const connector = await this.prisma.connectorConfig.findFirst({
      where: { id, tenantId },
    });

    if (!connector) {
      throw new NotFoundException('Connector not found');
    }

    const [productSources, total] = await Promise.all([
      this.prisma.productSource.findMany({
        where: { connectorId: id },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          product: {
            select: {
              id: true,
              name: true,
              sku: true,
              price: true,
              images: true,
              isActive: true,
            },
          },
        },
        orderBy: { lastSyncAt: 'desc' },
      }),
      this.prisma.productSource.count({ where: { connectorId: id } }),
    ]);

    return {
      items: productSources.map((ps) => ({
        id: ps.id,
        externalId: ps.externalId,
        lastSyncAt: ps.lastSyncAt,
        syncStatus: ps.syncStatus,
        product: ps.product,
      })),
      total,
      page,
      limit,
    };
  }

  // Private helper methods

  /**
   * Map enum to connector type string
   */
  private mapEnumToType(enumValue: ConnectorTypeEnum): 'shopify' | 'woocommerce' | 'rest' | 'csv' {
    switch (enumValue) {
      case ConnectorTypeEnum.SHOPIFY:
        return 'shopify';
      case ConnectorTypeEnum.WOOCOMMERCE:
        return 'woocommerce';
      case ConnectorTypeEnum.REST_API:
        return 'rest';
      case ConnectorTypeEnum.CSV:
        return 'csv';
      default:
        throw new BadRequestException(`Unknown connector type: ${enumValue}`);
    }
  }

  /**
   * Get default settings for connector type
   */
  private getDefaultSettings(type: ConnectorTypeEnum): any {
    switch (type) {
      case ConnectorTypeEnum.SHOPIFY:
        return {
          useGraphQL: true,
          syncInventory: true,
          syncImages: true,
          webhooksEnabled: true,
          apiVersion: '2024-01',
        };
      case ConnectorTypeEnum.WOOCOMMERCE:
        return {
          syncInventory: true,
          syncImages: true,
          webhooksEnabled: true,
          apiVersion: 'wc/v3',
        };
      case ConnectorTypeEnum.REST_API:
        return {
          pollingInterval: 60,
        };
      case ConnectorTypeEnum.CSV:
        return {
          delimiter: ',',
          hasHeader: true,
          encoding: 'utf-8',
        };
      default:
        return {};
    }
  }

  /**
   * Convert database model to response DTO
   */
  private toResponseDto(connector: any): ConnectorResponseDto {
    return {
      id: connector.id,
      tenantId: connector.tenantId,
      type: connector.type,
      name: connector.name,
      isActive: connector.isActive,
      lastSyncAt: connector.lastSyncAt || undefined,
      lastSyncStatus: connector.lastSyncStatus || undefined,
      createdAt: connector.createdAt,
      updatedAt: connector.updatedAt,
    };
  }
}
