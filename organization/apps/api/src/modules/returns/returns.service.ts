import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { ShippingService } from '../shipping/shipping.service';
import { PaymentsService } from '../payments/payments.service';
import { EmailService } from '../email/email.service';
import {
  CreateReturnRequestDto,
  UpdateReturnRequestDto,
  ApproveReturnDto,
  InspectReturnDto,
  CreateRefundDto,
  RestockReturnDto,
  IssueStoreCreditDto,
  GenerateReturnLabelDto,
  ReturnFiltersDto,
  ReturnAnalyticsDto,
  CancelReturnDto,
} from './dto/returns.dto';
import { ReturnStatus, RefundStatus, ReturnType, StoreCreditType, TransactionType } from '@prisma/client';
import { ShippingCarrierEnum, ServiceLevelEnum, PackageTypeEnum } from '../shipping/dto/shipping.dto';

@Injectable()
export class ReturnsService {
  constructor(
    private prisma: PrismaService,
    private shippingService: ShippingService,
    private paymentsService: PaymentsService,
    private emailService: EmailService,
  ) {}

  // ==================== RMA Generation ====================

  private async generateRMANumber(): Promise<string> {
    const prefix = 'RMA';
    const timestamp = Date.now().toString().slice(-8);
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `${prefix}${timestamp}${random}`;
  }

  // Helper method to send emails without breaking workflow
  private async sendEmailSafely(emailFunction: () => Promise<void>): Promise<void> {
    try {
      await emailFunction();
    } catch (error) {
      // Log error but don't throw - emails shouldn't break the workflow
      // Email error (don't break workflow)
    }
  }

  // ==================== Create Return Request ====================

