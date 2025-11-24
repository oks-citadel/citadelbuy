import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';
import { CreateSubscriptionPlanDto } from './dto/create-subscription-plan.dto';
import { UpdateSubscriptionPlanDto } from './dto/update-subscription-plan.dto';
import { SubscribeDto } from './dto/subscribe.dto';
import { SubscriptionPlanType, SubscriptionStatus } from '@prisma/client';
import { addMonths, addYears, addDays } from 'date-fns';

@Injectable()
export class SubscriptionsService {
  constructor(private readonly prisma: PrismaService) {}

  // ============================================
  // SUBSCRIPTION PLANS (Admin)
  // ============================================

  /**
   * Create new subscription plan
   */
  async createPlan(dto: CreateSubscriptionPlanDto) {
    return this.prisma.subscriptionPlan.create({
      data: {
        name: dto.name,
        description: dto.description,
        type: dto.type,
        price: dto.price,
        billingInterval: dto.billingInterval,
        trialDays: dto.trialDays || 0,
        benefits: dto.benefits,
        maxProducts: dto.maxProducts,
        maxAds: dto.maxAds,
        commissionRate: dto.commissionRate,
        prioritySupport: dto.prioritySupport || false,
      },
    });
  }

  /**
   * Get all subscription plans
   */
  async findAllPlans(includeInactive = false) {
    const where = includeInactive ? {} : { isActive: true };

    return this.prisma.subscriptionPlan.findMany({
      where,
      orderBy: [{ type: 'asc' }, { price: 'asc' }],
    });
  }

  /**
   * Get plans by type (customer or vendor)
   */
  async findPlansByType(type: 'customer' | 'vendor') {
    const typeFilter =
      type === 'customer'
        ? {
            type: {
              in: [
                SubscriptionPlanType.CUSTOMER_BASIC,
                SubscriptionPlanType.CUSTOMER_PREMIUM,
                SubscriptionPlanType.CUSTOMER_PRO,
              ],
            },
          }
        : {
            type: {
              in: [
                SubscriptionPlanType.VENDOR_STARTER,
                SubscriptionPlanType.VENDOR_PROFESSIONAL,
                SubscriptionPlanType.VENDOR_ENTERPRISE,
              ],
            },
          };

    return this.prisma.subscriptionPlan.findMany({
      where: {
        ...typeFilter,
        isActive: true,
      },
      orderBy: { price: 'asc' },
    });
  }

  /**
   * Get single plan
   */
  async findOnePlan(id: string) {
    const plan = await this.prisma.subscriptionPlan.findUnique({
      where: { id },
    });

    if (!plan) {
      throw new NotFoundException('Subscription plan not found');
    }

    return plan;
  }

