import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';
import { PaymentOrchestratorService } from './payment-orchestrator.service';
import { PaymentProviderType, CreatePaymentRequest } from '../interfaces';

export interface WalletTopupRequest {
  amount: number;
  currency?: string;
  provider?: PaymentProviderType;
  paymentMethodId?: string;
  returnUrl?: string;
  cancelUrl?: string;
}

export interface WalletBalance {
  userId: string;
  balance: number;
  currency: string;
  totalEarned: number;
  totalSpent: number;
}

export interface WalletTransaction {
  id: string;
  amount: number;
  type: 'CREDIT' | 'DEBIT';
  source: string;
  description: string;
  balanceBefore: number;
  balanceAfter: number;
  createdAt: Date;
}

/**
 * Wallet Service
 *
 * Manages user wallet/credits for in-app purchases:
 * - Coins
 * - Credits
 * - Boosts
 * - Super likes
 * - Gifts
 */
@Injectable()
export class WalletService {
  private readonly logger = new Logger(WalletService.name);

  constructor(
    private prisma: PrismaService,
    private paymentOrchestrator: PaymentOrchestratorService,
  ) {}

  /**
   * Get user's wallet balance
   */
  async getBalance(userId: string): Promise<WalletBalance> {
    let storeCredit = await this.prisma.storeCredit.findUnique({
      where: { userId },
    });

    if (!storeCredit) {
      // Create wallet if doesn't exist
      storeCredit = await this.prisma.storeCredit.create({
        data: {
          userId,
          currentBalance: 0,
          totalEarned: 0,
          totalSpent: 0,
        },
      });
    }

    return {
      userId,
      balance: storeCredit.currentBalance,
      currency: storeCredit.currency,
      totalEarned: storeCredit.totalEarned,
      totalSpent: storeCredit.totalSpent,
    };
  }