  async createReturnRequest(userId: string, dto: CreateReturnRequestDto) {
    // Verify order belongs to user
    const order = await this.prisma.order.findUnique({
      where: { id: dto.orderId },
      include: { items: true },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    if (order.userId !== userId) {
      throw new ForbiddenException('This order does not belong to you');
    }

    // Verify order items
    const orderItemIds = order.items.map(item => item.id);
    for (const item of dto.items) {
      if (!orderItemIds.includes(item.orderItemId)) {
        throw new BadRequestException(`Order item ${item.orderItemId} not found in this order`);
      }
    }

    // Generate RMA number
    const rmaNumber = await this.generateRMANumber();

    // Calculate refund amount
    const totalRefund = dto.items.reduce((sum, item) => sum + (item.itemPrice * item.quantity), 0);

    // Create return request
    const returnRequest = await this.prisma.returnRequest.create({
      data: {
        rmaNumber,
        orderId: dto.orderId,
        userId,
        reason: dto.reason,
        returnType: dto.returnType,
        comments: dto.comments,
        status: ReturnStatus.REQUESTED,
        refundAmount: totalRefund,
        items: {
          create: dto.items.map(item => ({
            orderItemId: item.orderItemId,
            productId: item.productId,
            quantity: item.quantity,
            reason: item.reason,
            condition: item.condition,
            notes: item.notes,
            itemPrice: item.itemPrice,
            refundAmount: item.itemPrice * item.quantity,
          })),
        },
        timeline: {
          create: {
            status: ReturnStatus.REQUESTED,
            description: 'Return request submitted by customer',
            performedBy: userId,
          },
        },
      },
      include: {
        items: { include: { product: true } },
        order: true,
        user: true,
        timeline: true,
      },
    });

    // Send confirmation email
    await this.sendEmailSafely(() =>
      this.emailService.sendReturnRequestConfirmation({
        email: returnRequest.user.email,
        customerName: returnRequest.user.name,
        rmaNumber: returnRequest.rmaNumber,
        orderNumber: returnRequest.order.id,
        items: returnRequest.items.map(item => ({
          name: item.product.name,
          quantity: item.quantity,
        })),
        totalRefund: returnRequest.refundAmount || 0,
      }),
    );

    return returnRequest;
  }

  // ==================== Approve/Reject Return ====================

  async approveReturn(returnId: string, adminId: string, dto: ApproveReturnDto) {
    const returnRequest = await this.prisma.returnRequest.findUnique({
      where: { id: returnId },
      include: { items: true },
    });

    if (!returnRequest) {
      throw new NotFoundException('Return request not found');
    }

    if (returnRequest.status !== ReturnStatus.REQUESTED && returnRequest.status !== ReturnStatus.PENDING_APPROVAL) {
      throw new BadRequestException('Return request cannot be approved in current status');
    }

    const newStatus = dto.approved ? ReturnStatus.APPROVED : ReturnStatus.REJECTED;

    // Calculate final refund amount with fees
    let refundAmount = returnRequest.refundAmount || 0;
    if (dto.restockingFee) {
      refundAmount -= dto.restockingFee;
    }

    const updated = await this.prisma.returnRequest.update({
      where: { id: returnId },
      data: {
        status: newStatus,
        approvedBy: adminId,
        approvedAt: dto.approved ? new Date() : null,
        rejectedAt: dto.approved ? null : new Date(),
        rejectedReason: dto.approved ? null : dto.reason,
        restockingFee: dto.restockingFee || 0,
        refundAmount,
        timeline: {
          create: {
            status: newStatus,
            description: dto.approved
              ? 'Return approved by admin'
              : `Return rejected: ${dto.reason}`,
            performedBy: adminId,
          },
        },
      },
      include: {
        items: true,
        user: true,
        timeline: true,
      },
    });

    // Send approval/rejection email
    if (dto.approved) {
      await this.sendEmailSafely(() =>
        this.emailService.sendReturnApproved({
          email: updated.user.email,
          customerName: updated.user.name,
          rmaNumber: updated.rmaNumber,
          approvedAmount: updated.refundAmount || 0,
          nextSteps: 'You will receive a prepaid shipping label within 24 hours. Please ship your items back to us using this label.',
        }),
      );
    } else {
      await this.sendEmailSafely(() =>
        this.emailService.sendReturnRejected({
          email: updated.user.email,
          customerName: updated.user.name,
          rmaNumber: updated.rmaNumber,
          reason: dto.reason || 'Does not meet return policy requirements',
        }),
      );
    }

    return updated;
  }

  // ==================== Generate Return Label ====================

  async generateReturnLabel(returnId: string, dto: GenerateReturnLabelDto) {
    const returnRequest = await this.prisma.returnRequest.findUnique({
      where: { id: returnId },
      include: {
        order: true,
        user: true,
      },
    });

    if (!returnRequest) {
      throw new NotFoundException('Return request not found');
    }

    if (returnRequest.status !== ReturnStatus.APPROVED) {
      throw new BadRequestException('Return must be approved before generating label');
    }

    // Parse shipping address
    const shippingAddress = JSON.parse(returnRequest.order.shippingAddress);

    // Get warehouse address (default warehouse)
    const warehouse = await this.prisma.warehouse.findFirst({
      where: { isPrimary: true, isActive: true },
    });

    if (!warehouse) {
      throw new NotFoundException('No active warehouse found');
    }

    // Create return shipment
    const shipment = await this.shippingService.createShipment({
      orderId: returnRequest.orderId,
      carrier: (dto.carrier as unknown as ShippingCarrierEnum) || ShippingCarrierEnum.UPS,
      serviceLevel: (dto.serviceLevel as ServiceLevelEnum) || ServiceLevelEnum.GROUND,
      fromAddress: {
        name: shippingAddress.name || returnRequest.user.name,
        street1: shippingAddress.street1,
        street2: shippingAddress.street2,
        city: shippingAddress.city,
        state: shippingAddress.state,
        postalCode: shippingAddress.postalCode,
        country: shippingAddress.country,
      },
      toAddress: {
        name: warehouse.name,
        street1: warehouse.address,
        city: warehouse.city,
        state: warehouse.state,
        postalCode: warehouse.postalCode,
        country: warehouse.country,
      },
      package: {
        type: PackageTypeEnum.SMALL_PACKAGE,
        weight: 5, // Default weight, should be calculated
      },
    });

    // Create return label from shipment
    const label = await this.prisma.returnLabel.create({
      data: {
        shipmentId: shipment.id,
        orderId: returnRequest.orderId,
        carrier: shipment.carrier,
        trackingNumber: shipment.trackingNumber,
        labelUrl: shipment.labelUrl,
        labelFormat: shipment.labelFormat || 'PDF',
        reason: `Return for order ${returnRequest.orderId}`,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
      },
    });

    // Update return request with label info
    const updated = await this.prisma.returnRequest.update({
      where: { id: returnId },
      data: {
        status: ReturnStatus.LABEL_SENT,
        returnLabelId: label.id,
        trackingNumber: label.trackingNumber,
        carrier: label.carrier,
        timeline: {
          create: {
            status: ReturnStatus.LABEL_SENT,
            description: 'Return shipping label sent to customer',
            metadata: { trackingNumber: label.trackingNumber },
          },
        },
      },
      include: {
        returnLabel: true,
        user: true,
        timeline: true,
      },
    });

    // Send label ready email
    await this.sendEmailSafely(() =>
      this.emailService.sendReturnLabelReady({
        email: updated.user.email,
        customerName: updated.user.name,
        rmaNumber: updated.rmaNumber,
        trackingNumber: label.trackingNumber || '',
        carrier: label.carrier || '',
        labelUrl: label.labelUrl ?? undefined,
      }),
    );

    return { returnRequest: updated, label };
  }

  // ==================== Mark as Received ====================

  async markAsReceived(returnId: string, adminId: string) {
    const returnRequest = await this.prisma.returnRequest.update({
      where: { id: returnId },
      data: {
        status: ReturnStatus.RECEIVED,
        receivedAt: new Date(),
        timeline: {
          create: {
            status: ReturnStatus.RECEIVED,
            description: 'Return package received at warehouse',
            performedBy: adminId,
          },
        },
      },
      include: { items: true, timeline: true },
    });

    return returnRequest;
  }

  // ==================== Inspect Return ====================

  async inspectReturn(returnId: string, adminId: string, dto: InspectReturnDto) {
    const returnRequest = await this.prisma.returnRequest.findUnique({
      where: { id: returnId },
    });

    if (!returnRequest) {
      throw new NotFoundException('Return request not found');
    }

    if (returnRequest.status !== ReturnStatus.RECEIVED) {
      throw new BadRequestException('Return must be received before inspection');
    }

    const newStatus = dto.approved ? ReturnStatus.APPROVED_REFUND : ReturnStatus.REJECTED;
    const refundAmount = dto.adjustedRefundAmount || returnRequest.refundAmount;

    const updated = await this.prisma.returnRequest.update({
      where: { id: returnId },
      data: {
        status: newStatus,
        inspectedAt: new Date(),
        inspectedBy: adminId,
        inspectionNotes: dto.inspectionNotes,
        inspectionPhotos: dto.inspectionPhotos || [],
        refundAmount,
        timeline: {
          create: {
            status: newStatus,
            description: dto.approved
              ? 'Return approved after inspection'
              : 'Return rejected after inspection',
            performedBy: adminId,
            metadata: { inspectionNotes: dto.inspectionNotes },
          },
        },
      },
      include: { items: true, timeline: true },
    });

    return updated;
  }

  // ==================== Process Refund ====================

  async createRefund(returnId: string, dto: CreateRefundDto) {
    const returnRequest = await this.prisma.returnRequest.findUnique({
      where: { id: returnId },
      include: { refund: true, items: true },
    });

    if (!returnRequest) {
      throw new NotFoundException('Return request not found');
    }

    if (returnRequest.refund) {
      throw new BadRequestException('Refund already exists for this return');
    }

    if (returnRequest.status !== ReturnStatus.APPROVED_REFUND) {
      throw new BadRequestException('Return must be approved for refund');
    }

    const subtotal = dto.subtotal || returnRequest.refundAmount || 0;
    const shippingRefund = dto.shippingRefund || returnRequest.shippingRefund || 0;
    const taxRefund = dto.taxRefund || 0;
    const restockingFee = dto.restockingFee || returnRequest.restockingFee || 0;
    const totalAmount = subtotal + shippingRefund + taxRefund - restockingFee;

    const refund = await this.prisma.refund.create({
      data: {
        returnRequestId: returnId,
        orderId: returnRequest.orderId,
        userId: returnRequest.userId,
        method: dto.method,
        subtotal,
        shippingRefund,
        taxRefund,
        restockingFee,
        totalAmount,
        status: RefundStatus.PENDING,
        notes: dto.notes,
      },
    });

    await this.prisma.returnRequest.update({
      where: { id: returnId },
      data: {
        timeline: {
          create: {
            status: returnRequest.status,
            description: `Refund initiated: $${totalAmount.toFixed(2)}`,
            metadata: { refundId: refund.id, method: dto.method },
          },
        },
      },
    });

    return refund;
  }

  async processRefund(refundId: string, adminId: string) {
    const refund = await this.prisma.refund.findUnique({
      where: { id: refundId },
      include: {
        returnRequest: true,
        user: true,
        order: {
          select: {
            paymentMethod: true,
            paymentIntentId: true,
          },
        },
      },
    });

    if (!refund) {
      throw new NotFoundException('Refund not found');
    }

    if (refund.status !== RefundStatus.PENDING) {
      throw new BadRequestException('Refund is not in pending status');
    }

    // Update refund to processing status
    await this.prisma.refund.update({
      where: { id: refundId },
      data: { status: RefundStatus.PROCESSING },
    });

    let paymentRefundResult;
    let transactionId = `TXN_${Date.now()}`; // Fallback transaction ID

    try {
      // Process refund through payment gateway based on method
      if (refund.method === 'ORIGINAL_PAYMENT' && refund.order.paymentIntentId) {
        const paymentMethod = this.determinePaymentMethod(refund.order.paymentMethod);

        paymentRefundResult = await this.paymentsService.processRefund(
          paymentMethod,
          refund.order.paymentIntentId,
          refund.totalAmount,
          `Return ${refund.returnRequest.rmaNumber}`,
          {
            returnRequestId: refund.returnRequestId,
            refundId: refund.id,
            rmaNumber: refund.returnRequest.rmaNumber,
          },
        );

        transactionId = paymentRefundResult.refundId;

        // Update refund to completed
        const updated = await this.prisma.refund.update({
          where: { id: refundId },
          data: {
            status: RefundStatus.COMPLETED,
            processedAt: new Date(),
            processedBy: adminId,
            transactionId: transactionId,
          },
        });

        await this.prisma.returnRequest.update({
          where: { id: refund.returnRequestId },
          data: {
            status: ReturnStatus.COMPLETED,
            completedAt: new Date(),
            timeline: {
              create: {
                status: ReturnStatus.COMPLETED,
                description: `Refund processed successfully - $${refund.totalAmount.toFixed(2)}`,
                performedBy: adminId,
                metadata: {
                  transactionId,
                  paymentMethod: paymentMethod,
                },
              },
            },
          },
        });

        // Send refund processed email
        await this.sendEmailSafely(() =>
          this.emailService.sendRefundProcessed({
            email: refund.user.email,
            customerName: refund.user.name,
            rmaNumber: refund.returnRequest.rmaNumber,
            refundAmount: refund.totalAmount,
            refundMethod: 'Original Payment Method',
            estimatedDays: 5,
          }),
        );

        return updated;
      } else {
        // For store credit or other methods, mark as completed directly
        const updated = await this.prisma.refund.update({
          where: { id: refundId },
          data: {
            status: RefundStatus.COMPLETED,
            processedAt: new Date(),
            processedBy: adminId,
            transactionId: transactionId,
          },
        });

        await this.prisma.returnRequest.update({
          where: { id: refund.returnRequestId },
          data: {
            status: ReturnStatus.COMPLETED,
            completedAt: new Date(),
            timeline: {
              create: {
                status: ReturnStatus.COMPLETED,
                description: 'Refund processed successfully',
                performedBy: adminId,
              },
            },
          },
        });

        // Send refund processed email
        await this.sendEmailSafely(() =>
          this.emailService.sendRefundProcessed({
            email: refund.user.email,
            customerName: refund.user.name,
            rmaNumber: refund.returnRequest.rmaNumber,
            refundAmount: refund.totalAmount,
            refundMethod: refund.method,
            estimatedDays: 3,
          }),
        );

        return updated;
      }
    } catch (error) {
      // Handle refund failure
      const _failed = await this.prisma.refund.update({
        where: { id: refundId },
        data: {
          status: RefundStatus.FAILED,
          failedReason: error.message || 'Payment gateway error',
        },
      });

      await this.prisma.returnRequest.update({
        where: { id: refund.returnRequestId },
        data: {
          timeline: {
            create: {
              status: refund.returnRequest.status,
              description: 'Refund processing failed',
              performedBy: adminId,
              metadata: { error: error.message },
            },
          },
        },
      });

      throw new BadRequestException(`Refund failed: ${error.message}`);
    }
  }

  private determinePaymentMethod(paymentMethod: string | null): 'STRIPE' | 'PAYPAL' | 'OTHER' {
    if (!paymentMethod) return 'OTHER';

    const method = paymentMethod.toUpperCase();
    if (method.includes('STRIPE') || method.includes('CARD') || method.includes('CREDIT')) {
      return 'STRIPE';
    } else if (method.includes('PAYPAL')) {
      return 'PAYPAL';
    }
    return 'OTHER';
  }

  // ==================== Issue Store Credit ====================

  async issueStoreCredit(returnId: string, adminId: string, dto: IssueStoreCreditDto) {
    const returnRequest = await this.prisma.returnRequest.findUnique({
      where: { id: returnId },
      include: { user: { include: { storeCredit: true } } },
    });

    if (!returnRequest) {
      throw new NotFoundException('Return request not found');
    }

    if (returnRequest.returnType !== ReturnType.STORE_CREDIT) {
      throw new BadRequestException('Return type must be STORE_CREDIT');
    }

    // Get or create user's store credit account
    let storeCredit = returnRequest.user.storeCredit;

    if (!storeCredit) {
      storeCredit = await this.prisma.storeCredit.create({
        data: {
          userId: returnRequest.userId,
          currentBalance: 0,
          totalEarned: 0,
          totalSpent: 0,
        },
      });
    }

    const balanceBefore = storeCredit.currentBalance;
    const balanceAfter = balanceBefore + dto.amount;

    // Create store credit transaction
    const transaction = await this.prisma.storeCreditTransaction.create({
      data: {
        storeCreditId: storeCredit.id,
        type: StoreCreditType.REFUND,
        transactionType: TransactionType.REFUND,
        amount: dto.amount,
        balanceBefore,
        balanceAfter,
        description: `Store credit from return ${returnRequest.rmaNumber}`,
        notes: dto.reason,
        expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null,
      },
    });

    // Update store credit balance
    await this.prisma.storeCredit.update({
      where: { id: storeCredit.id },
      data: {
        currentBalance: balanceAfter,
        totalEarned: { increment: dto.amount },
      },
    });

    // Update return request
    await this.prisma.returnRequest.update({
      where: { id: returnId },
      data: {
        storeCreditAmount: dto.amount,
        storeCreditTransactionId: transaction.id,
        status: ReturnStatus.COMPLETED,
        completedAt: new Date(),
        timeline: {
          create: {
            status: ReturnStatus.COMPLETED,
            description: `Store credit issued: $${dto.amount.toFixed(2)}`,
            performedBy: adminId,
            metadata: { transactionId: transaction.id },
          },
        },
      },
    });

    // Send store credit issued email
    await this.sendEmailSafely(() =>
      this.emailService.sendStoreCreditIssued({
        email: returnRequest.user.email,
        customerName: returnRequest.user.name,
        rmaNumber: returnRequest.rmaNumber,
        creditAmount: dto.amount,
        expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : undefined,
      }),
    );

    return { transaction, storeCredit: { ...storeCredit, currentBalance: balanceAfter } };
  }

  // ==================== Restock Items ====================

  async restockItems(dto: RestockReturnDto, adminId: string) {
    const returnRequest = await this.prisma.returnRequest.findUnique({
      where: { id: dto.returnRequestId },
      include: { items: true },
    });

    if (!returnRequest) {
      throw new NotFoundException('Return request not found');
    }

    if (returnRequest.status !== ReturnStatus.APPROVED_REFUND) {
      throw new BadRequestException('Return must be approved for restocking');
    }

    const updates = [];

    for (const item of dto.items) {
      const returnItem = returnRequest.items.find(ri => ri.id === item.returnItemId);
      if (!returnItem) {
        throw new NotFoundException(`Return item ${item.returnItemId} not found`);
      }

      const quantity = item.quantity || returnItem.quantity;

      // Update inventory
      await this.prisma.inventoryItem.upsert({
        where: {
          productId_warehouseId: {
            productId: returnItem.productId,
            warehouseId: item.warehouseId,
          },
        },
        create: {
          productId: returnItem.productId,
          warehouseId: item.warehouseId,
          quantity: quantity,
          availableQty: quantity,
          reservedQty: 0,
          reorderPoint: 10,
          reorderQuantity: 50,
        },
        update: {
          quantity: { increment: quantity },
          availableQty: { increment: quantity },
        },
      });

      // Mark return item as restocked
      await this.prisma.returnItem.update({
        where: { id: item.returnItemId },
        data: {
          restocked: true,
          restockedAt: new Date(),
          restockedBy: adminId,
          warehouseId: item.warehouseId,
        },
      });

      updates.push({ returnItemId: item.returnItemId, quantity });
    }

    await this.prisma.returnRequest.update({
      where: { id: dto.returnRequestId },
      data: {
        timeline: {
          create: {
            status: returnRequest.status,
            description: `${updates.length} items restocked`,
            performedBy: adminId,
            metadata: { updates },
          },
        },
      },
    });

    return { message: 'Items restocked successfully', updates };
  }

  // ==================== Get Returns ====================

  async getReturns(userId: string | null, filters: ReturnFiltersDto) {
    const where: any = {};

    if (filters.status) where.status = filters.status;
    if (filters.orderId) where.orderId = filters.orderId;
    if (filters.returnType) where.returnType = filters.returnType;
    if (filters.reason) where.reason = filters.reason;
    if (filters.rmaNumber) where.rmaNumber = filters.rmaNumber;

    // Non-admin users can only see their own returns
    if (userId) where.userId = userId;

    if (filters.fromDate || filters.toDate) {
      where.createdAt = {};
      if (filters.fromDate) where.createdAt.gte = new Date(filters.fromDate);
      if (filters.toDate) where.createdAt.lte = new Date(filters.toDate);
    }

    return this.prisma.returnRequest.findMany({
      where,
      include: {
        items: { include: { product: true } },
        order: true,
        user: { select: { id: true, email: true, name: true } },
        refund: true,
        timeline: { orderBy: { createdAt: 'desc' }, take: 5 },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getReturnById(returnId: string) {
    const returnRequest = await this.prisma.returnRequest.findUnique({
      where: { id: returnId },
      include: {
        items: { include: { product: true } },
        order: { include: { items: true } },
        user: { select: { id: true, email: true, name: true } },
        refund: true,
        returnLabel: true,
        timeline: { orderBy: { createdAt: 'desc' } },
      },
    });

    if (!returnRequest) {
      throw new NotFoundException('Return request not found');
    }

    return returnRequest;
  }


  /**
   * Security-enhanced method to get return by ID with ownership verification
   * Prevents IDOR vulnerability by ensuring users can only access their own returns
   * Admins can access any return
   */
  async getReturnByIdSecure(returnId: string, userId: string, userRole: string) {
    const returnRequest = await this.prisma.returnRequest.findUnique({
      where: { id: returnId },
      include: {
        items: { include: { product: true } },
        order: { include: { items: true } },
        user: { select: { id: true, email: true, name: true } },
        refund: true,
        returnLabel: true,
        timeline: { orderBy: { createdAt: 'desc' } },
      },
    });

    if (!returnRequest) {
      throw new NotFoundException('Return request not found');
    }

    // Security: Only allow access if user is admin or owner of the return
    const isAdmin = userRole === 'ADMIN';
    const isOwner = returnRequest.userId === userId;

    if (!isAdmin && !isOwner) {
      throw new ForbiddenException('You can only access your own return requests');
    }

    return returnRequest;
  }

  // ==================== Cancel Return ====================

  async cancelReturn(returnId: string, userId: string, dto: CancelReturnDto) {
    const returnRequest = await this.prisma.returnRequest.findUnique({
      where: { id: returnId },
    });

    if (!returnRequest) {
      throw new NotFoundException('Return request not found');
    }

    if (returnRequest.userId !== userId) {
      throw new ForbiddenException('You can only cancel your own returns');
    }

    const cancellableStatuses: ReturnStatus[] = [
      ReturnStatus.REQUESTED,
      ReturnStatus.PENDING_APPROVAL,
      ReturnStatus.APPROVED,
    ];

    if (!cancellableStatuses.includes(returnRequest.status)) {
      throw new BadRequestException('Return cannot be cancelled in current status');
    }

    const updated = await this.prisma.returnRequest.update({
      where: { id: returnId },
      data: {
        status: ReturnStatus.CANCELLED,
        cancelledAt: new Date(),
        timeline: {
          create: {
            status: ReturnStatus.CANCELLED,
            description: `Return cancelled${dto.reason ? `: ${dto.reason}` : ''}`,
            performedBy: userId,
          },
        },
      },
      include: { items: true, timeline: true },
    });

    return updated;
  }

  // ==================== Analytics ====================

  async getReturnAnalytics(filters: ReturnAnalyticsDto) {
    const where: any = {};

    if (filters.startDate || filters.endDate) {
      where.createdAt = {};
      if (filters.startDate) where.createdAt.gte = new Date(filters.startDate);
      if (filters.endDate) where.createdAt.lte = new Date(filters.endDate);
    }

    const [
      totalReturns,
      returnsByStatus,
      returnsByReason,
      returnsByType,
      totalRefunded,
    ] = await Promise.all([
      this.prisma.returnRequest.count({ where }),
      this.prisma.returnRequest.groupBy({
        by: ['status'],
        where,
        _count: true,
      }),
      this.prisma.returnRequest.groupBy({
        by: ['reason'],
        where,
        _count: true,
      }),
      this.prisma.returnRequest.groupBy({
        by: ['returnType'],
        where,
        _count: true,
      }),
      this.prisma.refund.aggregate({
        where: {
          ...where,
          status: RefundStatus.COMPLETED,
        },
        _sum: { totalAmount: true },
      }),
    ]);

    return {
      totalReturns,
      returnsByStatus,
      returnsByReason,
      returnsByType,
      totalRefunded: totalRefunded._sum.totalAmount || 0,
    };
  }
}