  /**
   * Update subscription plan
   */
  async updatePlan(id: string, dto: UpdateSubscriptionPlanDto) {
    await this.findOnePlan(id);

    return this.prisma.subscriptionPlan.update({
      where: { id },
      data: {
        ...(dto.name && { name: dto.name }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.price !== undefined && { price: dto.price }),
        ...(dto.billingInterval && { billingInterval: dto.billingInterval }),
        ...(dto.trialDays !== undefined && { trialDays: dto.trialDays }),
        ...(dto.benefits && { benefits: dto.benefits }),
        ...(dto.maxProducts !== undefined && { maxProducts: dto.maxProducts }),
        ...(dto.maxAds !== undefined && { maxAds: dto.maxAds }),
        ...(dto.commissionRate !== undefined && { commissionRate: dto.commissionRate }),
        ...(dto.prioritySupport !== undefined && { prioritySupport: dto.prioritySupport }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
      },
    });
  }

  /**
   * Delete subscription plan
   */
  async deletePlan(id: string) {
    await this.findOnePlan(id);

    // Check if any active subscriptions use this plan
    const activeSubscriptions = await this.prisma.subscription.count({
      where: {
        planId: id,
        status: SubscriptionStatus.ACTIVE,
      },
    });

    if (activeSubscriptions > 0) {
      throw new BadRequestException(
        `Cannot delete plan with ${activeSubscriptions} active subscription(s)`
      );
    }

    return this.prisma.subscriptionPlan.delete({
      where: { id },
    });
  }

  // ============================================
  // USER SUBSCRIPTIONS
  // ============================================

  /**
   * Subscribe user to a plan
   */
  async subscribe(userId: string, dto: SubscribeDto) {
    // Check if user already has an active subscription
    const existingSubscription = await this.prisma.subscription.findFirst({
      where: {
        userId,
        status: {
          in: [SubscriptionStatus.ACTIVE, SubscriptionStatus.TRIAL],
        },
      },
      include: { plan: true },
    });

    if (existingSubscription) {
      throw new ConflictException(
        `User already has an active ${existingSubscription.plan.name} subscription`
      );
    }

    // Get plan details
    const plan = await this.findOnePlan(dto.planId);

    if (!plan.isActive) {
      throw new BadRequestException('This subscription plan is not available');
    }

    // Calculate period dates
    const now = new Date();
    const currentPeriodStart = now;
    let currentPeriodEnd: Date;

    switch (plan.billingInterval) {
      case 'MONTHLY':
        currentPeriodEnd = addMonths(now, 1);
        break;
      case 'QUARTERLY':
        currentPeriodEnd = addMonths(now, 3);
        break;
      case 'YEARLY':
        currentPeriodEnd = addYears(now, 1);
        break;
    }

    // Handle trial period
    const hasTrial = plan.trialDays > 0;
    const trialStart = hasTrial ? now : null;
    const trialEnd = hasTrial ? addDays(now, plan.trialDays) : null;
    const status = hasTrial ? SubscriptionStatus.TRIAL : SubscriptionStatus.ACTIVE;

    // Create subscription
    const subscription = await this.prisma.subscription.create({
      data: {
        userId,
        planId: dto.planId,
        status,
        currentPeriodStart,
        currentPeriodEnd,
        trialStart,
        trialEnd,
        // Stripe integration would go here
        // stripeSubscriptionId: result.id,
        // stripeCustomerId: customer.id,
      },
      include: {
        plan: true,
      },
    });

    // Create initial invoice (if not trial)
    if (!hasTrial && plan.price > 0) {
      await this.createInvoice(subscription.id, plan.price, currentPeriodStart, currentPeriodEnd);
    }

    return subscription;
  }

  /**
   * Get user's current subscription
   */
  async getUserSubscription(userId: string) {
    const subscription = await this.prisma.subscription.findFirst({
      where: {
        userId,
        status: {
          in: [SubscriptionStatus.ACTIVE, SubscriptionStatus.TRIAL, SubscriptionStatus.PAST_DUE],
        },
      },
      include: {
        plan: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return subscription;
  }

  /**
   * Get all user subscriptions (including expired)
   */
  async getUserSubscriptions(userId: string) {
    return this.prisma.subscription.findMany({
      where: { userId },
      include: {
        plan: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Cancel subscription
   */
  async cancelSubscription(userId: string, subscriptionId: string) {
    const subscription = await this.prisma.subscription.findUnique({
      where: { id: subscriptionId },
    });

    if (!subscription) {
      throw new NotFoundException('Subscription not found');
    }

    if (subscription.userId !== userId) {
      throw new BadRequestException('You do not own this subscription');
    }

    if (subscription.status === SubscriptionStatus.CANCELLED) {
      throw new BadRequestException('Subscription is already cancelled');
    }

    // Cancel at period end (let them use until end of billing period)
    return this.prisma.subscription.update({
      where: { id: subscriptionId },
      data: {
        cancelAtPeriodEnd: true,
        cancelledAt: new Date(),
      },
      include: { plan: true },
    });
  }

  /**
   * Reactivate cancelled subscription
   */
  async reactivateSubscription(userId: string, subscriptionId: string) {
    const subscription = await this.prisma.subscription.findUnique({
      where: { id: subscriptionId },
    });

    if (!subscription) {
      throw new NotFoundException('Subscription not found');
    }

    if (subscription.userId !== userId) {
      throw new BadRequestException('You do not own this subscription');
    }

    if (!subscription.cancelAtPeriodEnd) {
      throw new BadRequestException('Subscription is not cancelled');
    }

    return this.prisma.subscription.update({
      where: { id: subscriptionId },
      data: {
        cancelAtPeriodEnd: false,
        cancelledAt: null,
      },
      include: { plan: true },
    });
  }

  /**
   * Upgrade/change subscription plan
   */
  async changePlan(userId: string, subscriptionId: string, newPlanId: string) {
    const subscription = await this.prisma.subscription.findUnique({
      where: { id: subscriptionId },
      include: { plan: true },
    });

    if (!subscription) {
      throw new NotFoundException('Subscription not found');
    }

    if (subscription.userId !== userId) {
      throw new BadRequestException('You do not own this subscription');
    }

    const newPlan = await this.findOnePlan(newPlanId);

    if (!newPlan.isActive) {
      throw new BadRequestException('Target plan is not available');
    }

    // Update subscription
    return this.prisma.subscription.update({
      where: { id: subscriptionId },
      data: {
        planId: newPlanId,
        // In production, handle prorated charges here
      },
      include: { plan: true },
    });
  }

  // ============================================
  // BENEFITS & FEATURES
  // ============================================

  /**
   * Check if user has a benefit
   */
  async hasBenefit(userId: string, benefit: string): Promise<boolean> {
    const subscription = await this.getUserSubscription(userId);

    if (!subscription) {
      return false;
    }

    const benefits = subscription.plan.benefits as any;
    return benefits[benefit] === true;
  }

  /**
   * Get user's subscription benefits
   */
  async getUserBenefits(userId: string) {
    const subscription = await this.getUserSubscription(userId);

    if (!subscription) {
      return {
        hasSubscription: false,
        benefits: {},
      };
    }

    return {
      hasSubscription: true,
      planName: subscription.plan.name,
      planType: subscription.plan.type,
      status: subscription.status,
      benefits: subscription.plan.benefits,
      maxProducts: subscription.plan.maxProducts,
      maxAds: subscription.plan.maxAds,
      commissionRate: subscription.plan.commissionRate,
      prioritySupport: subscription.plan.prioritySupport,
      currentPeriodEnd: subscription.currentPeriodEnd,
      cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
    };
  }

  /**
   * Check if user can perform action based on subscription limits
   */
  async canPerformAction(userId: string, action: 'createProduct' | 'createAd'): Promise<boolean> {
    const subscription = await this.getUserSubscription(userId);

    if (!subscription) {
      // Free tier limitations
      return action === 'createProduct'; // Allow products, no ads
    }

    if (action === 'createProduct') {
      if (subscription.plan.maxProducts === null) return true; // Unlimited

      const productCount = await this.prisma.product.count({
        where: { vendorId: userId },
      });

      return productCount < subscription.plan.maxProducts;
    }

    if (action === 'createAd') {
      if (subscription.plan.maxAds === null) return true; // Unlimited

      const adCount = await this.prisma.advertisement.count({
        where: {
          vendorId: userId,
          status: 'ACTIVE',
        },
      });

      return adCount < subscription.plan.maxAds;
    }

    return false;
  }

  // ============================================
  // INVOICES
  // ============================================

  /**
   * Create invoice for subscription
   */
  private async createInvoice(
    subscriptionId: string,
    amount: number,
    periodStart: Date,
    periodEnd: Date
  ) {
    return this.prisma.subscriptionInvoice.create({
      data: {
        subscriptionId,
        amount,
        currency: 'USD',
        status: 'pending',
        periodStart,
        periodEnd,
        attemptedAt: new Date(),
      },
    });
  }

  /**
   * Get subscription invoices
   */
  async getInvoices(userId: string, subscriptionId?: string) {
    const where: any = {
      subscription: {
        userId,
      },
    };

    if (subscriptionId) {
      where.subscriptionId = subscriptionId;
    }

    return this.prisma.subscriptionInvoice.findMany({
      where,
      include: {
        subscription: {
          include: {
            plan: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Mark invoice as paid
   */
  async markInvoicePaid(invoiceId: string, stripePaymentIntentId?: string) {
    return this.prisma.subscriptionInvoice.update({
      where: { id: invoiceId },
      data: {
        status: 'paid',
        paidAt: new Date(),
        stripePaymentIntentId,
      },
    });
  }

  // ============================================
  // BACKGROUND TASKS
  // ============================================

  /**
   * Process expired trials and renewals (should be called by cron job)
   */
  async processSubscriptions() {
    const now = new Date();

    // Expire trials
    await this.prisma.subscription.updateMany({
      where: {
        status: SubscriptionStatus.TRIAL,
        trialEnd: {
          lte: now,
        },
      },
      data: {
        status: SubscriptionStatus.ACTIVE,
      },
    });

    // Mark expired subscriptions
    await this.prisma.subscription.updateMany({
      where: {
        status: SubscriptionStatus.ACTIVE,
        currentPeriodEnd: {
          lte: now,
        },
        cancelAtPeriodEnd: true,
      },
      data: {
        status: SubscriptionStatus.EXPIRED,
      },
    });

    // Renew subscriptions (create invoices for next period)
    const subscriptionsToRenew = await this.prisma.subscription.findMany({
      where: {
        status: SubscriptionStatus.ACTIVE,
        currentPeriodEnd: {
          lte: now,
        },
        cancelAtPeriodEnd: false,
      },
      include: { plan: true },
    });

    for (const subscription of subscriptionsToRenew) {
      let newPeriodEnd: Date;

      switch (subscription.plan.billingInterval) {
        case 'MONTHLY':
          newPeriodEnd = addMonths(subscription.currentPeriodEnd, 1);
          break;
        case 'QUARTERLY':
          newPeriodEnd = addMonths(subscription.currentPeriodEnd, 3);
          break;
        case 'YEARLY':
          newPeriodEnd = addYears(subscription.currentPeriodEnd, 1);
          break;
      }

      // Update subscription period
      await this.prisma.subscription.update({
        where: { id: subscription.id },
        data: {
          currentPeriodStart: subscription.currentPeriodEnd,
          currentPeriodEnd: newPeriodEnd,
        },
      });

      // Create invoice for new period
      await this.createInvoice(
        subscription.id,
        subscription.plan.price,
        subscription.currentPeriodEnd,
        newPeriodEnd
      );
    }
  }
}
