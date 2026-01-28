import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';

export interface Offer {
  id: string;
  name: string;
  organizationId?: string;
  type: string;
  trigger: string;
  sourceProductIds: string[];
  offeredProductIds: string[];
  discountPercentage?: number;
  headline?: string;
  description?: string;
  priority: number;
  isActive: boolean;
  impressions: number;
  conversions: number;
  createdAt: Date;
}

export interface Coupon {
  id: string;
  code: string;
  organizationId?: string;
  type: string;
  value: number;
  minOrderAmount?: number;
  maxDiscountAmount?: number;
  usageLimit?: number;
  usageLimitPerUser?: number;
  usageCount: number;
  validFrom?: Date;
  validUntil?: Date;
  productIds?: string[];
  categoryIds?: string[];
  firstPurchaseOnly: boolean;
  isActive: boolean;
  createdAt: Date;
}

export interface InAppMessage {
  id: string;
  name: string;
  organizationId?: string;
  type: string;
  content: string;
  ctaText?: string;
  ctaUrl?: string;
  triggerEvent?: string;
  targetPages?: string[];
  targetSegments?: string[];
  showDelay?: number;
  dismissAfter?: number;
  isActive: boolean;
  impressions: number;
  clicks: number;
  createdAt: Date;
}

export interface TrialPlan {
  id: string;
  name: string;
  organizationId?: string;
  trialDays: number;
  features: string[];
  targetPlanId?: string;
  conversionIncentive?: any;
  isActive: boolean;
  createdAt: Date;
}

export interface UserTrial {
  id: string;
  userId: string;
  planId: string;
  startDate: Date;
  endDate: Date;
  status: 'active' | 'expired' | 'converted' | 'cancelled';
  convertedAt?: Date;
}

@Injectable()
export class CommerceService {
  private readonly logger = new Logger(CommerceService.name);

  private offers: Map<string, Offer> = new Map();
  private coupons: Map<string, Coupon> = new Map();
  private couponUsage: Map<string, Map<string, number>> = new Map(); // couponId -> userId -> usage count
  private inAppMessages: Map<string, InAppMessage> = new Map();
  private trialPlans: Map<string, TrialPlan> = new Map();
  private userTrials: Map<string, UserTrial> = new Map();

  constructor(private readonly prisma: PrismaService) {}

  // Upsell/Cross-sell Offers
  async createOffer(data: Partial<Offer>): Promise<Offer> {
    const id = `offer-${Date.now()}`;
    const offer: Offer = {
      id,
      name: data.name!,
      organizationId: data.organizationId,
      type: data.type!,
      trigger: data.trigger!,
      sourceProductIds: data.sourceProductIds!,
      offeredProductIds: data.offeredProductIds!,
      discountPercentage: data.discountPercentage,
      headline: data.headline,
      description: data.description,
      priority: data.priority || 0,
      isActive: true,
      impressions: 0,
      conversions: 0,
      createdAt: new Date(),
    };
    this.offers.set(id, offer);
    return offer;
  }

  async getOffers(query: { organizationId?: string; type?: string; productId?: string; trigger?: string }): Promise<Offer[]> {
    let items = Array.from(this.offers.values()).filter(o => o.isActive);

    if (query.organizationId) items = items.filter(o => o.organizationId === query.organizationId);
    if (query.type) items = items.filter(o => o.type === query.type);
    if (query.productId) items = items.filter(o => o.sourceProductIds.includes(query.productId!));
    if (query.trigger) items = items.filter(o => o.trigger === query.trigger);

    return items.sort((a, b) => b.priority - a.priority);
  }

  async getOffersForProduct(productId: string, trigger: string): Promise<Offer[]> {
    return this.getOffers({ productId, trigger });
  }

  async trackOfferImpression(offerId: string): Promise<void> {
    const offer = this.offers.get(offerId);
    if (offer) {
      offer.impressions++;
      this.offers.set(offerId, offer);
    }
  }

  async trackOfferConversion(offerId: string): Promise<void> {
    const offer = this.offers.get(offerId);
    if (offer) {
      offer.conversions++;
      this.offers.set(offerId, offer);
    }
  }

