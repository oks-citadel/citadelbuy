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
import { OrganizationTeamService } from '../services/organization-team.service';
import { CreateTeamDto, UpdateTeamDto } from '../dto';
import { RequirePermission } from '../../organization-roles/decorators/require-permission.decorator';
import { OrganizationPermissionGuard } from '../../organization-roles/guards/permission.guard';

@ApiTags('Organization Teams')
@Controller('organizations/:orgId/teams')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, OrganizationPermissionGuard)
export class OrganizationTeamController {
  constructor(private readonly teamService: OrganizationTeamService) {}

  @Get()
  @RequirePermission('teams:read')
  @ApiOperation({ summary: 'List all teams' })
  @ApiParam({ name: 'orgId', description: 'Organization ID' })
  @ApiResponse({ status: HttpStatus.OK, description: 'List of teams' })
  async findAll(@Param('orgId') orgId: string) {
    return this.teamService.findAll(orgId);
  }

  @Get(':teamId')
  @RequirePermission('teams:read')
  @ApiOperation({ summary: 'Get team details' })
  @ApiParam({ name: 'orgId', description: 'Organization ID' })
  @ApiParam({ name: 'teamId', description: 'Team ID' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Team details' })
  async findOne(
    @Param('orgId') orgId: string,
    @Param('teamId') teamId: string,
  ) {
    return this.teamService.findOne(orgId, teamId);
  }

  @Post()
  @RequirePermission('teams:create')
  @ApiOperation({ summary: 'Create a new team' })
  @ApiParam({ name: 'orgId', description: 'Organization ID' })
  @ApiResponse({ status: HttpStatus.CREATED, description: 'Team created' })
  async create(
    @Param('orgId') orgId: string,
    @Body() dto: CreateTeamDto,
  ) {
    return this.teamService.create(orgId, dto);
  }

  @Patch(':teamId')
  @RequirePermission('teams:update')
  @ApiOperation({ summary: 'Update team' })
  @ApiParam({ name: 'orgId', description: 'Organization ID' })
  @ApiParam({ name: 'teamId', description: 'Team ID' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Team updated' })
  async update(
    @Param('orgId') orgId: string,
    @Param('teamId') teamId: string,
    @Body() dto: UpdateTeamDto,
  ) {
    return this.teamService.update(orgId, teamId, dto);
  }

  @Delete(':teamId')
  @RequirePermission('teams:delete')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete team' })
  @ApiParam({ name: 'orgId', description: 'Organization ID' })
  @ApiParam({ name: 'teamId', description: 'Team ID' })
  @ApiResponse({ status: HttpStatus.NO_CONTENT, description: 'Team deleted' })
  async remove(
    @Param('orgId') orgId: string,
    @Param('teamId') teamId: string,
  ) {
    return this.teamService.remove(orgId, teamId);
  }

  @Get(':teamId/members')
  @RequirePermission('teams:read')
  @ApiOperation({ summary: 'Get team members' })
  @ApiParam({ name: 'orgId', description: 'Organization ID' })
  @ApiParam({ name: 'teamId', description: 'Team ID' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Team members' })
  async getMembers(
    @Param('orgId') orgId: string,
    @Param('teamId') teamId: string,
  ) {
    return this.teamService.getMembers(orgId, teamId);
  }

  @Post(':teamId/members')
  @RequirePermission('teams:update')
  @ApiOperation({ summary: 'Add members to team' })
  @ApiParam({ name: 'orgId', description: 'Organization ID' })
  @ApiParam({ name: 'teamId', description: 'Team ID' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Members added to team' })
  async addMembers(
    @Param('orgId') orgId: string,
    @Param('teamId') teamId: string,
    @Body() body: { memberIds: string[] },
  ) {
    return this.teamService.addMembers(orgId, teamId, body.memberIds);
  }

  @Delete(':teamId/members/:memberId')
  @RequirePermission('teams:update')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove member from team' })
  @ApiParam({ name: 'orgId', description: 'Organization ID' })
  @ApiParam({ name: 'teamId', description: 'Team ID' })
  @ApiParam({ name: 'memberId', description: 'Member ID' })
  @ApiResponse({ status: HttpStatus.NO_CONTENT, description: 'Member removed from team' })
  async removeMember(
    @Param('orgId') orgId: string,
    @Param('teamId') teamId: string,
    @Param('memberId') memberId: string,
  ) {
    return this.teamService.removeMember(orgId, teamId, memberId);
  }
}
