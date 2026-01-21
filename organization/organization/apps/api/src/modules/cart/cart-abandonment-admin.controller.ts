import {
  Controller,
  Get,
  Post,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { CartAbandonmentQueueService } from './cart-abandonment-queue.service';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { RolesGuard } from '@/common/guards/roles.guard';
import { Roles } from '@/common/decorators/roles.decorator';

/**
 * Admin Controller for Cart Abandonment Queue Management
 *
 * Provides endpoints for monitoring and managing the Bull queue
 * for cart abandonment processing. Admin-only access.
 */
@ApiTags('Cart Abandonment Queue (Admin)')
@Controller('cart-abandonment/queue')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
@ApiBearerAuth()
export class CartAbandonmentQueueAdminController {
  constructor(
    private readonly queueService: CartAbandonmentQueueService,
  ) {}

  /**
   * Get queue statistics
   */
  @Get('stats')
  @ApiOperation({ summary: 'Get cart abandonment queue statistics' })
  @ApiResponse({
    status: 200,
    description: 'Queue statistics',
    schema: {
      properties: {
        waiting: { type: 'number' },
        active: { type: 'number' },
        completed: { type: 'number' },
        failed: { type: 'number' },
        delayed: { type: 'number' },
        total: { type: 'number' },
      },
    },
  })
  async getQueueStats() {
    return this.queueService.getQueueStats();
  }

  /**
   * Get queue health status
   */
  @Get('health')
  @ApiOperation({ summary: 'Get cart abandonment queue health status' })
  @ApiResponse({
    status: 200,
    description: 'Queue health status',
    schema: {
      properties: {
        healthy: { type: 'boolean' },
        isPaused: { type: 'boolean' },
        stats: { type: 'object' },
        message: { type: 'string' },
      },
    },
  })
  async getQueueHealth() {
    return this.queueService.getQueueHealth();
  }

  /**
   * Get failed jobs
   */
  @Get('failed-jobs')
  @ApiOperation({ summary: 'Get failed cart abandonment jobs' })
  @ApiQuery({ name: 'limit', required: false, description: 'Limit number of jobs (default: 10)' })
  @ApiResponse({
    status: 200,
    description: 'List of failed jobs',
  })
  async getFailedJobs(@Query('limit') limit?: number) {
    return this.queueService.getFailedJobs(limit ? Number(limit) : 10);
  }

  /**
   * Initialize recurring jobs
   */
  @Post('init-recurring')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Initialize recurring cart abandonment jobs' })
  @ApiResponse({
    status: 200,
    description: 'Recurring jobs initialized successfully',
    schema: {
      properties: {
        message: { type: 'string' },
      },
    },
  })
  async initRecurringJobs() {
    await this.queueService.initializeRecurringJobs();
    return { message: 'Recurring jobs initialized successfully' };
  }

  /**
   * Manually schedule detect abandoned carts job
   */
  @Post('schedule/detect')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Manually schedule detect abandoned carts job' })
  @ApiQuery({ name: 'delay', required: false, description: 'Delay in milliseconds (default: 0)' })
  @ApiResponse({
    status: 200,
    description: 'Job scheduled successfully',
    schema: {
      properties: {
        message: { type: 'string' },
      },
    },
  })
  async scheduleDetect(@Query('delay') delay?: number) {
    await this.queueService.scheduleDetectAbandoned(delay ? Number(delay) : 0);
    return { message: 'Detect abandoned carts job scheduled' };
  }

  /**
   * Manually schedule process email queue job
   */
  @Post('schedule/process-emails')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Manually schedule process email queue job' })
  @ApiQuery({ name: 'delay', required: false, description: 'Delay in milliseconds (default: 0)' })
  @ApiQuery({ name: 'batchSize', required: false, description: 'Batch size (default: 50)' })
  @ApiResponse({
    status: 200,
    description: 'Job scheduled successfully',
    schema: {
      properties: {
        message: { type: 'string' },
      },
    },
  })
  async scheduleProcessEmails(
    @Query('delay') delay?: number,
    @Query('batchSize') batchSize?: number,
  ) {
    await this.queueService.scheduleProcessEmailQueue(
      batchSize ? Number(batchSize) : undefined,
      delay ? Number(delay) : 0,
    );
    return { message: 'Process email queue job scheduled' };
  }

  /**
   * Manually schedule cleanup job
   */
  @Post('schedule/cleanup')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Manually schedule cleanup old records job' })
  @ApiQuery({ name: 'delay', required: false, description: 'Delay in milliseconds (default: 0)' })
  @ApiQuery({ name: 'daysToKeep', required: false, description: 'Days to keep (default: 90)' })
  @ApiResponse({
    status: 200,
    description: 'Job scheduled successfully',
    schema: {
      properties: {
        message: { type: 'string' },
      },
    },
  })
  async scheduleCleanup(
    @Query('delay') delay?: number,
    @Query('daysToKeep') daysToKeep?: number,
  ) {
    await this.queueService.scheduleCleanupOldRecords(
      daysToKeep ? Number(daysToKeep) : 90,
      delay ? Number(delay) : 0,
    );
    return { message: 'Cleanup job scheduled' };
  }

  /**
   * Pause the queue
   */
  @Post('pause')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Pause cart abandonment queue' })
  @ApiResponse({
    status: 200,
    description: 'Queue paused successfully',
    schema: {
      properties: {
        message: { type: 'string' },
      },
    },
  })
  async pauseQueue() {
    await this.queueService.pauseQueue();
    return { message: 'Queue paused successfully' };
  }

  /**
   * Resume the queue
   */
  @Post('resume')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Resume cart abandonment queue' })
  @ApiResponse({
    status: 200,
    description: 'Queue resumed successfully',
    schema: {
      properties: {
        message: { type: 'string' },
      },
    },
  })
  async resumeQueue() {
    await this.queueService.resumeQueue();
    return { message: 'Queue resumed successfully' };
  }

  /**
   * Clean old jobs from queue
   */
  @Post('clean')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Clean old jobs from queue' })
  @ApiQuery({ name: 'gracePeriod', required: false, description: 'Grace period in hours (default: 24)' })
  @ApiResponse({
    status: 200,
    description: 'Queue cleaned successfully',
    schema: {
      properties: {
        message: { type: 'string' },
      },
    },
  })
  async cleanQueue(@Query('gracePeriod') gracePeriod?: number) {
    const gracePeriodMs = (gracePeriod ? Number(gracePeriod) : 24) * 60 * 60 * 1000;
    await this.queueService.cleanQueue(gracePeriodMs);
    return { message: 'Queue cleaned successfully' };
  }

  /**
   * Retry a failed job
   */
  @Post('retry/:jobId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Retry a failed job' })
  @ApiResponse({
    status: 200,
    description: 'Job retry initiated',
    schema: {
      properties: {
        message: { type: 'string' },
      },
    },
  })
  async retryJob(@Query('jobId') jobId: string) {
    await this.queueService.retryFailedJob(jobId);
    return { message: `Job ${jobId} retry initiated` };
  }

  /**
   * Remove a failed job
   */
  @Post('remove/:jobId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Remove a failed job' })
  @ApiResponse({
    status: 200,
    description: 'Job removed successfully',
    schema: {
      properties: {
        message: { type: 'string' },
      },
    },
  })
  async removeJob(@Query('jobId') jobId: string) {
    await this.queueService.removeFailedJob(jobId);
    return { message: `Job ${jobId} removed successfully` };
  }
}
