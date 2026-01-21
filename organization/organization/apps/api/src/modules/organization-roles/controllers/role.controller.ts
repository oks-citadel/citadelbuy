import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
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
import { RoleService } from '../services/role.service';
import { CreateRoleDto, UpdateRoleDto } from '../dto/create-role.dto';
import { RequirePermission } from '../decorators/require-permission.decorator';
import { OrganizationPermissionGuard } from '../guards/permission.guard';

@ApiTags('Organization Roles')
@Controller('organizations/:orgId/roles')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, OrganizationPermissionGuard)
export class RoleController {
  constructor(private readonly roleService: RoleService) {}

  @Get()
  @RequirePermission('org:read')
  @ApiOperation({ summary: 'List all roles (system + custom)' })
  @ApiParam({ name: 'orgId', description: 'Organization ID' })
  @ApiResponse({ status: HttpStatus.OK, description: 'List of roles' })
  async findAll(@Param('orgId') orgId: string) {
    return this.roleService.findAll(orgId);
  }

  @Get(':roleId')
  @RequirePermission('org:read')
  @ApiOperation({ summary: 'Get role details' })
  @ApiParam({ name: 'orgId', description: 'Organization ID' })
  @ApiParam({ name: 'roleId', description: 'Role ID' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Role details' })
  async findOne(
    @Param('orgId') orgId: string,
    @Param('roleId') roleId: string,
  ) {
    return this.roleService.findOne(orgId, roleId);
  }

  @Get(':roleId/members')
  @RequirePermission('members:read')
  @ApiOperation({ summary: 'Get members with this role' })
  @ApiParam({ name: 'orgId', description: 'Organization ID' })
  @ApiParam({ name: 'roleId', description: 'Role ID' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Role members' })
  async getRoleMembers(
    @Param('orgId') orgId: string,
    @Param('roleId') roleId: string,
  ) {
    return this.roleService.getRoleMembers(orgId, roleId);
  }

  @Post()
  @RequirePermission('members:manage_roles')
  @ApiOperation({ summary: 'Create a custom role' })
  @ApiParam({ name: 'orgId', description: 'Organization ID' })
  @ApiResponse({ status: HttpStatus.CREATED, description: 'Role created' })
  async create(
    @Param('orgId') orgId: string,
    @Body() dto: CreateRoleDto,
  ) {
    return this.roleService.create(orgId, dto);
  }

  @Patch(':roleId')
  @RequirePermission('members:manage_roles')
  @ApiOperation({ summary: 'Update a custom role' })
  @ApiParam({ name: 'orgId', description: 'Organization ID' })
  @ApiParam({ name: 'roleId', description: 'Role ID' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Role updated' })
  async update(
    @Param('orgId') orgId: string,
    @Param('roleId') roleId: string,
    @Body() dto: UpdateRoleDto,
  ) {
    return this.roleService.update(orgId, roleId, dto);
  }

  @Delete(':roleId')
  @RequirePermission('members:manage_roles')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a custom role' })
  @ApiParam({ name: 'orgId', description: 'Organization ID' })
  @ApiParam({ name: 'roleId', description: 'Role ID' })
  @ApiResponse({ status: HttpStatus.NO_CONTENT, description: 'Role deleted' })
  async remove(
    @Param('orgId') orgId: string,
    @Param('roleId') roleId: string,
  ) {
    return this.roleService.remove(orgId, roleId);
  }
}
