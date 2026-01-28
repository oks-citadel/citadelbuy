import {
  Controller,
  Get,
  Put,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  ParseIntPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse, ApiQuery, ApiParam } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '@/common/guards/roles.guard';
import { Roles } from '@/common/decorators/roles.decorator';
import { UserRole, OrderStatus } from '@prisma/client';
import { OrdersService } from './orders.service';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { IsString, IsOptional, IsDateString, IsNumber, Min } from 'class-validator';

// DTOs
class AddTrackingInfoDto {
  @IsString()
  @IsOptional()
  trackingNumber?: string;

  @IsString()
  carrier: string;

  @IsString()
  @IsOptional()
  shippingMethod?: string;

  @IsDateString()
  @IsOptional()
  estimatedDeliveryDate?: string;
}

class BulkUpdateOrdersDto {
  @IsString({ each: true })
  orderIds: string[];

  @IsString()
  status: OrderStatus;
}

@ApiTags('Orders - Admin')
@Controller('admin/orders')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@ApiBearerAuth()
export class OrdersAdminController {
  constructor(private ordersService: OrdersService) {}

  @Get()
  @ApiOperation({
    summary: 'Get all orders (Admin)',
    description: 'Retrieves all orders with filtering and pagination. Admin only.',
  })
  @ApiQuery({ name: 'status', required: false, enum: OrderStatus })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Orders retrieved successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin access required' })
  async getAllOrders(
    @Query('status') status?: OrderStatus,
    @Query('page', new ParseIntPipe({ optional: true })) page?: number,
    @Query('limit', new ParseIntPipe({ optional: true })) limit?: number,
  ) {
    return this.ordersService.findAll(status, page, limit);
  }

  @Get('stats')
  @ApiOperation({
    summary: 'Get order statistics (Admin)',
    description: 'Retrieves comprehensive order statistics including counts by status and revenue.',
  })
  @ApiResponse({
    status: 200,
    description: 'Statistics retrieved successfully',
    schema: {
      example: {
        totalOrders: 1523,
        ordersByStatus: {
          pending: 45,
          processing: 123,
          shipped: 89,
          delivered: 1234,
          cancelled: 32,
        },
        totalRevenue: 234567.89,
      },
    },
  })
  async getOrderStats() {
    return this.ordersService.getOrderStats();
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get order by ID (Admin)',
    description: 'Retrieves detailed order information. Admin can view any order.',
  })
  @ApiParam({ name: 'id', description: 'Order UUID' })
  @ApiResponse({ status: 200, description: 'Order retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Order not found' })
  async getOrderById(@Param('id') id: string) {
    // Admin can view any order, so no userId filter
    return this.ordersService.findById(id);
  }

  @Put(':id/status')
  @ApiOperation({
    summary: 'Update order status (Admin)',
    description: 'Updates the status of an order. Sends notification email to customer.',
  })
  @ApiParam({ name: 'id', description: 'Order UUID' })
  @ApiResponse({ status: 200, description: 'Order status updated successfully' })
  @ApiResponse({ status: 404, description: 'Order not found' })
  async updateOrderStatus(
    @Param('id') orderId: string,
    @Body() updateOrderStatusDto: UpdateOrderStatusDto,
  ) {
    return this.ordersService.updateOrderStatus(
      orderId,
      updateOrderStatusDto.status,
      {
        paymentIntentId: updateOrderStatusDto.paymentIntentId,
        paymentMethod: updateOrderStatusDto.paymentMethod,
      },
    );
  }

  @Post(':id/tracking')
  @ApiOperation({
    summary: 'Add tracking information to order (Admin)',
    description: 'Adds shipping tracking information and updates order to SHIPPED status. Sends tracking email to customer.',
  })
  @ApiParam({ name: 'id', description: 'Order UUID' })
  @ApiResponse({
    status: 200,
    description: 'Tracking information added successfully',
    schema: {
      example: {
        id: '123e4567-e89b-12d3-a456-426614174000',
        status: 'SHIPPED',
        trackingNumber: 'UPS1234567890',
        carrier: 'UPS',
        shippingMethod: 'Ground',
        estimatedDeliveryDate: '2024-01-25T00:00:00Z',
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Order not found' })
  async addTrackingInfo(
    @Param('id') orderId: string,
    @Body() dto: AddTrackingInfoDto,
  ) {
    return this.ordersService.addTrackingInfo(orderId, {
      trackingNumber: dto.trackingNumber,
      carrier: dto.carrier,
      shippingMethod: dto.shippingMethod,
      estimatedDeliveryDate: dto.estimatedDeliveryDate
        ? new Date(dto.estimatedDeliveryDate)
        : undefined,
    });
  }

  @Put(':id/delivered')
  @ApiOperation({
    summary: 'Mark order as delivered (Admin)',
    description: 'Updates order status to DELIVERED and records actual delivery date. Sends delivery confirmation email.',
  })
  @ApiParam({ name: 'id', description: 'Order UUID' })
  @ApiResponse({ status: 200, description: 'Order marked as delivered' })
  @ApiResponse({ status: 404, description: 'Order not found' })
  async markAsDelivered(@Param('id') orderId: string) {
    return this.ordersService.markAsDelivered(orderId);
  }

  @Get('tracking/:trackingNumber')
  @ApiOperation({
    summary: 'Find order by tracking number (Admin)',
    description: 'Retrieves order information using tracking number.',
  })
  @ApiParam({ name: 'trackingNumber', description: 'Shipping tracking number' })
  @ApiResponse({ status: 200, description: 'Order found' })
  @ApiResponse({ status: 404, description: 'Order not found' })
  async findByTrackingNumber(@Param('trackingNumber') trackingNumber: string) {
    return this.ordersService.findByTrackingNumber(trackingNumber);
  }

  @Post('bulk-update')
  @ApiOperation({
    summary: 'Bulk update order statuses (Admin)',
    description: 'Updates the status of multiple orders at once. Useful for batch processing.',
  })
  @ApiResponse({ status: 200, description: 'Orders updated successfully' })
  async bulkUpdateOrders(@Body() dto: BulkUpdateOrdersDto) {
    const results = await Promise.allSettled(
      dto.orderIds.map((orderId) =>
        this.ordersService.updateOrderStatus(orderId, dto.status),
      ),
    );

    const successful = results.filter((r) => r.status === 'fulfilled').length;
    const failed = results.filter((r) => r.status === 'rejected').length;

    return {
      success: true,
      message: `Updated ${successful} orders, ${failed} failed`,
      successful,
      failed,
    };
  }

  @Get('search/user/:userId')
  @ApiOperation({
    summary: 'Get orders by user ID (Admin)',
    description: 'Retrieves all orders for a specific user.',
  })
  @ApiParam({ name: 'userId', description: 'User UUID' })
  @ApiResponse({ status: 200, description: 'Orders retrieved successfully' })
  async getOrdersByUserId(@Param('userId') userId: string) {
    return this.ordersService.findByUserId(userId);
  }
}
