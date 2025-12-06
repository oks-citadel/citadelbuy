import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { OrderTrackingService } from './order-tracking.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import {
  GuestTrackingDto,
  TrackingResponseDto,
} from './dto/tracking.dto';
import { TrackingWebhookDto } from './dto/update-tracking.dto';

@ApiTags('Tracking')
@Controller('tracking')
export class OrderTrackingController {
  constructor(private readonly trackingService: OrderTrackingService) {}

  @Post('guest')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Track order by order number and email (Guest)',
    description: 'Allows guest users to track their order using order number and email address. No authentication required.',
  })
  @ApiResponse({
    status: 200,
    description: 'Tracking information retrieved successfully',
    type: TrackingResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Order not found with provided details',
  })
  @ApiResponse({
    status: 401,
    description: 'Email does not match order records',
  })
  async trackGuestOrder(@Body() dto: GuestTrackingDto): Promise<TrackingResponseDto> {
    return this.trackingService.trackByOrderNumberAndEmail(dto.orderNumber, dto.email);
  }

  @Get('order/:orderNumber')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Track order by order number (Authenticated)',
    description: 'Allows authenticated users to track their own orders using the order number.',
  })
  @ApiParam({
    name: 'orderNumber',
    description: 'Order number (e.g., CB-2024-12345678)',
    example: 'CB-2024-12345678',
  })
  @ApiResponse({
    status: 200,
    description: 'Tracking information retrieved successfully',
    type: TrackingResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Order not found or does not belong to user',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - invalid or missing token',
  })
  async trackOrder(
    @Param('orderNumber') orderNumber: string,
    @Request() req: any,
  ): Promise<TrackingResponseDto> {
    return this.trackingService.trackByOrderNumber(orderNumber, req.user.id);
  }

  @Get('tracking-number/:trackingNumber')
  @ApiOperation({
    summary: 'Track by carrier tracking number',
    description: 'Track shipment using the carrier tracking number. No authentication required.',
  })
  @ApiParam({
    name: 'trackingNumber',
    description: 'Carrier tracking number',
    example: 'TRK1234567890',
  })
  @ApiResponse({
    status: 200,
    description: 'Tracking information retrieved successfully',
    type: TrackingResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Tracking number not found',
  })
  async trackByTrackingNumber(
    @Param('trackingNumber') trackingNumber: string,
  ): Promise<TrackingResponseDto> {
    return this.trackingService.trackByTrackingNumber(trackingNumber);
  }

  @Get('shipment/:trackingNumber')
  @ApiOperation({
    summary: 'Get real-time shipment tracking from carrier',
    description: 'Retrieves real-time tracking information directly from the shipping carrier.',
  })
  @ApiParam({
    name: 'trackingNumber',
    description: 'Carrier tracking number',
    example: 'TRK1234567890',
  })
  @ApiResponse({
    status: 200,
    description: 'Shipment tracking information retrieved successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Shipment not found',
  })
  async getShipmentTracking(@Param('trackingNumber') trackingNumber: string) {
    return this.trackingService.getShipmentTracking(trackingNumber);
  }

  @Post('check')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Quick tracking check',
    description: 'Check tracking status by order number and email. Alternative endpoint for guest tracking.',
  })
  @ApiResponse({
    status: 200,
    description: 'Tracking status retrieved',
    type: TrackingResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Order not found',
  })
  async quickTrackingCheck(@Body() dto: GuestTrackingDto): Promise<TrackingResponseDto> {
    return this.trackingService.trackByOrderNumberAndEmail(dto.orderNumber, dto.email);
  }

  @Post('webhook')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Carrier tracking webhook',
    description: 'Webhook endpoint for receiving tracking updates from shipping carriers. Used by UPS, FedEx, USPS, etc.',
  })
  @ApiResponse({
    status: 200,
    description: 'Webhook processed successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid webhook payload',
  })
  async handleTrackingWebhook(@Body() dto: TrackingWebhookDto): Promise<{ success: boolean }> {
    await this.trackingService.handleTrackingWebhook(dto);
    return { success: true };
  }
}
