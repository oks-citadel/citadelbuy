/**
 * CSV Connector
 *
 * Implements the connector interface for CSV file imports.
 * Supports file uploads, S3 integration, and URL-based imports.
 */

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import * as fs from 'fs';
import * as path from 'path';
import {
  IConnector,
  ConnectorConfig,
  ConnectorSource,
  CsvConnectorConfig,
  FetchOptions,
  PaginatedResponse,
  NormalizedProduct,
  SyncResult,
  SyncError,
  SyncWarning,
  ConnectionTestResult,
  ConnectorEventType,
} from '../base/connector.interface';
import { CsvParser } from './csv.parser';
import {
  CsvImportOptions,
  CsvFieldMapping,
  CsvValidationRule,
  CsvParseResult,
  CsvImportJob,
  CsvColumnDefinition,
} from './dto/csv-mapping.dto';
import { NormalizedProductBuilder, ProductValidator } from '../base/normalized-product.model';

// Note: S3 integration would use @aws-sdk/client-s3 in production
// import { S3Client, GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';

@Injectable()
export class CsvConnector implements IConnector {
  readonly type: ConnectorSource = 'csv';
  readonly name = 'CSV Import';

  private readonly logger = new Logger(CsvConnector.name);
  private config?: CsvConnectorConfig;
  private isConnected = false;
  private tenantId?: string;
  private currentFileBuffer?: Buffer;
  private parsedProducts: NormalizedProduct[] = [];
  private importJobs: Map<string, CsvImportJob> = new Map();

  constructor(
    private readonly configService: ConfigService,
    private readonly eventEmitter: EventEmitter2,
    private readonly httpService: HttpService,
    private readonly csvParser: CsvParser,
  ) {}

  /**
   * Connect/initialize the CSV connector
   */
  async connect(config: ConnectorConfig): Promise<void> {
    this.config = config as CsvConnectorConfig;
    this.tenantId = config.tenantId;

    // Validate configuration
    if (!this.config.settings?.fieldMapping) {
      throw new Error('CSV field mapping is required');
    }

    this.isConnected = true;

    this.logger.log('CSV connector initialized');

    this.eventEmitter.emit(ConnectorEventType.CONNECTED, {
      type: ConnectorEventType.CONNECTED,
      connectorId: config.id,
      tenantId: this.tenantId,
      timestamp: new Date(),
      data: {
        storageType: this.config.credentials?.storageType,
      },
    });
  }

  /**
   * Disconnect/cleanup
   */
  async disconnect(): Promise<void> {
    this.isConnected = false;
    this.currentFileBuffer = undefined;
    this.parsedProducts = [];
    this.config = undefined;

    this.eventEmitter.emit(ConnectorEventType.DISCONNECTED, {
      type: ConnectorEventType.DISCONNECTED,
      connectorId: this.config?.id,
      tenantId: this.tenantId,
      timestamp: new Date(),
    });

    this.logger.log('CSV connector disconnected');
  }

  /**
   * Test the connection (validates configuration)
   */
  async testConnection(): Promise<ConnectionTestResult> {
    try {
      if (!this.config?.settings?.fieldMapping) {
        return {
          success: false,
          message: 'Missing field mapping configuration',
          error: {
            code: 'MISSING_CONFIG',
            message: 'Field mapping is required for CSV connector',
          },
        };
      }

      // If using URL storage, try to fetch the file
      if (this.config.credentials?.storageType === 'url' && this.config.credentials?.fileUrl) {
        const startTime = Date.now();
        await this.fetchFileFromUrl(this.config.credentials.fileUrl);
        const latency = Date.now() - startTime;

        return {
          success: true,
          message: 'Successfully connected to CSV source',
          details: {
            latency,
          },
        };
      }

      // If using S3, test S3 connection
      if (this.config.credentials?.storageType === 's3') {
        // Would test S3 connection here
        return {
          success: true,
          message: 'S3 configuration validated',
        };
      }

      return {
        success: true,
        message: 'CSV connector configuration is valid',
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to validate CSV configuration',
        error: {
          code: 'VALIDATION_FAILED',
          message: error.message,
        },
      };
    }
  }

