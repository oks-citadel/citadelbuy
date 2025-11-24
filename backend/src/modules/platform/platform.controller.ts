import { Controller, Get, Post, Body, Param, UseGuards, Request, Query } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { PlatformService } from './platform.service';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { RolesGuard } from '@/common/guards/roles.guard';
import { Roles } from '@/common/decorators/roles.decorator';
import { UserRole } from '@prisma/client';
import { AuthRequest } from '@/common/types/auth-request.types';

@ApiTags('Platform')
@Controller('platform')
export class PlatformController {
  constructor(private readonly platformService: PlatformService) {}

  @Get('health')
  async healthCheck() {
    return this.platformService.healthCheck();
  }

  @Get('vendor/commissions')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.VENDOR)
  @ApiBearerAuth()
  async getCommissions(@Request() req: AuthRequest) {
    return this.platformService.getVendorCommissions(req.user.id);
  }

  @Post('vendor/commissions/:id/payout')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  async payoutCommission(@Param('id') id: string) {
    return this.platformService.payoutCommission(id);
  }

  @Post('referral/create')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  async createReferral(@Request() req: AuthRequest, @Body() body: { refereeEmail: string }) {
    return this.platformService.createReferral(req.user.id, body.refereeEmail);
  }

  @Get('referral/stats')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  async getReferralStats(@Request() req: AuthRequest) {
    return this.platformService.getReferralStats(req.user.id);
  }

  @Get('cache/:key')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  async getCacheConfig(@Param('key') key: string) {
    return this.platformService.getCacheConfig(key);
  }

  @Get('rate-limits')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  async getRateLimits() {
    return this.platformService.getRateLimits();
  }
}