  /**
   * Get transaction history
   */
  async getTransactions(
    userId: string,
    limit: number = 20,
    offset: number = 0,
  ): Promise<{ transactions: WalletTransaction[]; total: number }> {
    const storeCredit = await this.prisma.storeCredit.findUnique({
      where: { userId },
    });

    if (!storeCredit) {
      return { transactions: [], total: 0 };
    }

    const [transactions, total] = await Promise.all([
      this.prisma.storeCreditTransaction.findMany({
        where: { storeCreditId: storeCredit.id },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      this.prisma.storeCreditTransaction.count({
        where: { storeCreditId: storeCredit.id },
      }),
    ]);

    return {
      transactions: transactions.map(t => ({
        id: t.id,
        amount: t.amount,
        type: t.amount >= 0 ? 'CREDIT' : 'DEBIT',
        source: t.type,
        description: t.description,
        balanceBefore: t.balanceBefore,
        balanceAfter: t.balanceAfter,
        createdAt: t.createdAt,
      })),
      total,
    };
  }

  /**
   * Top up wallet with payment
   */
  async topup(
    userId: string,
    request: WalletTopupRequest,
  ): Promise<{
    success: boolean;
    checkoutUrl?: string;
    clientSecret?: string;
    transactionId?: string;
    error?: string;
  }> {
    try {
      // Get user
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
      });

      if (!user) {
        throw new NotFoundException('User not found');
      }

      // Create payment request
      const paymentRequest: CreatePaymentRequest = {
        amount: request.amount,
        currency: request.currency || 'USD',
        customer: {
          id: userId,
          email: user.email,
          name: user.name,
        },
        metadata: {
          type: 'wallet_topup',
          userId,
          creditAmount: request.amount,
        },
        returnUrl: request.returnUrl,
        cancelUrl: request.cancelUrl,
        description: `Wallet top-up: ${request.amount} credits`,
      };

      // Create payment with specified or default provider
      const provider = request.provider || PaymentProviderType.STRIPE;
      const result = await this.paymentOrchestrator.createPayment(provider, paymentRequest);

      if (!result.success) {
        return {
          success: false,
          error: result.error?.message || 'Payment creation failed',
        };
      }

      return {
        success: true,
        checkoutUrl: result.checkoutUrl,
        clientSecret: result.clientSecret,
        transactionId: result.transactionId,
      };
    } catch (error: any) {
      this.logger.error(`Wallet topup error: ${error.message}`);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Add credits to wallet (after successful payment)
   */
  async addCredits(
    userId: string,
    amount: number,
    source: string,
    description: string,
    metadata?: Record<string, any>,
  ): Promise<WalletBalance> {
    if (amount <= 0) {
      throw new BadRequestException('Amount must be positive');
    }

    // Get or create wallet
    let storeCredit = await this.prisma.storeCredit.findUnique({
      where: { userId },
    });

    if (!storeCredit) {
      storeCredit = await this.prisma.storeCredit.create({
        data: {
          userId,
          currentBalance: 0,
          totalEarned: 0,
          totalSpent: 0,
        },
      });
    }

    const balanceBefore = storeCredit.currentBalance;
    const balanceAfter = balanceBefore + amount;

    // Create transaction
    await this.prisma.storeCreditTransaction.create({
      data: {
        storeCreditId: storeCredit.id,
        type: source as any,
        transactionType: 'PURCHASE',
        amount,
        balanceBefore,
        balanceAfter,
        description,
        notes: metadata ? JSON.stringify(metadata) : undefined,
      },
    });

    // Update balance
    await this.prisma.storeCredit.update({
      where: { id: storeCredit.id },
      data: {
        currentBalance: balanceAfter,
        totalEarned: { increment: amount },
      },
    });

    return {
      userId,
      balance: balanceAfter,
      currency: storeCredit.currency,
      totalEarned: storeCredit.totalEarned + amount,
      totalSpent: storeCredit.totalSpent,
    };
  }

  /**
   * Spend credits from wallet
   */
  async spendCredits(
    userId: string,
    amount: number,
    source: string,
    description: string,
    metadata?: Record<string, any>,
  ): Promise<WalletBalance> {
    if (amount <= 0) {
      throw new BadRequestException('Amount must be positive');
    }

    const storeCredit = await this.prisma.storeCredit.findUnique({
      where: { userId },
    });

    if (!storeCredit) {
      throw new BadRequestException('Wallet not found');
    }

    if (storeCredit.currentBalance < amount) {
      throw new BadRequestException('Insufficient balance');
    }

    const balanceBefore = storeCredit.currentBalance;
    const balanceAfter = balanceBefore - amount;

    // Create transaction
    await this.prisma.storeCreditTransaction.create({
      data: {
        storeCreditId: storeCredit.id,
        type: source as any,
        transactionType: 'REDEMPTION',
        amount: -amount,
        balanceBefore,
        balanceAfter,
        description,
        notes: metadata ? JSON.stringify(metadata) : undefined,
      },
    });

    // Update balance
    await this.prisma.storeCredit.update({
      where: { id: storeCredit.id },
      data: {
        currentBalance: balanceAfter,
        totalSpent: { increment: amount },
      },
    });

    return {
      userId,
      balance: balanceAfter,
      currency: storeCredit.currency,
      totalEarned: storeCredit.totalEarned,
      totalSpent: storeCredit.totalSpent + amount,
    };
  }

  /**
   * Transfer credits between users
   */
  async transferCredits(
    fromUserId: string,
    toUserId: string,
    amount: number,
    description?: string,
  ): Promise<{ success: boolean; error?: string }> {
    if (fromUserId === toUserId) {
      return { success: false, error: 'Cannot transfer to yourself' };
    }

    try {
      // Use transaction for atomicity
      await this.prisma.$transaction(async (tx) => {
        // Debit from sender
        const sender = await tx.storeCredit.findUnique({
          where: { userId: fromUserId },
        });

        if (!sender || sender.currentBalance < amount) {
          throw new Error('Insufficient balance');
        }

        await tx.storeCredit.update({
          where: { userId: fromUserId },
          data: {
            currentBalance: { decrement: amount },
            totalSpent: { increment: amount },
          },
        });

        await tx.storeCreditTransaction.create({
          data: {
            storeCreditId: sender.id,
            type: 'GIFT',
            transactionType: 'REDEMPTION',
            amount: -amount,
            balanceBefore: sender.currentBalance,
            balanceAfter: sender.currentBalance - amount,
            description: description || `Transfer to user ${toUserId}`,
          },
        });

        // Credit to receiver
        let receiver = await tx.storeCredit.findUnique({
          where: { userId: toUserId },
        });

        if (!receiver) {
          receiver = await tx.storeCredit.create({
            data: {
              userId: toUserId,
              currentBalance: 0,
              totalEarned: 0,
              totalSpent: 0,
            },
          });
        }

        await tx.storeCredit.update({
          where: { userId: toUserId },
          data: {
            currentBalance: { increment: amount },
            totalEarned: { increment: amount },
          },
        });

        await tx.storeCreditTransaction.create({
          data: {
            storeCreditId: receiver.id,
            type: 'GIFT',
            transactionType: 'PURCHASE',
            amount,
            balanceBefore: receiver.currentBalance,
            balanceAfter: receiver.currentBalance + amount,
            description: description || `Transfer from user ${fromUserId}`,
          },
        });
      });

      return { success: true };
    } catch (error: any) {
      this.logger.error(`Transfer error: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  /**
   * Check if user has sufficient balance
   */
  async hasBalance(userId: string, amount: number): Promise<boolean> {
    const storeCredit = await this.prisma.storeCredit.findUnique({
      where: { userId },
    });

    return (storeCredit?.currentBalance || 0) >= amount;
  }

  /**
   * Get predefined credit packages
   */
  getCreditPackages(): Array<{
    id: string;
    name: string;
    credits: number;
    price: number;
    currency: string;
    bonus?: number;
    popular?: boolean;
  }> {
    return [
      {
        id: 'credits_100',
        name: '100 Credits',
        credits: 100,
        price: 0.99,
        currency: 'USD',
      },
      {
        id: 'credits_500',
        name: '500 Credits',
        credits: 500,
        price: 4.99,
        currency: 'USD',
        bonus: 50,
      },
      {
        id: 'credits_1200',
        name: '1200 Credits',
        credits: 1200,
        price: 9.99,
        currency: 'USD',
        bonus: 200,
        popular: true,
      },
      {
        id: 'credits_3000',
        name: '3000 Credits',
        credits: 3000,
        price: 19.99,
        currency: 'USD',
        bonus: 600,
      },
      {
        id: 'credits_6500',
        name: '6500 Credits',
        credits: 6500,
        price: 39.99,
        currency: 'USD',
        bonus: 1500,
      },
    ];
  }

  /**
   * Purchase a credit package
   */
  async purchasePackage(
    userId: string,
    packageId: string,
    provider?: PaymentProviderType,
    returnUrl?: string,
    cancelUrl?: string,
  ): Promise<{
    success: boolean;
    checkoutUrl?: string;
    clientSecret?: string;
    transactionId?: string;
    error?: string;
  }> {
    const packages = this.getCreditPackages();
    const creditPackage = packages.find(p => p.id === packageId);

    if (!creditPackage) {
      return { success: false, error: 'Package not found' };
    }

    return this.topup(userId, {
      amount: creditPackage.price,
      currency: creditPackage.currency,
      provider,
      returnUrl,
      cancelUrl,
    });
  }

  /**
   * Process successful wallet payment (called from webhook)
   */
  async processWalletPayment(
    userId: string,
    transactionId: string,
    amount: number,
    creditAmount?: number,
  ): Promise<void> {
    // Determine credits based on amount if not specified
    const credits = creditAmount || this.getCreditAmountForPrice(amount);

    await this.addCredits(
      userId,
      credits,
      'PROMOTIONAL', // Using existing enum value
      `Wallet top-up: ${credits} credits`,
      {
        paymentTransactionId: transactionId,
        paidAmount: amount,
      },
    );
  }

  private getCreditAmountForPrice(price: number): number {
    const packages = this.getCreditPackages();
    const pkg = packages.find(p => Math.abs(p.price - price) < 0.01);

    if (pkg) {
      return pkg.credits + (pkg.bonus || 0);
    }

    // Default ratio: 100 credits per dollar
    return Math.floor(price * 100);
  }
}
