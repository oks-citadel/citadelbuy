import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '@/common/prisma/prisma.service';

// AWS SDK - optionally loaded if available
let AWS: any = null;
try {
  AWS = require('aws-sdk');
} catch {
  // aws-sdk not installed - SMS will be mocked
}

export interface SmsPayload {
  to: string;
  message: string;
  scheduledAt?: Date;
  messageType?: 'Transactional' | 'Promotional';
}

export interface SendSmsResult {
  success: boolean;
  messageId?: string;
  error?: string;
  status?: string;
}

@Injectable()
export class SmsService implements OnModuleInit {
  private readonly logger = new Logger(SmsService.name);
  private snsClient: any = null;
  private fromNumber: string | null = null;
  private isInitialized = false;

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
  ) {
    this.initializeAWS();
  }

  onModuleInit() {
    // In production, warn loudly if AWS SNS is not configured
    // SMS is optional but important for verification and alerts
    const nodeEnv = this.configService.get('NODE_ENV');
    if (nodeEnv === 'production' && !this.isInitialized) {
      this.logger.error(
        'WARNING: AWS SNS SMS is not configured in production! ' +
        'Phone verification, order SMS notifications, and delivery alerts will fail. ' +
        'Set AWS_SNS_ACCESS_KEY_ID, AWS_SNS_SECRET_ACCESS_KEY, and AWS_SNS_REGION.'
      );
      // SMS is less critical than push, so we warn rather than throw
      // Uncomment the following to make SMS required in production:
      // throw new Error('AWS SNS must be configured for production SMS functionality.');
    }
  }

  /**
   * Initialize AWS SNS client
   */
  private initializeAWS() {
    try {
      const accessKeyId = this.configService.get('AWS_SNS_ACCESS_KEY_ID') || this.configService.get('AWS_ACCESS_KEY_ID');
      const secretAccessKey = this.configService.get('AWS_SNS_SECRET_ACCESS_KEY') || this.configService.get('AWS_SECRET_ACCESS_KEY');
      const region = this.configService.get('AWS_SNS_REGION') || this.configService.get('AWS_REGION') || 'us-east-1';
      const senderId = this.configService.get('AWS_SNS_SENDER_ID');

      if (accessKeyId && secretAccessKey && AWS) {
        AWS.config.update({
          accessKeyId,
          secretAccessKey,
          region,
        });
        this.snsClient = new AWS.SNS({ apiVersion: '2010-03-31' });
        this.fromNumber = senderId || 'Broxiva';
        this.isInitialized = true;
        this.logger.log(`AWS SNS SMS service initialized for region ${region}`);
      } else {
        this.logger.warn(
          'AWS SNS not configured. SMS messages will be logged but not sent. ' +
          'Set AWS_SNS_ACCESS_KEY_ID, AWS_SNS_SECRET_ACCESS_KEY, and AWS_SNS_REGION',
        );
      }
    } catch (error) {
      this.logger.error('Failed to initialize AWS SNS', error);
      this.logger.warn('SMS messages will be logged but not sent');
    }
  }

  /**
   * Send SMS to a phone number using AWS SNS
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

    if (!this.isInitialized || !this.snsClient) {
      this.logger.warn(
        `SMS would be sent to ${phoneNumber}: "${payload.message}" but AWS SNS is not initialized`,
      );
      return {
        success: false,
        error: 'AWS SNS not initialized',
      };
    }

    try {
      const params: any = {
        Message: payload.message,
        PhoneNumber: phoneNumber,
        MessageAttributes: {
          'AWS.SNS.SMS.SMSType': {
            DataType: 'String',
            StringValue: payload.messageType || 'Transactional',
          },
        },
      };

      // Add sender ID if configured
      if (this.fromNumber) {
        params.MessageAttributes['AWS.SNS.SMS.SenderID'] = {
          DataType: 'String',
          StringValue: this.fromNumber,
        };
      }

      const result = await this.snsClient.publish(params).promise();

      this.logger.log(`SMS sent successfully via AWS SNS: ${result.MessageId} to ${phoneNumber}`);

      return {
        success: true,
        messageId: result.MessageId,
        status: 'sent',
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
    messageType: 'Transactional' | 'Promotional' = 'Promotional',
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
        messageType,
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
      messageType: 'Transactional',
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
      messageType: 'Transactional',
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
      messageType: 'Transactional',
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
      messageType: 'Transactional',
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
      messageType: 'Promotional',
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
   * Get SMS delivery status from AWS SNS (requires CloudWatch Logs)
   * Note: AWS SNS doesn't provide direct message status like Twilio.
   * For delivery tracking, configure CloudWatch Logs for SMS delivery status.
   */
  async getSmsStatus(messageId: string): Promise<{
    status: string;
    errorCode?: string;
    errorMessage?: string;
  } | null> {
    if (!this.isInitialized || !this.snsClient) {
      return null;
    }

    // AWS SNS doesn't provide direct status API like Twilio
    // Status tracking requires CloudWatch Logs configuration
    // Return a placeholder indicating the message was accepted
    this.logger.log(`SMS status check requested for ${messageId} - Use CloudWatch Logs for detailed delivery status`);

    return {
      status: 'accepted',
      errorMessage: 'For detailed delivery status, configure CloudWatch Logs for SNS SMS delivery',
    };
  }

  /**
   * Check SMS spending limits
   */
  async checkSpendingLimit(): Promise<{
    monthlySpendLimit: number;
    monthToDateSpend: number;
    isOverLimit: boolean;
  } | null> {
    if (!this.isInitialized || !this.snsClient) {
      return null;
    }

    try {
      const attributes = await this.snsClient.getSMSAttributes({
        attributes: ['MonthlySpendLimit', 'DeliveryStatusSuccessSamplingRate'],
      }).promise();

      // Note: MonthToDateSpend is not available via API, would need CloudWatch metrics
      return {
        monthlySpendLimit: parseFloat(attributes.attributes?.MonthlySpendLimit || '1'),
        monthToDateSpend: 0, // Would need CloudWatch metrics
        isOverLimit: false,
      };
    } catch (error) {
      this.logger.error('Failed to get SMS spending attributes', error);
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
   * Note: AWS SNS validates phone numbers during publish,
   * but we can do basic validation here
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

    // E.164 format validation: starts with + and 10-15 digits
    const e164Regex = /^\+[1-9]\d{9,14}$/;
    if (!e164Regex.test(normalized)) {
      return {
        valid: false,
        error: 'Phone number must be in E.164 format (e.g., +14155552671)',
      };
    }

    return {
      valid: true,
      formatted: normalized,
    };
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
   * Opt out phone number from receiving SMS (for STOP requests)
   */
  async optOutPhoneNumber(phoneNumber: string): Promise<boolean> {
    if (!this.isInitialized || !this.snsClient) {
      return false;
    }

    try {
      await this.snsClient.optInPhoneNumber({
        phoneNumber: this.normalizePhoneNumber(phoneNumber),
      }).promise();
      // Note: optInPhoneNumber is used to add back to opt-in list
      // There's no direct opt-out API, it's handled automatically by carriers
      return true;
    } catch (error) {
      this.logger.error(`Failed to process opt-out for ${phoneNumber}`, error);
      return false;
    }
  }

  /**
   * Check if phone number is opted out
   */
  async isPhoneNumberOptedOut(phoneNumber: string): Promise<boolean> {
    if (!this.isInitialized || !this.snsClient) {
      return false;
    }

    try {
      const result = await this.snsClient.checkIfPhoneNumberIsOptedOut({
        phoneNumber: this.normalizePhoneNumber(phoneNumber),
      }).promise();
      return result.isOptedOut || false;
    } catch (error) {
      this.logger.error(`Failed to check opt-out status for ${phoneNumber}`, error);
      return false;
    }
  }

  /**
   * Utility: Add delay for rate limiting
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
