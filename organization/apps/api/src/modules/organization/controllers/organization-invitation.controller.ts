import {
  Controller,
  Get,
  Post,
  Delete,
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
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { OrganizationInvitationService } from '../services/organization-invitation.service';
import { RequirePermission } from '../../organization-roles/decorators/require-permission.decorator';
import { OrganizationPermissionGuard } from '../../organization-roles/guards/permission.guard';

@ApiTags('Organization Invitations')
@Controller()
@ApiBearerAuth()
export class OrganizationInvitationController {
  constructor(private readonly invitationService: OrganizationInvitationService) {}

  // ==================== LIST PENDING INVITATIONS ====================

  @Get('organizations/:orgId/invitations')
  @UseGuards(JwtAuthGuard, OrganizationPermissionGuard)
  @RequirePermission('members:read')
  @ApiOperation({ summary: 'List pending invitations' })
  @ApiParam({ name: 'orgId', description: 'Organization ID' })
  @ApiResponse({ status: HttpStatus.OK, description: 'List of invitations' })
  async findAll(@Param('orgId') orgId: string) {
    return this.invitationService.findAll(orgId);
  }

  // ==================== CANCEL INVITATION ====================

  @Delete('organizations/:orgId/invitations/:inviteId')
  @UseGuards(JwtAuthGuard, OrganizationPermissionGuard)
  @RequirePermission('members:invite')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Cancel a pending invitation' })
  @ApiParam({ name: 'orgId', description: 'Organization ID' })
  @ApiParam({ name: 'inviteId', description: 'Invitation ID' })
  @ApiResponse({ status: HttpStatus.NO_CONTENT, description: 'Invitation cancelled' })
  async cancel(
    @Param('orgId') orgId: string,
    @Param('inviteId') inviteId: string,
  ) {
    return this.invitationService.cancel(orgId, inviteId);
  }

  // ==================== RESEND INVITATION ====================

  @Post('organizations/:orgId/invitations/:inviteId/resend')
  @UseGuards(JwtAuthGuard, OrganizationPermissionGuard)
  @RequirePermission('members:invite')
  @ApiOperation({ summary: 'Resend invitation email' })
  @ApiParam({ name: 'orgId', description: 'Organization ID' })
  @ApiParam({ name: 'inviteId', description: 'Invitation ID' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Invitation resent' })
  async resend(
    @Param('orgId') orgId: string,
    @Param('inviteId') inviteId: string,
  ) {
    return this.invitationService.resend(orgId, inviteId);
  }

  // ==================== ACCEPT INVITATION (PUBLIC) ====================

  @Post('invitations/:token/accept')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Accept an invitation' })
  @ApiParam({ name: 'token', description: 'Invitation token' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Invitation accepted' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Invalid or expired token' })
  async accept(
    @Param('token') token: string,
    @CurrentUser() user: { id: string },
  ) {
    return this.invitationService.accept(token, user.id);
  }

  // ==================== GET INVITATION INFO (PUBLIC) ====================

  @Get('invitations/:token')
  @ApiOperation({ summary: 'Get invitation details by token' })
  @ApiParam({ name: 'token', description: 'Invitation token' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Invitation details' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Invalid or expired token' })
  async getByToken(@Param('token') token: string) {
    return this.invitationService.getByToken(token);
  }

  // ==================== USER'S PENDING INVITATIONS ====================

  @Get('me/invitations')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get current user pending invitations' })
  @ApiResponse({ status: HttpStatus.OK, description: 'User invitations' })
  async getMyInvitations(@CurrentUser() user: { id: string; email: string }) {
    return this.invitationService.findForEmail(user.email);
  }
}
