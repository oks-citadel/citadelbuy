import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';
import { CreatePaymentPlanDto } from './dto/create-payment-plan.dto';
import { BnplProvider, BnplPaymentPlanStatus, BnplInstallmentStatus } from '@prisma/client';
import { addDays, addWeeks, addMonths } from 'date-fns';

@Injectable()
export class BnplService {
  constructor(private readonly prisma: PrismaService) {}

  // ============================================
  // PAYMENT PLAN CREATION
  // ============================================

  /**
   * Create BNPL payment plan for an order
   */
  async createPaymentPlan(userId: string, dto: CreatePaymentPlanDto) {
    // Get order details
    const order = await this.prisma.order.findUnique({
      where: { id: dto.orderId },
      include: { bnplPaymentPlan: true },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    if (order.userId !== userId) {
      throw new BadRequestException('You do not own this order');
    }

    if (order.bnplPaymentPlan) {
      throw new ConflictException('Order already has a payment plan');
    }

    // Validate order amount
    const MIN_AMOUNT = 50; // Minimum $50 for BNPL
    const MAX_AMOUNT = 10000; // Maximum $10,000 for BNPL

    if (order.total < MIN_AMOUNT) {
      throw new BadRequestException(`Order total must be at least $${MIN_AMOUNT} for BNPL`);
    }

    if (order.total > MAX_AMOUNT) {
      throw new BadRequestException(`Order total cannot exceed $${MAX_AMOUNT} for BNPL`);
    }

    // Calculate payment plan
    const downPayment = dto.downPayment || 0;
    const amountToFinance = order.total - downPayment;

    if (amountToFinance <= 0) {
      throw new BadRequestException('Down payment cannot exceed order total');
    }

    const installmentAmount = this.calculateInstallmentAmount(
      amountToFinance,
      dto.numberOfInstallments,
      dto.provider
    );

    // Calculate dates
    const frequency = dto.frequency || 'MONTHLY';
    const { firstPaymentDate, finalPaymentDate, installmentDates } = this.calculatePaymentDates(
      dto.numberOfInstallments,
      frequency
    );

    // Get provider-specific details
    const { interestRate, fees } = this.getProviderDetails(dto.provider);

    // Create payment plan
    const paymentPlan = await this.prisma.bnplPaymentPlan.create({
      data: {
        orderId: dto.orderId,
        userId,
        provider: dto.provider,
        totalAmount: order.total,
        downPayment,
        numberOfInstallments: dto.numberOfInstallments,
        installmentAmount,
        frequency,
        firstPaymentDate,
        finalPaymentDate,
        remainingBalance: amountToFinance,
        interestRate,
        fees,
        status: BnplPaymentPlanStatus.PENDING,
      },
    });

    // Create installments
    const installments = installmentDates.map((date, index) => ({
      paymentPlanId: paymentPlan.id,
      installmentNumber: index + 1,
      amount: installmentAmount,
      dueDate: date,
      status: BnplInstallmentStatus.PENDING,
    }));

    await this.prisma.bnplInstallment.createMany({
      data: installments,
    });

    // In production, integrate with actual provider API
    // const providerResponse = await this.integrateWithProvider(paymentPlan, order);
    // Update providerPlanId with response

    return this.findOnePaymentPlan(paymentPlan.id, userId);
  }

  /**
   * Calculate installment amount with interest
   */
  private calculateInstallmentAmount(
    principal: number,
    numberOfInstallments: number,
    provider: BnplProvider
  ): number {
    const { interestRate } = this.getProviderDetails(provider);

    if (interestRate === 0) {
      // 0% APR - simple division
      return Math.ceil((principal / numberOfInstallments) * 100) / 100;
    }

    // Calculate with interest (monthly rate)
    const monthlyRate = interestRate / 12 / 100;
    const installment =
      (principal * monthlyRate * Math.pow(1 + monthlyRate, numberOfInstallments)) /
      (Math.pow(1 + monthlyRate, numberOfInstallments) - 1);

    return Math.ceil(installment * 100) / 100;
  }

  /**
   * Calculate payment dates
   */
  private calculatePaymentDates(numberOfInstallments: number, frequency: string) {
    const installmentDates: Date[] = [];
    let currentDate = new Date();

    // First payment is typically immediate or within a few days
    const firstPaymentDate = addDays(currentDate, 1);
    installmentDates.push(firstPaymentDate);

    // Calculate subsequent payments
    for (let i = 1; i < numberOfInstallments; i++) {
      switch (frequency) {
        case 'WEEKLY':
          currentDate = addWeeks(installmentDates[i - 1], 1);
          break;
        case 'BIWEEKLY':
          currentDate = addWeeks(installmentDates[i - 1], 2);
          break;
        case 'MONTHLY':
        default:
          currentDate = addMonths(installmentDates[i - 1], 1);
          break;
      }
      installmentDates.push(currentDate);
    }

    const finalPaymentDate = installmentDates[installmentDates.length - 1];

    return {
      firstPaymentDate,
      finalPaymentDate,
      installmentDates,
    };
  }

  /**
   * Get provider-specific details (interest rates, fees)
   */
  private getProviderDetails(provider: BnplProvider): { interestRate: number; fees: number } {
    // In production, these would come from provider configurations
    const providerConfig = {
      [BnplProvider.KLARNA]: { interestRate: 0, fees: 0 }, // 0% APR
      [BnplProvider.AFFIRM]: { interestRate: 10, fees: 0 }, // 10% APR
      [BnplProvider.AFTERPAY]: { interestRate: 0, fees: 0 }, // 0% APR
      [BnplProvider.SEZZLE]: { interestRate: 0, fees: 0 }, // 0% APR
    };

    return providerConfig[provider];
  }

  // ============================================
  // PAYMENT PLAN RETRIEVAL
  // ============================================

  /**
   * Get payment plan by ID
   */
  async findOnePaymentPlan(id: string, userId: string) {
    const paymentPlan = await this.prisma.bnplPaymentPlan.findUnique({
      where: { id },
      include: {
        order: {
          include: {
            items: {
              include: {
                product: true,
              },
            },
          },
        },
        installments: {
          orderBy: {
            installmentNumber: 'asc',
          },
        },
      },
    });

    if (!paymentPlan) {
      throw new NotFoundException('Payment plan not found');
    }

    if (paymentPlan.userId !== userId) {
      throw new BadRequestException('You do not own this payment plan');
    }

    return paymentPlan;
  }

  /**
   * Get all payment plans for a user
   */
  async findUserPaymentPlans(userId: string) {
    return this.prisma.bnplPaymentPlan.findMany({
      where: { userId },
      include: {
        order: {
          select: {
            id: true,
            total: true,
            createdAt: true,
            status: true,
          },
        },
        installments: {
          where: {
            status: BnplInstallmentStatus.PENDING,
          },
          orderBy: {
            dueDate: 'asc',
          },
          take: 1, // Next due installment
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  /**
   * Get payment plan by order ID
   */
  async findByOrderId(orderId: string, userId: string) {
    const paymentPlan = await this.prisma.bnplPaymentPlan.findUnique({
      where: { orderId },
      include: {
        installments: {
          orderBy: {
            installmentNumber: 'asc',
          },
        },
      },
    });

    if (!paymentPlan) {
      return null;
    }

    if (paymentPlan.userId !== userId) {
      throw new BadRequestException('You do not own this payment plan');
    }

    return paymentPlan;
  }

  // ============================================
  // PAYMENT PROCESSING
  // ============================================

  /**
   * Process installment payment
   */
  async processInstallmentPayment(installmentId: string, userId: string) {
    const installment = await this.prisma.bnplInstallment.findUnique({
      where: { id: installmentId },
      include: {
        paymentPlan: true,
      },
    });

    if (!installment) {
      throw new NotFoundException('Installment not found');
    }

    if (installment.paymentPlan.userId !== userId) {
      throw new BadRequestException('You do not own this installment');
    }

    if (installment.status === BnplInstallmentStatus.PAID) {
      throw new BadRequestException('Installment already paid');
    }

    // In production, process payment through provider
    // const paymentResult = await this.processPaymentWithProvider(installment);

    // Update installment
    await this.prisma.bnplInstallment.update({
      where: { id: installmentId },
      data: {
        status: BnplInstallmentStatus.PAID,
        paidDate: new Date(),
        attemptCount: { increment: 1 },
        lastAttemptDate: new Date(),
      },
    });

    // Update payment plan
    const updatedTotalPaid = installment.paymentPlan.totalPaid + installment.amount;
    const updatedRemainingBalance = installment.paymentPlan.remainingBalance - installment.amount;

    await this.prisma.bnplPaymentPlan.update({
      where: { id: installment.paymentPlanId },
      data: {
        totalPaid: updatedTotalPaid,
        remainingBalance: updatedRemainingBalance,
        status:
          updatedRemainingBalance <= 0
            ? BnplPaymentPlanStatus.COMPLETED
            : BnplPaymentPlanStatus.ACTIVE,
      },
    });

    return { success: true, message: 'Payment processed successfully' };
  }

  /**
   * Cancel payment plan
   */
  async cancelPaymentPlan(id: string, userId: string) {
    const paymentPlan = await this.findOnePaymentPlan(id, userId);

    if (paymentPlan.status === BnplPaymentPlanStatus.COMPLETED) {
      throw new BadRequestException('Cannot cancel completed payment plan');
    }

    if (paymentPlan.status === BnplPaymentPlanStatus.CANCELLED) {
      throw new BadRequestException('Payment plan already cancelled');
    }

    // Check if any payments have been made
    if (paymentPlan.totalPaid > 0) {
      throw new BadRequestException(
        'Cannot cancel payment plan with completed payments. Contact support.'
      );
    }

    // In production, cancel with provider
    // await this.cancelWithProvider(paymentPlan);

    return this.prisma.bnplPaymentPlan.update({
      where: { id },
      data: {
        status: BnplPaymentPlanStatus.CANCELLED,
      },
      include: {
        installments: true,
      },
    });
  }

  // ============================================
  // INSTALLMENT MANAGEMENT
  // ============================================

  /**
   * Get upcoming installments for a user
   */
  async getUpcomingInstallments(userId: string) {
    const now = new Date();
    const thirtyDaysFromNow = addDays(now, 30);

    return this.prisma.bnplInstallment.findMany({
      where: {
        paymentPlan: {
          userId,
          status: BnplPaymentPlanStatus.ACTIVE,
        },
        status: BnplInstallmentStatus.PENDING,
        dueDate: {
          gte: now,
          lte: thirtyDaysFromNow,
        },
      },
      include: {
        paymentPlan: {
          include: {
            order: {
              select: {
                id: true,
                total: true,
              },
            },
          },
        },
      },
      orderBy: {
        dueDate: 'asc',
      },
    });
  }

  /**
   * Get overdue installments
   */
  async getOverdueInstallments(userId: string) {
    const now = new Date();

    return this.prisma.bnplInstallment.findMany({
      where: {
        paymentPlan: {
          userId,
        },
        status: {
          in: [BnplInstallmentStatus.PENDING, BnplInstallmentStatus.OVERDUE],
        },
        dueDate: {
          lt: now,
        },
      },
      include: {
        paymentPlan: {
          include: {
            order: true,
          },
        },
      },
      orderBy: {
        dueDate: 'asc',
      },
    });
  }

  // ============================================
  // PROVIDER INTEGRATION STUBS
  // ============================================

  /**
   * Check if order is eligible for BNPL with provider
   */
  async checkEligibility(orderId: string, provider: BnplProvider) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    // Simple eligibility check
    const isEligible = order.total >= 50 && order.total <= 10000;

    return {
      eligible: isEligible,
      provider,
      minInstallments: 2,
      maxInstallments: provider === BnplProvider.AFFIRM ? 12 : 4,
      interestRate: this.getProviderDetails(provider).interestRate,
    };
  }

  // ============================================
  // BACKGROUND TASKS
  // ============================================

  /**
   * Mark overdue installments (should be called by cron job)
   */
  async processOverdueInstallments() {
    const now = new Date();

    // Mark overdue
    await this.prisma.bnplInstallment.updateMany({
      where: {
        status: BnplInstallmentStatus.PENDING,
        dueDate: {
          lt: now,
        },
      },
      data: {
        status: BnplInstallmentStatus.OVERDUE,
      },
    });

    // Mark payment plans as defaulted if too many overdue
    const defaultedPlans = await this.prisma.bnplPaymentPlan.findMany({
      where: {
        status: BnplPaymentPlanStatus.ACTIVE,
        installments: {
          some: {
            status: BnplInstallmentStatus.OVERDUE,
          },
        },
      },
      include: {
        installments: {
          where: {
            status: BnplInstallmentStatus.OVERDUE,
          },
        },
      },
    });

    for (const plan of defaultedPlans) {
      // If 2 or more installments overdue, mark as defaulted
      if (plan.installments.length >= 2) {
        await this.prisma.bnplPaymentPlan.update({
          where: { id: plan.id },
          data: {
            status: BnplPaymentPlanStatus.DEFAULTED,
          },
        });
      }
    }
  }
}
