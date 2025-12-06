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

@ApiTags('Email & Notifications')
@Controller('email')
export class EmailController {
  constructor(
    private readonly emailService: EmailService,
    private readonly emailQueueService: EmailQueueService,
    private readonly emailProcessor: EmailProcessor,
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
}
