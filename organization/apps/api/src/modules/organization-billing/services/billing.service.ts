import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '@/common/prisma/prisma.service';
import { RedisService } from '@/common/redis/redis.service';
import { StripeService } from './stripe.service';
import {
  CreateSubscriptionDto,
  UpdateSubscriptionDto,
  CreatePaymentMethodDto,
} from '../dto';

@Injectable()
export class BillingService {
  private readonly logger = new Logger(BillingService.name);
  private readonly CACHE_TTL = 300; // 5 minutes

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly stripeService: StripeService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Create a new subscription for an organization
   * @param organizationId - Organization ID
   * @param dto - Subscription creation data
   * @returns Created subscription details
   */
  async createSubscription(organizationId: string, dto: CreateSubscriptionDto) {
    this.logger.log(`Creating subscription for organization: ${organizationId}`);

    // Validate organization exists
    const organization = await this.prisma.organization.findUnique({
      where: { id: organizationId },
    });

    if (!organization) {
      throw new NotFoundException('Organization not found');
    }

    // Get or create billing record
    const billing = await this.prisma.organizationBilling.findUnique({
      where: { organizationId },
    });

    // Create Stripe customer if not exists
    let stripeCustomerId = billing?.stripeCustomerId;
    if (!stripeCustomerId) {
      const customer = await this.stripeService.createCustomer({
        name: organization.name,
        email: organization.primaryEmail,
        metadata: {
          organizationId: organization.id,
          organizationSlug: organization.slug,
        },
      });
      stripeCustomerId = customer.id;
    }

    // Attach payment method to customer
    await this.stripeService.attachPaymentMethod(
      stripeCustomerId,
      dto.paymentMethodId,
    );

    // Create subscription in Stripe
    const subscription = await this.stripeService.createSubscription(
      stripeCustomerId,
      dto.planId,
    );

    // Update or create billing record
    const updatedBilling = await this.prisma.organizationBilling.upsert({
      where: { organizationId },
      create: {
        organizationId,
        stripeCustomerId,
        stripeSubscriptionId: subscription.id,
        planId: dto.planId,
        planName: subscription.items.data[0]?.price.nickname || 'Custom Plan',
        billingCycle: dto.billingCycle,
        status: subscription.status,
        currentPeriodStart: new Date(subscription.current_period_start * 1000),
        currentPeriodEnd: new Date(subscription.current_period_end * 1000),
        paymentMethodId: dto.paymentMethodId,
      },
      update: {
        stripeCustomerId,
        stripeSubscriptionId: subscription.id,
        planId: dto.planId,
        planName: subscription.items.data[0]?.price.nickname || 'Custom Plan',
        billingCycle: dto.billingCycle,
        status: subscription.status,
        currentPeriodStart: new Date(subscription.current_period_start * 1000),
        currentPeriodEnd: new Date(subscription.current_period_end * 1000),
        paymentMethodId: dto.paymentMethodId,
        updatedAt: new Date(),
      },
    });

    // Clear cache
    await this.clearBillingCache(organizationId);

    this.logger.log(`Subscription created successfully: ${subscription.id}`);

    return {
      id: updatedBilling.id,
      subscriptionId: subscription.id,
      status: subscription.status,
      planId: dto.planId,
      billingCycle: dto.billingCycle,
      currentPeriodStart: updatedBilling.currentPeriodStart,
      currentPeriodEnd: updatedBilling.currentPeriodEnd,
    };
  }

