import { Test, TestingModule } from '@nestjs/testing';
import { BnplController } from './bnpl.controller';
import { BnplService } from './bnpl.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { BnplProvider } from '@prisma/client';

describe('BnplController', () => {
  let controller: BnplController;
  let service: BnplService;

  const mockBnplService = {
    createPaymentPlan: jest.fn(),
    findUserPaymentPlans: jest.fn(),
    findOnePaymentPlan: jest.fn(),
    findByOrderId: jest.fn(),
    cancelPaymentPlan: jest.fn(),
    processInstallmentPayment: jest.fn(),
    getUpcomingInstallments: jest.fn(),
    getOverdueInstallments: jest.fn(),
    checkEligibility: jest.fn(),
  };

  const mockUser = {
    id: 'user-123',
    email: 'test@example.com',
    role: 'CUSTOMER',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [BnplController],
      providers: [
        {
          provide: BnplService,
          useValue: mockBnplService,
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
      .compile();

    controller = module.get<BnplController>(BnplController);
    service = module.get<BnplService>(BnplService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('createPaymentPlan', () => {
    it('should create a payment plan for the authenticated user', async () => {
      const dto = {
        orderId: 'order-123',
        provider: BnplProvider.KLARNA,
        numberOfInstallments: 4,
      };
      const mockRequest = { user: mockUser };
      const mockPaymentPlan = {
        id: 'plan-123',
        userId: 'user-123',
        orderId: 'order-123',
        provider: BnplProvider.KLARNA,
        numberOfInstallments: 4,
      };

      mockBnplService.createPaymentPlan.mockResolvedValue(mockPaymentPlan);

      const result = await controller.createPaymentPlan(mockRequest as any, dto);

      expect(result).toEqual(mockPaymentPlan);
      expect(mockBnplService.createPaymentPlan).toHaveBeenCalledWith('user-123', dto);
    });
  });

  describe('findUserPaymentPlans', () => {
    it('should return all payment plans for the authenticated user', async () => {
      const mockRequest = { user: mockUser };
      const mockPaymentPlans = [
        { id: 'plan-1', userId: 'user-123', provider: BnplProvider.KLARNA },
        { id: 'plan-2', userId: 'user-123', provider: BnplProvider.AFTERPAY },
      ];

      mockBnplService.findUserPaymentPlans.mockResolvedValue(mockPaymentPlans);

      const result = await controller.findUserPaymentPlans(mockRequest as any);

      expect(result).toEqual(mockPaymentPlans);
      expect(mockBnplService.findUserPaymentPlans).toHaveBeenCalledWith('user-123');
    });
  });

  describe('findOnePaymentPlan', () => {
    it('should return a specific payment plan by ID', async () => {
      const mockRequest = { user: mockUser };
      const mockPaymentPlan = {
        id: 'plan-123',
        userId: 'user-123',
        provider: BnplProvider.KLARNA,
      };

      mockBnplService.findOnePaymentPlan.mockResolvedValue(mockPaymentPlan);

      const result = await controller.findOnePaymentPlan('plan-123', mockRequest as any);

      expect(result).toEqual(mockPaymentPlan);
      expect(mockBnplService.findOnePaymentPlan).toHaveBeenCalledWith('plan-123', 'user-123');
    });
  });

  describe('findByOrderId', () => {
    it('should return payment plan for a specific order', async () => {
      const mockRequest = { user: mockUser };
      const mockPaymentPlan = {
        id: 'plan-123',
        userId: 'user-123',
        orderId: 'order-456',
      };

      mockBnplService.findByOrderId.mockResolvedValue(mockPaymentPlan);

      const result = await controller.findByOrderId('order-456', mockRequest as any);

      expect(result).toEqual(mockPaymentPlan);
      expect(mockBnplService.findByOrderId).toHaveBeenCalledWith('order-456', 'user-123');
    });
  });

  describe('cancelPaymentPlan', () => {
    it('should cancel a payment plan', async () => {
      const mockRequest = { user: mockUser };
      const mockResult = { success: true, message: 'Payment plan cancelled' };

      mockBnplService.cancelPaymentPlan.mockResolvedValue(mockResult);

      const result = await controller.cancelPaymentPlan('plan-123', mockRequest as any);

      expect(result).toEqual(mockResult);
      expect(mockBnplService.cancelPaymentPlan).toHaveBeenCalledWith('plan-123', 'user-123');
    });
  });

  describe('processInstallmentPayment', () => {
    it('should process an installment payment', async () => {
      const mockRequest = { user: mockUser };
      const mockResult = {
        success: true,
        installmentId: 'inst-123',
        paymentStatus: 'PAID',
      };

      mockBnplService.processInstallmentPayment.mockResolvedValue(mockResult);

      const result = await controller.processInstallmentPayment('inst-123', mockRequest as any);

      expect(result).toEqual(mockResult);
      expect(mockBnplService.processInstallmentPayment).toHaveBeenCalledWith('inst-123', 'user-123');
    });
  });

  describe('getUpcomingInstallments', () => {
    it('should return upcoming installments for the user', async () => {
      const mockRequest = { user: mockUser };
      const mockInstallments = [
        { id: 'inst-1', dueDate: new Date('2024-02-01'), amount: 25.00 },
        { id: 'inst-2', dueDate: new Date('2024-03-01'), amount: 25.00 },
      ];

      mockBnplService.getUpcomingInstallments.mockResolvedValue(mockInstallments);

      const result = await controller.getUpcomingInstallments(mockRequest as any);

      expect(result).toEqual(mockInstallments);
      expect(mockBnplService.getUpcomingInstallments).toHaveBeenCalledWith('user-123');
    });
  });

  describe('getOverdueInstallments', () => {
    it('should return overdue installments for the user', async () => {
      const mockRequest = { user: mockUser };
      const mockInstallments = [
        { id: 'inst-3', dueDate: new Date('2024-01-01'), amount: 25.00, status: 'OVERDUE' },
      ];

      mockBnplService.getOverdueInstallments.mockResolvedValue(mockInstallments);

      const result = await controller.getOverdueInstallments(mockRequest as any);

      expect(result).toEqual(mockInstallments);
      expect(mockBnplService.getOverdueInstallments).toHaveBeenCalledWith('user-123');
    });
  });

  describe('checkEligibility', () => {
    it('should check BNPL eligibility for an order', async () => {
      const mockEligibility = {
        eligible: true,
        provider: BnplProvider.KLARNA,
        maxInstallments: 4,
      };

      mockBnplService.checkEligibility.mockResolvedValue(mockEligibility);

      const result = await controller.checkEligibility('order-123', BnplProvider.KLARNA);

      expect(result).toEqual(mockEligibility);
      expect(mockBnplService.checkEligibility).toHaveBeenCalledWith('order-123', BnplProvider.KLARNA);
    });

    it('should work without provider parameter', async () => {
      const mockEligibility = {
        eligible: true,
        provider: null,
      };

      mockBnplService.checkEligibility.mockResolvedValue(mockEligibility);

      const result = await controller.checkEligibility('order-123', undefined);

      expect(result).toEqual(mockEligibility);
      expect(mockBnplService.checkEligibility).toHaveBeenCalledWith('order-123', undefined);
    });
  });
});