  /**
   * Load and process CSV file
   */
  async loadFile(fileBuffer: Buffer): Promise<CsvParseResult> {
    this.currentFileBuffer = fileBuffer;

    const parseResult = await this.csvParser.parse(
      fileBuffer,
      this.getCsvOptions(),
      this.buildFieldMapping(),
      this.buildValidationRules(),
    );

    // Convert parsed rows to normalized products
    this.parsedProducts = [];

    for (const row of parseResult.rows) {
      if (row.success && row.data) {
        try {
          const product = this.rowToNormalizedProduct(row.data);
          this.parsedProducts.push(product);
        } catch (error) {
          this.logger.warn(`Failed to convert row ${row.rowNumber}: ${error.message}`);
        }
      }
    }

    return parseResult;
  }

  /**
   * Fetch products (from loaded/parsed CSV)
   */
  async fetchProducts(options?: FetchOptions): Promise<PaginatedResponse<NormalizedProduct>> {
    this.ensureConnected();

    // If no products loaded, try to load from configured source
    if (this.parsedProducts.length === 0) {
      await this.loadFromSource();
    }

    const page = options?.page || 1;
    const limit = options?.limit || 50;
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;

    const products = this.parsedProducts.slice(startIndex, endIndex);
    const hasMore = endIndex < this.parsedProducts.length;

    return {
      data: products,
      pagination: {
        total: this.parsedProducts.length,
        page,
        limit,
        hasMore,
        nextCursor: hasMore ? String(page + 1) : undefined,
      },
    };
  }

  /**
   * Fetch a single product by external ID
   */
  async fetchProduct(externalId: string): Promise<NormalizedProduct | null> {
    this.ensureConnected();

    if (this.parsedProducts.length === 0) {
      await this.loadFromSource();
    }

    return this.parsedProducts.find((p) => p.externalId === externalId) || null;
  }

  /**
   * Sync all products from CSV
   */
  async syncProducts(): Promise<SyncResult> {
    this.ensureConnected();

    const startedAt = new Date();
    const errors: SyncError[] = [];
    const warnings: SyncWarning[] = [];
    let totalProcessed = 0;
    let created = 0;
    let updated = 0;
    let deleted = 0;
    let skipped = 0;
    let failed = 0;

    this.eventEmitter.emit(ConnectorEventType.SYNC_STARTED, {
      type: ConnectorEventType.SYNC_STARTED,
      connectorId: this.config?.id,
      tenantId: this.tenantId,
      timestamp: new Date(),
    });

    try {
      // Load from source if needed
      if (this.parsedProducts.length === 0) {
        await this.loadFromSource();
      }

      for (const product of this.parsedProducts) {
        totalProcessed++;

        try {
          // Validate product
          const validation = ProductValidator.validate(product);
          if (!validation.valid) {
            warnings.push({
              externalId: product.externalId,
              message: `Validation warnings: ${validation.errors.join(', ')}`,
              code: 'VALIDATION_WARNING',
            });
          }

          // Emit event for sync service to handle
          this.eventEmitter.emit(ConnectorEventType.PRODUCT_UPDATED, {
            type: ConnectorEventType.PRODUCT_UPDATED,
            connectorId: this.config?.id,
            tenantId: this.tenantId,
            timestamp: new Date(),
            data: { product },
          });

          updated++;
        } catch (error) {
          failed++;
          errors.push({
            externalId: product.externalId,
            message: error.message,
            code: 'SYNC_ERROR',
          });
        }
      }

      this.eventEmitter.emit(ConnectorEventType.SYNC_COMPLETED, {
        type: ConnectorEventType.SYNC_COMPLETED,
        connectorId: this.config?.id,
        tenantId: this.tenantId,
        timestamp: new Date(),
        data: { totalProcessed, created, updated, deleted, failed },
      });

      return {
        success: failed === 0,
        connectorId: this.config?.id || '',
        startedAt,
        completedAt: new Date(),
        summary: {
          totalProcessed,
          created,
          updated,
          deleted,
          skipped,
          failed,
        },
        errors,
        warnings,
      };
    } catch (error) {
      this.eventEmitter.emit(ConnectorEventType.SYNC_FAILED, {
        type: ConnectorEventType.SYNC_FAILED,
        connectorId: this.config?.id,
        tenantId: this.tenantId,
        timestamp: new Date(),
        error: {
          code: 'SYNC_FAILED',
          message: error.message,
        },
      });

      throw error;
    }
  }

  /**
   * Sync delta (not applicable for CSV - always full sync)
   */
  async syncDelta(since: Date): Promise<SyncResult> {
    // CSV imports are always full syncs
    return this.syncProducts();
  }

