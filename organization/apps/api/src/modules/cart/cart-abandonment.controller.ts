import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { CartAbandonmentService } from './cart-abandonment.service';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { RolesGuard } from '@/common/guards/roles.guard';
import { Roles } from '@/common/decorators/roles.decorator';

@ApiTags('Cart Abandonment')
@Controller('cart-abandonment')
export class CartAbandonmentController {
  constructor(private readonly abandonmentService: CartAbandonmentService) {}

  // ==================== Public Endpoints ====================

  /**
   * Track email opens via tracking pixel
   */
  @Get('track/open/:emailId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Track email open (pixel tracking)' })
  async trackEmailOpen(@Param('emailId') emailId: string): Promise<void> {
    await this.abandonmentService.trackEmailOpen(emailId);
  }

  /**
   * Track email link clicks
   */
  @Get('track/click/:emailId')
  @ApiOperation({ summary: 'Track email click and redirect' })
  async trackEmailClick(@Param('emailId') emailId: string): Promise<{ redirectUrl: string }> {
    await this.abandonmentService.trackEmailClick(emailId);
    return { redirectUrl: '/cart' };
  }

  /**
   * Handle unsubscribe requests
   */
  @Get('unsubscribe/:abandonmentId')
  @ApiOperation({ summary: 'Unsubscribe from cart abandonment emails' })
  @ApiResponse({ status: 200, description: 'Successfully unsubscribed' })
  async unsubscribe(
    @Param('abandonmentId') abandonmentId: string,
  ): Promise<{ message: string }> {
    await this.abandonmentService.handleUnsubscribe(abandonmentId);
    return { message: 'Successfully unsubscribed from cart recovery emails' };
  }

  /**
   * Validate recovery discount code
   */
  @Get('validate-discount')
  @ApiOperation({ summary: 'Validate a recovery discount code' })
  @ApiQuery({ name: 'code', required: true, description: 'Recovery discount code' })
  @ApiQuery({ name: 'cartTotal', required: true, description: 'Current cart total' })
  @ApiResponse({
    status: 200,
    description: 'Discount validation result',
    schema: {
      properties: {
        valid: { type: 'boolean' },
        discount: { type: 'number' },
        message: { type: 'string' },
      },
    },
  })
  async validateDiscount(
    @Query('code') code: string,
    @Query('cartTotal') cartTotal: number,
  ): Promise<{ valid: boolean; discount: number; message: string }> {
    return this.abandonmentService.validateRecoveryDiscount(code, Number(cartTotal));
  }

  // ==================== Admin Endpoints ====================

  /**
   * Get abandonment analytics
   */
  @Get('admin/analytics')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get cart abandonment analytics (Admin only)' })
  @ApiQuery({ name: 'startDate', required: false, description: 'Start date (ISO)' })
  @ApiQuery({ name: 'endDate', required: false, description: 'End date (ISO)' })
  @ApiResponse({
    status: 200,
    description: 'Abandonment analytics',
    schema: {
      properties: {
        totalAbandoned: { type: 'number' },
        totalRecovered: { type: 'number' },
        recoveryRate: { type: 'number' },
        recoveredValue: { type: 'number' },
        emailStats: {
          type: 'array',
          items: {
            properties: {
              type: { type: 'string' },
              sent: { type: 'number' },
              opened: { type: 'number' },
              clicked: { type: 'number' },
              converted: { type: 'number' },
              openRate: { type: 'number' },
              clickRate: { type: 'number' },
              conversionRate: { type: 'number' },
            },
          },
        },
        dailyStats: {
          type: 'array',
          items: {
            properties: {
              date: { type: 'string' },
              abandoned: { type: 'number' },
              recovered: { type: 'number' },
            },
          },
        },
      },
    },
  })
  async getAnalytics(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.abandonmentService.getAbandonmentAnalytics(
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate) : undefined,
    );
  }

  /**
   * Manually trigger abandoned cart detection (for testing)
   */
  @Post('admin/detect')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Manually trigger abandoned cart detection (Admin only)' })
  @ApiResponse({
    status: 200,
    description: 'Detection result',
    schema: {
      properties: {
        cartsProcessed: { type: 'number' },
      },
    },
  })
  async triggerDetection(): Promise<{ cartsProcessed: number }> {
    const count = await this.abandonmentService.detectAbandonedCarts();
    return { cartsProcessed: count };
  }

  /**
   * Manually trigger email processing (for testing)
   */
  @Post('admin/process-emails')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Manually process pending abandonment emails (Admin only)' })
  @ApiResponse({
    status: 200,
    description: 'Processing result',
    schema: {
      properties: {
        sent: { type: 'number' },
        failed: { type: 'number' },
      },
    },
  })
  async processEmails(): Promise<{ sent: number; failed: number }> {
    return this.abandonmentService.processAbandonmentEmails();
  }

  /**
   * Cleanup old abandonment records
   */
  @Post('admin/cleanup')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Clean up old abandonment records (Admin only)' })
  @ApiQuery({ name: 'daysToKeep', required: false, description: 'Days to keep (default: 90)' })
  @ApiResponse({
    status: 200,
    description: 'Cleanup result',
    schema: {
      properties: {
        deleted: { type: 'number' },
      },
    },
  })
  async cleanup(
    @Query('daysToKeep') daysToKeep?: number,
  ): Promise<{ deleted: number }> {
    const count = await this.abandonmentService.cleanupOldAbandonments(
      daysToKeep ? Number(daysToKeep) : 90,
    );
    return { deleted: count };
  }
}
