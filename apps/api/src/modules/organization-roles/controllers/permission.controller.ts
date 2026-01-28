import {
  Controller,
  Get,
  UseGuards,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { PermissionService } from '../services/permission.service';

@ApiTags('Permissions')
@Controller('permissions')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
export class PermissionController {
  constructor(private readonly permissionService: PermissionService) {}

  @Get()
  @ApiOperation({ summary: 'List all available permissions' })
  @ApiResponse({ status: HttpStatus.OK, description: 'List of permissions' })
  async findAll() {
    return this.permissionService.getAllPermissions();
  }

  @Get('by-category')
  @ApiOperation({ summary: 'Get permissions grouped by category' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Permissions by category' })
  async getByCategory() {
    return this.permissionService.getPermissionsByCategory();
  }
}
