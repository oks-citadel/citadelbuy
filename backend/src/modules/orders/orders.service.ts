import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { OrderStatus } from '@prisma/client';
import { EmailService } from '../email/email.service';
import { TaxService } from '../tax/tax.service';

@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);

  constructor(
    private prisma: PrismaService,
    private emailService: EmailService,
    private taxService: TaxService,
  ) {}

  async findByUserId(userId: string) {
    return this.prisma.order.findMany({
      where: { userId },
      include: {
        items: {
          include: {
            product: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async findById(orderId: string, userId?: string) {
    const order = await this.prisma.order.findFirst({
      where: {
        id: orderId,
        ...(userId && { userId }),
      },
      include: {
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                images: true,
              },
            },
          },
        },
      },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    return order;
  }

  async create(userId: string, createOrderDto: CreateOrderDto) {
    const { items, shippingAddress, subtotal, shipping } = createOrderDto;

    // Get product details to extract category IDs
    const productIds = items.map((item) => item.productId);
    const products = await this.prisma.product.findMany({
      where: { id: { in: productIds } },
      select: { id: true, categoryId: true },
    });

    const categoryIds = products
      .map((p) => p.categoryId)
      .filter((id): id is string => id !== null);

    // Calculate tax automatically using TaxService
    let calculatedTax = 0;
    let taxCalculationId: string | undefined;

    try {
      const taxCalculation = await this.taxService.calculateTax({
        subtotal,
        shippingAmount: shipping,
        country: this.extractCountryCode(shippingAddress.country),
        state: shippingAddress.state,
        city: shippingAddress.city,
        zipCode: shippingAddress.postalCode,
        customerId: userId,
        productIds,
        categoryIds,
      });

      calculatedTax = taxCalculation.taxAmount;
      this.logger.log(`Tax calculated for order: $${calculatedTax.toFixed(2)}`);
    } catch (error) {
      this.logger.warn('Failed to calculate tax, using 0:', error.message);
      // Continue with order creation even if tax calculation fails
      calculatedTax = 0;
    }

    // Calculate total with tax
    const total = subtotal + shipping + calculatedTax;

    // Create order with items in a transaction
    const order = await this.prisma.order.create({
      data: {
        userId,
        status: 'PENDING',
        total,
        subtotal,
        tax: calculatedTax,
        shipping,
        shippingAddress: JSON.stringify(shippingAddress),
        items: {
          create: items.map((item) => ({
            productId: item.productId,
            quantity: item.quantity,
            price: item.price,
          })),
        },
      },
      include: {
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                images: true,
              },
            },
          },
        },
        user: {
          select: {
            email: true,
            name: true,
          },
        },
      },
    });

    // Store tax calculation in database
    if (calculatedTax > 0) {
      try {
        const taxCalc = await this.taxService.calculateOrderTax(order.id, {
          subtotal,
          shippingAmount: shipping,
          country: this.extractCountryCode(shippingAddress.country),
          state: shippingAddress.state,
          city: shippingAddress.city,
          zipCode: shippingAddress.postalCode,
          customerId: userId,
          productIds,
          categoryIds,
        });
        taxCalculationId = taxCalc.calculationId;
      } catch (error) {
        this.logger.error('Failed to store tax calculation:', error);
      }
    }

    // Send order confirmation email (async, don't block order creation)
    this.emailService
      .sendOrderConfirmation(order.user.email, {
        customerName: order.user.name,
        orderId: order.id,
        orderTotal: order.total,
        orderItems: order.items.map((item) => ({
          name: item.product.name,
          quantity: item.quantity,
          price: item.price,
        })),
        shippingAddress: JSON.parse(order.shippingAddress),
        orderDate: order.createdAt.toLocaleString(),
      })
      .catch((error) => {
        this.logger.error('Failed to send order confirmation email:', error);
      });

    return order;
  }

  async updateOrderStatus(
    orderId: string,
    status: OrderStatus,
    paymentData?: {
      paymentIntentId?: string;
      paymentMethod?: string;
    },
  ) {
    try {
      // Check if order exists
      const existingOrder = await this.prisma.order.findUnique({
        where: { id: orderId },
      });

      if (!existingOrder) {
        throw new NotFoundException(`Order ${orderId} not found`);
      }

      // Build update data
      const updateData: any = {
        status,
        updatedAt: new Date(),
      };

      // Add payment data if provided
      if (paymentData?.paymentIntentId) {
        updateData.paymentIntentId = paymentData.paymentIntentId;
      }

      if (paymentData?.paymentMethod) {
        updateData.paymentMethod = paymentData.paymentMethod;
      }

      // Update order
      const updatedOrder = await this.prisma.order.update({
        where: { id: orderId },
        data: updateData,
        include: {
          items: {
            include: {
              product: {
                select: {
                  id: true,
                  name: true,
                  images: true,
                },
              },
            },
          },
          user: {
            select: {
              email: true,
              name: true,
            },
          },
        },
      });

      this.logger.log(
        `Order ${orderId} status updated from ${existingOrder.status} to ${status}`,
      );

      // Send status update email (only if status actually changed)
      if (existingOrder.status !== status) {
        this.emailService
          .sendOrderStatusUpdate(updatedOrder.user.email, {
            customerName: updatedOrder.user.name,
            orderId: updatedOrder.id,
            newStatus: status,
            trackingNumber: updateData.trackingNumber,
          })
          .catch((error) => {
            this.logger.error('Failed to send order status update email:', error);
          });
      }

      return updatedOrder;
    } catch (error) {
      this.logger.error(`Failed to update order ${orderId}`, error);
      throw error;
    }
  }

  async updateOrderPayment(
    orderId: string,
    paymentIntentId: string,
    paymentMethod?: string,
  ) {
    try {
      const order = await this.prisma.order.update({
        where: { id: orderId },
        data: {
          paymentIntentId,
          paymentMethod: paymentMethod || 'card',
          status: 'PROCESSING',
          updatedAt: new Date(),
        },
      });

      this.logger.log(
        `Order ${orderId} payment updated with intent ${paymentIntentId}`,
      );

      return order;
    } catch (error) {
      this.logger.error(`Failed to update order ${orderId} payment`, error);
      throw error;
    }
  }

  async findAll(
    status?: OrderStatus,
    page: number = 1,
    limit: number = 20,
  ) {
    const where = status ? { status } : {};
    const skip = (page - 1) * limit;

    const [orders, total] = await Promise.all([
      this.prisma.order.findMany({
        where,
        include: {
          items: {
            include: {
              product: {
                select: {
                  id: true,
                  name: true,
                  images: true,
                },
              },
            },
          },
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
        skip,
        take: limit,
      }),
      this.prisma.order.count({ where }),
    ]);

    return {
      data: orders,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        hasNextPage: page * limit < total,
        hasPreviousPage: page > 1,
      },
    };
  }

  async getOrderStats() {
    const [
      totalOrders,
      pendingOrders,
      processingOrders,
      shippedOrders,
      deliveredOrders,
      cancelledOrders,
      totalRevenue,
    ] = await Promise.all([
      this.prisma.order.count(),
      this.prisma.order.count({ where: { status: 'PENDING' } }),
      this.prisma.order.count({ where: { status: 'PROCESSING' } }),
      this.prisma.order.count({ where: { status: 'SHIPPED' } }),
      this.prisma.order.count({ where: { status: 'DELIVERED' } }),
      this.prisma.order.count({ where: { status: 'CANCELLED' } }),
      this.prisma.order.aggregate({
        _sum: {
          total: true,
        },
        where: {
          status: {
            in: ['PROCESSING', 'SHIPPED', 'DELIVERED'],
          },
        },
      }),
    ]);

    return {
      totalOrders,
      ordersByStatus: {
        pending: pendingOrders,
        processing: processingOrders,
        shipped: shippedOrders,
        delivered: deliveredOrders,
        cancelled: cancelledOrders,
      },
      totalRevenue: totalRevenue._sum.total || 0,
    };
  }

  /**
   * Generate a tracking number
   */
  private generateTrackingNumber(carrier: string = 'CITADEL'): string {
    const prefix = carrier.substring(0, 3).toUpperCase();
    const timestamp = Date.now().toString().slice(-8);
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    return `${prefix}${timestamp}${random}`;
  }

  /**
   * Add tracking information to an order
   */
  async addTrackingInfo(
    orderId: string,
    trackingData: {
      trackingNumber?: string;
      carrier: string;
      shippingMethod?: string;
      estimatedDeliveryDate?: Date;
    },
  ) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        user: {
          select: {
            email: true,
            name: true,
          },
        },
      },
    });

    if (!order) {
      throw new NotFoundException(`Order ${orderId} not found`);
    }

    // Generate tracking number if not provided
    const trackingNumber =
      trackingData.trackingNumber || this.generateTrackingNumber(trackingData.carrier);

    // Update status history
    const currentHistory = (order.statusHistory as any[]) || [];
    const statusHistory = [
      ...currentHistory,
      {
        status: 'SHIPPED',
        timestamp: new Date().toISOString(),
        note: `Shipped via ${trackingData.carrier}`,
      },
    ];

    const updatedOrder = await this.prisma.order.update({
      where: { id: orderId },
      data: {
        trackingNumber,
        carrier: trackingData.carrier,
        shippingMethod: trackingData.shippingMethod,
        estimatedDeliveryDate: trackingData.estimatedDeliveryDate,
        status: 'SHIPPED',
        statusHistory,
        updatedAt: new Date(),
      },
    });

    // Send tracking email
    this.emailService
      .sendOrderStatusUpdate(order.user.email, {
        customerName: order.user.name,
        orderId: order.id,
        newStatus: 'SHIPPED',
        trackingNumber,
        carrier: trackingData.carrier,
        estimatedDelivery: trackingData.estimatedDeliveryDate?.toLocaleDateString(),
      })
      .catch((error) => {
        this.logger.error('Failed to send tracking email:', error);
      });

    this.logger.log(`Tracking info added to order ${orderId}: ${trackingNumber}`);
    return updatedOrder;
  }

  /**
   * Update order to delivered status
   */
  async markAsDelivered(orderId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        user: {
          select: {
            email: true,
            name: true,
          },
        },
      },
    });

    if (!order) {
      throw new NotFoundException(`Order ${orderId} not found`);
    }

    // Update status history
    const currentHistory = (order.statusHistory as any[]) || [];
    const statusHistory = [
      ...currentHistory,
      {
        status: 'DELIVERED',
        timestamp: new Date().toISOString(),
        note: 'Package delivered',
      },
    ];

    const updatedOrder = await this.prisma.order.update({
      where: { id: orderId },
      data: {
        status: 'DELIVERED',
        actualDeliveryDate: new Date(),
        statusHistory,
        updatedAt: new Date(),
      },
    });

    // Send delivery confirmation email
    this.emailService
      .sendOrderStatusUpdate(order.user.email, {
        customerName: order.user.name,
        orderId: order.id,
        newStatus: 'DELIVERED',
        trackingNumber: order.trackingNumber ?? undefined,
      })
      .catch((error) => {
        this.logger.error('Failed to send delivery confirmation email:', error);
      });

    this.logger.log(`Order ${orderId} marked as delivered`);
    return updatedOrder;
  }

  /**
   * Get order tracking history
   */
  async getTrackingHistory(orderId: string, userId?: string) {
    const order = await this.findById(orderId, userId);

    if (!order) {
      throw new NotFoundException(`Order ${orderId} not found`);
    }

    return {
      orderId: order.id,
      status: order.status,
      trackingNumber: order.trackingNumber,
      carrier: order.carrier,
      shippingMethod: order.shippingMethod,
      estimatedDeliveryDate: order.estimatedDeliveryDate,
      actualDeliveryDate: order.actualDeliveryDate,
      statusHistory: order.statusHistory || [],
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
    };
  }

  /**
   * Find order by tracking number
   */
  async findByTrackingNumber(trackingNumber: string) {
    const order = await this.prisma.order.findFirst({
      where: { trackingNumber },
      include: {
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                images: true,
              },
            },
          },
        },
      },
    });

    if (!order) {
      throw new NotFoundException(`Order with tracking number ${trackingNumber} not found`);
    }

    return order;
  }

  /**
   * Extract ISO 3166-1 alpha-2 country code from country name
   * This is a helper method for tax calculation
   */
  private extractCountryCode(country: string): string {
    const countryMap: Record<string, string> = {
      'United States': 'US',
      'USA': 'US',
      'Canada': 'CA',
      'United Kingdom': 'GB',
      'UK': 'GB',
      'Australia': 'AU',
      'Germany': 'DE',
      'France': 'FR',
      'Italy': 'IT',
      'Spain': 'ES',
      'Netherlands': 'NL',
      'Belgium': 'BE',
      'Switzerland': 'CH',
      'Austria': 'AT',
      'Sweden': 'SE',
      'Norway': 'NO',
      'Denmark': 'DK',
      'Finland': 'FI',
      'Ireland': 'IE',
      'Poland': 'PL',
      'Portugal': 'PT',
      'Greece': 'GR',
      'Czech Republic': 'CZ',
      'Hungary': 'HU',
      'Romania': 'RO',
      'India': 'IN',
      'Japan': 'JP',
      'China': 'CN',
      'South Korea': 'KR',
      'Brazil': 'BR',
      'Mexico': 'MX',
      'Argentina': 'AR',
      'Chile': 'CL',
      'Colombia': 'CO',
      'Singapore': 'SG',
      'Malaysia': 'MY',
      'Thailand': 'TH',
      'Indonesia': 'ID',
      'Philippines': 'PH',
      'Vietnam': 'VN',
      'New Zealand': 'NZ',
      'South Africa': 'ZA',
      'Egypt': 'EG',
      'Turkey': 'TR',
      'Saudi Arabia': 'SA',
      'United Arab Emirates': 'AE',
      'UAE': 'AE',
      'Israel': 'IL',
    };

    // Check if it's already a 2-letter code
    if (country.length === 2) {
      return country.toUpperCase();
    }

    // Look up in the map
    const code = countryMap[country];
    if (code) {
      return code;
    }

    // Default to US if not found (or could throw error)
    this.logger.warn(`Unknown country: ${country}, defaulting to US`);
    return 'US';
  }
}
