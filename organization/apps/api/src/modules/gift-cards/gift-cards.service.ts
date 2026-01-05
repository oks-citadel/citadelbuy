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
  TransferGiftCardDto,
  BulkCreateGiftCardsDto,
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
   * Uses transaction to ensure atomicity of gift card creation and transaction record
   */
  async purchaseGiftCard(dto: PurchaseGiftCardDto, userId: string) {
    // Generate unique code
    const code = await this.generateUniqueCode();

    // Use transaction to ensure atomicity
    const giftCard = await this.prisma.$transaction(async (tx) => {
      // Create gift card
      const card = await tx.giftCard.create({
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

      // Create transaction record within the same transaction
      await tx.giftCardTransaction.create({
        data: {
          giftCardId: card.id,
          type: TransactionType.PURCHASE,
          amount: dto.amount,
          balanceBefore: 0,
          balanceAfter: dto.amount,
          userId,
          description: `Gift card purchased for ${dto.amount}`,
        },
      });

      return card;
    });

    // Send email if not scheduled (outside transaction - non-critical)
    if (!dto.isScheduled) {
      await this.sendGiftCardEmail(giftCard.id);
    }

    return giftCard;
  }

  /**
   * Create promotional gift card (Admin only)
   * Uses transaction to ensure atomicity of gift card creation and transaction record
   */
  async createPromotionalGiftCard(dto: CreatePromotionalGiftCardDto) {
    const code = await this.generateUniqueCode();

    // Use transaction to ensure atomicity
    const giftCard = await this.prisma.$transaction(async (tx) => {
      const card = await tx.giftCard.create({
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

      // Create transaction record within the same transaction
      await tx.giftCardTransaction.create({
        data: {
          giftCardId: card.id,
          type: TransactionType.PURCHASE,
          amount: dto.amount,
          balanceBefore: 0,
          balanceAfter: dto.amount,
          userId: null,
          description: 'Promotional gift card created',
        },
      });

      return card;
    });

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
   * Uses transaction to ensure atomicity of balance update and transaction record
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

    // Use transaction to ensure atomicity of balance update and transaction record
    const result = await this.prisma.$transaction(async (tx) => {
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

      const updatedCard = await tx.giftCard.update({
        where: { id: giftCard.id },
        data: updateData,
      });

      // Create transaction record within the same transaction
      await tx.giftCardTransaction.create({
        data: {
          giftCardId: giftCard.id,
          type: TransactionType.REDEMPTION,
          amount: -redemptionAmount,
          balanceBefore: giftCard.currentBalance,
          balanceAfter: newBalance,
          userId,
          description: `Redeemed ${redemptionAmount} from gift card`,
          orderId: dto.orderId,
        },
      });

      return {
        redemptionAmount,
        remainingBalance: newBalance,
        giftCard: updatedCard,
      };
    });

    return result;
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
   * Uses transaction to ensure atomicity of status update and transaction record
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

    // Use transaction to ensure atomicity
    const updatedCard = await this.prisma.$transaction(async (tx) => {
      const card = await tx.giftCard.update({
        where: { id },
        data: { status: GiftCardStatus.CANCELLED },
      });

      // Create transaction record within the same transaction
      await tx.giftCardTransaction.create({
        data: {
          giftCardId: id,
          type: TransactionType.CANCELLATION,
          amount: 0,
          balanceBefore: giftCard.currentBalance,
          balanceAfter: giftCard.currentBalance,
          userId: null,
          description: `Gift card cancelled: ${reason}`,
        },
      });

      return card;
    });

    return updatedCard;
  }

  /**
   * Convert gift card to store credit
   * Uses transaction to ensure atomicity of store credit addition, gift card update, and transaction record
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

    // Use transaction to ensure atomicity of all operations
    await this.prisma.$transaction(async (tx) => {
      // Get or create store credit account
      let storeCredit = await tx.storeCredit.findUnique({
        where: { userId },
      });

      if (!storeCredit) {
        storeCredit = await tx.storeCredit.create({
          data: { userId },
        });
      }

      const newBalance = storeCredit.currentBalance + amount;
      const newTotalEarned = storeCredit.totalEarned + amount;

      // Update store credit
      await tx.storeCredit.update({
        where: { userId },
        data: {
          currentBalance: newBalance,
          totalEarned: newTotalEarned,
        },
      });

      // Create store credit transaction
      await tx.storeCreditTransaction.create({
        data: {
          storeCreditId: storeCredit.id,
          type: StoreCreditType.GIFT,
          transactionType: TransactionType.PURCHASE,
          amount,
          balanceBefore: storeCredit.currentBalance,
          balanceAfter: newBalance,
          description: `Converted from gift card ${giftCard.code}`,
        },
      });

      // Mark gift card as redeemed
      await tx.giftCard.update({
        where: { id: giftCard.id },
        data: {
          currentBalance: 0,
          status: GiftCardStatus.REDEEMED,
          redeemedBy: userId,
          redeemedAt: new Date(),
        },
      });

      // Create gift card transaction record
      await tx.giftCardTransaction.create({
        data: {
          giftCardId: giftCard.id,
          type: TransactionType.TRANSFER,
          amount: -amount,
          balanceBefore: amount,
          balanceAfter: 0,
          userId,
          description: 'Converted to store credit',
        },
      });
    });

    return {
      message: 'Gift card converted to store credit successfully',
      amount,
    };
  }

  /**
   * Transfer gift card balance between users
   * Uses transaction to ensure atomicity of debit from source and credit to destination
   */
  async transferGiftCard(
    dto: TransferGiftCardDto,
    fromUserId: string,
  ) {
    const giftCard = await this.prisma.giftCard.findUnique({
      where: { code: dto.giftCardCode },
    });

    if (!giftCard) {
      throw new NotFoundException('Gift card not found');
    }

    // Validate that the user owns this gift card or is the redeemer
    if (giftCard.purchasedBy !== fromUserId && giftCard.redeemedBy !== fromUserId) {
      throw new BadRequestException('You do not have permission to transfer this gift card');
    }

    if (giftCard.status !== GiftCardStatus.ACTIVE) {
      throw new BadRequestException(`Gift card is ${giftCard.status.toLowerCase()}`);
    }

    if (this.isExpired(giftCard)) {
      throw new BadRequestException('Gift card has expired');
    }

    if (giftCard.currentBalance <= 0) {
      throw new BadRequestException('Gift card has no balance to transfer');
    }

    // Verify the recipient exists
    const recipientExists = await this.prisma.user.findUnique({
      where: { id: dto.toUserId },
    });

    if (!recipientExists) {
      throw new NotFoundException('Recipient user not found');
    }

    if (dto.toUserId === fromUserId) {
      throw new BadRequestException('Cannot transfer to yourself');
    }

    // Calculate transfer amount
    const transferAmount = dto.amount
      ? Math.min(dto.amount, giftCard.currentBalance)
      : giftCard.currentBalance;

    // Use transaction to ensure atomicity of transfer
    const result = await this.prisma.$transaction(async (tx) => {
      const newSourceBalance = giftCard.currentBalance - transferAmount;

      // Update source gift card (deduct balance)
      const updateData: Prisma.GiftCardUpdateInput = {
        currentBalance: newSourceBalance,
        lastUsedAt: new Date(),
      };

      if (newSourceBalance === 0) {
        updateData.status = GiftCardStatus.REDEEMED;
      }

      await tx.giftCard.update({
        where: { id: giftCard.id },
        data: updateData,
      });

      // Create transfer-out transaction for source
      await tx.giftCardTransaction.create({
        data: {
          giftCardId: giftCard.id,
          type: TransactionType.TRANSFER,
          amount: -transferAmount,
          balanceBefore: giftCard.currentBalance,
          balanceAfter: newSourceBalance,
          userId: fromUserId,
          description: `Transferred ${transferAmount} to user ${dto.toUserId}`,
        },
      });

      // Generate a new gift card for the recipient
      const newCode = await this.generateUniqueCode();
      const newGiftCard = await tx.giftCard.create({
        data: {
          code: newCode,
          type: giftCard.type,
          initialAmount: transferAmount,
          currentBalance: transferAmount,
          purchasedBy: dto.toUserId,
          redeemedBy: dto.toUserId,
          redeemedAt: new Date(),
          expirationDate: giftCard.expirationDate,
          minimumPurchase: giftCard.minimumPurchase,
          allowedCategories: giftCard.allowedCategories,
          excludedProducts: giftCard.excludedProducts,
        },
      });

      // Create transfer-in transaction for destination
      await tx.giftCardTransaction.create({
        data: {
          giftCardId: newGiftCard.id,
          type: TransactionType.TRANSFER,
          amount: transferAmount,
          balanceBefore: 0,
          balanceAfter: transferAmount,
          userId: dto.toUserId,
          description: `Received ${transferAmount} from gift card ${giftCard.code}`,
        },
      });

      return {
        sourceGiftCard: {
          code: giftCard.code,
          remainingBalance: newSourceBalance,
        },
        destinationGiftCard: {
          code: newGiftCard.code,
          balance: transferAmount,
        },
        transferAmount,
      };
    });

    return {
      message: 'Gift card transferred successfully',
      ...result,
    };
  }

  /**
   * Bulk create gift cards (Admin only)
   * Uses transaction to ensure all gift cards are created atomically
   */
  async bulkCreateGiftCards(dto: BulkCreateGiftCardsDto) {
    // Generate all unique codes first
    const codes: string[] = [];
    for (let i = 0; i < dto.count; i++) {
      codes.push(await this.generateUniqueCode());
    }

    // Use transaction to ensure atomicity of bulk creation
    const giftCards = await this.prisma.$transaction(async (tx) => {
      const createdCards = [];

      for (const code of codes) {
        const card = await tx.giftCard.create({
          data: {
            code,
            type: dto.type || GiftCardType.PROMOTIONAL,
            initialAmount: dto.amount,
            currentBalance: dto.amount,
            expirationDate: dto.expirationDate
              ? new Date(dto.expirationDate)
              : this.getDefaultExpirationDate(),
            minimumPurchase: dto.minimumPurchase,
            allowedCategories: dto.allowedCategories || [],
            excludedProducts: dto.excludedProducts || [],
          },
        });

        // Create transaction record for each card
        await tx.giftCardTransaction.create({
          data: {
            giftCardId: card.id,
            type: TransactionType.PURCHASE,
            amount: dto.amount,
            balanceBefore: 0,
            balanceAfter: dto.amount,
            userId: null,
            description: 'Bulk promotional gift card created',
          },
        });

        createdCards.push(card);
      }

      return createdCards;
    });

    return {
      message: `Successfully created ${giftCards.length} gift cards`,
      count: giftCards.length,
      giftCards: giftCards.map((card) => ({
        id: card.id,
        code: card.code,
        amount: card.initialAmount,
        expirationDate: card.expirationDate,
      })),
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
   * Uses transaction to ensure atomicity of balance update and transaction record
   */
  async addStoreCredit(dto: AddStoreCreditDto) {
    // Use transaction to ensure atomicity
    const updatedCredit = await this.prisma.$transaction(async (tx) => {
      let storeCredit = await tx.storeCredit.findUnique({
        where: { userId: dto.userId },
      });

      if (!storeCredit) {
        storeCredit = await tx.storeCredit.create({
          data: { userId: dto.userId },
        });
      }

      const newBalance = storeCredit.currentBalance + dto.amount;
      const newTotalEarned = storeCredit.totalEarned + dto.amount;

      // Update store credit
      const updated = await tx.storeCredit.update({
        where: { userId: dto.userId },
        data: {
          currentBalance: newBalance,
          totalEarned: newTotalEarned,
        },
      });

      // Create transaction within the same transaction
      await tx.storeCreditTransaction.create({
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

      return updated;
    });

    return updatedCredit;
  }

  /**
   * Deduct store credit (use for order)
   * Uses transaction to ensure atomicity of balance update and transaction record
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

    // Use transaction to ensure atomicity
    const result = await this.prisma.$transaction(async (tx) => {
      const newBalance = storeCredit.currentBalance - dto.amount;
      const newTotalSpent = storeCredit.totalSpent + dto.amount;

      // Update store credit
      const updatedCredit = await tx.storeCredit.update({
        where: { userId: dto.userId },
        data: {
          currentBalance: newBalance,
          totalSpent: newTotalSpent,
        },
      });

      // Create transaction within the same transaction
      await tx.storeCreditTransaction.create({
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
    });

    return result;
  }

  /**
   * Adjust store credit (Admin)
   * Uses transaction to ensure atomicity of balance update and transaction record
   */
  async adjustStoreCredit(userId: string, dto: AdjustStoreCreditDto) {
    // Use transaction to ensure atomicity
    const updatedCredit = await this.prisma.$transaction(async (tx) => {
      let storeCredit = await tx.storeCredit.findUnique({
        where: { userId },
      });

      if (!storeCredit) {
        storeCredit = await tx.storeCredit.create({
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

      const updated = await tx.storeCredit.update({
        where: { userId },
        data: updateData,
      });

      // Create transaction within the same transaction
      await tx.storeCreditTransaction.create({
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

      return updated;
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
   * Uses transaction to ensure atomicity of status update and transaction record
   */
  private async expireGiftCard(id: string) {
    // Use transaction to ensure atomicity
    const giftCard = await this.prisma.$transaction(async (tx) => {
      const card = await tx.giftCard.update({
        where: { id },
        data: { status: GiftCardStatus.EXPIRED },
      });

      await tx.giftCardTransaction.create({
        data: {
          giftCardId: id,
          type: TransactionType.EXPIRATION,
          amount: 0,
          balanceBefore: card.currentBalance,
          balanceAfter: card.currentBalance,
          userId: null,
          description: 'Gift card expired',
        },
      });

      return card;
    });

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
   * Uses transaction to ensure atomicity of bulk expiration
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

    if (expiredCards.length === 0) {
      return {
        message: 'No gift cards to expire',
        count: 0,
      };
    }

    // Use transaction to ensure atomicity of bulk expiration
    await this.prisma.$transaction(async (tx) => {
      for (const card of expiredCards) {
        await tx.giftCard.update({
          where: { id: card.id },
          data: { status: GiftCardStatus.EXPIRED },
        });

        await tx.giftCardTransaction.create({
          data: {
            giftCardId: card.id,
            type: TransactionType.EXPIRATION,
            amount: 0,
            balanceBefore: card.currentBalance,
            balanceAfter: card.currentBalance,
            userId: null,
            description: 'Gift card expired',
          },
        });
      }
    });

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
