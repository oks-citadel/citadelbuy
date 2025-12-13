import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse, ApiParam } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';

@ApiTags('Orders')
@Controller('orders')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class OrdersController {
  constructor(private ordersService: OrdersService) {}

  @Get()
  @ApiOperation({
    summary: 'Get all orders for current user',
    description: 'Retrieves a complete list of orders placed by the authenticated user, including order details, status, and items.',
  })
  @ApiResponse({
    status: 200,
    description: 'Successfully retrieved user orders',
    schema: {
      example: [
        {
          id: '123e4567-e89b-12d3-a456-426614174000',
          orderNumber: 'ORD-2024-001234',
          status: 'DELIVERED',
          subtotal: 145.43,
          tax: 14.54,
          shipping: 0,
          total: 159.97,
          items: [
            {
              id: 'item-1',
              productId: 'prod-123',
              productName: 'Wireless Bluetooth Headphones',
              quantity: 2,
              price: 49.99,
              subtotal: 99.98,
            },
          ],
          shippingAddress: {
            fullName: 'John Doe',
            street: '123 Main St, Apt 4B',
            city: 'New York',
            state: 'NY',
            postalCode: '10001',
            country: 'United States',
          },
          createdAt: '2024-01-15T10:30:00Z',
          updatedAt: '2024-01-20T14:45:00Z',
        },
      ],
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized - invalid or missing token' })
  async findAll(@Request() req: any) {
    return this.ordersService.findByUserId(req.user.id);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get order by ID',
    description: 'Retrieves detailed information about a specific order including items, shipping details, and status history.',
  })
  @ApiParam({
    name: 'id',
    description: 'Order UUID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: 200,
    description: 'Successfully retrieved order details',
    schema: {
      example: {
        id: '123e4567-e89b-12d3-a456-426614174000',
        orderNumber: 'ORD-2024-001234',
        status: 'DELIVERED',
        subtotal: 145.43,
        tax: 14.54,
        shipping: 0,
        total: 159.97,
        items: [
          {
            id: 'item-1',
            productId: 'prod-123',
            productName: 'Wireless Bluetooth Headphones',
            productImage: 'https://cdn.citadelbuy.com/products/headphones-main.jpg',
            quantity: 2,
            price: 49.99,
            subtotal: 99.98,
          },
        ],
        shippingAddress: {
          fullName: 'John Doe',
          email: 'john.doe@example.com',
          phone: '+1 (555) 123-4567',
          street: '123 Main St, Apt 4B',
          city: 'New York',
          state: 'NY',
          postalCode: '10001',
          country: 'United States',
        },
        paymentMethod: 'card',
        paymentStatus: 'PAID',
        trackingNumber: 'TRK123456789',
        estimatedDelivery: '2024-01-25T00:00:00Z',
        statusHistory: [
          {
            status: 'PENDING',
            timestamp: '2024-01-15T10:30:00Z',
          },
          {
            status: 'PROCESSING',
            timestamp: '2024-01-15T11:00:00Z',
          },
          {
            status: 'SHIPPED',
            timestamp: '2024-01-16T09:00:00Z',
          },
          {
            status: 'DELIVERED',
            timestamp: '2024-01-20T14:45:00Z',
          },
        ],
        createdAt: '2024-01-15T10:30:00Z',
        updatedAt: '2024-01-20T14:45:00Z',
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Order not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized - invalid or missing token' })
  @ApiResponse({ status: 403, description: 'Forbidden - order belongs to another user' })
  async findById(@Param('id') id: string, @Request() req: any) {
    return this.ordersService.findById(id, req.user.id);
  }

  @Post()
  @ApiOperation({
    summary: 'Create a new order',
    description: 'Creates a new order with the provided items and shipping address. Validates inventory availability and calculates totals.',
  })
  @ApiResponse({
    status: 201,
    description: 'Order created successfully',
    schema: {
      example: {
        id: '123e4567-e89b-12d3-a456-426614174000',
        orderNumber: 'ORD-2024-001234',
        status: 'PENDING',
        subtotal: 145.43,
        tax: 14.54,
        shipping: 0,
        total: 159.97,
        items: [
          {
            id: 'item-1',
            productId: 'prod-123',
            quantity: 2,
            price: 49.99,
            subtotal: 99.98,
          },
        ],
        shippingAddress: {
          fullName: 'John Doe',
          street: '123 Main St, Apt 4B',
          city: 'New York',
          state: 'NY',
          postalCode: '10001',
          country: 'United States',
        },
        createdAt: '2024-01-15T10:30:00Z',
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Invalid order data or insufficient inventory' })
  @ApiResponse({ status: 401, description: 'Unauthorized - invalid or missing token' })
  async create(@Request() req: any, @Body() createOrderDto: CreateOrderDto) {
    return this.ordersService.create(req.user.id, createOrderDto);
  }

  @Get(':id/tracking')
  @ApiOperation({
    summary: 'Get order tracking information',
    description: 'Retrieves detailed tracking information for a specific order including shipment status and timeline.',
  })
  @ApiParam({
    name: 'id',
    description: 'Order UUID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: 200,
    description: 'Successfully retrieved tracking information',
  })
  @ApiResponse({ status: 404, description: 'Order not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized - invalid or missing token' })
  @ApiResponse({ status: 403, description: 'Forbidden - order belongs to another user' })
  async getTracking(@Param('id') id: string, @Request() req: any) {
    return this.ordersService.getTrackingHistory(id, req.user.id);
  }

  @Post(':id/cancel')
  @ApiOperation({
    summary: 'Cancel an order',
    description: 'Cancels an order if it has not been shipped yet. Only the order owner can cancel their order.',
  })
  @ApiParam({
    name: 'id',
    description: 'Order UUID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: 200,
    description: 'Order cancelled successfully',
    schema: {
      example: {
        id: '123e4567-e89b-12d3-a456-426614174000',
        orderNumber: 'ORD-2024-001234',
        status: 'CANCELLED',
        message: 'Order has been cancelled successfully',
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Order cannot be cancelled (already shipped/delivered)' })
  @ApiResponse({ status: 401, description: 'Unauthorized - invalid or missing token' })
  @ApiResponse({ status: 403, description: 'Forbidden - order belongs to another user' })
  @ApiResponse({ status: 404, description: 'Order not found' })
  async cancelOrder(@Param('id') id: string, @Request() req: any) {
    return this.ordersService.cancelOrder(id, req.user.id);
  }
}
