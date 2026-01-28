import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';
import { RegisterDeviceDto } from './dto/register-device.dto';
import { DevicePlatform, NotificationCategory } from '@prisma/client';

@Injectable()
export class MobileService {
  constructor(private prisma: PrismaService) {}

  async registerDevice(userId: string, dto: RegisterDeviceDto) {
    return this.prisma.pushNotificationToken.upsert({
      where: { userId_deviceId: { userId, deviceId: dto.deviceId } },
      update: { token: dto.token, platform: dto.platform, lastUsedAt: new Date() },
      create: {
        userId,
        deviceId: dto.deviceId,
        platform: dto.platform,
        token: dto.token,
      },
    });
  }

  async sendNotification(userId: string, title: string, body: string, category: NotificationCategory, data?: any) {
    return this.prisma.mobileNotification.create({
      data: { userId, title, body, category, data },
    });
  }

  async getNotifications(userId: string, limit: number = 50) {
    return this.prisma.mobileNotification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  async createDeepLink(targetType: string, targetId: string, campaign?: string) {
    const linkId = Math.random().toString(36).substring(7);
    return this.prisma.deepLink.create({
      data: { linkId, targetType, targetId, campaign },
    });
  }

  async trackDeepLink(linkId: string) {
    return this.prisma.deepLink.update({
      where: { linkId },
      data: { clickCount: { increment: 1 }, lastClickedAt: new Date() },
    });
  }

  async getAppConfig(platform?: DevicePlatform) {
    const where: any = { isActive: true };
    if (platform) where.platform = platform;
    return this.prisma.appConfig.findMany({ where });
  }
}
