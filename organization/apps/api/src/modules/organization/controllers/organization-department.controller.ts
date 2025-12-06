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
import { OrganizationDepartmentService } from '../services/organization-department.service';
import { CreateDepartmentDto, UpdateDepartmentDto } from '../dto';
import { RequirePermission } from '../../organization-roles/decorators/require-permission.decorator';
import { OrganizationPermissionGuard } from '../../organization-roles/guards/permission.guard';

@ApiTags('Organization Departments')
@Controller('organizations/:orgId/departments')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, OrganizationPermissionGuard)
export class OrganizationDepartmentController {
  constructor(private readonly departmentService: OrganizationDepartmentService) {}

  @Get()
  @RequirePermission('org:read')
  @ApiOperation({ summary: 'List all departments' })
  @ApiParam({ name: 'orgId', description: 'Organization ID' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Department tree' })
  async findAll(@Param('orgId') orgId: string) {
    return this.departmentService.findAll(orgId);
  }

  @Get('tree')
  @RequirePermission('org:read')
  @ApiOperation({ summary: 'Get department hierarchy tree' })
  @ApiParam({ name: 'orgId', description: 'Organization ID' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Department tree' })
  async getTree(@Param('orgId') orgId: string) {
    return this.departmentService.getTree(orgId);
  }

  @Get(':deptId')
  @RequirePermission('org:read')
  @ApiOperation({ summary: 'Get department details' })
  @ApiParam({ name: 'orgId', description: 'Organization ID' })
  @ApiParam({ name: 'deptId', description: 'Department ID' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Department details' })
  async findOne(
    @Param('orgId') orgId: string,
    @Param('deptId') deptId: string,
  ) {
    return this.departmentService.findOne(orgId, deptId);
  }

  @Post()
  @RequirePermission('org:update')
  @ApiOperation({ summary: 'Create a new department' })
  @ApiParam({ name: 'orgId', description: 'Organization ID' })
  @ApiResponse({ status: HttpStatus.CREATED, description: 'Department created' })
  async create(
    @Param('orgId') orgId: string,
    @Body() dto: CreateDepartmentDto,
  ) {
    return this.departmentService.create(orgId, dto);
  }

  @Patch(':deptId')
  @RequirePermission('org:update')
  @ApiOperation({ summary: 'Update department' })
  @ApiParam({ name: 'orgId', description: 'Organization ID' })
  @ApiParam({ name: 'deptId', description: 'Department ID' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Department updated' })
  async update(
    @Param('orgId') orgId: string,
    @Param('deptId') deptId: string,
    @Body() dto: UpdateDepartmentDto,
  ) {
    return this.departmentService.update(orgId, deptId, dto);
  }

  @Delete(':deptId')
  @RequirePermission('org:update')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete department' })
  @ApiParam({ name: 'orgId', description: 'Organization ID' })
  @ApiParam({ name: 'deptId', description: 'Department ID' })
  @ApiResponse({ status: HttpStatus.NO_CONTENT, description: 'Department deleted' })
  async remove(
    @Param('orgId') orgId: string,
    @Param('deptId') deptId: string,
  ) {
    return this.departmentService.remove(orgId, deptId);
  }
}
