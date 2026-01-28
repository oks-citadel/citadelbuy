/**
 * Connectors Controller
 *
 * REST API endpoints for managing product integration connectors.
 */

import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
  HttpCode,
  HttpStatus,
  UseInterceptors,
  UploadedFile,
  ParseFilePipe,
  MaxFileSizeValidator,
  FileTypeValidator,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiConsumes,
  ApiBody,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ConnectorsService } from './connectors.service';
import { CsvConnector } from './csv/csv.connector';
import { ConnectorFactory } from './base/connector.factory';
import {
  CreateConnectorDto,
  UpdateConnectorDto,
  ConnectorResponseDto,
  ConnectorListQueryDto,
  TestConnectionResponseDto,
} from './dto/connector-config.dto';
import {
  TriggerSyncDto,
  SyncStatusResponseDto,
  SyncHistoryQueryDto,
  SyncHistoryResponseDto,
} from './dto/sync-result.dto';

@ApiTags('Connectors')
@Controller('api/v1/connectors')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ConnectorsController {
  constructor(
    private readonly connectorsService: ConnectorsService,
    private readonly connectorFactory: ConnectorFactory,
    private readonly csvConnector: CsvConnector,
  ) {}

  /**
   * Create a new connector
   */
  @Post()
  @ApiOperation({ summary: 'Create a new connector' })
  @ApiResponse({ status: 201, description: 'Connector created', type: ConnectorResponseDto })
  @ApiResponse({ status: 400, description: 'Invalid configuration' })
  @ApiResponse({ status: 409, description: 'Connector with same name exists' })
  async create(
    @Req() req: any,
    @Body() dto: CreateConnectorDto,
  ): Promise<ConnectorResponseDto> {
    const tenantId = req.user.organizationId || req.user.id;
    return this.connectorsService.create(tenantId, dto);
  }

  /**
   * List all connectors
   */
  @Get()
  @ApiOperation({ summary: 'List all connectors for tenant' })
  @ApiResponse({ status: 200, description: 'List of connectors' })
  async findAll(
    @Req() req: any,
    @Query() query: ConnectorListQueryDto,
  ): Promise<{
    items: ConnectorResponseDto[];
    total: number;
    page: number;
    limit: number;
  }> {
    const tenantId = req.user.organizationId || req.user.id;
    return this.connectorsService.findAll(tenantId, query);
  }

  /**
   * Get connector types
   */
  @Get('types')
  @ApiOperation({ summary: 'Get available connector types' })
  @ApiResponse({ status: 200, description: 'List of connector types' })
  getConnectorTypes() {
    return this.connectorsService.getConnectorTypes();
  }

  /**
   * Get a single connector
   */
  @Get(':id')
  @ApiOperation({ summary: 'Get connector details' })
  @ApiParam({ name: 'id', description: 'Connector ID' })
  @ApiResponse({ status: 200, description: 'Connector details', type: ConnectorResponseDto })
  @ApiResponse({ status: 404, description: 'Connector not found' })
  async findOne(
    @Req() req: any,
    @Param('id') id: string,
  ): Promise<ConnectorResponseDto> {
    const tenantId = req.user.organizationId || req.user.id;
    return this.connectorsService.findOne(id, tenantId);
  }

  /**
   * Update a connector
   */
  @Put(':id')
  @ApiOperation({ summary: 'Update connector configuration' })
  @ApiParam({ name: 'id', description: 'Connector ID' })
  @ApiResponse({ status: 200, description: 'Connector updated', type: ConnectorResponseDto })
  @ApiResponse({ status: 404, description: 'Connector not found' })
  async update(
    @Req() req: any,
    @Param('id') id: string,
    @Body() dto: UpdateConnectorDto,
  ): Promise<ConnectorResponseDto> {
    const tenantId = req.user.organizationId || req.user.id;
    return this.connectorsService.update(id, tenantId, dto);
  }

  /**
   * Delete a connector
   */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a connector' })
  @ApiParam({ name: 'id', description: 'Connector ID' })
  @ApiResponse({ status: 204, description: 'Connector deleted' })
  @ApiResponse({ status: 404, description: 'Connector not found' })
  async delete(
    @Req() req: any,
    @Param('id') id: string,
  ): Promise<void> {
    const tenantId = req.user.organizationId || req.user.id;
    return this.connectorsService.delete(id, tenantId);
  }

  /**
   * Test connector connection
   */
  @Post(':id/test')
  @ApiOperation({ summary: 'Test connector connection' })
  @ApiParam({ name: 'id', description: 'Connector ID' })
  @ApiResponse({ status: 200, description: 'Connection test result', type: TestConnectionResponseDto })
  @ApiResponse({ status: 404, description: 'Connector not found' })
  async testConnection(
    @Req() req: any,
    @Param('id') id: string,
  ): Promise<TestConnectionResponseDto> {
    const tenantId = req.user.organizationId || req.user.id;
    return this.connectorsService.testConnection(id, tenantId);
  }

  /**
   * Trigger a sync
   */
  @Post(':id/sync')
  @ApiOperation({ summary: 'Trigger product sync' })
  @ApiParam({ name: 'id', description: 'Connector ID' })
  @ApiResponse({ status: 200, description: 'Sync started', type: SyncStatusResponseDto })
  @ApiResponse({ status: 404, description: 'Connector not found' })
  async triggerSync(
    @Req() req: any,
    @Param('id') id: string,
    @Body() dto: TriggerSyncDto,
  ): Promise<SyncStatusResponseDto> {
    const tenantId = req.user.organizationId || req.user.id;
    return this.connectorsService.triggerSync(id, tenantId, dto);
  }

  /**
   * Get sync status
   */
  @Get(':id/sync/status')
  @ApiOperation({ summary: 'Get current sync status' })
  @ApiParam({ name: 'id', description: 'Connector ID' })
  @ApiResponse({ status: 200, description: 'Sync status', type: SyncStatusResponseDto })
  @ApiResponse({ status: 404, description: 'Connector not found' })
  async getSyncStatus(
    @Req() req: any,
    @Param('id') id: string,
  ): Promise<SyncStatusResponseDto | null> {
    const tenantId = req.user.organizationId || req.user.id;
    return this.connectorsService.getSyncStatus(id, tenantId);
  }

  /**
   * Get sync history
   */
  @Get(':id/sync/history')
  @ApiOperation({ summary: 'Get sync history' })
  @ApiParam({ name: 'id', description: 'Connector ID' })
  @ApiResponse({ status: 200, description: 'Sync history', type: SyncHistoryResponseDto })
  @ApiResponse({ status: 404, description: 'Connector not found' })
  async getSyncHistory(
    @Req() req: any,
    @Param('id') id: string,
    @Query() query: SyncHistoryQueryDto,
  ): Promise<SyncHistoryResponseDto> {
    const tenantId = req.user.organizationId || req.user.id;
    return this.connectorsService.getSyncHistory(id, tenantId, query);
  }

  /**
   * Cancel a running sync
   */
  @Post(':id/sync/cancel')
  @ApiOperation({ summary: 'Cancel running sync' })
  @ApiParam({ name: 'id', description: 'Connector ID' })
  @ApiResponse({ status: 200, description: 'Sync cancelled' })
  async cancelSync(
    @Req() req: any,
    @Param('id') id: string,
  ): Promise<{ cancelled: boolean }> {
    const tenantId = req.user.organizationId || req.user.id;
    return this.connectorsService.cancelSync(id, tenantId);
  }

  /**
   * Get products imported from connector
   */
  @Get(':id/products')
  @ApiOperation({ summary: 'Get products imported from connector' })
  @ApiParam({ name: 'id', description: 'Connector ID' })
  @ApiResponse({ status: 200, description: 'List of products' })
  async getConnectorProducts(
    @Req() req: any,
    @Param('id') id: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 20,
  ): Promise<any> {
    const tenantId = req.user.organizationId || req.user.id;
    return this.connectorsService.getConnectorProducts(id, tenantId, page, limit);
  }

  /**
   * Upload CSV file for import
   */
  @Post(':id/csv/upload')
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload CSV file for import' })
  @ApiParam({ name: 'id', description: 'CSV Connector ID' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'CSV parsed successfully' })
  async uploadCsv(
    @Req() req: any,
    @Param('id') id: string,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 50 * 1024 * 1024 }), // 50MB
          new FileTypeValidator({ fileType: /(text\/csv|application\/vnd\.ms-excel)/ }),
        ],
      }),
    )
    file: Express.Multer.File,
  ): Promise<any> {
    const tenantId = req.user.organizationId || req.user.id;

    // Verify connector exists and is CSV type
    const connector = await this.connectorsService.findOne(id, tenantId);
    if (connector.type !== 'CSV') {
      throw new Error('This endpoint is only for CSV connectors');
    }

    // Load file into CSV connector and parse
    const result = await this.csvConnector.loadFile(file.buffer);

    return {
      fileName: file.originalname,
      totalRows: result.totalRows,
      successfulRows: result.successfulRows,
      failedRows: result.failedRows,
      headers: result.headers,
      errors: result.errors.slice(0, 10), // Return first 10 errors
      warnings: result.warnings.slice(0, 10),
    };
  }

  /**
   * Preview CSV import
   */
  @Get(':id/csv/preview')
  @ApiOperation({ summary: 'Preview CSV import mapping' })
  @ApiParam({ name: 'id', description: 'CSV Connector ID' })
  @ApiResponse({ status: 200, description: 'CSV preview' })
  async previewCsv(
    @Req() req: any,
    @Param('id') id: string,
  ): Promise<any> {
    const tenantId = req.user.organizationId || req.user.id;

    // Get products from CSV connector
    const result = await this.csvConnector.fetchProducts({ limit: 5 });

    return {
      previewProducts: result.data,
      total: result.pagination.total,
    };
  }
}
