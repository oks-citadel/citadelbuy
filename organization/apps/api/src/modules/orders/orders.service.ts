import { Injectable, NotFoundException, BadRequestException, ForbiddenException, Logger } from '@nestjs/common';
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

    // Get product details to extract category IDs and verify stock
    const productIds = items.map((item) => item.productId);
    const products = await this.prisma.product.findMany({
      where: { id: { in: productIds } },
      select: { id: true, categoryId: true, stock: true, name: true },
    });

    // CRITICAL: Verify stock availability before creating order
    const insufficientStock: string[] = [];
    for (const item of items) {
      const product = products.find((p) => p.id === item.productId);
      if (!product) {
        throw new NotFoundException(`Product ${item.productId} not found`);
      }
      if (product.stock < item.quantity) {
        insufficientStock.push(
          `${product.name}: requested ${item.quantity}, available ${product.stock}`
        );
      }
    }

    if (insufficientStock.length > 0) {
      throw new BadRequestException(
        `Insufficient stock for: ${insufficientStock.join('; ')}`
      );
    }

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

    // CRITICAL: Use transaction to atomically reserve inventory and create order
    // This prevents overselling by ensuring stock is decremented in the same transaction
    const order = await this.prisma.$transaction(async (tx) => {
      // Reserve inventory (decrement stock) for each item
      for (const item of items) {
        const product = await tx.product.findUnique({
          where: { id: item.productId },
          select: { stock: true, name: true },
        });

        if (!product || product.stock < item.quantity) {
          throw new BadRequestException(
            `Insufficient stock for ${product?.name || item.productId}. ` +
            `Available: ${product?.stock || 0}, Requested: ${item.quantity}`
          );
        }

        // Decrement stock atomically
        await tx.product.update({
          where: { id: item.productId },
          data: {
            stock: {
              decrement: item.quantity,
            },
          },
        });

        this.logger.log(
          `Reserved ${item.quantity} units of product ${item.productId}`
        );
      }

      // Create order with items
      return tx.order.create({
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
    // For guest orders, use guestEmail instead of user.email
    const customerEmail = order.user?.email || (order as any).guestEmail;
    const customerName = order.user?.name || 'Customer';

    if (customerEmail) {
      const shippingAddr = JSON.parse(order.shippingAddress);
      this.emailService
        .sendOrderConfirmation(customerEmail, {
          customerName,
          orderNumber: order.id.slice(-8).toUpperCase(), // Use last 8 chars of ID as order number
          orderDate: order.createdAt.toLocaleDateString(),
          items: order.items.map((item) => ({
            name: item.product.name,
            image: item.product.images?.[0] || '',
            quantity: item.quantity,
            price: item.price,
          })),
          subtotal: order.subtotal,
          shipping: order.shipping || 0,
          shippingFree: !order.shipping || order.shipping === 0,
          tax: order.tax || 0,
          total: order.total,
          currency: '$',
          shippingAddress: {
            name: shippingAddr.name || customerName,
            line1: shippingAddr.line1 || shippingAddr.address || '',
            line2: shippingAddr.line2,
            city: shippingAddr.city || '',
            state: shippingAddr.state || '',
            postalCode: shippingAddr.postalCode || shippingAddr.zip || '',
            country: shippingAddr.country || 'US',
          },
          paymentMethod: {
            brand: order.paymentMethod || 'Card',
            last4: '****',
            email: customerEmail,
          },
          estimatedDelivery: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString(),
        })
        .catch((error) => {
          this.logger.error('Failed to send order confirmation email:', error);
        });
    }

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
        const email = updatedOrder.user?.email || (updatedOrder as any).guestEmail;
        const name = updatedOrder.user?.name || 'Customer';

        if (email) {
          // Map order status to email status
          const statusMap: Record<string, 'processing' | 'shipped' | 'delivered' | 'cancelled'> = {
            PENDING: 'processing',
            PROCESSING: 'processing',
            SHIPPED: 'shipped',
            DELIVERED: 'delivered',
            CANCELLED: 'cancelled',
            REFUNDED: 'cancelled',
          };

          this.emailService
            .sendOrderStatusUpdate(email, {
              customerName: name,
              orderNumber: updatedOrder.id.slice(-8).toUpperCase(),
              orderDate: updatedOrder.createdAt.toLocaleDateString(),
              status: statusMap[status] || 'processing',
              statusMessage: this.getStatusMessage(status),
              trackingNumber: updateData.trackingNumber,
              carrier: updateData.carrier,
              items: updatedOrder.items.map((item) => ({
                name: item.product.name,
                image: item.product.images?.[0],
                quantity: item.quantity,
              })),
            })
            .catch((error) => {
              this.logger.error('Failed to send order status update email:', error);
            });
        }
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
  private generateTrackingNumber(carrier: string = 'BROXIVA'): string {
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
    const trackingEmail = order.user?.email || (order as any).guestEmail;
    const trackingName = order.user?.name || 'Customer';

    if (trackingEmail) {
      this.emailService
        .sendOrderStatusUpdate(trackingEmail, {
          customerName: trackingName,
          orderNumber: order.id.slice(-8).toUpperCase(),
          orderDate: order.createdAt.toLocaleDateString(),
          status: 'shipped',
          statusMessage: 'Your order has been shipped and is on its way!',
          trackingNumber,
          carrier: trackingData.carrier,
          estimatedDelivery: trackingData.estimatedDeliveryDate?.toLocaleDateString(),
          items: [],
        })
        .catch((error) => {
          this.logger.error('Failed to send tracking email:', error);
        });
    }

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
    const deliveryEmail = order.user?.email || (order as any).guestEmail;
    const deliveryName = order.user?.name || 'Customer';

    if (deliveryEmail) {
      this.emailService
        .sendOrderStatusUpdate(deliveryEmail, {
          customerName: deliveryName,
          orderNumber: order.id.slice(-8).toUpperCase(),
          orderDate: order.createdAt.toLocaleDateString(),
          status: 'delivered',
          statusMessage: 'Your order has been delivered! Thank you for shopping with us.',
          trackingNumber: order.trackingNumber ?? undefined,
          carrier: order.carrier ?? undefined,
          items: [],
        })
        .catch((error) => {
          this.logger.error('Failed to send delivery confirmation email:', error);
        });
    }

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
   * Get status message for email notifications
   */
  private getStatusMessage(status: string): string {
    const messages: Record<string, string> = {
      PENDING: 'Your order is being processed.',
      PROCESSING: 'Your order is being prepared for shipment.',
      SHIPPED: 'Your order has been shipped and is on its way!',
      DELIVERED: 'Your order has been delivered. Thank you for shopping with us!',
      CANCELLED: 'Your order has been cancelled.',
      REFUNDED: 'Your order has been refunded.',
    };
    return messages[status] || 'Your order status has been updated.';
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

  /**
   * Cancel an order
   * Only allows cancellation if order is in PENDING or PROCESSING status
   */
  async cancelOrder(orderId: string, userId: string) {
    const order = await this.prisma.order.findFirst({
      where: {
        id: orderId,
        userId,
      },
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
      throw new NotFoundException('Order not found');
    }

    // Check if order belongs to user
    if (order.userId !== userId) {
      throw new ForbiddenException('You are not authorized to cancel this order');
    }

    // Check if order can be cancelled
    const cancellableStatuses = ['PENDING', 'PROCESSING'];
    if (!cancellableStatuses.includes(order.status)) {
      throw new BadRequestException(
        `Order cannot be cancelled. Current status: ${order.status}. ` +
        `Orders can only be cancelled when in ${cancellableStatuses.join(' or ')} status.`
      );
    }

    // Update status history
    const currentHistory = (order.statusHistory as any[]) || [];
    const statusHistory = [
      ...currentHistory,
      {
        status: 'CANCELLED',
        timestamp: new Date().toISOString(),
        note: 'Order cancelled by customer',
      },
    ];

    // Cancel the order and restore inventory in a transaction
    const cancelledOrder = await this.prisma.$transaction(async (tx) => {
      // Get order items to restore inventory
      const orderWithItems = await tx.order.findUnique({
        where: { id: orderId },
        include: {
          items: {
            select: {
              productId: true,
              quantity: true,
            },
          },
        },
      });

      if (!orderWithItems) {
        throw new NotFoundException('Order not found');
      }

      // Restore inventory for each item
      for (const item of orderWithItems.items) {
        await tx.product.update({
          where: { id: item.productId },
          data: {
            stock: {
              increment: item.quantity,
            },
          },
        });

        this.logger.log(
          `Restored ${item.quantity} units to product ${item.productId}`
        );
      }

      // Update order status
      return tx.order.update({
        where: { id: orderId },
        data: {
          status: 'CANCELLED',
          statusHistory,
          updatedAt: new Date(),
        },
      });
    });

    // Send cancellation email
    const email = order.user?.email || (order as any).guestEmail;
    const name = order.user?.name || 'Customer';

    if (email) {
      this.emailService
        .sendOrderStatusUpdate(email, {
          customerName: name,
          orderNumber: order.id.slice(-8).toUpperCase(),
          orderDate: order.createdAt.toLocaleDateString(),
          status: 'cancelled',
          statusMessage: 'Your order has been cancelled as requested.',
          items: [],
        })
        .catch((error) => {
          this.logger.error('Failed to send order cancellation email:', error);
        });
    }

    this.logger.log(`Order ${orderId} cancelled by user ${userId}`);

    return {
      id: cancelledOrder.id,
      orderNumber: cancelledOrder.id.slice(-8).toUpperCase(),
      status: cancelledOrder.status,
      message: 'Order has been cancelled successfully',
    };
  }
}
