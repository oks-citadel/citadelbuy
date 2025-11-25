import { Controller, Get, Post, Body, Query, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { MobileService } from './mobile.service';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { RegisterDeviceDto } from './dto/register-device.dto';
import { AuthRequest } from '@/common/types/auth-request.types';

@ApiTags('Mobile API')
@Controller('mobile')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class MobileController {
  constructor(private readonly mobileService: MobileService) {}

  @Post('devices/register')
  async registerDevice(@Request() req: AuthRequest, @Body() dto: RegisterDeviceDto) {
    return this.mobileService.registerDevice(req.user.id, dto);
  }

  @Get('notifications')
  async getNotifications(@Request() req: AuthRequest, @Query('limit') limit?: number) {
    return this.mobileService.getNotifications(req.user.id, limit ? Number(limit) : undefined);
  }

  @Get('config')
  async getAppConfig(@Query('platform') platform?: string) {
    return this.mobileService.getAppConfig(platform as any);
  }
}
