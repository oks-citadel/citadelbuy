import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '@/common/prisma/prisma.service';

// Firebase admin SDK - optionally loaded if available
let admin: any = null;
try {
  admin = require('firebase-admin');
} catch {
  // firebase-admin not installed - push notifications will be mocked
}

export interface PushNotificationPayload {
  title: string;
  body: string;
  data?: Record<string, any>;
  imageUrl?: string;
  actionUrl?: string;
  badge?: number;
  sound?: string;
  priority?: 'high' | 'normal';
}

export interface SendPushResult {
  success: boolean;
  sentCount: number;
  failedCount: number;
  errors?: string[];
}

@Injectable()
export class PushNotificationService {
  private readonly logger = new Logger(PushNotificationService.name);
  private firebaseApp: any = null;
  private isInitialized = false;

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
  ) {
    this.initializeFirebase();
  }

  /**
   * Initialize Firebase Admin SDK for push notifications
   */
  private initializeFirebase() {
    try {
      const serviceAccountPath = this.configService.get('FIREBASE_SERVICE_ACCOUNT_PATH');
      const serviceAccountJson = this.configService.get('FIREBASE_SERVICE_ACCOUNT_JSON');
      const projectId = this.configService.get('FIREBASE_PROJECT_ID');

      if (serviceAccountPath) {
        // Initialize from file path
        const serviceAccount = require(serviceAccountPath);
        this.firebaseApp = admin.initializeApp({
          credential: admin.credential.cert(serviceAccount),
          projectId: serviceAccount.project_id,
        });
        this.isInitialized = true;
        this.logger.log('Firebase initialized from service account file');
      } else if (serviceAccountJson) {
        // Initialize from JSON string
        const serviceAccount = JSON.parse(serviceAccountJson);
        this.firebaseApp = admin.initializeApp({
          credential: admin.credential.cert(serviceAccount),
          projectId: serviceAccount.project_id,
        });
        this.isInitialized = true;
        this.logger.log('Firebase initialized from service account JSON');
      } else if (projectId) {
        // Initialize with application default credentials
        this.firebaseApp = admin.initializeApp({
          projectId,
        });
        this.isInitialized = true;
        this.logger.log('Firebase initialized with default credentials');
      } else {
        this.logger.warn(
          'Firebase not configured. Push notifications will be logged but not sent. ' +
          'Set FIREBASE_SERVICE_ACCOUNT_PATH, FIREBASE_SERVICE_ACCOUNT_JSON, or FIREBASE_PROJECT_ID',
        );
      }
    } catch (error) {
      this.logger.error('Failed to initialize Firebase', error);
      this.logger.warn('Push notifications will be logged but not sent');
    }
  }

  /**
   * Send push notification to a single device token
   */
  async sendToToken(
    token: string,
    payload: PushNotificationPayload,
  ): Promise<{ success: boolean; error?: string }> {
    if (!this.isInitialized || !this.firebaseApp) {
      this.logger.warn(
        `Push notification would be sent to token ${token.substring(0, 20)}... but Firebase is not initialized`,
      );
      return { success: false, error: 'Firebase not initialized' };
    }

    try {
      const message: any = {
        token,
        notification: {
          title: payload.title,
          body: payload.body,
          imageUrl: payload.imageUrl,
        },
        data: payload.data || {},
        android: {
          priority: payload.priority === 'high' ? 'high' : 'normal',
          notification: {
            sound: payload.sound || 'default',
            imageUrl: payload.imageUrl,
          },
        },
        apns: {
          payload: {
            aps: {
              badge: payload.badge,
              sound: payload.sound || 'default',
              contentAvailable: true,
            },
          },
          fcmOptions: {
            imageUrl: payload.imageUrl,
          },
        },
        webpush: payload.actionUrl
          ? {
              notification: {
                icon: '/icon-192x192.png',
                badge: '/badge-72x72.png',
                data: {
                  url: payload.actionUrl,
                },
              },
              fcmOptions: {
                link: payload.actionUrl,
              },
            }
          : undefined,
      };

      const response = await admin.messaging().send(message);
      this.logger.log(`Push notification sent successfully: ${response}`);
      return { success: true };
    } catch (error) {
      this.logger.error(`Failed to send push notification to token ${token.substring(0, 20)}...`, error);

      // Check for invalid token errors
      if (
        error.code === 'messaging/invalid-registration-token' ||
        error.code === 'messaging/registration-token-not-registered'
      ) {
        // Mark token as inactive
        await this.markTokenInactive(token);
      }

      return { success: false, error: error.message };
    }
  }

  /**
   * Send push notification to multiple device tokens
   */
  async sendToTokens(
    tokens: string[],
    payload: PushNotificationPayload,
  ): Promise<SendPushResult> {
    if (!this.isInitialized || !this.firebaseApp) {
      this.logger.warn(
        `Push notifications would be sent to ${tokens.length} tokens but Firebase is not initialized`,
      );
      return {
        success: false,
        sentCount: 0,
        failedCount: tokens.length,
        errors: ['Firebase not initialized'],
      };
    }

    if (tokens.length === 0) {
      return { success: true, sentCount: 0, failedCount: 0 };
    }

    try {
      const message: any = {
        tokens,
        notification: {
          title: payload.title,
          body: payload.body,
          imageUrl: payload.imageUrl,
        },
        data: payload.data || {},
        android: {
          priority: payload.priority === 'high' ? 'high' : 'normal',
          notification: {
            sound: payload.sound || 'default',
            imageUrl: payload.imageUrl,
          },
        },
        apns: {
          payload: {
            aps: {
              badge: payload.badge,
              sound: payload.sound || 'default',
              contentAvailable: true,
            },
          },
          fcmOptions: {
            imageUrl: payload.imageUrl,
          },
        },
        webpush: payload.actionUrl
          ? {
              notification: {
                icon: '/icon-192x192.png',
                badge: '/badge-72x72.png',
                data: {
                  url: payload.actionUrl,
                },
              },
              fcmOptions: {
                link: payload.actionUrl,
              },
            }
          : undefined,
      };

      const response = await admin.messaging().sendMulticast(message);

      this.logger.log(
        `Push notifications sent: ${response.successCount} succeeded, ${response.failureCount} failed`,
      );

      // Handle failed tokens
      const errors: string[] = [];
      if (response.failureCount > 0) {
        response.responses.forEach((resp: any, idx: number) => {
          if (!resp.success) {
            const token = tokens[idx];
            const error = resp.error;

            errors.push(`Token ${token.substring(0, 20)}...: ${error?.message || 'Unknown error'}`);

            // Mark invalid tokens as inactive
            if (
              error?.code === 'messaging/invalid-registration-token' ||
              error?.code === 'messaging/registration-token-not-registered'
            ) {
              this.markTokenInactive(token);
            }
          }
        });
      }

      return {
        success: response.successCount > 0,
        sentCount: response.successCount,
        failedCount: response.failureCount,
        errors: errors.length > 0 ? errors : undefined,
      };
    } catch (error) {
      this.logger.error('Failed to send multicast push notification', error);
      return {
        success: false,
        sentCount: 0,
        failedCount: tokens.length,
        errors: [error.message],
      };
    }
  }

  /**
   * Send push notification to a user (all their devices)
   */
  async sendToUser(
    userId: string,
    payload: PushNotificationPayload,
  ): Promise<SendPushResult> {
    // Get all active push tokens for the user
    const tokenRecords = await this.prisma.pushNotificationToken.findMany({
      where: {
        userId,
        isActive: true,
      },
    });

    if (tokenRecords.length === 0) {
      this.logger.warn(`No active push tokens found for user ${userId}`);
      return {
        success: false,
        sentCount: 0,
        failedCount: 0,
        errors: ['No active push tokens'],
      };
    }

    const tokens = tokenRecords.map((t) => t.token);
    this.logger.log(`Sending push notification to ${tokens.length} devices for user ${userId}`);

    return this.sendToTokens(tokens, payload);
  }

  /**
   * Send push notification to multiple users
   */
  async sendToUsers(
    userIds: string[],
    payload: PushNotificationPayload,
  ): Promise<{
    totalUsers: number;
    sentCount: number;
    failedCount: number;
    userResults: Record<string, SendPushResult>;
  }> {
    const results: Record<string, SendPushResult> = {};
    let totalSent = 0;
    let totalFailed = 0;

    for (const userId of userIds) {
      const result = await this.sendToUser(userId, payload);
      results[userId] = result;
      totalSent += result.sentCount;
      totalFailed += result.failedCount;
    }

    return {
      totalUsers: userIds.length,
      sentCount: totalSent,
      failedCount: totalFailed,
      userResults: results,
    };
  }

  /**
   * Send notification to a topic (for broadcast messages)
   */
  async sendToTopic(
    topic: string,
    payload: PushNotificationPayload,
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    if (!this.isInitialized || !this.firebaseApp) {
      this.logger.warn(
        `Push notification to topic ${topic} would be sent but Firebase is not initialized`,
      );
      return { success: false, error: 'Firebase not initialized' };
    }

    try {
      const message: any = {
        topic,
        notification: {
          title: payload.title,
          body: payload.body,
          imageUrl: payload.imageUrl,
        },
        data: payload.data || {},
        android: {
          priority: payload.priority === 'high' ? 'high' : 'normal',
        },
        apns: {
          payload: {
            aps: {
              badge: payload.badge,
              sound: payload.sound || 'default',
            },
          },
        },
      };

      const messageId = await admin.messaging().send(message);
      this.logger.log(`Push notification sent to topic ${topic}: ${messageId}`);
      return { success: true, messageId };
    } catch (error) {
      this.logger.error(`Failed to send push notification to topic ${topic}`, error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Subscribe user's tokens to a topic
   */
  async subscribeToTopic(
    userId: string,
    topic: string,
  ): Promise<{ success: boolean; error?: string }> {
    if (!this.isInitialized || !this.firebaseApp) {
      return { success: false, error: 'Firebase not initialized' };
    }

    const tokenRecords = await this.prisma.pushNotificationToken.findMany({
      where: { userId, isActive: true },
    });

    if (tokenRecords.length === 0) {
      return { success: false, error: 'No active tokens found' };
    }

    try {
      const tokens = tokenRecords.map((t) => t.token);
      await admin.messaging().subscribeToTopic(tokens, topic);
      this.logger.log(`Subscribed ${tokens.length} tokens to topic ${topic}`);
      return { success: true };
    } catch (error) {
      this.logger.error(`Failed to subscribe to topic ${topic}`, error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Unsubscribe user's tokens from a topic
   */
  async unsubscribeFromTopic(
    userId: string,
    topic: string,
  ): Promise<{ success: boolean; error?: string }> {
    if (!this.isInitialized || !this.firebaseApp) {
      return { success: false, error: 'Firebase not initialized' };
    }

    const tokenRecords = await this.prisma.pushNotificationToken.findMany({
      where: { userId, isActive: true },
    });

    if (tokenRecords.length === 0) {
      return { success: false, error: 'No active tokens found' };
    }

    try {
      const tokens = tokenRecords.map((t) => t.token);
      await admin.messaging().unsubscribeFromTopic(tokens, topic);
      this.logger.log(`Unsubscribed ${tokens.length} tokens from topic ${topic}`);
      return { success: true };
    } catch (error) {
      this.logger.error(`Failed to unsubscribe from topic ${topic}`, error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Mark a push token as inactive
   */
  private async markTokenInactive(token: string): Promise<void> {
    try {
      await this.prisma.pushNotificationToken.updateMany({
        where: { token },
        data: { isActive: false },
      });
      this.logger.log(`Marked token as inactive: ${token.substring(0, 20)}...`);
    } catch (error) {
      this.logger.error('Failed to mark token as inactive', error);
    }
  }

  /**
   * Validate a push token
   */
  async validateToken(token: string): Promise<boolean> {
    if (!this.isInitialized || !this.firebaseApp) {
      return false;
    }

    try {
      // Try to send a dry-run message
      await admin.messaging().send(
        {
          token,
          notification: {
            title: 'Test',
            body: 'Test',
          },
        },
        true, // dry run
      );
      return true;
    } catch (error) {
      return false;
    }
  }
}
