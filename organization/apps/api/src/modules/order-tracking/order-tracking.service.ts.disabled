import { Injectable, NotFoundException, UnauthorizedException, Logger, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { ShippingService } from '../shipping/shipping.service';
import {
  TrackingResponseDto,
  TrackingEventDto,
  TrackingStatusEnum,
  ShipmentTrackingDto,
} from './dto/tracking.dto';
import { OrderStatus } from '@prisma/client';

@Injectable()
export class OrderTrackingService {
  private readonly logger = new Logger(OrderTrackingService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly shippingService: ShippingService,
  ) {}

  /**
   * Track order by order number (authenticated user)
   */
  async trackByOrderNumber(orderNumber: string, userId: string): Promise<TrackingResponseDto> {
    this.logger.log(`Tracking order: ${orderNumber} for user: ${userId}`);

    // Find order - orderNumber is typically derived from order ID
    // For CitadelBuy, we use last 8 chars of ID as order number (e.g., CB-2024-12345678)
    const order = await this.prisma.order.findFirst({
      where: {
        userId,
        // Match by ID suffix or full ID
        OR: [
          { id: { endsWith: orderNumber.replace(/^CB-\d{4}-/, '') } },
          { id: orderNumber },
        ],
      },
      include: {
        items: {
          include: {
            product: {
              select: {
                name: true,
                images: true,
              },
            },
          },
        },
      },
    });

    if (!order) {
      throw new NotFoundException('Order not found or does not belong to this user');
    }

    return this.buildTrackingResponse(order);
  }

  /**
   * Track order by order number and email (guest tracking)
   */
  async trackByOrderNumberAndEmail(orderNumber: string, email: string): Promise<TrackingResponseDto> {
    this.logger.log(`Guest tracking order: ${orderNumber} for email: ${email}`);

    // Find order - support both guest orders and authenticated orders
    const order = await this.prisma.order.findFirst({
      where: {
        OR: [
          { id: { endsWith: orderNumber.replace(/^CB-\d{4}-/, '') } },
          { id: orderNumber },
        ],
        OR: [
          { guestEmail: email },
          { user: { email } },
        ],
      },
      include: {
        items: {
          include: {
            product: {
              select: {
                name: true,
                images: true,
              },
            },
          },
        },
        user: {
          select: {
            email: true,
          },
        },
      },
    });

    if (!order) {
      throw new NotFoundException('Order not found with the provided email address');
    }

    // Verify email matches (for security)
    const orderEmail = order.guestEmail || order.user?.email;
    if (orderEmail?.toLowerCase() !== email.toLowerCase()) {
      throw new UnauthorizedException('Email does not match order records');
    }

    return this.buildTrackingResponse(order);
  }

  /**
   * Track by carrier tracking number
   */
  async trackByTrackingNumber(trackingNumber: string): Promise<TrackingResponseDto> {
    this.logger.log(`Tracking by tracking number: ${trackingNumber}`);

    const order = await this.prisma.order.findFirst({
      where: { trackingNumber },
      include: {
        items: {
          include: {
            product: {
              select: {
                name: true,
                images: true,
              },
            },
          },
        },
      },
    });

    if (!order) {
      throw new NotFoundException('Order not found with this tracking number');
    }

    // If order has a carrier, get real-time tracking from shipping provider
    if (order.carrier && order.trackingNumber) {
      try {
        const shipmentTracking = await this.getShipmentTracking(order.trackingNumber);
        if (shipmentTracking) {
          // Merge shipment tracking with order data
          return this.mergeShipmentTracking(order, shipmentTracking);
        }
      } catch (error) {
        this.logger.warn(`Failed to get real-time tracking: ${error.message}`);
        // Fall back to order-based tracking
      }
    }

    return this.buildTrackingResponse(order);
  }

  /**
   * Get shipment tracking from shipping provider
   */
  async getShipmentTracking(trackingNumber: string): Promise<ShipmentTrackingDto | null> {
    try {
      const shipment = await this.prisma.shipment.findUnique({
        where: { trackingNumber },
        include: {
          trackingEvents: {
            orderBy: { timestamp: 'desc' },
          },
        },
      });

      if (!shipment) {
        return null;
      }

      // Get real-time tracking from shipping provider
      const tracking = await this.shippingService.trackShipment({ trackingNumber });

      return {
        shipmentId: shipment.id,
        trackingNumber: shipment.trackingNumber!,
        carrier: shipment.carrier,
        status: tracking.status || shipment.status,
        events: tracking.events.map((event: any) => ({
          status: this.mapShipmentStatusToTrackingStatus(event.status),
          description: event.description,
          location: event.location || 'Unknown',
          timestamp: event.timestamp.toISOString(),
          completed: this.isEventCompleted(event.status, tracking.status),
        })),
        estimatedDelivery: shipment.estimatedDelivery?.toISOString(),
        actualDelivery: shipment.actualDelivery?.toISOString(),
      };
    } catch (error) {
      this.logger.error(`Failed to get shipment tracking: ${error.message}`);
      return null;
    }
  }

  /**
   * Build tracking response from order data
   */
  private async buildTrackingResponse(order: any): Promise<TrackingResponseDto> {
    const orderNumber = this.formatOrderNumber(order.id);
    const timeline = this.buildTimeline(order);
    const shippingAddress = this.parseShippingAddress(order.shippingAddress);

    // If order has shipment tracking, get additional details
    if (order.trackingNumber) {
      try {
        const shipmentTracking = await this.getShipmentTracking(order.trackingNumber);
        if (shipmentTracking && shipmentTracking.events.length > 0) {
          // Merge shipment events into timeline
          timeline.push(...shipmentTracking.events);
          // Sort by timestamp descending
          timeline.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        }
      } catch (error) {
        this.logger.warn(`Failed to merge shipment tracking: ${error.message}`);
      }
    }

    return {
      orderNumber,
      orderId: order.id,
      status: this.mapOrderStatusToTrackingStatus(order.status),
      trackingNumber: order.trackingNumber || undefined,
      carrier: order.carrier || undefined,
      shippingMethod: order.shippingMethod || undefined,
      estimatedDelivery: order.estimatedDeliveryDate
        ? order.estimatedDeliveryDate.toISOString()
        : this.estimateDeliveryDate(order.createdAt).toISOString(),
      actualDelivery: order.actualDeliveryDate?.toISOString(),
      orderDate: order.createdAt.toISOString(),
      timeline,
      shippingAddress,
      items: order.items?.map((item: any) => ({
        name: item.product?.name || 'Product',
        quantity: item.quantity,
        image: item.product?.images?.[0] || undefined,
      })),
      total: order.total,
    };
  }

  /**
   * Merge shipment tracking data with order data
   */
  private mergeShipmentTracking(order: any, shipmentTracking: ShipmentTrackingDto): TrackingResponseDto {
    const orderNumber = this.formatOrderNumber(order.id);
    const shippingAddress = this.parseShippingAddress(order.shippingAddress);

    return {
      orderNumber,
      orderId: order.id,
      status: this.mapShipmentStatusToTrackingStatus(shipmentTracking.status),
      trackingNumber: shipmentTracking.trackingNumber,
      carrier: shipmentTracking.carrier,
      shippingMethod: order.shippingMethod || undefined,
      estimatedDelivery: shipmentTracking.estimatedDelivery || this.estimateDeliveryDate(order.createdAt).toISOString(),
      actualDelivery: shipmentTracking.actualDelivery,
      orderDate: order.createdAt.toISOString(),
      timeline: shipmentTracking.events,
      shippingAddress,
      items: order.items?.map((item: any) => ({
        name: item.product?.name || 'Product',
        quantity: item.quantity,
        image: item.product?.images?.[0] || undefined,
      })),
      total: order.total,
    };
  }

  /**
   * Build timeline from order status history
   */
  private buildTimeline(order: any): TrackingEventDto[] {
    const timeline: TrackingEventDto[] = [];

    // Add order placed event
    timeline.push({
      status: TrackingStatusEnum.ORDER_PLACED,
      description: 'Order placed successfully',
      location: 'Online',
      timestamp: order.createdAt.toISOString(),
      completed: true,
    });

    // Add status history events if available
    if (order.statusHistory && Array.isArray(order.statusHistory)) {
      for (const event of order.statusHistory) {
        timeline.push({
          status: this.mapOrderStatusToTrackingStatus(event.status),
          description: event.note || this.getStatusDescription(event.status),
          location: event.location || 'Processing Center',
          timestamp: event.timestamp,
          completed: true,
        });
      }
    } else {
      // Build timeline from current order status
      const currentStatus = order.status;

      if (['PROCESSING', 'SHIPPED', 'DELIVERED'].includes(currentStatus)) {
        timeline.push({
          status: TrackingStatusEnum.PROCESSING,
          description: 'Order is being processed',
          location: 'Warehouse',
          timestamp: order.updatedAt.toISOString(),
          completed: true,
        });
      }

      if (order.trackingNumber && ['SHIPPED', 'DELIVERED'].includes(currentStatus)) {
        timeline.push({
          status: TrackingStatusEnum.LABEL_CREATED,
          description: 'Shipping label created',
          location: 'Warehouse',
          timestamp: order.updatedAt.toISOString(),
          completed: true,
        });
      }

      if (['SHIPPED', 'DELIVERED'].includes(currentStatus)) {
        timeline.push({
          status: TrackingStatusEnum.IN_TRANSIT,
          description: 'Package is in transit',
          location: order.carrier || 'Shipping facility',
          timestamp: order.updatedAt.toISOString(),
          completed: currentStatus === 'DELIVERED',
        });
      }

      if (currentStatus === 'DELIVERED') {
        timeline.push({
          status: TrackingStatusEnum.DELIVERED,
          description: 'Package delivered successfully',
          location: 'Destination',
          timestamp: order.actualDeliveryDate?.toISOString() || order.updatedAt.toISOString(),
          completed: true,
        });
      }
    }

    // Add future events if not delivered
    if (order.status !== 'DELIVERED' && order.status !== 'CANCELLED') {
      const lastCompletedIndex = timeline.length - 1;

      if (!timeline.some(e => e.status === TrackingStatusEnum.OUT_FOR_DELIVERY)) {
        timeline.push({
          status: TrackingStatusEnum.OUT_FOR_DELIVERY,
          description: 'Out for delivery',
          location: 'Local delivery hub',
          timestamp: this.estimateDeliveryDate(order.createdAt, -1).toISOString(),
          completed: false,
        });
      }

      if (!timeline.some(e => e.status === TrackingStatusEnum.DELIVERED)) {
        timeline.push({
          status: TrackingStatusEnum.DELIVERED,
          description: 'Package will be delivered',
          location: 'Destination',
          timestamp: order.estimatedDeliveryDate?.toISOString() || this.estimateDeliveryDate(order.createdAt).toISOString(),
          completed: false,
        });
      }
    }

    // Sort by timestamp
    timeline.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

    return timeline;
  }

  /**
   * Map OrderStatus to TrackingStatusEnum
   */
  private mapOrderStatusToTrackingStatus(orderStatus: OrderStatus | string): TrackingStatusEnum {
    const statusMap: Record<string, TrackingStatusEnum> = {
      PENDING: TrackingStatusEnum.ORDER_PLACED,
      PROCESSING: TrackingStatusEnum.PROCESSING,
      SHIPPED: TrackingStatusEnum.IN_TRANSIT,
      DELIVERED: TrackingStatusEnum.DELIVERED,
      CANCELLED: TrackingStatusEnum.CANCELLED,
      REFUNDED: TrackingStatusEnum.RETURNED,
    };

    return statusMap[orderStatus] || TrackingStatusEnum.PROCESSING;
  }

  /**
   * Map shipment status to TrackingStatusEnum
   */
  private mapShipmentStatusToTrackingStatus(shipmentStatus: string): TrackingStatusEnum {
    const statusMap: Record<string, TrackingStatusEnum> = {
      LABEL_CREATED: TrackingStatusEnum.LABEL_CREATED,
      PICKED_UP: TrackingStatusEnum.PICKED_UP,
      IN_TRANSIT: TrackingStatusEnum.IN_TRANSIT,
      OUT_FOR_DELIVERY: TrackingStatusEnum.OUT_FOR_DELIVERY,
      DELIVERED: TrackingStatusEnum.DELIVERED,
      EXCEPTION: TrackingStatusEnum.EXCEPTION,
      RETURNED: TrackingStatusEnum.RETURNED,
    };

    return statusMap[shipmentStatus] || TrackingStatusEnum.IN_TRANSIT;
  }

  /**
   * Check if event is completed based on current status
   */
  private isEventCompleted(eventStatus: string, currentStatus: string): boolean {
    const statusOrder = [
      'LABEL_CREATED',
      'PICKED_UP',
      'IN_TRANSIT',
      'OUT_FOR_DELIVERY',
      'DELIVERED',
    ];

    const eventIndex = statusOrder.indexOf(eventStatus);
    const currentIndex = statusOrder.indexOf(currentStatus);

    return eventIndex <= currentIndex;
  }

  /**
   * Get status description
   */
  private getStatusDescription(status: string): string {
    const descriptions: Record<string, string> = {
      PENDING: 'Order received and awaiting processing',
      PROCESSING: 'Order is being prepared for shipment',
      SHIPPED: 'Package has been shipped',
      DELIVERED: 'Package delivered successfully',
      CANCELLED: 'Order has been cancelled',
      REFUNDED: 'Order has been refunded',
    };

    return descriptions[status] || 'Status updated';
  }

  /**
   * Parse shipping address from JSON string
   */
  private parseShippingAddress(addressJson: string): any {
    try {
      const address = JSON.parse(addressJson);
      return {
        name: address.fullName || address.name || 'Customer',
        street: address.street || address.line1 || address.address || '',
        city: address.city || '',
        state: address.state || '',
        postalCode: address.postalCode || address.zip || '',
        country: address.country || 'US',
      };
    } catch (error) {
      this.logger.error('Failed to parse shipping address', error);
      return {
        name: 'Customer',
        street: '',
        city: '',
        state: '',
        postalCode: '',
        country: 'US',
      };
    }
  }

  /**
   * Format order ID to order number (e.g., CB-2024-12345678)
   */
  private formatOrderNumber(orderId: string): string {
    const year = new Date().getFullYear();
    const orderSuffix = orderId.slice(-8).toUpperCase();
    return `CB-${year}-${orderSuffix}`;
  }

  /**
   * Estimate delivery date (7 days from order date by default)
   */
  private estimateDeliveryDate(orderDate: Date, daysOffset: number = 0): Date {
    const deliveryDate = new Date(orderDate);
    deliveryDate.setDate(deliveryDate.getDate() + 7 + daysOffset);
    return deliveryDate;
  }
}
