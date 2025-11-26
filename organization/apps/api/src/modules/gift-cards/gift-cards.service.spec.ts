import { Test, TestingModule } from '@nestjs/testing';
import { GiftCardsService } from './gift-cards.service';
import { PrismaService } from '@/common/prisma/prisma.service';
import { EmailService } from '../email/email.service';
import {
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import {
  GiftCardStatus,
  GiftCardType,
  StoreCreditType,
  TransactionType,
} from '@prisma/client';

describe('GiftCardsService', () => {
  let service: GiftCardsService;
  let prismaService: PrismaService;
  let emailService: EmailService;

  const mockPrismaService = {
    giftCard: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
      aggregate: jest.fn(),
    },
    giftCardTransaction: {
      create: jest.fn(),
    },
    storeCredit: {
      create: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    storeCreditTransaction: {
      create: jest.fn(),
      findMany: jest.fn(),
    },
  };

  const mockEmailService = {
    sendEmail: jest.fn().mockResolvedValue(undefined),
  };

  const mockGiftCard = {
    id: 'gc-123',
    code: '1234-5678-9ABC-DEF0',
    type: GiftCardType.DIGITAL,
    initialAmount: 100.0,
    currentBalance: 100.0,
    status: GiftCardStatus.ACTIVE,
    purchasedBy: 'user-123',
    recipientEmail: 'recipient@example.com',
    recipientName: 'John Doe',
    senderName: 'Jane Smith',
    personalMessage: 'Happy Birthday!',
    designTemplate: 'birthday',
    isScheduled: false,
    scheduledDelivery: null,
    deliveredAt: null,
    expirationDate: new Date('2026-12-31'),
    minimumPurchase: null,
    allowedCategories: [],
    excludedProducts: [],
    redeemedBy: null,
    redeemedAt: null,
    lastUsedAt: null,
    usageCount: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
    purchaser: {
      id: 'user-123',
      name: 'Jane Smith',
      email: 'jane@example.com',
    },
  };

  const mockStoreCredit = {
    id: 'sc-123',
    userId: 'user-123',
    currentBalance: 50.0,
    totalEarned: 100.0,
    totalSpent: 50.0,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GiftCardsService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: EmailService,
          useValue: mockEmailService,
        },
      ],
    }).compile();

    service = module.get<GiftCardsService>(GiftCardsService);
    prismaService = module.get<PrismaService>(PrismaService);
    emailService = module.get<EmailService>(EmailService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // ==================== GIFT CARD PURCHASE ====================

  describe('purchaseGiftCard', () => {
    it('should purchase a gift card and send email immediately', async () => {
      const dto = {
        amount: 100,
        recipientEmail: 'recipient@example.com',
        recipientName: 'John Doe',
        senderName: 'Jane Smith',
        personalMessage: 'Happy Birthday!',
        designTemplate: 'birthday',
      };

      mockPrismaService.giftCard.findUnique
        .mockResolvedValueOnce(null) // First call: check if code exists
        .mockResolvedValueOnce(mockGiftCard); // Second call: sendGiftCardEmail
      mockPrismaService.giftCard.create.mockResolvedValue(mockGiftCard);
      mockPrismaService.giftCardTransaction.create.mockResolvedValue({});
      mockPrismaService.giftCard.update.mockResolvedValue(mockGiftCard);

      const result = await service.purchaseGiftCard(dto, 'user-123');

      expect(result).toEqual(mockGiftCard);
      expect(mockPrismaService.giftCard.create).toHaveBeenCalled();
      expect(mockPrismaService.giftCardTransaction.create).toHaveBeenCalled();
      expect(mockEmailService.sendEmail).toHaveBeenCalled();
    });

    it('should schedule gift card delivery for future date', async () => {
      const dto = {
        amount: 100,
        recipientEmail: 'recipient@example.com',
        isScheduled: true,
        scheduledDelivery: new Date('2026-12-25').toISOString(),
      };

      const scheduledCard = {
        ...mockGiftCard,
        isScheduled: true,
        scheduledDelivery: new Date('2026-12-25'),
      };

      mockPrismaService.giftCard.findUnique.mockResolvedValue(null);
      mockPrismaService.giftCard.create.mockResolvedValue(scheduledCard);
      mockPrismaService.giftCardTransaction.create.mockResolvedValue({});

      const result = await service.purchaseGiftCard(dto, 'user-123');

      expect(result.isScheduled).toBe(true);
      expect(mockEmailService.sendEmail).not.toHaveBeenCalled();
    });
  });

  describe('createPromotionalGiftCard', () => {
    it('should create promotional gift card with restrictions', async () => {
      const dto = {
        amount: 50,
        recipientEmail: 'customer@example.com',
        minimumPurchase: 100,
        allowedCategories: ['cat-1', 'cat-2'],
        excludedProducts: ['prod-1'],
      };

      const promoCard = {
        ...mockGiftCard,
        type: GiftCardType.PROMOTIONAL,
        minimumPurchase: 100,
        allowedCategories: ['cat-1', 'cat-2'],
        excludedProducts: ['prod-1'],
      };

      mockPrismaService.giftCard.findUnique.mockResolvedValue(null);
      mockPrismaService.giftCard.create.mockResolvedValue(promoCard);
      mockPrismaService.giftCardTransaction.create.mockResolvedValue({});

      const result = await service.createPromotionalGiftCard(dto);

      expect(result.type).toBe(GiftCardType.PROMOTIONAL);
      expect(result.minimumPurchase).toBe(100);
      expect(result.allowedCategories).toEqual(['cat-1', 'cat-2']);
    });
  });

  // ==================== GIFT CARD BALANCE ====================

  describe('checkBalance', () => {
    it('should return gift card balance and recent transactions', async () => {
      const transactions = [
        {
          id: 'txn-1',
          type: TransactionType.PURCHASE,
          amount: 100,
          balanceBefore: 0,
          balanceAfter: 100,
          createdAt: new Date(),
        },
      ];

      mockPrismaService.giftCard.findUnique.mockResolvedValue({
        ...mockGiftCard,
        transactions,
      });

      const result = await service.checkBalance({ code: '1234-5678-9ABC-DEF0' });

      expect(result.code).toBe('1234-5678-9ABC-DEF0');
      expect(result.currentBalance).toBe(100);
      expect(result.recentTransactions).toHaveLength(1);
    });

    it('should throw NotFoundException when gift card not found', async () => {
      mockPrismaService.giftCard.findUnique.mockResolvedValue(null);

      await expect(
        service.checkBalance({ code: 'INVALID-CODE' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when gift card is expired', async () => {
      const expiredCard = {
        ...mockGiftCard,
        expirationDate: new Date('2020-01-01'),
        transactions: [],
      };

      mockPrismaService.giftCard.findUnique.mockResolvedValue(expiredCard);
      mockPrismaService.giftCard.update.mockResolvedValue({
        ...expiredCard,
        status: GiftCardStatus.EXPIRED,
      });
      mockPrismaService.giftCardTransaction.create.mockResolvedValue({});

      await expect(
        service.checkBalance({ code: '1234-5678-9ABC-DEF0' }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ==================== GIFT CARD REDEMPTION ====================

  describe('redeemGiftCard', () => {
    it('should redeem gift card and update balance', async () => {
      mockPrismaService.giftCard.findUnique.mockResolvedValue(mockGiftCard);
      mockPrismaService.giftCard.update.mockResolvedValue({
        ...mockGiftCard,
        currentBalance: 50,
        usageCount: 1,
        lastUsedAt: new Date(),
      });
      mockPrismaService.giftCardTransaction.create.mockResolvedValue({});

      const result = await service.redeemGiftCard(
        { code: '1234-5678-9ABC-DEF0', amount: 50 },
        'user-456',
        100,
      );

      expect(result.redemptionAmount).toBe(50);
      expect(result.remainingBalance).toBe(50);
      expect(mockPrismaService.giftCard.update).toHaveBeenCalled();
      expect(mockPrismaService.giftCardTransaction.create).toHaveBeenCalled();
    });

    it('should mark gift card as redeemed when fully used', async () => {
      mockPrismaService.giftCard.findUnique.mockResolvedValue(mockGiftCard);
      mockPrismaService.giftCard.update.mockResolvedValue({
        ...mockGiftCard,
        currentBalance: 0,
        status: GiftCardStatus.REDEEMED,
        usageCount: 1,
      });
      mockPrismaService.giftCardTransaction.create.mockResolvedValue({});

      const result = await service.redeemGiftCard(
        { code: '1234-5678-9ABC-DEF0', amount: 100 },
        'user-456',
        100,
      );

      expect(result.redemptionAmount).toBe(100);
      expect(result.remainingBalance).toBe(0);
      expect(result.giftCard.status).toBe(GiftCardStatus.REDEEMED);
    });

    it('should throw BadRequestException when gift card is not active', async () => {
      const cancelledCard = {
        ...mockGiftCard,
        status: GiftCardStatus.CANCELLED,
      };

      mockPrismaService.giftCard.findUnique.mockResolvedValue(cancelledCard);

      await expect(
        service.redeemGiftCard(
          { code: '1234-5678-9ABC-DEF0', amount: 50 },
          'user-456',
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when order total below minimum purchase', async () => {
      const restrictedCard = {
        ...mockGiftCard,
        minimumPurchase: 100,
      };

      mockPrismaService.giftCard.findUnique.mockResolvedValue(restrictedCard);

      await expect(
        service.redeemGiftCard(
          { code: '1234-5678-9ABC-DEF0', amount: 50 },
          'user-456',
          50, // Order total below minimum
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when gift card has no balance', async () => {
      const emptyCard = {
        ...mockGiftCard,
        currentBalance: 0,
      };

      mockPrismaService.giftCard.findUnique.mockResolvedValue(emptyCard);

      await expect(
        service.redeemGiftCard(
          { code: '1234-5678-9ABC-DEF0', amount: 10 },
          'user-456',
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ==================== GIFT CARD RETRIEVAL ====================

  describe('getUserPurchasedGiftCards', () => {
    it('should return user purchased gift cards with pagination', async () => {
      const giftCards = [mockGiftCard];

      mockPrismaService.giftCard.findMany.mockResolvedValue(giftCards);
      mockPrismaService.giftCard.count.mockResolvedValue(1);

      const result = await service.getUserPurchasedGiftCards('user-123', {
        page: 1,
        limit: 20,
      });

      expect(result.giftCards).toHaveLength(1);
      expect(result.pagination.total).toBe(1);
      expect(result.pagination.totalPages).toBe(1);
    });

    it('should filter by status and type', async () => {
      mockPrismaService.giftCard.findMany.mockResolvedValue([]);
      mockPrismaService.giftCard.count.mockResolvedValue(0);

      await service.getUserPurchasedGiftCards('user-123', {
        status: GiftCardStatus.ACTIVE,
        type: GiftCardType.DIGITAL,
        page: 1,
        limit: 20,
      });

      expect(mockPrismaService.giftCard.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: GiftCardStatus.ACTIVE,
            type: GiftCardType.DIGITAL,
          }),
        }),
      );
    });
  });

  describe('cancelGiftCard', () => {
    it('should cancel gift card and create transaction', async () => {
      mockPrismaService.giftCard.findUnique.mockResolvedValue(mockGiftCard);
      mockPrismaService.giftCard.update.mockResolvedValue({
        ...mockGiftCard,
        status: GiftCardStatus.CANCELLED,
      });
      mockPrismaService.giftCardTransaction.create.mockResolvedValue({});

      const result = await service.cancelGiftCard('gc-123', 'Customer request');

      expect(result.status).toBe(GiftCardStatus.CANCELLED);
      expect(mockPrismaService.giftCardTransaction.create).toHaveBeenCalled();
    });

    it('should throw BadRequestException when cancelling redeemed gift card', async () => {
      const redeemedCard = {
        ...mockGiftCard,
        status: GiftCardStatus.REDEEMED,
      };

      mockPrismaService.giftCard.findUnique.mockResolvedValue(redeemedCard);

      await expect(
        service.cancelGiftCard('gc-123', 'Test'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('convertToStoreCredit', () => {
    it('should convert gift card to store credit', async () => {
      mockPrismaService.giftCard.findUnique.mockResolvedValue(mockGiftCard);
      mockPrismaService.storeCredit.findUnique.mockResolvedValue(mockStoreCredit);
      mockPrismaService.storeCredit.update.mockResolvedValue({
        ...mockStoreCredit,
        currentBalance: 150,
      });
      mockPrismaService.storeCreditTransaction.create.mockResolvedValue({});
      mockPrismaService.giftCard.update.mockResolvedValue({
        ...mockGiftCard,
        currentBalance: 0,
        status: GiftCardStatus.REDEEMED,
      });
      mockPrismaService.giftCardTransaction.create.mockResolvedValue({});

      const result = await service.convertToStoreCredit(
        { giftCardCode: '1234-5678-9ABC-DEF0' },
        'user-123',
      );

      expect(result.amount).toBe(100);
      expect(mockPrismaService.storeCredit.update).toHaveBeenCalled();
      expect(mockPrismaService.giftCard.update).toHaveBeenCalled();
    });

    it('should throw BadRequestException when gift card has no balance', async () => {
      const emptyCard = {
        ...mockGiftCard,
        currentBalance: 0,
      };

      mockPrismaService.giftCard.findUnique.mockResolvedValue(emptyCard);

      await expect(
        service.convertToStoreCredit(
          { giftCardCode: '1234-5678-9ABC-DEF0' },
          'user-123',
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ==================== STORE CREDIT ====================

  describe('getStoreCredit', () => {
    it('should return existing store credit account', async () => {
      mockPrismaService.storeCredit.findUnique.mockResolvedValue({
        ...mockStoreCredit,
        transactions: [],
      });

      const result = await service.getStoreCredit('user-123');

      expect(result).toBeDefined();
      expect(result.userId).toBe('user-123');
    });

    it('should create new store credit account if not exists', async () => {
      mockPrismaService.storeCredit.findUnique.mockResolvedValue(null);
      mockPrismaService.storeCredit.create.mockResolvedValue({
        ...mockStoreCredit,
        transactions: [],
      });

      const result = await service.getStoreCredit('user-456');

      expect(mockPrismaService.storeCredit.create).toHaveBeenCalled();
      expect(result).toBeDefined();
    });
  });

  describe('addStoreCredit', () => {
    it('should add store credit and create transaction', async () => {
      mockPrismaService.storeCredit.findUnique.mockResolvedValue(mockStoreCredit);
      mockPrismaService.storeCredit.update.mockResolvedValue({
        ...mockStoreCredit,
        currentBalance: 100,
        totalEarned: 150,
      });
      mockPrismaService.storeCreditTransaction.create.mockResolvedValue({});

      const result = await service.addStoreCredit({
        userId: 'user-123',
        amount: 50,
        type: StoreCreditType.REFUND,
        description: 'Refund for order',
      });

      expect(result.currentBalance).toBe(100);
      expect(result.totalEarned).toBe(150);
      expect(mockPrismaService.storeCreditTransaction.create).toHaveBeenCalled();
    });
  });

  describe('deductStoreCredit', () => {
    it('should deduct store credit and create transaction', async () => {
      mockPrismaService.storeCredit.findUnique.mockResolvedValue(mockStoreCredit);
      mockPrismaService.storeCredit.update.mockResolvedValue({
        ...mockStoreCredit,
        currentBalance: 25,
        totalSpent: 75,
      });
      mockPrismaService.storeCreditTransaction.create.mockResolvedValue({});

      const result = await service.deductStoreCredit({
        userId: 'user-123',
        amount: 25,
        orderId: 'order-123',
      });

      expect(result.deductedAmount).toBe(25);
      expect(result.remainingBalance).toBe(25);
      expect(mockPrismaService.storeCreditTransaction.create).toHaveBeenCalled();
    });

    it('should throw NotFoundException when store credit not found', async () => {
      mockPrismaService.storeCredit.findUnique.mockResolvedValue(null);

      await expect(
        service.deductStoreCredit({
          userId: 'user-999',
          amount: 10,
          orderId: 'order-123',
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when insufficient balance', async () => {
      mockPrismaService.storeCredit.findUnique.mockResolvedValue(mockStoreCredit);

      await expect(
        service.deductStoreCredit({
          userId: 'user-123',
          amount: 100, // More than available balance
          orderId: 'order-123',
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('adjustStoreCredit', () => {
    it('should adjust store credit with positive amount', async () => {
      mockPrismaService.storeCredit.findUnique.mockResolvedValue(mockStoreCredit);
      mockPrismaService.storeCredit.update.mockResolvedValue({
        ...mockStoreCredit,
        currentBalance: 70,
        totalEarned: 120,
      });
      mockPrismaService.storeCreditTransaction.create.mockResolvedValue({});

      const result = await service.adjustStoreCredit('user-123', {
        amount: 20,
        reason: 'Compensation',
      });

      expect(result.currentBalance).toBe(70);
      expect(mockPrismaService.storeCreditTransaction.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            amount: 20,
            type: StoreCreditType.COMPENSATION,
          }),
        }),
      );
    });

    it('should throw BadRequestException when adjustment results in negative balance', async () => {
      mockPrismaService.storeCredit.findUnique.mockResolvedValue(mockStoreCredit);

      await expect(
        service.adjustStoreCredit('user-123', {
          amount: -100, // Would result in negative balance
          reason: 'Error correction',
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('getStoreCreditHistory', () => {
    it('should return store credit transaction history', async () => {
      const transactions = [
        {
          id: 'txn-1',
          type: StoreCreditType.REFUND,
          amount: 50,
          createdAt: new Date(),
        },
      ];

      mockPrismaService.storeCredit.findUnique.mockResolvedValue(mockStoreCredit);
      mockPrismaService.storeCreditTransaction.findMany.mockResolvedValue(
        transactions,
      );

      const result = await service.getStoreCreditHistory('user-123', {
        limit: 20,
      });

      expect(result.transactions).toHaveLength(1);
      expect(result.storeCredit).toBeDefined();
    });

    it('should return empty when no store credit account', async () => {
      mockPrismaService.storeCredit.findUnique.mockResolvedValue(null);

      const result = await service.getStoreCreditHistory('user-999', {
        limit: 20,
      });

      expect(result.transactions).toEqual([]);
      expect(result.storeCredit).toBeNull();
    });
  });

  // ==================== BACKGROUND JOBS ====================

  describe('processScheduledDeliveries', () => {
    it('should process scheduled gift card deliveries', async () => {
      const scheduledCards = [
        {
          id: 'gc-1',
          code: 'CODE-1',
          recipientEmail: 'user1@example.com',
          scheduledDelivery: new Date('2025-12-01'),
          ...mockGiftCard,
        },
      ];

      mockPrismaService.giftCard.findMany.mockResolvedValue(scheduledCards);
      mockPrismaService.giftCard.findUnique.mockResolvedValue(scheduledCards[0]);
      mockPrismaService.giftCard.update.mockResolvedValue(scheduledCards[0]);

      const result = await service.processScheduledDeliveries();

      expect(result.count).toBe(1);
      expect(mockEmailService.sendEmail).toHaveBeenCalled();
    });
  });

  describe('expireOldGiftCards', () => {
    it('should expire old gift cards', async () => {
      const expiredCards = [
        {
          ...mockGiftCard,
          expirationDate: new Date('2020-01-01'),
        },
      ];

      mockPrismaService.giftCard.findMany.mockResolvedValue(expiredCards);
      mockPrismaService.giftCard.update.mockResolvedValue({
        ...expiredCards[0],
        status: GiftCardStatus.EXPIRED,
      });
      mockPrismaService.giftCardTransaction.create.mockResolvedValue({});

      const result = await service.expireOldGiftCards();

      expect(result.count).toBe(1);
      expect(mockPrismaService.giftCard.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: GiftCardStatus.EXPIRED,
          }),
        }),
      );
    });
  });

  describe('getGiftCardStatistics', () => {
    it('should return comprehensive gift card statistics', async () => {
      mockPrismaService.giftCard.count.mockResolvedValueOnce(100); // total
      mockPrismaService.giftCard.count.mockResolvedValueOnce(50); // active
      mockPrismaService.giftCard.count.mockResolvedValueOnce(30); // redeemed
      mockPrismaService.giftCard.count.mockResolvedValueOnce(20); // expired
      mockPrismaService.giftCard.aggregate.mockResolvedValueOnce({
        _sum: { initialAmount: 10000 },
      }); // totalValue
      mockPrismaService.giftCard.aggregate.mockResolvedValueOnce({
        _sum: { initialAmount: 3000 },
      }); // redeemedValue
      mockPrismaService.giftCard.aggregate.mockResolvedValueOnce({
        _sum: { currentBalance: 5000 },
      }); // outstanding

      const result = await service.getGiftCardStatistics();

      expect(result.total).toBe(100);
      expect(result.byStatus.active).toBe(50);
      expect(result.byStatus.redeemed).toBe(30);
      expect(result.value.totalSold).toBe(10000);
      expect(result.value.outstandingBalance).toBe(5000);
      expect(result.value.breakage).toBe(2000); // 10000 - 3000 - 5000
    });
  });
});