  async updateOffer(id: string, data: Partial<Offer>): Promise<Offer> {
    const offer = this.offers.get(id);
    if (!offer) throw new NotFoundException(`Offer ${id} not found`);
    const updated = { ...offer, ...data };
    this.offers.set(id, updated);
    return updated;
  }

  async deleteOffer(id: string): Promise<void> {
    this.offers.delete(id);
  }

  // Coupon Management
  async createCoupon(data: Partial<Coupon>): Promise<Coupon> {
    const existing = Array.from(this.coupons.values()).find(c => c.code === data.code);
    if (existing) throw new BadRequestException(`Coupon code ${data.code} already exists`);

    const id = `coupon-${Date.now()}`;
    const coupon: Coupon = {
      id,
      code: data.code!.toUpperCase(),
      organizationId: data.organizationId,
      type: data.type!,
      value: data.value!,
      minOrderAmount: data.minOrderAmount,
      maxDiscountAmount: data.maxDiscountAmount,
      usageLimit: data.usageLimit,
      usageLimitPerUser: data.usageLimitPerUser,
      usageCount: 0,
      validFrom: data.validFrom ? new Date(data.validFrom as any) : undefined,
      validUntil: data.validUntil ? new Date(data.validUntil as any) : undefined,
      productIds: data.productIds,
      categoryIds: data.categoryIds,
      firstPurchaseOnly: data.firstPurchaseOnly || false,
      isActive: true,
      createdAt: new Date(),
    };
    this.coupons.set(id, coupon);
    this.couponUsage.set(id, new Map());
    return coupon;
  }

  async validateCoupon(code: string, userId: string, orderTotal: number, productIds?: string[]): Promise<{
    valid: boolean;
    coupon?: Coupon;
    discount?: number;
    error?: string;
  }> {
    const coupon = Array.from(this.coupons.values()).find(c => c.code === code.toUpperCase() && c.isActive);

    if (!coupon) return { valid: false, error: 'Coupon not found' };
    if (coupon.validFrom && new Date() < coupon.validFrom) return { valid: false, error: 'Coupon not yet valid' };
    if (coupon.validUntil && new Date() > coupon.validUntil) return { valid: false, error: 'Coupon expired' };
    if (coupon.usageLimit && coupon.usageCount >= coupon.usageLimit) return { valid: false, error: 'Coupon usage limit reached' };
    if (coupon.minOrderAmount && orderTotal < coupon.minOrderAmount) return { valid: false, error: `Minimum order amount is ${coupon.minOrderAmount}` };

    const userUsage = this.couponUsage.get(coupon.id)?.get(userId) || 0;
    if (coupon.usageLimitPerUser && userUsage >= coupon.usageLimitPerUser) return { valid: false, error: 'You have already used this coupon' };

    let discount = 0;
    if (coupon.type === 'PERCENTAGE') {
      discount = orderTotal * (coupon.value / 100);
      if (coupon.maxDiscountAmount) discount = Math.min(discount, coupon.maxDiscountAmount);
    } else if (coupon.type === 'FIXED_AMOUNT') {
      discount = coupon.value;
    }

    return { valid: true, coupon, discount };
  }

  async applyCoupon(couponId: string, userId: string): Promise<void> {
    const coupon = this.coupons.get(couponId);
    if (!coupon) throw new NotFoundException(`Coupon ${couponId} not found`);

    coupon.usageCount++;
    this.coupons.set(couponId, coupon);

    const usage = this.couponUsage.get(couponId) || new Map();
    usage.set(userId, (usage.get(userId) || 0) + 1);
    this.couponUsage.set(couponId, usage);
  }

  async getCoupons(organizationId: string): Promise<Coupon[]> {
    return Array.from(this.coupons.values()).filter(c => c.organizationId === organizationId);
  }

  async updateCoupon(id: string, data: Partial<Coupon>): Promise<Coupon> {
    const coupon = this.coupons.get(id);
    if (!coupon) throw new NotFoundException(`Coupon ${id} not found`);
    const updated = { ...coupon, ...data };
    this.coupons.set(id, updated);
    return updated;
  }

  async deleteCoupon(id: string): Promise<void> {
    this.coupons.delete(id);
    this.couponUsage.delete(id);
  }

