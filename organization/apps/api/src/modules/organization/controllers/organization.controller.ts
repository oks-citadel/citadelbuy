import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpStatus,
  HttpCode,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { OrganizationService } from '../services/organization.service';
import {
  CreateOrganizationDto,
  UpdateOrganizationDto,
  OrganizationQueryDto,
} from '../dto';
import { RequirePermission } from '../../organization-roles/decorators/require-permission.decorator';
import { OrganizationPermissionGuard } from '../../organization-roles/guards/permission.guard';

@ApiTags('Organizations')
@Controller('organizations')
@ApiBearerAuth()
export class OrganizationController {
  constructor(private readonly organizationService: OrganizationService) {}

  // ==================== CREATE ====================

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Create a new organization' })
  @ApiResponse({ status: HttpStatus.CREATED, description: 'Organization created' })
  @ApiResponse({ status: HttpStatus.CONFLICT, description: 'Slug already exists' })
  async create(
    @CurrentUser() user: { id: string },
    @Body() dto: CreateOrganizationDto,
  ) {
    return this.organizationService.create(user.id, dto);
  }

  // ==================== READ ====================

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'List organizations the user belongs to' })
  @ApiResponse({ status: HttpStatus.OK, description: 'List of organizations' })
  async findAll(
    @CurrentUser() user: { id: string },
    @Query() query: OrganizationQueryDto,
  ) {
    return this.organizationService.findAllForUser(user.id, query);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard, OrganizationPermissionGuard)
  @RequirePermission('org:read')
  @ApiOperation({ summary: 'Get organization by ID' })
  @ApiParam({ name: 'id', description: 'Organization ID or slug' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Organization details' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Organization not found' })
  async findOne(@Param('id') id: string) {
    return this.organizationService.findOne(id);
  }

  @Get(':id/dashboard')
  @UseGuards(JwtAuthGuard, OrganizationPermissionGuard)
  @RequirePermission('org:read')
  @ApiOperation({ summary: 'Get organization dashboard data' })
  @ApiParam({ name: 'id', description: 'Organization ID' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Dashboard data' })
  async getDashboard(@Param('id') id: string) {
    return this.organizationService.getDashboard(id);
  }

  // ==================== UPDATE ====================

  @Patch(':id')
  @UseGuards(JwtAuthGuard, OrganizationPermissionGuard)
  @RequirePermission('org:update')
  @ApiOperation({ summary: 'Update organization' })
  @ApiParam({ name: 'id', description: 'Organization ID' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Organization updated' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateOrganizationDto,
  ) {
    return this.organizationService.update(id, dto);
  }

  // ==================== DELETE ====================

  @Delete(':id')
  @UseGuards(JwtAuthGuard, OrganizationPermissionGuard)
  @RequirePermission('org:delete')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete organization (soft delete)' })
  @ApiParam({ name: 'id', description: 'Organization ID' })
  @ApiResponse({ status: HttpStatus.NO_CONTENT, description: 'Organization deleted' })
  async remove(@Param('id') id: string) {
    return this.organizationService.softDelete(id);
  }

  // ==================== SETTINGS ====================

  @Get(':id/settings')
  @UseGuards(JwtAuthGuard, OrganizationPermissionGuard)
  @RequirePermission('settings:read')
  @ApiOperation({ summary: 'Get organization settings' })
  @ApiParam({ name: 'id', description: 'Organization ID' })
  async getSettings(@Param('id') id: string) {
    return this.organizationService.getSettings(id);
  }

  @Patch(':id/settings')
  @UseGuards(JwtAuthGuard, OrganizationPermissionGuard)
  @RequirePermission('settings:update')
  @ApiOperation({ summary: 'Update organization settings' })
  @ApiParam({ name: 'id', description: 'Organization ID' })
  async updateSettings(
    @Param('id') id: string,
    @Body() settings: Record<string, any>,
  ) {
    return this.organizationService.updateSettings(id, settings);
  }
}
