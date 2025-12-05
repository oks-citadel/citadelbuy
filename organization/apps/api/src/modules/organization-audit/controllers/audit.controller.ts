import {
  Controller,
  Get,
  Param,
  Query,
  UseGuards,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { AuditService } from '../services/audit.service';
import { AuditQueryDto } from '../dto/audit-query.dto';
import { RequirePermission } from '../../organization-roles/decorators/require-permission.decorator';
import { OrganizationPermissionGuard } from '../../organization-roles/guards/permission.guard';

@ApiTags('Organization Audit')
@Controller('organizations/:orgId/audit')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, OrganizationPermissionGuard)
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get()
  @RequirePermission('org:read')
  @ApiOperation({ summary: 'Query audit logs' })
  @ApiParam({ name: 'orgId', description: 'Organization ID' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Audit log entries' })
  async query(
    @Param('orgId') orgId: string,
    @Query() query: AuditQueryDto,
  ) {
    return this.auditService.query(orgId, query);
  }

  @Get('stats')
  @RequirePermission('analytics:read')
  @ApiOperation({ summary: 'Get audit statistics' })
  @ApiParam({ name: 'orgId', description: 'Organization ID' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Audit statistics' })
  async getStats(
    @Param('orgId') orgId: string,
    @Query('days') days?: number,
  ) {
    return this.auditService.getStats(orgId, days || 30);
  }

  @Get('recent')
  @RequirePermission('org:read')
  @ApiOperation({ summary: 'Get recent activity' })
  @ApiParam({ name: 'orgId', description: 'Organization ID' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Recent activity' })
  async getRecentActivity(
    @Param('orgId') orgId: string,
    @Query('limit') limit?: number,
  ) {
    return this.auditService.getRecentActivity(orgId, limit || 20);
  }

  @Get('resource/:resource/:resourceId')
  @RequirePermission('org:read')
  @ApiOperation({ summary: 'Get audit trail for a resource' })
  @ApiParam({ name: 'orgId', description: 'Organization ID' })
  @ApiParam({ name: 'resource', description: 'Resource type' })
  @ApiParam({ name: 'resourceId', description: 'Resource ID' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Resource audit trail' })
  async getResourceHistory(
    @Param('orgId') orgId: string,
    @Param('resource') resource: string,
    @Param('resourceId') resourceId: string,
  ) {
    return this.auditService.getResourceHistory(orgId, resource, resourceId);
  }

  @Get('user/:userId')
  @RequirePermission('members:read')
  @ApiOperation({ summary: 'Get user activity' })
  @ApiParam({ name: 'orgId', description: 'Organization ID' })
  @ApiParam({ name: 'userId', description: 'User ID' })
  @ApiResponse({ status: HttpStatus.OK, description: 'User activity' })
  async getUserActivity(
    @Param('orgId') orgId: string,
    @Param('userId') userId: string,
    @Query('limit') limit?: number,
  ) {
    return this.auditService.getUserActivity(orgId, userId, limit || 50);
  }
}
