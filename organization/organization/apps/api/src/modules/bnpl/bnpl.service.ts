import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import { CreatePaymentPlanDto } from './dto/create-payment-plan.dto';
import { BnplProvider, BnplPaymentPlanStatus, BnplInstallmentStatus } from '@prisma/client';
import { addDays, addWeeks, addMonths } from 'date-fns';
import { BnplProviderService, BnplSessionRequest } from './services/bnpl-provider.service';

@Injectable()
export class BnplService {
  private readonly logger = new Logger(BnplService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly bnplProviderService: BnplProviderService,
  ) {}

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

    // Create provider session for payment authorization
    let providerSession = null;
    if (this.bnplProviderService.isProviderConfigured(dto.provider)) {
      try {
        const user = await this.prisma.user.findUnique({
          where: { id: userId },
        });

        // Parse shipping address from order (stored as JSON string)
        let shippingAddress: {
          line1?: string;
          line2?: string;
          city?: string;
          state?: string;
          postalCode?: string;
          country?: string;
        } = {};

        try {
          if (order.shippingAddress) {
            shippingAddress = typeof order.shippingAddress === 'string'
              ? JSON.parse(order.shippingAddress)
              : order.shippingAddress;
          }
        } catch {
          this.logger.warn('Failed to parse shipping address from order');
        }

        if (user) {
          const sessionRequest: BnplSessionRequest = {
            orderId: dto.orderId,
            orderTotal: order.total,
            currency: 'USD',
            items: [], // Will be populated from order items
            customer: {
              email: user.email,
              firstName: user.name?.split(' ')[0] || '',
              lastName: user.name?.split(' ').slice(1).join(' ') || '',
              phone: '', // User model doesn't have phone field
            },
            billingAddress: {
              line1: shippingAddress.line1 || '',
              line2: shippingAddress.line2 || '',
              city: shippingAddress.city || '',
              state: shippingAddress.state || '',
              postalCode: shippingAddress.postalCode || '',
              country: shippingAddress.country || 'US',
            },
            shippingAddress: {
              line1: shippingAddress.line1 || '',
              line2: shippingAddress.line2 || '',
              city: shippingAddress.city || '',
              state: shippingAddress.state || '',
              postalCode: shippingAddress.postalCode || '',
              country: shippingAddress.country || 'US',
            },
            returnUrl: `${this.configService.get('APP_URL')}/checkout/success?orderId=${dto.orderId}`,
            cancelUrl: `${this.configService.get('APP_URL')}/checkout/cancel?orderId=${dto.orderId}`,
            numberOfInstallments: dto.numberOfInstallments,
          };

          providerSession = await this.bnplProviderService.createSession(dto.provider, sessionRequest);

          // Update payment plan with provider session ID
          await this.prisma.bnplPaymentPlan.update({
            where: { id: paymentPlan.id },
            data: {
              providerPlanId: providerSession.sessionId,
            },
          });

          this.logger.log(`BNPL session created with ${dto.provider}: ${providerSession.sessionId}`);
        }
      } catch (error: any) {
        this.logger.error(`Failed to create BNPL provider session: ${error.message}`);
        // Don't fail the payment plan creation, just log the error
        // The user can still manually trigger payment later
      }
    } else {
      this.logger.warn(`BNPL provider ${dto.provider} not configured. Payment plan created without provider session.`);
    }

    const result = await this.findOnePaymentPlan(paymentPlan.id, userId);

    // Include provider session info in response if available
    return {
      ...result,
      providerSession: providerSession ? {
        redirectUrl: providerSession.redirectUrl,
        expiresAt: providerSession.expiresAt,
        clientToken: providerSession.clientToken,
      } : null,
    };
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
  async processInstallmentPayment(installmentId: string, userId: string, paymentToken?: string) {
    const installment = await this.prisma.bnplInstallment.findUnique({
      where: { id: installmentId },
      include: {
        paymentPlan: {
          include: {
            order: {
              include: {
                user: true,
              },
            },
          },
        },
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

    // Update attempt tracking
    await this.prisma.bnplInstallment.update({
      where: { id: installmentId },
      data: {
        attemptCount: { increment: 1 },
        lastAttemptDate: new Date(),
      },
    });

    // Process payment through the BNPL provider
    const { paymentPlan } = installment;
    const provider = paymentPlan.provider;

    // Check if provider is configured
    if (!this.bnplProviderService.isProviderConfigured(provider)) {
      // In development, simulate successful payment
      if (this.configService.get('NODE_ENV') !== 'production') {
        this.logger.warn(`BNPL provider ${provider} not configured. Simulating payment in development.`);
        return this.completeInstallmentPayment(installment);
      }
      throw new BadRequestException(`BNPL provider ${provider} is not configured`);
    }

    try {
      // If this is the first installment, we need to capture the initial authorization
      // For subsequent installments, most BNPL providers handle them automatically
      // but some require explicit capture

      if (installment.installmentNumber === 1 && paymentPlan.providerPlanId) {
        // Authorize and capture the first payment
        const authResult = await this.bnplProviderService.authorizePayment(
          provider,
          paymentPlan.providerPlanId,
          paymentToken,
        );

        if (!authResult.authorized) {
          this.logger.error(`BNPL authorization failed for installment ${installmentId}: ${authResult.errorMessage}`);

          // Update installment with failure
          await this.prisma.bnplInstallment.update({
            where: { id: installmentId },
            data: {
              status: BnplInstallmentStatus.FAILED,
              failureReason: authResult.errorMessage,
            },
          });

          return {
            success: false,
            message: authResult.errorMessage || 'Payment authorization failed',
          };
        }

        // Update payment plan with provider order ID
        if (authResult.providerOrderId) {
          await this.prisma.bnplPaymentPlan.update({
            where: { id: paymentPlan.id },
            data: {
              providerPlanId: authResult.providerOrderId,
              status: BnplPaymentPlanStatus.ACTIVE,
            },
          });
        }
      }

      // Complete the installment payment
      return this.completeInstallmentPayment(installment);
    } catch (error: any) {
      this.logger.error(`BNPL payment processing failed: ${error.message}`, error.stack);

      // Update installment with failure
      await this.prisma.bnplInstallment.update({
        where: { id: installmentId },
        data: {
          status: BnplInstallmentStatus.FAILED,
          failureReason: error.message,
        },
      });

      throw new BadRequestException(`Payment processing failed: ${error.message}`);
    }
  }

  /**
   * Complete installment payment and update balances
   */
  private async completeInstallmentPayment(installment: any) {
    // Update installment as paid
    await this.prisma.bnplInstallment.update({
      where: { id: installment.id },
      data: {
        status: BnplInstallmentStatus.PAID,
        paidDate: new Date(),
      },
    });

    // Update payment plan balances
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

    this.logger.log(`Installment ${installment.id} paid successfully. Remaining balance: ${updatedRemainingBalance}`);

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
