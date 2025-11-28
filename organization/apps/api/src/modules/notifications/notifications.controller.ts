import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { NotificationsService } from './notifications.service';
import {
  UpdateNotificationPreferencesDto,
  RegisterPushTokenDto,
} from './dto';
import { NotificationCategory } from '@prisma/client';

@ApiTags('Notifications')
@Controller('notifications')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  @ApiOperation({ summary: 'Get user notifications' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'offset', required: false, type: Number })
  @ApiQuery({ name: 'unreadOnly', required: false, type: Boolean })
  @ApiQuery({ name: 'category', required: false, enum: NotificationCategory })
  async getNotifications(
    @CurrentUser('id') userId: string,
    @Query('limit') limit?: number,
    @Query('offset') offset?: number,
    @Query('unreadOnly') unreadOnly?: boolean,
    @Query('category') category?: NotificationCategory
  ) {
    return this.notificationsService.getNotifications(userId, {
      limit: limit ? Number(limit) : undefined,
      offset: offset ? Number(offset) : undefined,
      unreadOnly: unreadOnly === true || unreadOnly === 'true' as any,
      category,
    });
  }

  @Get('unread-count')
  @ApiOperation({ summary: 'Get unread notification count' })
  async getUnreadCount(@CurrentUser('id') userId: string) {
    const count = await this.notificationsService.getUnreadCount(userId);
    return { unreadCount: count };
  }

  @Put(':id/read')
  @ApiOperation({ summary: 'Mark notification as read' })
  async markAsRead(
    @CurrentUser('id') userId: string,
    @Param('id') notificationId: string
  ) {
    return this.notificationsService.markAsRead(userId, notificationId);
  }

  @Put('read-all')
  @ApiOperation({ summary: 'Mark all notifications as read' })
  async markAllAsRead(@CurrentUser('id') userId: string) {
    return this.notificationsService.markAllAsRead(userId);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a notification' })
  async deleteNotification(
    @CurrentUser('id') userId: string,
    @Param('id') notificationId: string
  ) {
    return this.notificationsService.deleteNotification(userId, notificationId);
  }

  @Delete()
  @ApiOperation({ summary: 'Delete all notifications' })
  async deleteAllNotifications(@CurrentUser('id') userId: string) {
    return this.notificationsService.deleteAllNotifications(userId);
  }

  @Get('preferences')
  @ApiOperation({ summary: 'Get notification preferences' })
  async getPreferences(@CurrentUser('id') userId: string) {
    return this.notificationsService.getPreferences(userId);
  }

  @Put('preferences')
  @ApiOperation({ summary: 'Update notification preferences' })
  async updatePreferences(
    @CurrentUser('id') userId: string,
    @Body() dto: UpdateNotificationPreferencesDto
  ) {
    return this.notificationsService.updatePreferences(userId, dto);
  }

  @Post('register-token')
  @ApiOperation({ summary: 'Register push notification token' })
  async registerPushToken(
    @CurrentUser('id') userId: string,
    @Body() dto: RegisterPushTokenDto
  ) {
    return this.notificationsService.registerPushToken(
      userId,
      dto.deviceId,
      dto.token,
      dto.platform
    );
  }

  @Post('unregister-token')
  @ApiOperation({ summary: 'Unregister push notification token' })
  async unregisterPushToken(
    @CurrentUser('id') userId: string,
    @Body('deviceId') deviceId: string
  ) {
    return this.notificationsService.unregisterPushToken(userId, deviceId);
  }
}
