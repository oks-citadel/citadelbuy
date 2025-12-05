import { Controller, Post, Get, Param, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { AccountLockoutService } from './account-lockout.service';

@ApiTags('Admin - Account Security')
@Controller('auth/admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class AdminAuthController {
  constructor(private readonly accountLockoutService: AccountLockoutService) {}

  @Post('unlock/:email')
  @Roles('ADMIN')
  @ApiOperation({
    summary: 'Unlock a locked user account',
    description: 'Admins can manually unlock accounts that have been locked due to failed login attempts.',
  })
  @ApiParam({ name: 'email', description: 'Email address of the account to unlock' })
  @ApiResponse({
    status: 200,
    description: 'Account unlocked successfully',
    schema: {
      example: {
        message: 'Account unlocked successfully',
        email: 'user@example.com',
      },
    },
  })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin access required' })
  @ApiResponse({ status: 404, description: 'Account not found or not locked' })
  async unlockAccount(
    @Param('email') email: string,
    @Request() req: any,
  ) {
    await this.accountLockoutService.adminUnlock(email, req.user.id);

    return {
      message: 'Account unlocked successfully',
      email,
    };
  }

  @Get('lockout-status/:email')
  @Roles('ADMIN')
  @ApiOperation({
    summary: 'Get account lockout status',
    description: 'Check if an account is locked and get lockout details.',
  })
  @ApiParam({ name: 'email', description: 'Email address to check' })
  @ApiResponse({
    status: 200,
    description: 'Lockout status retrieved',
    schema: {
      example: {
        email: 'user@example.com',
        isLocked: true,
        attempts: 0,
        lockedUntil: '2025-12-04T15:30:00.000Z',
        lockCount: 2,
      },
    },
  })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin access required' })
  async getLockoutStatus(@Param('email') email: string) {
    const status = await this.accountLockoutService.getLockoutStatus(email);

    return {
      email,
      ...status,
    };
  }

  @Get('security-logs/:email')
  @Roles('ADMIN')
  @ApiOperation({
    summary: 'Get security audit logs for an account',
    description: 'View failed login attempts and security events for a specific user.',
  })
  @ApiParam({ name: 'email', description: 'Email address to check' })
  @ApiResponse({
    status: 200,
    description: 'Security logs retrieved',
    schema: {
      example: {
        email: 'user@example.com',
        logs: [
          {
            email: 'user@example.com',
            ipAddress: '192.168.1.1',
            event: 'failed_login',
            timestamp: '2025-12-04T14:30:00.000Z',
            metadata: { attempts: 3 },
          },
        ],
      },
    },
  })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin access required' })
  async getSecurityLogs(@Param('email') email: string) {
    const logs = await this.accountLockoutService.getSecurityLogs(email, 50);

    return {
      email,
      logs,
    };
  }
}
