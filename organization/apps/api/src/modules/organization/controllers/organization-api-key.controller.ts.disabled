import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  UseGuards,
  HttpStatus,
  HttpCode,
  Ip,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiBody,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { OrganizationApiKeyService, CreateApiKeyDto } from '../services/organization-api-key.service';
import { RequirePermission } from '../../organization-roles/decorators/require-permission.decorator';
import { OrganizationPermissionGuard } from '../../organization-roles/guards/permission.guard';

@ApiTags('Organization API Keys')
@Controller('organizations/:orgId/api-keys')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, OrganizationPermissionGuard)
export class OrganizationApiKeyController {
  constructor(private readonly apiKeyService: OrganizationApiKeyService) {}

  // ==================== CREATE API KEY ====================

  @Post()
  @RequirePermission('api_keys:write')
  @ApiOperation({
    summary: 'Generate new API key',
    description: 'Creates a new API key for the organization. The full key is returned only once.',
  })
  @ApiParam({ name: 'orgId', description: 'Organization ID' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['name', 'permissions'],
      properties: {
        name: {
          type: 'string',
          description: 'Name/description for the API key',
          example: 'Production API Key',
        },
        permissions: {
          type: 'array',
          items: { type: 'string' },
          description: 'List of permissions for this API key',
          example: ['orders:read', 'products:read', 'products:write'],
        },
        expiresInDays: {
          type: 'number',
          description: 'Number of days until key expires (optional, null = never expires)',
          example: 365,
        },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'API key created successfully',
    schema: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        name: { type: 'string' },
        apiKey: {
          type: 'string',
          description: 'Full API key - save this securely, it will not be shown again!',
        },
        keyPrefix: { type: 'string' },
        permissions: { type: 'array', items: { type: 'string' } },
        expiresAt: { type: 'string', format: 'date-time', nullable: true },
        createdAt: { type: 'string', format: 'date-time' },
      },
    },
  })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Invalid input or key name already exists' })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Insufficient permissions' })
  async create(
    @Param('orgId') orgId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: CreateApiKeyDto,
    @Ip() ipAddress: string,
  ) {
    return this.apiKeyService.generateApiKey(orgId, userId, dto, ipAddress);
  }

  // ==================== LIST API KEYS ====================

  @Get()
  @RequirePermission('api_keys:read')
  @ApiOperation({
    summary: 'List all API keys',
    description: 'Returns all API keys for the organization (without full key values)',
  })
  @ApiParam({ name: 'orgId', description: 'Organization ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'List of API keys',
    schema: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          name: { type: 'string' },
          keyPrefix: { type: 'string' },
          permissions: { type: 'array', items: { type: 'string' } },
          createdAt: { type: 'string', format: 'date-time' },
          expiresAt: { type: 'string', format: 'date-time', nullable: true },
          lastUsedAt: { type: 'string', format: 'date-time', nullable: true },
          isActive: { type: 'boolean' },
        },
      },
    },
  })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Insufficient permissions' })
  async findAll(@Param('orgId') orgId: string) {
    return this.apiKeyService.listApiKeys(orgId);
  }

  // ==================== GET API KEY DETAILS ====================

  @Get(':id')
  @RequirePermission('api_keys:read')
  @ApiOperation({
    summary: 'Get API key details',
    description: 'Returns details for a specific API key (without full key value)',
  })
  @ApiParam({ name: 'orgId', description: 'Organization ID' })
  @ApiParam({ name: 'id', description: 'API Key ID' })
  @ApiResponse({ status: HttpStatus.OK, description: 'API key details' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'API key not found' })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Insufficient permissions' })
  async findOne(
    @Param('orgId') orgId: string,
    @Param('id') id: string,
  ) {
    return this.apiKeyService.getApiKey(orgId, id);
  }

  // ==================== REVOKE API KEY ====================

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermission('api_keys:write')
  @ApiOperation({
    summary: 'Revoke API key',
    description: 'Permanently revokes an API key. This action cannot be undone.',
  })
  @ApiParam({ name: 'orgId', description: 'Organization ID' })
  @ApiParam({ name: 'id', description: 'API Key ID' })
  @ApiResponse({ status: HttpStatus.NO_CONTENT, description: 'API key revoked successfully' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'API key not found' })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'API key already revoked' })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Insufficient permissions' })
  async revoke(
    @Param('orgId') orgId: string,
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @Ip() ipAddress: string,
  ) {
    await this.apiKeyService.revokeApiKey(orgId, id, userId, ipAddress);
  }

  // ==================== ROTATE API KEY ====================

  @Post(':id/rotate')
  @RequirePermission('api_keys:write')
  @ApiOperation({
    summary: 'Rotate API key',
    description: 'Revokes the old key and generates a new one with the same permissions. The new full key is returned only once.',
  })
  @ApiParam({ name: 'orgId', description: 'Organization ID' })
  @ApiParam({ name: 'id', description: 'API Key ID to rotate' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'API key rotated successfully',
    schema: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        name: { type: 'string' },
        apiKey: {
          type: 'string',
          description: 'New full API key - save this securely!',
        },
        keyPrefix: { type: 'string' },
        permissions: { type: 'array', items: { type: 'string' } },
        expiresAt: { type: 'string', format: 'date-time', nullable: true },
        createdAt: { type: 'string', format: 'date-time' },
      },
    },
  })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'API key not found' })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Cannot rotate inactive API key' })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Insufficient permissions' })
  async rotate(
    @Param('orgId') orgId: string,
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @Ip() ipAddress: string,
  ) {
    return this.apiKeyService.rotateApiKey(orgId, id, userId, ipAddress);
  }

  // ==================== UPDATE PERMISSIONS ====================

  @Post(':id/permissions')
  @RequirePermission('api_keys:write')
  @ApiOperation({
    summary: 'Update API key permissions',
    description: 'Updates the permissions for an existing API key',
  })
  @ApiParam({ name: 'orgId', description: 'Organization ID' })
  @ApiParam({ name: 'id', description: 'API Key ID' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['permissions'],
      properties: {
        permissions: {
          type: 'array',
          items: { type: 'string' },
          description: 'New list of permissions',
          example: ['orders:read', 'products:read'],
        },
      },
    },
  })
  @ApiResponse({ status: HttpStatus.OK, description: 'Permissions updated successfully' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'API key not found' })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Cannot update inactive API key' })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Insufficient permissions' })
  async updatePermissions(
    @Param('orgId') orgId: string,
    @Param('id') id: string,
    @Body('permissions') permissions: string[],
    @CurrentUser('id') userId: string,
    @Ip() ipAddress: string,
  ) {
    return this.apiKeyService.updatePermissions(orgId, id, permissions, userId, ipAddress);
  }

  // ==================== USAGE STATISTICS ====================

  @Get('stats/usage')
  @RequirePermission('api_keys:read')
  @ApiOperation({
    summary: 'Get API key usage statistics',
    description: 'Returns usage statistics for all API keys in the organization',
  })
  @ApiParam({ name: 'orgId', description: 'Organization ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Usage statistics',
    schema: {
      type: 'object',
      properties: {
        total: { type: 'number', description: 'Total number of API keys' },
        active: { type: 'number', description: 'Number of active API keys' },
        expired: { type: 'number', description: 'Number of expired API keys' },
        revoked: { type: 'number', description: 'Number of revoked API keys' },
        recentlyUsed: { type: 'number', description: 'Number of keys used in the last 24 hours' },
      },
    },
  })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Insufficient permissions' })
  async getUsageStats(@Param('orgId') orgId: string) {
    return this.apiKeyService.getUsageStats(orgId);
  }
}
