import {
  Controller,
  Get,
  Patch,
  Param,
  Body,
  UseGuards,
  Query,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiResponse,
  ApiQuery,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../auth/guards/admin.guard';
import { OrdersService } from '../orders/orders.service';
import { OrderStatus } from '@prisma/client';

class UpdateOrderStatusDto {
  status: OrderStatus;
  trackingNumber?: string;
}

@ApiTags('admin/orders')
@Controller('admin/orders')
@UseGuards(JwtAuthGuard, AdminGuard)
@ApiBearerAuth()
export class AdminOrdersController {
  constructor(private ordersService: OrdersService) {}

  @Get()
  @ApiOperation({ summary: 'Get all orders (admin only)' })
  @ApiResponse({ status: 200, description: 'Returns all orders' })
  @ApiQuery({ name: 'status', required: false, enum: OrderStatus })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async getAllOrders(
    @Query('status') status?: OrderStatus,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 20,
  ) {
    return this.ordersService.findAll(status, Number(page), Number(limit));
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Update order status (admin only)' })
  @ApiResponse({ status: 200, description: 'Order status updated' })
  @ApiResponse({ status: 403, description: 'Admin access required' })
  @ApiResponse({ status: 404, description: 'Order not found' })
  async updateOrderStatus(
    @Param('id') orderId: string,
    @Body() updateDto: UpdateOrderStatusDto,
  ) {
    return this.ordersService.updateOrderStatus(
      orderId,
      updateDto.status,
      undefined, // paymentData not needed for admin status updates
    );
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get order statistics (admin only)' })
  @ApiResponse({ status: 200, description: 'Returns order statistics' })
  async getOrderStats() {
    return this.ordersService.getOrderStats();
  }
}
