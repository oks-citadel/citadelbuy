import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';
import { EmailService } from '../email/email.service';
import {
  PurchaseGiftCardDto,
  CreatePromotionalGiftCardDto,
  RedeemGiftCardDto,
  CheckGiftCardBalanceDto,
  UpdateGiftCardDto,
  SendGiftCardEmailDto,
  ConvertToStoreCreditDto,
  GetGiftCardsQueryDto,
} from './dto/gift-card.dto';
import {
  AddStoreCreditDto,
  DeductStoreCreditDto,
  AdjustStoreCreditDto,
  GetStoreCreditHistoryDto,
} from './dto/store-credit.dto';
import {
  GiftCardStatus,
  GiftCardType,
  StoreCreditType,
  TransactionType,
  Prisma,
} from '@prisma/client';
import { randomBytes } from 'crypto';

@Injectable()
export class GiftCardsService {
  private readonly logger = new Logger(GiftCardsService.name);

  constructor(
    private prisma: PrismaService,
    private emailService: EmailService,
  ) {}

  // ==================== GIFT CARD MANAGEMENT ====================

  /**
   * Purchase a gift card
   */
  async purchaseGiftCard(dto: PurchaseGiftCardDto, userId: string) {
    // Generate unique code
    const code = await this.generateUniqueCode();

    // Create gift card
    const giftCard = await this.prisma.giftCard.create({
      data: {
        code,
        type: dto.type || GiftCardType.DIGITAL,
        initialAmount: dto.amount,
        currentBalance: dto.amount,
        purchasedBy: userId,
        recipientEmail: dto.recipientEmail,
        recipientName: dto.recipientName,
        senderName: dto.senderName,
        personalMessage: dto.personalMessage,
        designTemplate: dto.designTemplate,
        isScheduled: dto.isScheduled || false,
        scheduledDelivery: dto.scheduledDelivery
          ? new Date(dto.scheduledDelivery)
          : undefined,
        expirationDate: dto.expirationDate
          ? new Date(dto.expirationDate)
          : this.getDefaultExpirationDate(),
      },
      include: {
        purchaser: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    // Create transaction record
    await this.createTransaction(
      giftCard.id,
      TransactionType.PURCHASE,
      dto.amount,
      0,
      dto.amount,
      userId,
      `Gift card purchased for ${dto.amount}`,
    );

    // Send email if not scheduled
    if (!dto.isScheduled) {
      await this.sendGiftCardEmail(giftCard.id);
    }

    return giftCard;
  }

  /**
   * Create promotional gift card (Admin only)
   */
  async createPromotionalGiftCard(dto: CreatePromotionalGiftCardDto) {
    const code = await this.generateUniqueCode();

    const giftCard = await this.prisma.giftCard.create({
      data: {
        code,
        type: GiftCardType.PROMOTIONAL,
        initialAmount: dto.amount,
        currentBalance: dto.amount,
        recipientEmail: dto.recipientEmail,
        expirationDate: dto.expirationDate
          ? new Date(dto.expirationDate)
          : undefined,
        minimumPurchase: dto.minimumPurchase,
        allowedCategories: dto.allowedCategories || [],
        excludedProducts: dto.excludedProducts || [],
      },
    });

    // Create transaction record
    await this.createTransaction(
      giftCard.id,
      TransactionType.PURCHASE,
      dto.amount,
      0,
      dto.amount,
      null,
      'Promotional gift card created',
    );

    return giftCard;
  }

  /**
   * Check gift card balance
   */
  async checkBalance(dto: CheckGiftCardBalanceDto) {
    const giftCard = await this.prisma.giftCard.findUnique({
      where: { code: dto.code },
      include: {
        transactions: {
          orderBy: { createdAt: 'desc' },
          take: 5,
        },
      },
    });

    if (!giftCard) {
      throw new NotFoundException('Gift card not found');
    }

    // Check expiration
    if (this.isExpired(giftCard)) {
      if (giftCard.status === GiftCardStatus.ACTIVE) {
        await this.expireGiftCard(giftCard.id);
      }
      throw new BadRequestException('Gift card has expired');
    }

    return {
      code: giftCard.code,
      currentBalance: giftCard.currentBalance,
      initialAmount: giftCard.initialAmount,
      status: giftCard.status,
      expirationDate: giftCard.expirationDate,
      minimumPurchase: giftCard.minimumPurchase,
      recentTransactions: giftCard.transactions,
    };
  }

  /**
   * Redeem gift card (apply to order)
   */
  async redeemGiftCard(
    dto: RedeemGiftCardDto,
    userId: string,
    orderTotal?: number,
  ) {
    const giftCard = await this.prisma.giftCard.findUnique({
      where: { code: dto.code },
    });

    if (!giftCard) {
      throw new NotFoundException('Gift card not found');
    }

    // Validate redemption
    this.validateRedemption(giftCard, orderTotal);

    // Calculate redemption amount
    let redemptionAmount = dto.amount || giftCard.currentBalance;
    if (orderTotal) {
      redemptionAmount = Math.min(redemptionAmount, orderTotal);
    }
    redemptionAmount = Math.min(redemptionAmount, giftCard.currentBalance);

    // Update gift card
    const newBalance = giftCard.currentBalance - redemptionAmount;
    const updateData: Prisma.GiftCardUpdateInput = {
      currentBalance: newBalance,
      lastUsedAt: new Date(),
      usageCount: { increment: 1 },
    };

    // Mark as redeemed if fully used
    if (newBalance === 0) {
      updateData.status = GiftCardStatus.REDEEMED;
    }

    // Set redeemer on first use
    if (!giftCard.redeemedBy) {
      (updateData as any).redeemedBy = userId;
      updateData.redeemedAt = new Date();
    }

    const updatedCard = await this.prisma.giftCard.update({
      where: { id: giftCard.id },
      data: updateData,
    });

    // Create transaction record
    await this.createTransaction(
      giftCard.id,
      TransactionType.REDEMPTION,
      -redemptionAmount,
      giftCard.currentBalance,
      newBalance,
      userId,
      `Redeemed ${redemptionAmount} from gift card`,
      dto.orderId,
    );

    return {
      redemptionAmount,
      remainingBalance: newBalance,
      giftCard: updatedCard,
    };
  }

  /**
   * Get gift card by ID
   */
  async getGiftCardById(id: string) {
    const giftCard = await this.prisma.giftCard.findUnique({
      where: { id },
      include: {
        purchaser: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        redeemer: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        transactions: {
          orderBy: { createdAt: 'desc' },
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
      },
    });

    if (!giftCard) {
      throw new NotFoundException('Gift card not found');
    }

    return giftCard;
  }

  /**
   * Get user's purchased gift cards
   */
  async getUserPurchasedGiftCards(userId: string, query: GetGiftCardsQueryDto) {
    const { status, type, page = 1, limit = 20 } = query;

    const where: Prisma.GiftCardWhereInput = {
      purchasedBy: userId,
    };

    if (status) {
      where.status = status;
    }
    if (type) {
      where.type = type;
    }

    const skip = (page - 1) * limit;

    const [giftCards, total] = await Promise.all([
      this.prisma.giftCard.findMany({
        where,
        include: {
          transactions: {
            orderBy: { createdAt: 'desc' },
            take: 1,
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.giftCard.count({ where }),
    ]);

    return {
      giftCards,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get user's redeemed gift cards
   */
  async getUserRedeemedGiftCards(userId: string, query: GetGiftCardsQueryDto) {
    const { status, page = 1, limit = 20 } = query;

    const where: Prisma.GiftCardWhereInput = {
      redeemedBy: userId,
    };

    if (status) {
      where.status = status;
    }

    const skip = (page - 1) * limit;

    const [giftCards, total] = await Promise.all([
      this.prisma.giftCard.findMany({
        where,
        include: {
          transactions: {
            where: { userId },
            orderBy: { createdAt: 'desc' },
          },
        },
        orderBy: { redeemedAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.giftCard.count({ where }),
    ]);

    return {
      giftCards,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Update gift card (Admin)
   */
  async updateGiftCard(id: string, dto: UpdateGiftCardDto) {
    const giftCard = await this.prisma.giftCard.findUnique({
      where: { id },
    });

    if (!giftCard) {
      throw new NotFoundException('Gift card not found');
    }

    return this.prisma.giftCard.update({
      where: { id },
      data: {
        status: dto.status,
        expirationDate: dto.expirationDate
          ? new Date(dto.expirationDate)
          : undefined,
        minimumPurchase: dto.minimumPurchase,
        allowedCategories: dto.allowedCategories,
        excludedProducts: dto.excludedProducts,
      },
    });
  }

  /**
   * Cancel gift card (Admin)
   */
  async cancelGiftCard(id: string, reason: string) {
    const giftCard = await this.prisma.giftCard.findUnique({
      where: { id },
    });

    if (!giftCard) {
      throw new NotFoundException('Gift card not found');
    }

    if (giftCard.status === GiftCardStatus.REDEEMED) {
      throw new BadRequestException('Cannot cancel fully redeemed gift card');
    }

    const updatedCard = await this.prisma.giftCard.update({
      where: { id },
      data: { status: GiftCardStatus.CANCELLED },
    });

    // Create transaction record
    await this.createTransaction(
      id,
      TransactionType.CANCELLATION,
      0,
      giftCard.currentBalance,
      giftCard.currentBalance,
      null,
      `Gift card cancelled: ${reason}`,
    );

    return updatedCard;
  }

  /**
   * Convert gift card to store credit
   */
  async convertToStoreCredit(dto: ConvertToStoreCreditDto, userId: string) {
    const giftCard = await this.prisma.giftCard.findUnique({
      where: { code: dto.giftCardCode },
    });

    if (!giftCard) {
      throw new NotFoundException('Gift card not found');
    }

    if (giftCard.currentBalance <= 0) {
      throw new BadRequestException('Gift card has no balance');
    }

    if (this.isExpired(giftCard)) {
      throw new BadRequestException('Gift card has expired');
    }

    // Transfer balance to store credit
    const amount = giftCard.currentBalance;

    await this.addStoreCredit({
      userId,
      amount,
      type: StoreCreditType.GIFT,
      description: `Converted from gift card ${giftCard.code}`,
    });

    // Mark gift card as redeemed
    await this.prisma.giftCard.update({
      where: { id: giftCard.id },
      data: {
        currentBalance: 0,
        status: GiftCardStatus.REDEEMED,
        redeemedBy: userId,
        redeemedAt: new Date(),
      },
    });

    // Create transaction
    await this.createTransaction(
      giftCard.id,
      TransactionType.TRANSFER,
      -amount,
      amount,
      0,
      userId,
      'Converted to store credit',
    );

    return {
      message: 'Gift card converted to store credit successfully',
      amount,
    };
  }

  // ==================== STORE CREDIT MANAGEMENT ====================

  /**
   * Get or create store credit account
   */
  async getStoreCredit(userId: string) {
    let storeCredit = await this.prisma.storeCredit.findUnique({
      where: { userId },
      include: {
        transactions: {
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
      },
    });

    if (!storeCredit) {
      storeCredit = await this.prisma.storeCredit.create({
        data: { userId },
        include: {
          transactions: true,
        },
      });
    }

    return storeCredit;
  }

  /**
   * Add store credit
   */
  async addStoreCredit(dto: AddStoreCreditDto) {
    let storeCredit = await this.prisma.storeCredit.findUnique({
      where: { userId: dto.userId },
    });

    if (!storeCredit) {
      storeCredit = await this.prisma.storeCredit.create({
        data: { userId: dto.userId },
      });
    }

    const newBalance = storeCredit.currentBalance + dto.amount;
    const newTotalEarned = storeCredit.totalEarned + dto.amount;

    // Update store credit
    const updatedCredit = await this.prisma.storeCredit.update({
      where: { userId: dto.userId },
      data: {
        currentBalance: newBalance,
        totalEarned: newTotalEarned,
      },
    });

    // Create transaction
    await this.prisma.storeCreditTransaction.create({
      data: {
        storeCreditId: storeCredit.id,
        type: dto.type,
        transactionType: TransactionType.PURCHASE,
        amount: dto.amount,
        balanceBefore: storeCredit.currentBalance,
        balanceAfter: newBalance,
        orderId: dto.orderId,
        description: dto.description,
        notes: dto.notes,
        expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : undefined,
      },
    });

    return updatedCredit;
  }

  /**
   * Deduct store credit (use for order)
   */
  async deductStoreCredit(dto: DeductStoreCreditDto) {
    const storeCredit = await this.prisma.storeCredit.findUnique({
      where: { userId: dto.userId },
    });

    if (!storeCredit) {
      throw new NotFoundException('Store credit account not found');
    }

    if (storeCredit.currentBalance < dto.amount) {
      throw new BadRequestException('Insufficient store credit balance');
    }

    const newBalance = storeCredit.currentBalance - dto.amount;
    const newTotalSpent = storeCredit.totalSpent + dto.amount;

    // Update store credit
    const updatedCredit = await this.prisma.storeCredit.update({
      where: { userId: dto.userId },
      data: {
        currentBalance: newBalance,
        totalSpent: newTotalSpent,
      },
    });

    // Create transaction
    await this.prisma.storeCreditTransaction.create({
      data: {
        storeCreditId: storeCredit.id,
        type: StoreCreditType.REFUND, // Default type
        transactionType: TransactionType.REDEMPTION,
        amount: -dto.amount,
        balanceBefore: storeCredit.currentBalance,
        balanceAfter: newBalance,
        orderId: dto.orderId,
        description: dto.description || `Applied to order ${dto.orderId}`,
      },
    });

    return {
      deductedAmount: dto.amount,
      remainingBalance: newBalance,
      storeCredit: updatedCredit,
    };
  }

  /**
   * Adjust store credit (Admin)
   */
  async adjustStoreCredit(userId: string, dto: AdjustStoreCreditDto) {
    let storeCredit = await this.prisma.storeCredit.findUnique({
      where: { userId },
    });

    if (!storeCredit) {
      storeCredit = await this.prisma.storeCredit.create({
        data: { userId },
      });
    }

    const newBalance = storeCredit.currentBalance + dto.amount;

    if (newBalance < 0) {
      throw new BadRequestException('Cannot adjust to negative balance');
    }

    // Update totals
    const updateData: Prisma.StoreCreditUpdateInput = {
      currentBalance: newBalance,
    };

    if (dto.amount > 0) {
      updateData.totalEarned = { increment: dto.amount };
    } else {
      updateData.totalSpent = { increment: Math.abs(dto.amount) };
    }

    const updatedCredit = await this.prisma.storeCredit.update({
      where: { userId },
      data: updateData,
    });

    // Create transaction
    await this.prisma.storeCreditTransaction.create({
      data: {
        storeCreditId: storeCredit.id,
        type: StoreCreditType.COMPENSATION,
        transactionType: TransactionType.ADJUSTMENT,
        amount: dto.amount,
        balanceBefore: storeCredit.currentBalance,
        balanceAfter: newBalance,
        description: dto.reason,
        notes: dto.notes,
      },
    });

    return updatedCredit;
  }

  /**
   * Get store credit transaction history
   */
  async getStoreCreditHistory(userId: string, query: GetStoreCreditHistoryDto) {
    const storeCredit = await this.prisma.storeCredit.findUnique({
      where: { userId },
    });

    if (!storeCredit) {
      return { transactions: [], storeCredit: null };
    }

    const where: Prisma.StoreCreditTransactionWhereInput = {
      storeCreditId: storeCredit.id,
    };

    if (query.type) {
      where.type = query.type;
    }

    const transactions = await this.prisma.storeCreditTransaction.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: query.limit || 20,
      include: {
        order: {
          select: {
            id: true,
            total: true,
            status: true,
          },
        },
      },
    });

    return { transactions, storeCredit };
  }

  // ==================== HELPER METHODS ====================

  /**
   * Generate unique gift card code
   */
  private async generateUniqueCode(): Promise<string> {
    let code: string = '';
    let exists = true;

    while (exists) {
      // Generate 16-character code: XXXX-XXXX-XXXX-XXXX
      const bytes = randomBytes(8);
      const hex = bytes.toString('hex').toUpperCase();
      code = `${hex.slice(0, 4)}-${hex.slice(4, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}`;

      const existing = await this.prisma.giftCard.findUnique({
        where: { code },
      });
      exists = !!existing;
    }

    return code;
  }

  /**
   * Create gift card transaction
   */
  private async createTransaction(
    giftCardId: string,
    type: TransactionType,
    amount: number,
    balanceBefore: number,
    balanceAfter: number,
    userId: string | null,
    description: string,
    orderId?: string,
  ) {
    return this.prisma.giftCardTransaction.create({
      data: {
        giftCardId,
        type,
        amount,
        balanceBefore,
        balanceAfter,
        userId,
        description,
        orderId,
      },
    });
  }

  /**
   * Check if gift card is expired
   */
  private isExpired(giftCard: { expirationDate: Date | null }): boolean {
    if (!giftCard.expirationDate) {
      return false;
    }
    return new Date() > giftCard.expirationDate;
  }

  /**
   * Get default expiration date (1 year from now)
   */
  private getDefaultExpirationDate(): Date {
    const date = new Date();
    date.setFullYear(date.getFullYear() + 1);
    return date;
  }

  /**
   * Validate gift card redemption
   */
  private validateRedemption(
    giftCard: any,
    orderTotal?: number,
  ): void {
    if (giftCard.status !== GiftCardStatus.ACTIVE) {
      throw new BadRequestException(
        `Gift card is ${giftCard.status.toLowerCase()}`,
      );
    }

    if (this.isExpired(giftCard)) {
      throw new BadRequestException('Gift card has expired');
    }

    if (giftCard.currentBalance <= 0) {
      throw new BadRequestException('Gift card has no remaining balance');
    }

    if (
      giftCard.minimumPurchase &&
      orderTotal &&
      orderTotal < giftCard.minimumPurchase
    ) {
      throw new BadRequestException(
        `Minimum purchase of $${giftCard.minimumPurchase} required`,
      );
    }
  }

  /**
   * Expire gift card
   */
  private async expireGiftCard(id: string) {
    const giftCard = await this.prisma.giftCard.update({
      where: { id },
      data: { status: GiftCardStatus.EXPIRED },
    });

    await this.createTransaction(
      id,
      TransactionType.EXPIRATION,
      0,
      giftCard.currentBalance,
      giftCard.currentBalance,
      null,
      'Gift card expired',
    );

    return giftCard;
  }

  /**
   * Send gift card email
   */
  async sendGiftCardEmail(giftCardId: string) {
    const giftCard = await this.prisma.giftCard.findUnique({
      where: { id: giftCardId },
      include: {
        purchaser: {
          select: {
            name: true,
            email: true,
          },
        },
      },
    });

    if (!giftCard) {
      throw new NotFoundException('Gift card not found');
    }

    // Send email to recipient
    const recipientEmail = giftCard.recipientEmail || giftCard.purchaser?.email;
    const recipientName = giftCard.recipientName || giftCard.purchaser?.name || 'Valued Customer';

    if (recipientEmail) {
      try {
        await this.sendGiftCardNotificationEmail(giftCard, recipientEmail, recipientName);
        this.logger.log(`Gift card email sent to ${recipientEmail}`);
      } catch (error) {
        this.logger.error(`Failed to send gift card email: ${error.message}`, error.stack);
        throw error;
      }
    }

    // Update deliveredAt
    await this.prisma.giftCard.update({
      where: { id: giftCardId },
      data: { deliveredAt: new Date() },
    });

    return { message: 'Gift card email sent successfully' };
  }

  /**
   * Process scheduled gift card deliveries (Cron job)
   */
  async processScheduledDeliveries() {
    const now = new Date();

    const scheduledCards = await this.prisma.giftCard.findMany({
      where: {
        isScheduled: true,
        deliveredAt: null,
        scheduledDelivery: {
          lte: now,
        },
      },
    });

    for (const card of scheduledCards) {
      await this.sendGiftCardEmail(card.id);
    }

    return {
      message: `Processed ${scheduledCards.length} scheduled gift card deliveries`,
      count: scheduledCards.length,
    };
  }

  /**
   * Expire old gift cards (Cron job)
   */
  async expireOldGiftCards() {
    const now = new Date();

    const expiredCards = await this.prisma.giftCard.findMany({
      where: {
        status: GiftCardStatus.ACTIVE,
        expirationDate: {
          lt: now,
        },
      },
    });

    for (const card of expiredCards) {
      await this.expireGiftCard(card.id);
    }

    return {
      message: `Expired ${expiredCards.length} gift cards`,
      count: expiredCards.length,
    };
  }

  /**
   * Get gift card statistics (Admin)
   */
  async getGiftCardStatistics(startDate?: Date, endDate?: Date) {
    const where: Prisma.GiftCardWhereInput = {};

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = startDate;
      if (endDate) where.createdAt.lte = endDate;
    }

    const [
      total,
      active,
      redeemed,
      expired,
      totalValue,
      redeemedValue,
      outstanding,
    ] = await Promise.all([
      this.prisma.giftCard.count({ where }),
      this.prisma.giftCard.count({
        where: { ...where, status: GiftCardStatus.ACTIVE },
      }),
      this.prisma.giftCard.count({
        where: { ...where, status: GiftCardStatus.REDEEMED },
      }),
      this.prisma.giftCard.count({
        where: { ...where, status: GiftCardStatus.EXPIRED },
      }),
      this.prisma.giftCard.aggregate({
        where,
        _sum: { initialAmount: true },
      }),
      this.prisma.giftCard.aggregate({
        where: { ...where, status: GiftCardStatus.REDEEMED },
        _sum: { initialAmount: true },
      }),
      this.prisma.giftCard.aggregate({
        where: { ...where, status: GiftCardStatus.ACTIVE },
        _sum: { currentBalance: true },
      }),
    ]);

    return {
      total,
      byStatus: {
        active,
        redeemed,
        expired,
      },
      value: {
        totalSold: totalValue._sum.initialAmount || 0,
        totalRedeemed: redeemedValue._sum.initialAmount || 0,
        outstandingBalance: outstanding._sum.currentBalance || 0,
        breakage:
          (totalValue._sum.initialAmount || 0) -
          (redeemedValue._sum.initialAmount || 0) -
          (outstanding._sum.currentBalance || 0),
      },
    };
  }

  // ==================== HELPER METHODS ====================

  /**
   * Send gift card notification email
   */
  private async sendGiftCardNotificationEmail(
    giftCard: any,
    recipientEmail: string,
    recipientName: string,
  ): Promise<void> {
    const subject = `🎁 You've received a ${giftCard.initialAmount.toFixed(2)} Gift Card!`;
    const html = this.generateGiftCardEmailTemplate(giftCard, recipientName);

    await this.emailService['sendEmail']({ to: recipientEmail, subject, html });
  }

  /**
   * Generate gift card email template
   */
  private generateGiftCardEmailTemplate(giftCard: any, recipientName: string): string {
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Gift Card</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f4f4;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f4; padding: 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          <tr>
            <td style="background: linear-gradient(135deg, #ec4899 0%, #8b5cf6 100%); padding: 40px 20px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 32px;">🎁 Gift Card</h1>
              <p style="color: #ffffff; margin: 10px 0 0; font-size: 24px; font-weight: bold;">$${giftCard.initialAmount.toFixed(2)}</p>
            </td>
          </tr>
          <tr>
            <td style="padding: 40px 30px;">
              <p style="font-size: 18px; color: #333333; margin: 0 0 20px;">Hello ${recipientName},</p>
              ${giftCard.senderName ? `<p style="font-size: 16px; color: #666666; line-height: 1.6; margin: 0 0 20px;">You've received a gift card from <strong>${giftCard.senderName}</strong>!</p>` : ''}
              ${giftCard.personalMessage ? `<div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0;"><p style="font-size: 14px; color: #92400e; margin: 0; font-style: italic;">"${giftCard.personalMessage}"</p></div>` : ''}
              <div style="background: linear-gradient(135deg, #ec4899 0%, #8b5cf6 100%); padding: 30px; border-radius: 10px; margin: 30px 0; text-align: center;">
                <p style="color: #ffffff; margin: 0 0 10px; font-size: 14px; text-transform: uppercase; letter-spacing: 2px;">Your Gift Card Code</p>
                <p style="color: #ffffff; margin: 0; font-size: 28px; font-weight: bold; letter-spacing: 3px; font-family: monospace;">${giftCard.code}</p>
                <p style="color: #ffffff; margin: 15px 0 0; font-size: 18px; font-weight: bold;">Balance: $${giftCard.currentBalance.toFixed(2)}</p>
              </div>
              <div style="background-color: #f8f8f8; padding: 20px; border-radius: 5px; margin: 20px 0;">
                <h3 style="font-size: 16px; color: #333333; margin: 0 0 15px;">How to Use:</h3>
                <ol style="margin: 0; padding-left: 20px; color: #666666; line-height: 1.8;">
                  <li>Browse our products and add items to your cart</li>
                  <li>At checkout, enter your gift card code</li>
                  <li>The amount will be deducted from your order total</li>
                  <li>Any remaining balance stays on your card for future use</li>
                </ol>
              </div>
              ${giftCard.expirationDate ? `<p style="font-size: 14px; color: #ef4444; margin: 20px 0;"><strong>⚠️ Expires:</strong> ${new Date(giftCard.expirationDate).toLocaleDateString()}</p>` : ''}
              ${giftCard.minimumPurchase ? `<p style="font-size: 14px; color: #666666; margin: 10px 0;"><strong>Minimum Purchase:</strong> $${giftCard.minimumPurchase.toFixed(2)}</p>` : ''}
              <div style="text-align: center; margin: 30px 0;">
                <a href="http://localhost:3000/gift-cards/redeem?code=${giftCard.code}" style="display: inline-block; background: linear-gradient(135deg, #ec4899 0%, #8b5cf6 100%); color: #ffffff; text-decoration: none; padding: 15px 40px; border-radius: 5px; font-size: 16px; font-weight: bold;">
                  Redeem Now
                </a>
              </div>
            </td>
          </tr>
          <tr>
            <td style="background-color: #f8f8f8; padding: 20px 30px; text-align: center; border-top: 1px solid #eeeeee;">
              <p style="font-size: 12px; color: #999999; margin: 0;">© 2025 Broxiva. All rights reserved.</p>
              <p style="font-size: 12px; color: #999999; margin: 10px 0 0;">
                Questions? Contact us at support@broxiva.com
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `;
  }
}