  /**
   * Update an existing subscription
   * @param organizationId - Organization ID
   * @param dto - Subscription update data
   * @returns Updated subscription details
   */
  async updateSubscription(
    organizationId: string,
    dto: UpdateSubscriptionDto,
  ) {
    this.logger.log(`Updating subscription for organization: ${organizationId}`);

    const billing = await this.prisma.organizationBilling.findUnique({
      where: { organizationId },
    });

    if (!billing || !billing.stripeSubscriptionId) {
      throw new NotFoundException('No active subscription found');
    }

    // Update payment method if provided
    if (dto.paymentMethodId) {
      await this.stripeService.attachPaymentMethod(
        billing.stripeCustomerId!,
        dto.paymentMethodId,
      );
    }

    // Update subscription in Stripe if plan or billing cycle changed
    let subscription;
    if (dto.planId) {
      subscription = await this.stripeService.updateSubscription(
        billing.stripeSubscriptionId,
        dto.planId,
      );

      // Update billing record
      await this.prisma.organizationBilling.update({
        where: { organizationId },
        data: {
          planId: dto.planId,
          planName: subscription.items.data[0]?.price.nickname || 'Custom Plan',
          billingCycle: dto.billingCycle || billing.billingCycle,
          status: subscription.status,
          currentPeriodStart: new Date(subscription.current_period_start * 1000),
          currentPeriodEnd: new Date(subscription.current_period_end * 1000),
          paymentMethodId: dto.paymentMethodId || billing.paymentMethodId,
        },
      });
    } else if (dto.billingCycle && dto.billingCycle !== billing.billingCycle) {
      // Update billing cycle only
      await this.prisma.organizationBilling.update({
        where: { organizationId },
        data: {
          billingCycle: dto.billingCycle,
          paymentMethodId: dto.paymentMethodId || billing.paymentMethodId,
        },
      });
    } else if (dto.paymentMethodId) {
      // Update payment method only
      await this.prisma.organizationBilling.update({
        where: { organizationId },
        data: {
          paymentMethodId: dto.paymentMethodId,
          updatedAt: new Date(),
        },
      });
    }

    // Clear cache
    await this.clearBillingCache(organizationId);

    this.logger.log(`Subscription updated successfully`);

    return this.getSubscription(organizationId);
  }

  /**
   * Cancel an organization's subscription
   * @param organizationId - Organization ID
   * @returns Cancellation confirmation
   */
  async cancelSubscription(organizationId: string) {
    this.logger.log(`Cancelling subscription for organization: ${organizationId}`);

    const billing = await this.prisma.organizationBilling.findUnique({
      where: { organizationId },
    });

    if (!billing || !billing.stripeSubscriptionId) {
      throw new NotFoundException('No active subscription found');
    }

    // Cancel subscription in Stripe
    await this.stripeService.cancelSubscription(billing.stripeSubscriptionId);

    // Update billing record
    await this.prisma.organizationBilling.update({
      where: { organizationId },
      data: {
        status: 'cancelled',
      },
    });

    // CRITICAL: Revoke premium access on cancellation
    await this.revokeAccess(organizationId, 'Subscription cancelled');

    // Clear cache
    await this.clearBillingCache(organizationId);

    this.logger.log(`Subscription cancelled successfully`);

    return {
      success: true,
      message: 'Subscription cancelled successfully',
    };
  }

  /**
   * Revoke premium access for an organization
   * Called on subscription cancellation, downgrade, or payment failure
   * @param organizationId - Organization ID
   * @param reason - Reason for revocation
   */
  async revokeAccess(organizationId: string, reason: string): Promise<void> {
    this.logger.warn(`Revoking access for organization ${organizationId}: ${reason}`);

    // Disable API keys
    await this.prisma.apiKey.updateMany({
      where: {
        organizationId,
        isActive: true,
      },
      data: {
        isActive: false,
        revokedAt: new Date(),
        revokedReason: reason,
      },
    });

    // Downgrade organization to free tier
    await this.prisma.organization.update({
      where: { id: organizationId },
      data: {
        planTier: 'FREE',
        featuresEnabled: [],
      },
    });

    // Clear any cached permissions
    await this.redis.del(`org:permissions:${organizationId}`);
    await this.redis.del(`org:features:${organizationId}`);

    this.logger.warn(`Access revoked for organization ${organizationId}`);
  }

  /**
   * Check if organization has valid subscription before allowing premium features
   * @param organizationId - Organization ID
   * @returns Boolean indicating if subscription is valid
   */
  async hasValidSubscription(organizationId: string): Promise<boolean> {
    const billing = await this.prisma.organizationBilling.findUnique({
      where: { organizationId },
    });

    if (!billing) {
      return false;
    }

    // Only 'active' and 'trialing' statuses are considered valid
    return ['active', 'trialing'].includes(billing.status || '');
  }

