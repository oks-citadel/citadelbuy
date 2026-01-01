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
  Request,
  Logger,
  Headers,
  RawBodyRequest,
  Req,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { EmailService } from './email.service';
import { EmailQueueService, EmailPriority } from './email-queue.service';
import { EmailProcessor } from './email.processor';
import { SendEmailDto } from './dto/send-email.dto';
import { CreateTemplateDto } from './dto/create-template.dto';
import { UpdateNotificationPreferencesDto } from './dto/update-notification-preferences.dto';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { RolesGuard } from '@/common/guards/roles.guard';
import { Roles } from '@/common/decorators/roles.decorator';
import { UserRole, EmailType, EmailStatus } from '@prisma/client';
import { AuthRequest } from '@/common/types/auth-request.types';
import { PrismaService } from '@/common/prisma/prisma.service';

// AWS SES Notification Types
interface SESBounce {
  bounceType: 'Permanent' | 'Transient' | 'Undetermined';
  bounceSubType: string;
  bouncedRecipients: Array<{
    emailAddress: string;
    action?: string;
    status?: string;
    diagnosticCode?: string;
  }>;
  timestamp: string;
}

interface SESComplaint {
  complainedRecipients: Array<{
    emailAddress: string;
  }>;
  complaintFeedbackType?: string;
  timestamp: string;
}

interface SNSNotification {
  Type: 'Notification' | 'SubscriptionConfirmation' | 'UnsubscribeConfirmation';
  MessageId: string;
  TopicArn: string;
  Message: string;
  Timestamp: string;
  SubscribeURL?: string;
}

@ApiTags('Email & Notifications')
@Controller('email')
export class EmailController {
  private readonly logger = new Logger(EmailController.name);

  constructor(
    private readonly emailService: EmailService,
    private readonly emailQueueService: EmailQueueService,
    private readonly emailProcessor: EmailProcessor,
    private readonly prisma: PrismaService,
  ) {}

  @Post('send')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Send email directly (Admin only)' })
  @ApiResponse({ status: 200, description: 'Email sent successfully' })
  async sendEmail(@Request() req: AuthRequest, @Body() dto: SendEmailDto) {
    return this.emailService.sendEmailWithLogging(dto, req.user?.id);
  }

  @Post('queue')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Queue email for later sending (Admin only)' })
  @ApiResponse({ status: 201, description: 'Email queued successfully' })
  async queueEmail(
    @Request() req: AuthRequest,
    @Body() dto: SendEmailDto,
    @Query('priority') priority?: number,
    @Query('scheduledFor') scheduledFor?: string,
  ) {
    return this.emailService.queueEmail(
      dto,
      req.user?.id,
      priority ? Number(priority) : undefined,
      scheduledFor ? new Date(scheduledFor) : undefined,
    );
  }

  @Post('queue/process')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Process email queue (Admin only)' })
  @ApiResponse({ status: 200, description: 'Queue processed successfully' })
  async processQueue(@Query('limit') limit?: number) {
    return this.emailService.processQueue(limit ? Number(limit) : undefined);
  }

  // ==================== Template Management ====================

  @Get('templates')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all email templates (Admin only)' })
  @ApiQuery({ name: 'type', required: false, enum: EmailType })
  @ApiResponse({ status: 200, description: 'Templates retrieved successfully' })
  async getTemplates(@Query('type') type?: EmailType) {
    return this.emailService.getTemplates(type);
  }