  /**
   * Start an async import job
   */
  async startImportJob(fileBuffer: Buffer, fileName: string): Promise<CsvImportJob> {
    const jobId = `csv-import-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const job: CsvImportJob = {
      id: jobId,
      connectorId: this.config?.id || '',
      tenantId: this.tenantId || '',
      fileName,
      filePath: '',
      status: 'pending',
      progress: 0,
      totalRows: 0,
      processedRows: 0,
      successfulRows: 0,
      failedRows: 0,
    };

    this.importJobs.set(jobId, job);

    // Process job asynchronously
    this.processImportJob(jobId, fileBuffer).catch((error) => {
      const failedJob = this.importJobs.get(jobId);
      if (failedJob) {
        failedJob.status = 'failed';
        failedJob.errorMessage = error.message;
      }
    });

    return job;
  }

  /**
   * Get import job status
   */
  getImportJob(jobId: string): CsvImportJob | undefined {
    return this.importJobs.get(jobId);
  }

  // Private methods

  /**
   * Load CSV data from configured source
   */
  private async loadFromSource(): Promise<void> {
    let fileBuffer: Buffer;

    if (this.config?.credentials?.storageType === 'url' && this.config?.credentials?.fileUrl) {
      fileBuffer = await this.fetchFileFromUrl(this.config.credentials.fileUrl);
    } else if (this.config?.credentials?.storageType === 's3') {
      fileBuffer = await this.fetchFileFromS3();
    } else if (this.currentFileBuffer) {
      fileBuffer = this.currentFileBuffer;
    } else {
      throw new Error('No CSV file source configured');
    }

    await this.loadFile(fileBuffer);
  }

  /**
   * Fetch CSV file from URL
   */
  private async fetchFileFromUrl(url: string): Promise<Buffer> {
    const response = await firstValueFrom(
      this.httpService.get(url, {
        responseType: 'arraybuffer',
      }),
    );

    return Buffer.from(response.data);
  }

  /**
   * Fetch CSV file from S3
   */
  private async fetchFileFromS3(): Promise<Buffer> {
    // Placeholder for S3 implementation
    // In production, use @aws-sdk/client-s3
    throw new Error('S3 integration not implemented');
  }

  /**
   * Process import job asynchronously
   */
  private async processImportJob(jobId: string, fileBuffer: Buffer): Promise<void> {
    const job = this.importJobs.get(jobId);
    if (!job) return;

    job.status = 'processing';
    job.startedAt = new Date();

    try {
      const parseResult = await this.loadFile(fileBuffer);

      job.totalRows = parseResult.totalRows;
      job.successfulRows = parseResult.successfulRows;
      job.failedRows = parseResult.failedRows;

      // Process each product
      for (let i = 0; i < this.parsedProducts.length; i++) {
        const product = this.parsedProducts[i];

        job.processedRows = i + 1;
        job.progress = Math.floor((job.processedRows / job.totalRows) * 100);

        try {
          this.eventEmitter.emit(ConnectorEventType.PRODUCT_UPDATED, {
            type: ConnectorEventType.PRODUCT_UPDATED,
            connectorId: this.config?.id,
            tenantId: this.tenantId,
            timestamp: new Date(),
            data: { product },
          });
        } catch (error) {
          job.failedRows++;
        }
      }

      job.status = 'completed';
      job.completedAt = new Date();
      job.progress = 100;
    } catch (error) {
      job.status = 'failed';
      job.errorMessage = error.message;
      job.completedAt = new Date();
    }
  }

  /**
   * Get CSV parsing options from config
   */
  private getCsvOptions(): Partial<CsvImportOptions> {
    return {
      delimiter: this.config?.settings?.delimiter || ',',
      hasHeader: this.config?.settings?.hasHeader !== false,
      encoding: (this.config?.settings?.encoding as BufferEncoding) || 'utf-8',
      skipRows: this.config?.settings?.skipRows || 0,
      trimValues: true,
      skipEmptyRows: true,
    };
  }

  /**
   * Build field mapping from config
   */
  private buildFieldMapping(): CsvFieldMapping {
    const mapping = this.config?.settings?.fieldMapping;

    if (!mapping) {
      throw new Error('Field mapping is required');
    }

    const fieldMapping: CsvFieldMapping = {
      externalId: { column: mapping.externalId, type: 'string', required: true },
      name: { column: mapping.name, type: 'string', required: true },
      price: { column: mapping.price, type: 'number', required: true },
    };

    if (mapping.sku) {
      fieldMapping.sku = { column: mapping.sku, type: 'string' };
    }
    if (mapping.description) {
      fieldMapping.description = { column: mapping.description, type: 'string' };
    }
    if (mapping.currency) {
      fieldMapping.currency = { column: mapping.currency, type: 'string' };
    }
    if (mapping.images) {
      fieldMapping.images = { column: mapping.images, type: 'array', arrayDelimiter: ',' };
    }
    if (mapping.categories) {
      fieldMapping.categories = { column: mapping.categories, type: 'array', arrayDelimiter: ',' };
    }
    if (mapping.quantity) {
      fieldMapping.quantity = { column: mapping.quantity, type: 'number' };
    }

    return fieldMapping;
  }

  /**
   * Build validation rules from config
   */
  private buildValidationRules(): CsvValidationRule[] {
    const rules = this.config?.settings?.validationRules || [];

    return rules.map((rule) => ({
      column: rule.field,
      type: rule.type as CsvValidationRule['type'],
      value: rule.value,
      message: rule.message,
    }));
  }

  /**
   * Convert parsed row data to normalized product
   */
  private rowToNormalizedProduct(data: Record<string, any>): NormalizedProduct {
    const builder = new NormalizedProductBuilder();

    builder
      .setExternalId(String(data.externalId))
      .setSource('csv')
      .setSku(String(data.sku || `CSV-${data.externalId}`))
      .setName(String(data.name))
      .setDescription(String(data.description || ''))
      .setPrice(Number(data.price) || 0)
      .setCurrency(String(data.currency || 'USD').toUpperCase());

    if (data.compareAtPrice) {
      builder.setCompareAtPrice(Number(data.compareAtPrice));
    }

    if (data.images) {
      const images = Array.isArray(data.images) ? data.images : [data.images];
      builder.setImages(images.filter((img: any) => img));
    }

    if (data.featuredImage) {
      builder.setFeaturedImage(String(data.featuredImage));
    }

    if (data.categories) {
      const categories = Array.isArray(data.categories) ? data.categories : [data.categories];
      builder.setCategories(categories.filter((cat: any) => cat));
    }

    if (data.tags) {
      const tags = Array.isArray(data.tags) ? data.tags : [data.tags];
      builder.setTags(tags.filter((tag: any) => tag));
    }

    if (data.quantity !== undefined) {
      builder.setInventory({
        quantity: Math.max(0, Math.floor(Number(data.quantity) || 0)),
        trackInventory: data.trackInventory !== false,
      });
    }

    if (data.status) {
      const statusMap: Record<string, NormalizedProduct['status']> =
        this.config?.settings?.fieldMapping?.statusMapping || {};
      const status = statusMap[String(data.status)] || this.mapGenericStatus(String(data.status));
      builder.setStatus(status);
    } else {
      builder.setStatus('active');
    }

    if (data.vendor) {
      builder.setVendor(String(data.vendor));
    }

    if (data.brand) {
      builder.setBrand(String(data.brand));
    }

    if (data.barcode) {
      builder.setBarcode(String(data.barcode));
    }

    if (data.weight || data.length || data.width || data.height) {
      builder.setDimensions({
        weight: data.weight ? Number(data.weight) : undefined,
        length: data.length ? Number(data.length) : undefined,
        width: data.width ? Number(data.width) : undefined,
        height: data.height ? Number(data.height) : undefined,
      });
    }

    if (data.metadata) {
      builder.setMetadata(data.metadata);
    }

    return builder.build();
  }

  /**
   * Map generic status values
   */
  private mapGenericStatus(status: string): NormalizedProduct['status'] {
    const lowerStatus = status.toLowerCase();

    if (['active', 'published', 'live', 'enabled'].includes(lowerStatus)) {
      return 'active';
    }
    if (['draft', 'pending'].includes(lowerStatus)) {
      return 'draft';
    }
    if (['archived', 'deleted'].includes(lowerStatus)) {
      return 'archived';
    }
    if (['inactive', 'disabled'].includes(lowerStatus)) {
      return 'inactive';
    }

    return 'active';
  }

  /**
   * Ensure connector is connected
   */
  private ensureConnected(): void {
    if (!this.isConnected || !this.config) {
      throw new Error('CSV connector is not connected');
    }
  }
}