  /**
   * Get subscription details for an organization
   * @param organizationId - Organization ID
   * @returns Subscription details
   */
  async getSubscription(organizationId: string) {
    const cacheKey = `billing:subscription:${organizationId}`;

    // Check cache
    const cached = await this.redis.get(cacheKey);
    if (cached) {
      return cached;
    }

    const billing = await this.prisma.organizationBilling.findUnique({
      where: { organizationId },
    });

    if (!billing) {
      throw new NotFoundException('Billing information not found');
    }

    const result = {
      id: billing.id,
      organizationId: billing.organizationId,
      stripeCustomerId: billing.stripeCustomerId,
      stripeSubscriptionId: billing.stripeSubscriptionId,
      planId: billing.planId,
      planName: billing.planName,
      billingCycle: billing.billingCycle,
      status: billing.status,
      currentPeriodStart: billing.currentPeriodStart,
      currentPeriodEnd: billing.currentPeriodEnd,
      paymentMethodId: billing.paymentMethodId,
      createdAt: billing.createdAt,
      updatedAt: billing.updatedAt,
    };

    // Cache the result
    await this.redis.set(cacheKey, result, this.CACHE_TTL);

    return result;
  }

  /**
   * Get billing information for an organization including invoices
   * @param organizationId - Organization ID
   * @returns Comprehensive billing information
   */
  async getBillingInfo(organizationId: string) {
    const cacheKey = `billing:info:${organizationId}`;

    // Check cache
    const cached = await this.redis.get(cacheKey);
    if (cached) {
      return cached;
    }

    const billing = await this.prisma.organizationBilling.findUnique({
      where: { organizationId },
      include: {
        invoices: {
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
      },
    });

    if (!billing) {
      // Return default structure if no billing exists
      return {
        hasActiveSubscription: false,
        subscription: null,
        recentInvoices: [],
      };
    }

    const result = {
      hasActiveSubscription: billing.status === 'active',
      subscription: {
        id: billing.id,
        planId: billing.planId,
        planName: billing.planName,
        billingCycle: billing.billingCycle,
        status: billing.status,
        currentPeriodStart: billing.currentPeriodStart,
        currentPeriodEnd: billing.currentPeriodEnd,
      },
      recentInvoices: billing.invoices.map((invoice) => ({
        id: invoice.id,
        number: invoice.number,
        amount: invoice.amount,
        currency: invoice.currency,
        status: invoice.status,
        dueDate: invoice.dueDate,
        paidAt: invoice.paidAt,
        pdfUrl: invoice.pdfUrl,
        createdAt: invoice.createdAt,
      })),
    };

    // Cache the result
    await this.redis.set(cacheKey, result, this.CACHE_TTL);

    return result;
  }

  /**
   * Update payment method for an organization
   * @param organizationId - Organization ID
   * @param dto - Payment method data
   * @returns Updated payment method info
   */
  async updatePaymentMethod(
    organizationId: string,
    dto: CreatePaymentMethodDto,
  ) {
    this.logger.log(`Updating payment method for organization: ${organizationId}`);

    const billing = await this.prisma.organizationBilling.findUnique({
      where: { organizationId },
    });

    if (!billing || !billing.stripeCustomerId) {
      throw new NotFoundException('Billing information not found');
    }

    // Attach payment method to Stripe customer
    await this.stripeService.attachPaymentMethod(
      billing.stripeCustomerId,
      dto.paymentMethodId,
    );

    // Update billing record
    await this.prisma.organizationBilling.update({
      where: { organizationId },
      data: {
        paymentMethodId: dto.paymentMethodId,
      },
    });

    // Clear cache
    await this.clearBillingCache(organizationId);

    this.logger.log(`Payment method updated successfully`);

    return {
      success: true,
      message: 'Payment method updated successfully',
      paymentMethodId: dto.paymentMethodId,
    };
  }

  /**
   * Clear billing cache for an organization
   * @param organizationId - Organization ID
   */
  private async clearBillingCache(organizationId: string): Promise<void> {
    await Promise.all([
      this.redis.del(`billing:subscription:${organizationId}`),
      this.redis.del(`billing:info:${organizationId}`),
    ]);
  }
}
