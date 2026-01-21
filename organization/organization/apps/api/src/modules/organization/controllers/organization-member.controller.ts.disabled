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
import { OrganizationMemberService } from '../services/organization-member.service';
import {
  InviteMemberDto,
  BulkInviteMembersDto,
  UpdateMemberDto,
  MemberQueryDto,
} from '../dto';
import { RequirePermission } from '../../organization-roles/decorators/require-permission.decorator';
import { OrganizationPermissionGuard } from '../../organization-roles/guards/permission.guard';

@ApiTags('Organization Members')
@Controller('organizations/:orgId/members')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, OrganizationPermissionGuard)
export class OrganizationMemberController {
  constructor(private readonly memberService: OrganizationMemberService) {}

  // ==================== LIST MEMBERS ====================

  @Get()
  @RequirePermission('members:read')
  @ApiOperation({ summary: 'List organization members' })
  @ApiParam({ name: 'orgId', description: 'Organization ID' })
  @ApiResponse({ status: HttpStatus.OK, description: 'List of members' })
  async findAll(
    @Param('orgId') orgId: string,
    @Query() query: MemberQueryDto,
  ) {
    return this.memberService.findAll(orgId, query);
  }

  @Get(':userId')
  @RequirePermission('members:read')
  @ApiOperation({ summary: 'Get member details' })
  @ApiParam({ name: 'orgId', description: 'Organization ID' })
  @ApiParam({ name: 'userId', description: 'User ID' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Member details' })
  async findOne(
    @Param('orgId') orgId: string,
    @Param('userId') userId: string,
  ) {
    return this.memberService.findOne(orgId, userId);
  }

  // ==================== INVITE MEMBERS ====================

  @Post('invite')
  @RequirePermission('members:invite')
  @ApiOperation({ summary: 'Invite a new member' })
  @ApiParam({ name: 'orgId', description: 'Organization ID' })
  @ApiResponse({ status: HttpStatus.CREATED, description: 'Invitation sent' })
  async invite(
    @Param('orgId') orgId: string,
    @CurrentUser() user: { id: string },
    @Body() dto: InviteMemberDto,
  ) {
    return this.memberService.invite(orgId, user.id, dto);
  }

  @Post('invite/bulk')
  @RequirePermission('members:invite')
  @ApiOperation({ summary: 'Bulk invite members' })
  @ApiParam({ name: 'orgId', description: 'Organization ID' })
  @ApiResponse({ status: HttpStatus.CREATED, description: 'Invitations sent' })
  async bulkInvite(
    @Param('orgId') orgId: string,
    @CurrentUser() user: { id: string },
    @Body() dto: BulkInviteMembersDto,
  ) {
    return this.memberService.bulkInvite(orgId, user.id, dto);
  }

  // ==================== UPDATE MEMBERS ====================

  @Patch(':userId')
  @RequirePermission('members:manage_roles')
  @ApiOperation({ summary: 'Update member details' })
  @ApiParam({ name: 'orgId', description: 'Organization ID' })
  @ApiParam({ name: 'userId', description: 'User ID' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Member updated' })
  async update(
    @Param('orgId') orgId: string,
    @Param('userId') userId: string,
    @CurrentUser() currentUser: { id: string },
    @Body() dto: UpdateMemberDto,
  ) {
    return this.memberService.update(orgId, userId, currentUser.id, dto);
  }

  // ==================== REMOVE MEMBERS ====================

  @Delete(':userId')
  @RequirePermission('members:remove')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove member from organization' })
  @ApiParam({ name: 'orgId', description: 'Organization ID' })
  @ApiParam({ name: 'userId', description: 'User ID' })
  @ApiResponse({ status: HttpStatus.NO_CONTENT, description: 'Member removed' })
  async remove(
    @Param('orgId') orgId: string,
    @Param('userId') userId: string,
    @CurrentUser() currentUser: { id: string },
  ) {
    return this.memberService.remove(orgId, userId, currentUser.id);
  }

  // ==================== MY PERMISSIONS ====================

  @Get('me/permissions')
  @ApiOperation({ summary: 'Get current user permissions in organization' })
  @ApiParam({ name: 'orgId', description: 'Organization ID' })
  @ApiResponse({ status: HttpStatus.OK, description: 'User permissions' })
  async getMyPermissions(
    @Param('orgId') orgId: string,
    @CurrentUser() user: { id: string },
  ) {
    return this.memberService.getPermissions(orgId, user.id);
  }
}