  @Get('templates/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get single email template (Admin only)' })
  @ApiResponse({ status: 200, description: 'Template retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Template not found' })
  async getTemplate(@Param('id') id: string) {
    return this.emailService.getTemplate(id);
  }

  @Post('templates')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create email template (Admin only)' })
  @ApiResponse({ status: 201, description: 'Template created successfully' })
  async createTemplate(@Body() dto: CreateTemplateDto) {
    return this.emailService.createTemplate(dto);
  }

  @Put('templates/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update email template (Admin only)' })
  @ApiResponse({ status: 200, description: 'Template updated successfully' })
  @ApiResponse({ status: 404, description: 'Template not found' })
  async updateTemplate(@Param('id') id: string, @Body() dto: Partial<CreateTemplateDto>) {
    return this.emailService.updateTemplate(id, dto);
  }

  @Delete('templates/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete email template (Admin only)' })
  @ApiResponse({ status: 200, description: 'Template deleted successfully' })
  @ApiResponse({ status: 404, description: 'Template not found' })
  async deleteTemplate(@Param('id') id: string) {
    return this.emailService.deleteTemplate(id);
  }

  // ==================== Notification Preferences ====================

  @Get('preferences')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get notification preferences' })
  @ApiResponse({ status: 200, description: 'Preferences retrieved successfully' })
  async getPreferences(@Request() req: AuthRequest) {
    return this.emailService.getPreferences(req.user.id);
  }

  @Put('preferences')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update notification preferences' })
  @ApiResponse({ status: 200, description: 'Preferences updated successfully' })
  async updatePreferences(@Request() req: AuthRequest, @Body() dto: UpdateNotificationPreferencesDto) {
    return this.emailService.updatePreferences(req.user.id, dto);
  }

  // ==================== Email Analytics ====================

  @Get('stats')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get email statistics (Admin only)' })
  @ApiQuery({ name: 'startDate', required: false, type: String })
  @ApiQuery({ name: 'endDate', required: false, type: String })
  @ApiResponse({ status: 200, description: 'Statistics retrieved successfully' })
  async getEmailStats(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.emailService.getEmailStats(
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate) : undefined,
    );
  }

  @Get('logs')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get email logs (Admin only)' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'userId', required: false, type: String })
  @ApiQuery({ name: 'status', required: false, enum: EmailStatus })
  @ApiQuery({ name: 'type', required: false, enum: EmailType })
  @ApiResponse({ status: 200, description: 'Logs retrieved successfully' })
  async getEmailLogs(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('userId') userId?: string,
    @Query('status') status?: EmailStatus,
    @Query('type') type?: EmailType,
  ) {
    return this.emailService.getEmailLogs({
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
      userId,
      status,
      type,
    });
  }

  // ==================== Queue Management ====================

  @Get('queue/stats')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get email queue statistics (Admin only)' })
  @ApiResponse({ status: 200, description: 'Queue statistics retrieved successfully' })
  async getQueueStats() {
    return this.emailQueueService.getQueueStats();
  }

  @Get('queue/health')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get email queue health status (Admin only)' })
  @ApiResponse({ status: 200, description: 'Queue health retrieved successfully' })
  async getQueueHealth() {
    return this.emailQueueService.getQueueHealth();
  }

  @Get('queue/job/:jobId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get job status by ID (Admin only)' })
  @ApiResponse({ status: 200, description: 'Job status retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Job not found' })
  async getJobStatus(@Param('jobId') jobId: string) {
    return this.emailQueueService.getJobStatus(jobId);
  }

  @Post('queue/job/:jobId/retry')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Retry failed job (Admin only)' })
  @ApiResponse({ status: 200, description: 'Job retried successfully' })
  @ApiResponse({ status: 404, description: 'Job not found' })
  async retryFailedJob(@Param('jobId') jobId: string) {
    await this.emailQueueService.retryFailedJob(jobId);
    return { message: 'Job retried successfully', jobId };
  }

  @Get('queue/failed')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get failed jobs (Admin only)' })
  @ApiQuery({ name: 'start', required: false, type: Number })
  @ApiQuery({ name: 'end', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Failed jobs retrieved successfully' })
  async getFailedJobs(
    @Query('start') start?: number,
    @Query('end') end?: number,
  ) {
    return this.emailQueueService.getFailedJobs(
      start ? Number(start) : 0,
      end ? Number(end) : 10,
    );
  }

  @Post('queue/pause')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Pause email queue (Admin only)' })
  @ApiResponse({ status: 200, description: 'Queue paused successfully' })
  async pauseQueue() {
    await this.emailQueueService.pauseQueue();
    return { message: 'Email queue paused' };
  }

  @Post('queue/resume')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Resume email queue (Admin only)' })
  @ApiResponse({ status: 200, description: 'Queue resumed successfully' })
  async resumeQueue() {
    await this.emailQueueService.resumeQueue();
    return { message: 'Email queue resumed' };
  }

  @Post('queue/clear-completed')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Clear completed jobs from queue (Admin only)' })
  @ApiResponse({ status: 200, description: 'Completed jobs cleared successfully' })
  async clearCompleted() {
    await this.emailQueueService.clearCompleted();
    return { message: 'Completed jobs cleared from queue' };
  }

  @Delete('queue/job/:jobId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Remove job from queue (Admin only)' })
  @ApiResponse({ status: 200, description: 'Job removed successfully' })
  async removeJob(@Param('jobId') jobId: string) {
    await this.emailQueueService.removeJob(jobId);
    return { message: 'Job removed from queue', jobId };
  }

  // ==================== Dead Letter Queue ====================

  @Post('dead-letter/:id/retry')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Retry email from dead letter queue (Admin only)' })
  @ApiResponse({ status: 200, description: 'Email retried successfully' })
  @ApiResponse({ status: 404, description: 'Dead letter entry not found' })
  async retryFromDeadLetterQueue(@Param('id') id: string) {
    return this.emailProcessor.retryFromDeadLetterQueue(id);
  }

  // ==================== AWS SES Bounce/Complaint Handling ====================
  // COMPLIANCE: Required for AWS SES reputation management

  @Post('webhooks/ses')
  @ApiOperation({ summary: 'AWS SES SNS webhook for bounce/complaint handling' })
  @ApiResponse({ status: 200, description: 'Notification processed successfully' })
  async handleSESWebhook(
    @Body() body: SNSNotification,
    @Headers('x-amz-sns-message-type') messageType: string,
  ) {
    this.logger.log(`Received SES webhook: ${messageType}`);

    // Handle SNS subscription confirmation
    if (body.Type === 'SubscriptionConfirmation' && body.SubscribeURL) {
      this.logger.log('SNS Subscription confirmation request received');
      // Auto-confirm by fetching the SubscribeURL
      try {
        const response = await fetch(body.SubscribeURL);
        if (response.ok) {
          this.logger.log('SNS Subscription confirmed successfully');
          return { message: 'Subscription confirmed' };
        }
      } catch (error) {
        this.logger.error('Failed to confirm SNS subscription', error);
      }
      return { message: 'Subscription confirmation attempted' };
    }

    // Process notification
    if (body.Type === 'Notification') {
      try {
        const message = JSON.parse(body.Message);
        const notificationType = message.notificationType;

        if (notificationType === 'Bounce') {
          await this.handleBounce(message.bounce);
        } else if (notificationType === 'Complaint') {
          await this.handleComplaint(message.complaint);
        } else if (notificationType === 'Delivery') {
          await this.handleDelivery(message.delivery);
        }

        return { message: 'Notification processed' };
      } catch (error) {
        this.logger.error('Error processing SES notification', error);
        return { message: 'Error processing notification' };
      }
    }

    return { message: 'Unknown notification type' };
  }

  /**
   * COMPLIANCE: Handle email bounces
   * Permanently suppresses hard-bounced addresses to protect sender reputation
   */
  private async handleBounce(bounce: SESBounce) {
    this.logger.warn(`Processing bounce: ${bounce.bounceType}`);

    for (const recipient of bounce.bouncedRecipients) {
      const email = recipient.emailAddress.toLowerCase();

      this.logger.warn(`Bounce for ${email}: ${bounce.bounceType}/${bounce.bounceSubType}`);

      // For permanent/hard bounces, suppress the email address
      if (bounce.bounceType === 'Permanent') {
        await this.suppressEmail(email, 'BOUNCE', {
          bounceType: bounce.bounceType,
          bounceSubType: bounce.bounceSubType,
          diagnosticCode: recipient.diagnosticCode,
          timestamp: bounce.timestamp,
        });
      }

      // Log all bounces for monitoring
      await this.logEmailEvent(email, 'BOUNCE', {
        bounceType: bounce.bounceType,
        bounceSubType: bounce.bounceSubType,
        diagnosticCode: recipient.diagnosticCode,
      });
    }
  }

  /**
   * COMPLIANCE: Handle spam complaints
   * Immediately suppresses complained addresses (critical for SES reputation)
   */
  private async handleComplaint(complaint: SESComplaint) {
    this.logger.error('Processing spam complaint - CRITICAL');

    for (const recipient of complaint.complainedRecipients) {
      const email = recipient.emailAddress.toLowerCase();

      this.logger.error(`Spam complaint from ${email}`);

      // Immediately suppress email for all communication types
      await this.suppressEmail(email, 'COMPLAINT', {
        complaintFeedbackType: complaint.complaintFeedbackType,
        timestamp: complaint.timestamp,
      });

      // Log for compliance audit trail
      await this.logEmailEvent(email, 'COMPLAINT', {
        complaintFeedbackType: complaint.complaintFeedbackType,
      });
    }
  }

  /**
   * Handle successful delivery (optional, for analytics)
   */
  private async handleDelivery(delivery: any) {
    this.logger.debug(`Delivery confirmed: ${delivery.recipients?.join(', ')}`);
    // Optional: Update email log status
  }

  /**
   * COMPLIANCE: Suppress email address from future sends
   */
  private async suppressEmail(
    email: string,
    reason: 'BOUNCE' | 'COMPLAINT' | 'UNSUBSCRIBE',
    metadata?: any,
  ) {
    const prismaAny = this.prisma as any;
    if (!prismaAny.emailSuppression) {
      this.logger.warn('emailSuppression model not available');
      return;
    }

    try {
      // Check if already suppressed
      const existing = await prismaAny.emailSuppression.findUnique({
        where: { email },
      });

      if (existing) {
        // Update existing suppression with new reason if more severe
        const severityOrder = { UNSUBSCRIBE: 1, BOUNCE: 2, COMPLAINT: 3 };
        if (severityOrder[reason] > severityOrder[existing.reason as keyof typeof severityOrder]) {
          await prismaAny.emailSuppression.update({
            where: { email },
            data: { reason, metadata, updatedAt: new Date() },
          });
        }
        return;
      }

      // Create new suppression record
      await prismaAny.emailSuppression.create({
        data: {
          email,
          reason,
          metadata,
        },
      });

      this.logger.warn(`Email suppressed: ${email} (${reason})`);

      // Also update notification preferences to disable emails
      const user = await this.prisma.user.findUnique({
        where: { email },
      });

      if (user) {
        await this.prisma.notificationPreference.upsert({
          where: { userId: user.id },
          update: { emailEnabled: false },
          create: { userId: user.id, emailEnabled: false },
        });
      }
    } catch (error) {
      this.logger.error(`Failed to suppress email ${email}`, error);
    }
  }

  /**
   * Log email event for audit trail
   */
  private async logEmailEvent(
    email: string,
    eventType: string,
    metadata?: any,
  ) {
    try {
      const prismaAny = this.prisma as any;
      if (prismaAny.emailEvent) {
        await prismaAny.emailEvent.create({
          data: {
            email,
            eventType,
            metadata,
          },
        });
      }
    } catch (error) {
      // Don't fail on logging errors
      this.logger.warn(`Failed to log email event for ${email}`, error);
    }
  }

  // ==================== Suppression List Management ====================

  @Get('suppressions')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get suppressed email addresses (Admin only)' })
  @ApiQuery({ name: 'reason', required: false, type: String })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Suppression list retrieved' })
  async getSuppressions(
    @Query('reason') reason?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    const skip = ((page || 1) - 1) * (limit || 20);
    const where = reason ? { reason } : {};
    const prismaAny = this.prisma as any;

    if (!prismaAny.emailSuppression) {
      return {
        suppressions: [],
        pagination: { page: page || 1, limit: limit || 20, total: 0, totalPages: 0 },
      };
    }

    const [suppressions, total] = await Promise.all([
      prismaAny.emailSuppression.findMany({
        where,
        skip,
        take: limit || 20,
        orderBy: { createdAt: 'desc' },
      }),
      prismaAny.emailSuppression.count({ where }),
    ]);

    return {
      suppressions: suppressions || [],
      pagination: {
        page: page || 1,
        limit: limit || 20,
        total: total || 0,
        totalPages: Math.ceil((total || 0) / (limit || 20)),
      },
    };
  }

  @Delete('suppressions/:email')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Remove email from suppression list (Admin only)' })
  @ApiResponse({ status: 200, description: 'Email removed from suppression list' })
  async removeSuppression(@Param('email') email: string) {
    const prismaAny = this.prisma as any;
    if (prismaAny.emailSuppression) {
      await prismaAny.emailSuppression.delete({
        where: { email: email.toLowerCase() },
      });
    }
    return { message: 'Email removed from suppression list' };
  }
}
