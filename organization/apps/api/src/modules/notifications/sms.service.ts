import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '@/common/prisma/prisma.service';

// Twilio SDK - optionally loaded if available
let Twilio: any = null;
try {
  Twilio = require('twilio');
} catch {
  // twilio not installed - SMS will be mocked
}

export interface SmsPayload {
  to: string;
  message: string;
  scheduledAt?: Date;
}

export interface SendSmsResult {
  success: boolean;
  messageId?: string;
  error?: string;
  status?: string;
}

@Injectable()
export class SmsService {
  private readonly logger = new Logger(SmsService.name);
  private twilioClient: any = null;
  private fromNumber: string | null = null;
  private isInitialized = false;

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
  ) {
    this.initializeTwilio();
  }

  /**
   * Initialize Twilio client
   */
  private initializeTwilio() {
    try {
      const accountSid = this.configService.get('TWILIO_ACCOUNT_SID');
      const authToken = this.configService.get('TWILIO_AUTH_TOKEN');
      const fromNumber = this.configService.get('TWILIO_PHONE_NUMBER');

      if (accountSid && authToken && fromNumber) {
        this.twilioClient = new Twilio(accountSid, authToken);
        this.fromNumber = fromNumber;
        this.isInitialized = true;
        this.logger.log('Twilio SMS service initialized');
      } else {
        this.logger.warn(
          'Twilio not configured. SMS messages will be logged but not sent. ' +
          'Set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_PHONE_NUMBER',
        );
      }
    } catch (error) {
      this.logger.error('Failed to initialize Twilio', error);
      this.logger.warn('SMS messages will be logged but not sent');
    }
  }

  /**
   * Send SMS to a phone number
   */
  async sendSms(payload: SmsPayload): Promise<SendSmsResult> {
    // Validate phone number format
    const phoneNumber = this.normalizePhoneNumber(payload.to);
    if (!phoneNumber) {
      return {
        success: false,
        error: 'Invalid phone number format',
      };
    }

    if (!this.isInitialized || !this.twilioClient || !this.fromNumber) {
      this.logger.warn(
        `SMS would be sent to ${phoneNumber}: "${payload.message}" but Twilio is not initialized`,
      );
      return {
        success: false,
        error: 'Twilio not initialized',
      };
    }

    try {
      const messageOptions: any = {
        body: payload.message,
        from: this.fromNumber,
        to: phoneNumber,
      };

      // Schedule message if scheduledAt is provided
      if (payload.scheduledAt) {
        messageOptions.scheduleType = 'fixed';
        messageOptions.sendAt = payload.scheduledAt;
      }

      const message = await this.twilioClient.messages.create(messageOptions);

      this.logger.log(`SMS sent successfully: ${message.sid} to ${phoneNumber}`);

      return {
        success: true,
        messageId: message.sid,
        status: message.status,
      };
    } catch (error) {
      this.logger.error(`Failed to send SMS to ${phoneNumber}`, error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Send SMS to multiple recipients
   */
  async sendBulkSms(
    recipients: string[],
    message: string,
  ): Promise<{
    totalRecipients: number;
    sentCount: number;
    failedCount: number;
    results: Record<string, SendSmsResult>;
  }> {
    const results: Record<string, SendSmsResult> = {};
    let sentCount = 0;
    let failedCount = 0;

    for (const recipient of recipients) {
      const result = await this.sendSms({
        to: recipient,
        message,
      });

      results[recipient] = result;

      if (result.success) {
        sentCount++;
      } else {
        failedCount++;
      }

      // Rate limiting: Add small delay between messages
      await this.delay(100);
    }

    this.logger.log(
      `Bulk SMS completed: ${sentCount} sent, ${failedCount} failed out of ${recipients.length}`,
    );

    return {
      totalRecipients: recipients.length,
      sentCount,
      failedCount,
      results,
    };
  }

  /**
   * Send order update SMS
   */
  async sendOrderUpdateSms(
    phoneNumber: string,
    orderNumber: string,
    status: string,
    trackingNumber?: string,
  ): Promise<SendSmsResult> {
    let message = `Broxiva Order Update: Your order #${orderNumber} is now ${status}.`;

    if (trackingNumber) {
      message += ` Track your package: ${trackingNumber}`;
    }

    return this.sendSms({
      to: phoneNumber,
      message,
    });
  }

  /**
   * Send delivery notification SMS
   */
  async sendDeliveryNotificationSms(
    phoneNumber: string,
    orderNumber: string,
    estimatedDelivery?: string,
  ): Promise<SendSmsResult> {
    let message = `Broxiva: Your order #${orderNumber} is out for delivery!`;

    if (estimatedDelivery) {
      message += ` Expected by ${estimatedDelivery}.`;
    }

    message += ' Be ready to receive your package.';

    return this.sendSms({
      to: phoneNumber,
      message,
    });
  }

  /**
   * Send verification code SMS
   */
  async sendVerificationCodeSms(
    phoneNumber: string,
    code: string,
  ): Promise<SendSmsResult> {
    const message = `Your Broxiva verification code is: ${code}. This code expires in 10 minutes.`;

    return this.sendSms({
      to: phoneNumber,
      message,
    });
  }

  /**
   * Send password reset SMS
   */
  async sendPasswordResetSms(
    phoneNumber: string,
    code: string,
  ): Promise<SendSmsResult> {
    const message = `Broxiva password reset code: ${code}. If you didn't request this, please ignore this message.`;

    return this.sendSms({
      to: phoneNumber,
      message,
    });
  }

  /**
   * Send promotional SMS
   */
  async sendPromotionalSms(
    phoneNumber: string,
    promoMessage: string,
  ): Promise<SendSmsResult> {
    // Add unsubscribe notice as required by regulations
    const message = `${promoMessage}\n\nReply STOP to unsubscribe.`;

    return this.sendSms({
      to: phoneNumber,
      message,
    });
  }

  /**
   * Check if user can receive SMS based on preferences
   */
  async canReceiveSms(userId: string, smsType: string): Promise<boolean> {
    const preferences = await this.prisma.notificationPreference.findUnique({
      where: { userId },
    });

    if (!preferences || !preferences.smsEnabled) {
      return false;
    }

    // Check specific SMS type preferences
    // Note: smsOrderUpdates and smsDeliveryAlerts fields not yet in schema
    // Using shippingUpdates and deliveryNotifications as fallback
    switch (smsType) {
      case 'order_updates':
        return preferences.shippingUpdates ?? false;
      case 'delivery_alerts':
        return preferences.deliveryNotifications ?? false;
      default:
        return true; // Default to true for transactional SMS
    }
  }

  /**
   * Send SMS to user with preference check
   */
  async sendSmsToUser(
    userId: string,
    message: string,
    smsType: string = 'general',
  ): Promise<SendSmsResult> {
    // Check preferences
    const canSend = await this.canReceiveSms(userId, smsType);
    if (!canSend) {
      this.logger.log(`User ${userId} has opted out of ${smsType} SMS`);
      return {
        success: false,
        error: 'User opted out of SMS notifications',
      };
    }

    // Fetch user with phone number
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        phoneNumber: true,
        phoneVerified: true,
      },
    });

    if (!user) {
      return {
        success: false,
        error: 'User not found',
      };
    }

    if (!user.phoneNumber) {
      this.logger.log(`User ${userId} does not have a phone number configured`);
      return {
        success: false,
        error: 'Phone number not available in user profile',
      };
    }

    // Optional: Check if phone is verified for non-critical messages
    if (!user.phoneVerified && smsType !== 'verification') {
      this.logger.warn(`User ${userId} phone number not verified, sending anyway`);
    }

    return this.sendSms({
      to: user.phoneNumber,
      message,
    });
  }

  /**
   * Get SMS delivery status
   */
  async getSmsStatus(messageId: string): Promise<{
    status: string;
    errorCode?: string;
    errorMessage?: string;
  } | null> {
    if (!this.isInitialized || !this.twilioClient) {
      return null;
    }

    try {
      const message = await this.twilioClient.messages(messageId).fetch();
      return {
        status: message.status,
        errorCode: message.errorCode?.toString(),
        errorMessage: message.errorMessage || undefined,
      };
    } catch (error) {
      this.logger.error(`Failed to get SMS status for ${messageId}`, error);
      return null;
    }
  }

  /**
   * Normalize phone number to E.164 format
   */
  private normalizePhoneNumber(phoneNumber: string): string | null {
    // Remove all non-numeric characters
    const cleaned = phoneNumber.replace(/\D/g, '');

    // Check if it's a valid length
    if (cleaned.length < 10 || cleaned.length > 15) {
      return null;
    }

    // Add + prefix if not present
    if (!phoneNumber.startsWith('+')) {
      // Assume US number if no country code
      if (cleaned.length === 10) {
        return `+1${cleaned}`;
      }
      return `+${cleaned}`;
    }

    return phoneNumber;
  }

  /**
   * Validate phone number format
   */
  async validatePhoneNumber(phoneNumber: string): Promise<{
    valid: boolean;
    formatted?: string;
    error?: string;
  }> {
    const normalized = this.normalizePhoneNumber(phoneNumber);

    if (!normalized) {
      return {
        valid: false,
        error: 'Invalid phone number format',
      };
    }

    if (!this.isInitialized || !this.twilioClient) {
      // Basic validation without Twilio
      return {
        valid: true,
        formatted: normalized,
      };
    }

    try {
      const lookup = await this.twilioClient.lookups.v1
        .phoneNumbers(normalized)
        .fetch();

      return {
        valid: true,
        formatted: lookup.phoneNumber,
      };
    } catch (error) {
      return {
        valid: false,
        error: error.message,
      };
    }
  }

  /**
   * Update user phone verification status
   */
  async markPhoneAsVerified(userId: string): Promise<boolean> {
    try {
      await this.prisma.user.update({
        where: { id: userId },
        data: {
          phoneVerified: true,
          phoneVerifiedAt: new Date(),
        },
      });
      this.logger.log(`Phone verified for user ${userId}`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to mark phone as verified for user ${userId}`, error);
      return false;
    }
  }

  /**
   * Update user phone number
   */
  async updateUserPhoneNumber(
    userId: string,
    phoneNumber: string,
  ): Promise<{
    success: boolean;
    error?: string;
  }> {
    // Validate phone number first
    const validation = await this.validatePhoneNumber(phoneNumber);
    if (!validation.valid) {
      return {
        success: false,
        error: validation.error || 'Invalid phone number',
      };
    }

    try {
      await this.prisma.user.update({
        where: { id: userId },
        data: {
          phoneNumber: validation.formatted || phoneNumber,
          phoneVerified: false, // Reset verification when phone changes
          phoneVerifiedAt: null,
        },
      });
      this.logger.log(`Phone number updated for user ${userId}`);
      return { success: true };
    } catch (error) {
      this.logger.error(`Failed to update phone number for user ${userId}`, error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Utility: Add delay for rate limiting
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
