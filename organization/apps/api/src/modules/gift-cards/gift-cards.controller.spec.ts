import { Test, TestingModule } from '@nestjs/testing';
import { GiftCardsController } from './gift-cards.controller';
import { GiftCardsService } from './gift-cards.service';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { RolesGuard } from '@/common/guards/roles.guard';

describe('GiftCardsController', () => {
  let controller: GiftCardsController;
  let service: GiftCardsService;

  const mockGiftCardsService = {
    checkBalance: jest.fn(),
    purchaseGiftCard: jest.fn(),
    redeemGiftCard: jest.fn(),
    getUserPurchasedGiftCards: jest.fn(),
    getUserRedeemedGiftCards: jest.fn(),
    getGiftCardById: jest.fn(),
    convertToStoreCredit: jest.fn(),
    getStoreCredit: jest.fn(),
    getStoreCreditHistory: jest.fn(),
    deductStoreCredit: jest.fn(),
    createPromotionalGiftCard: jest.fn(),
    updateGiftCard: jest.fn(),
    cancelGiftCard: jest.fn(),
    sendGiftCardEmail: jest.fn(),
    addStoreCredit: jest.fn(),
    adjustStoreCredit: jest.fn(),
    getGiftCardStatistics: jest.fn(),
    processScheduledDeliveries: jest.fn(),
    expireOldGiftCards: jest.fn(),
  };

  const mockUser = {
    userId: 'user-123',
    email: 'test@example.com',
    role: 'CUSTOMER',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [GiftCardsController],
      providers: [
        {
          provide: GiftCardsService,
          useValue: mockGiftCardsService,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({
        canActivate: (context) => {
          const request = context.switchToHttp().getRequest();
          request.user = mockUser;
          return true;
        },
      })
      .overrideGuard(RolesGuard)
      .useValue({
        canActivate: () => true,
      })
      .compile();

    controller = module.get<GiftCardsController>(GiftCardsController);
    service = module.get<GiftCardsService>(GiftCardsService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('checkBalance', () => {
    it('should check gift card balance', async () => {
      const dto = { code: 'GIFT123' };
      mockGiftCardsService.checkBalance.mockResolvedValue({ balance: 50, isValid: true });

      const result = await controller.checkBalance(dto);

      expect(result).toEqual({ balance: 50, isValid: true });
      expect(mockGiftCardsService.checkBalance).toHaveBeenCalledWith(dto);
    });
  });

  describe('purchaseGiftCard', () => {
    it('should purchase a gift card', async () => {
      const dto = { amount: 100, recipientEmail: 'recipient@example.com' };
      const mockRequest = { user: mockUser };
      mockGiftCardsService.purchaseGiftCard.mockResolvedValue({ id: 'gift-1', code: 'GIFT123' });

      const result = await controller.purchaseGiftCard(dto, mockRequest as any);

      expect(result).toEqual({ id: 'gift-1', code: 'GIFT123' });
      expect(mockGiftCardsService.purchaseGiftCard).toHaveBeenCalledWith(dto, 'user-123');
    });
  });

  describe('redeemGiftCard', () => {
    it('should redeem a gift card', async () => {
      const dto = { code: 'GIFT123' };
      const mockRequest = { user: mockUser };
      mockGiftCardsService.redeemGiftCard.mockResolvedValue({ success: true, creditAdded: 50 });

      const result = await controller.redeemGiftCard(dto, mockRequest as any);

      expect(result).toEqual({ success: true, creditAdded: 50 });
      expect(mockGiftCardsService.redeemGiftCard).toHaveBeenCalledWith(dto, 'user-123');
    });
  });

  describe('getMyPurchasedGiftCards', () => {
    it('should return user purchased gift cards', async () => {
      const mockRequest = { user: mockUser };
      const query = { page: 1, limit: 10 };
      mockGiftCardsService.getUserPurchasedGiftCards.mockResolvedValue([]);

      const result = await controller.getMyPurchasedGiftCards(mockRequest as any, query);

      expect(result).toEqual([]);
      expect(mockGiftCardsService.getUserPurchasedGiftCards).toHaveBeenCalledWith('user-123', query);
    });
  });

  describe('getMyRedeemedGiftCards', () => {
    it('should return user redeemed gift cards', async () => {
      const mockRequest = { user: mockUser };
      const query = { page: 1, limit: 10 };
      mockGiftCardsService.getUserRedeemedGiftCards.mockResolvedValue([]);

      const result = await controller.getMyRedeemedGiftCards(mockRequest as any, query);

      expect(result).toEqual([]);
      expect(mockGiftCardsService.getUserRedeemedGiftCards).toHaveBeenCalledWith('user-123', query);
    });
  });

  describe('getGiftCardById', () => {
    it('should return gift card by id', async () => {
      mockGiftCardsService.getGiftCardById.mockResolvedValue({ id: 'gift-1', balance: 50 });

      const result = await controller.getGiftCardById('gift-1');

      expect(result).toEqual({ id: 'gift-1', balance: 50 });
      expect(mockGiftCardsService.getGiftCardById).toHaveBeenCalledWith('gift-1');
    });
  });

  describe('convertToStoreCredit', () => {
    it('should convert gift card to store credit', async () => {
      const dto = { giftCardCode: 'GIFT123' };
      const mockRequest = { user: mockUser };
      mockGiftCardsService.convertToStoreCredit.mockResolvedValue({ success: true, amount: 50 });

      const result = await controller.convertToStoreCredit(dto, mockRequest as any);

      expect(result).toEqual({ success: true, amount: 50 });
      expect(mockGiftCardsService.convertToStoreCredit).toHaveBeenCalledWith(dto, 'user-123');
    });
  });

  describe('getMyStoreCredit', () => {
    it('should return user store credit balance', async () => {
      const mockRequest = { user: mockUser };
      mockGiftCardsService.getStoreCredit.mockResolvedValue({ balance: 25.50 });

      const result = await controller.getMyStoreCredit(mockRequest as any);

      expect(result).toEqual({ balance: 25.50 });
      expect(mockGiftCardsService.getStoreCredit).toHaveBeenCalledWith('user-123');
    });
  });

  describe('getStoreCreditHistory', () => {
    it('should return store credit history', async () => {
      const mockRequest = { user: mockUser };
      const query = { page: 1, limit: 20 };
      mockGiftCardsService.getStoreCreditHistory.mockResolvedValue([]);

      const result = await controller.getStoreCreditHistory(mockRequest as any, query);

      expect(result).toEqual([]);
      expect(mockGiftCardsService.getStoreCreditHistory).toHaveBeenCalledWith('user-123', query);
    });
  });

  describe('deductStoreCredit', () => {
    it('should deduct store credit', async () => {
      const dto = { userId: 'user-123', amount: 10, orderId: 'order-1' };
      const mockRequest = { user: mockUser };
      mockGiftCardsService.deductStoreCredit.mockResolvedValue({ success: true });

      const result = await controller.deductStoreCredit(dto, mockRequest as any);

      expect(result).toEqual({ success: true });
      expect(mockGiftCardsService.deductStoreCredit).toHaveBeenCalledWith(dto);
    });

    it('should enforce user can only deduct from own account', async () => {
      const dto = { userId: 'other-user', amount: 10, orderId: 'order-1' };
      const mockRequest = { user: mockUser };
      mockGiftCardsService.deductStoreCredit.mockResolvedValue({ success: true });

      await controller.deductStoreCredit(dto, mockRequest as any);

      expect(mockGiftCardsService.deductStoreCredit).toHaveBeenCalledWith({
        ...dto,
        userId: 'user-123',
      });
    });
  });

  describe('createPromotionalGiftCard (Admin)', () => {
    it('should create promotional gift card', async () => {
      const dto = { amount: 100, quantity: 10, expiryDays: 30 };
      mockGiftCardsService.createPromotionalGiftCard.mockResolvedValue({ created: 10 });

      const result = await controller.createPromotionalGiftCard(dto);

      expect(result).toEqual({ created: 10 });
      expect(mockGiftCardsService.createPromotionalGiftCard).toHaveBeenCalledWith(dto);
    });
  });

  describe('updateGiftCard (Admin)', () => {
    it('should update gift card', async () => {
      const dto = { status: 'CANCELLED' };
      mockGiftCardsService.updateGiftCard.mockResolvedValue({ id: 'gift-1', status: 'CANCELLED' });

      const result = await controller.updateGiftCard('gift-1', dto);

      expect(result).toEqual({ id: 'gift-1', status: 'CANCELLED' });
      expect(mockGiftCardsService.updateGiftCard).toHaveBeenCalledWith('gift-1', dto);
    });
  });

  describe('cancelGiftCard (Admin)', () => {
    it('should cancel gift card', async () => {
      mockGiftCardsService.cancelGiftCard.mockResolvedValue({ success: true });

      const result = await controller.cancelGiftCard('gift-1', 'Fraudulent');

      expect(result).toEqual({ success: true });
      expect(mockGiftCardsService.cancelGiftCard).toHaveBeenCalledWith('gift-1', 'Fraudulent');
    });
  });

  describe('sendGiftCardEmail (Admin)', () => {
    it('should send gift card email', async () => {
      mockGiftCardsService.sendGiftCardEmail.mockResolvedValue({ success: true });

      const result = await controller.sendGiftCardEmail('gift-1');

      expect(result).toEqual({ success: true });
      expect(mockGiftCardsService.sendGiftCardEmail).toHaveBeenCalledWith('gift-1');
    });
  });

  describe('addStoreCredit (Admin)', () => {
    it('should add store credit to user', async () => {
      const dto = { userId: 'user-1', amount: 50, reason: 'Promotion' };
      mockGiftCardsService.addStoreCredit.mockResolvedValue({ success: true });

      const result = await controller.addStoreCredit(dto);

      expect(result).toEqual({ success: true });
      expect(mockGiftCardsService.addStoreCredit).toHaveBeenCalledWith(dto);
    });
  });

  describe('adjustStoreCredit (Admin)', () => {
    it('should adjust user store credit', async () => {
      const dto = { amount: -25, reason: 'Adjustment' };
      mockGiftCardsService.adjustStoreCredit.mockResolvedValue({ newBalance: 25 });

      const result = await controller.adjustStoreCredit('user-1', dto);

      expect(result).toEqual({ newBalance: 25 });
      expect(mockGiftCardsService.adjustStoreCredit).toHaveBeenCalledWith('user-1', dto);
    });
  });

  describe('getStatistics (Admin)', () => {
    it('should return gift card statistics', async () => {
      mockGiftCardsService.getGiftCardStatistics.mockResolvedValue({
        totalSold: 100,
        totalRedeemed: 75,
      });

      const result = await controller.getStatistics('2024-01-01', '2024-01-31');

      expect(result).toEqual({ totalSold: 100, totalRedeemed: 75 });
      expect(mockGiftCardsService.getGiftCardStatistics).toHaveBeenCalledWith(
        new Date('2024-01-01'),
        new Date('2024-01-31')
      );
    });
  });

  describe('processScheduledDeliveries (Admin/Cron)', () => {
    it('should process scheduled deliveries', async () => {
      mockGiftCardsService.processScheduledDeliveries.mockResolvedValue({ processed: 5 });

      const result = await controller.processScheduledDeliveries();

      expect(result).toEqual({ processed: 5 });
      expect(mockGiftCardsService.processScheduledDeliveries).toHaveBeenCalled();
    });
  });

  describe('expireOldGiftCards (Admin/Cron)', () => {
    it('should expire old gift cards', async () => {
      mockGiftCardsService.expireOldGiftCards.mockResolvedValue({ expired: 3 });

      const result = await controller.expireOldGiftCards();

      expect(result).toEqual({ expired: 3 });
      expect(mockGiftCardsService.expireOldGiftCards).toHaveBeenCalled();
    });
  });
});