  // In-App Messaging
  async createInAppMessage(data: Partial<InAppMessage>): Promise<InAppMessage> {
    const id = `msg-${Date.now()}`;
    const message: InAppMessage = {
      id,
      name: data.name!,
      organizationId: data.organizationId,
      type: data.type!,
      content: data.content!,
      ctaText: data.ctaText,
      ctaUrl: data.ctaUrl,
      triggerEvent: data.triggerEvent,
      targetPages: data.targetPages,
      targetSegments: data.targetSegments,
      showDelay: data.showDelay,
      dismissAfter: data.dismissAfter,
      isActive: true,
      impressions: 0,
      clicks: 0,
      createdAt: new Date(),
    };
    this.inAppMessages.set(id, message);
    return message;
  }

  async getInAppMessages(organizationId: string, page?: string, segment?: string): Promise<InAppMessage[]> {
    let items = Array.from(this.inAppMessages.values())
      .filter(m => m.organizationId === organizationId && m.isActive);

    if (page) items = items.filter(m => !m.targetPages?.length || m.targetPages.includes(page));
    if (segment) items = items.filter(m => !m.targetSegments?.length || m.targetSegments.includes(segment));

    return items;
  }

  async trackMessageImpression(messageId: string): Promise<void> {
    const message = this.inAppMessages.get(messageId);
    if (message) {
      message.impressions++;
      this.inAppMessages.set(messageId, message);
    }
  }

  async trackMessageClick(messageId: string): Promise<void> {
    const message = this.inAppMessages.get(messageId);
    if (message) {
      message.clicks++;
      this.inAppMessages.set(messageId, message);
    }
  }

  async updateInAppMessage(id: string, data: Partial<InAppMessage>): Promise<InAppMessage> {
    const message = this.inAppMessages.get(id);
    if (!message) throw new NotFoundException(`Message ${id} not found`);
    const updated = { ...message, ...data };
    this.inAppMessages.set(id, updated);
    return updated;
  }

  async deleteInAppMessage(id: string): Promise<void> {
    this.inAppMessages.delete(id);
  }

  // Trial Conversion
  async createTrialPlan(data: Partial<TrialPlan>): Promise<TrialPlan> {
    const id = `trial-plan-${Date.now()}`;
    const plan: TrialPlan = {
      id,
      name: data.name!,
      organizationId: data.organizationId,
      trialDays: data.trialDays!,
      features: data.features || [],
      targetPlanId: data.targetPlanId,
      conversionIncentive: data.conversionIncentive,
      isActive: true,
      createdAt: new Date(),
    };
    this.trialPlans.set(id, plan);
    return plan;
  }

  async startTrial(userId: string, planId: string): Promise<UserTrial> {
    const plan = this.trialPlans.get(planId);
    if (!plan) throw new NotFoundException(`Trial plan ${planId} not found`);

    const existing = Array.from(this.userTrials.values()).find(t => t.userId === userId && t.planId === planId);
    if (existing) throw new BadRequestException('User already has or had a trial for this plan');

    const id = `trial-${Date.now()}`;
    const startDate = new Date();
    const endDate = new Date(startDate.getTime() + plan.trialDays * 24 * 60 * 60 * 1000);

    const trial: UserTrial = {
      id,
      userId,
      planId,
      startDate,
      endDate,
      status: 'active',
    };
    this.userTrials.set(id, trial);
    return trial;
  }

  async getUserTrials(userId: string): Promise<UserTrial[]> {
    return Array.from(this.userTrials.values()).filter(t => t.userId === userId);
  }

  async convertTrial(trialId: string): Promise<UserTrial> {
    const trial = this.userTrials.get(trialId);
    if (!trial) throw new NotFoundException(`Trial ${trialId} not found`);
    trial.status = 'converted';
    trial.convertedAt = new Date();
    this.userTrials.set(trialId, trial);
    return trial;
  }

  async getTrialMetrics(planId: string): Promise<{
    totalTrials: number;
    activeTrials: number;
    convertedTrials: number;
    conversionRate: number;
  }> {
    const trials = Array.from(this.userTrials.values()).filter(t => t.planId === planId);
    const total = trials.length;
    const active = trials.filter(t => t.status === 'active').length;
    const converted = trials.filter(t => t.status === 'converted').length;

    return {
      totalTrials: total,
      activeTrials: active,
      convertedTrials: converted,
      conversionRate: total > 0 ? (converted / total) * 100 : 0,
    };
  }
}
