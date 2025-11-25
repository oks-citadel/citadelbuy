import { Test, TestingModule } from '@nestjs/testing';
import { BnplService } from './bnpl.service';
import { PrismaService } from '@/common/prisma/prisma.service';
import {
  BnplProvider,
  BnplPaymentPlanStatus,
  BnplInstallmentStatus,
} from '@prisma/client';
import {
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';

describe('BnplService', () => {
  let service: BnplService;
  let prisma: PrismaService;

  const mockPrismaService = {
    order: {
      findUnique: jest.fn(),
    },
    bnplPaymentPlan: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
    },
    bnplInstallment: {
      createMany: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
  };

  // Mock data
  const mockOrder = {
    id: 'order-123',
    userId: 'user-123',
    total: 500.0,
    status: 'PENDING',
    bnplPaymentPlan: null,
    createdAt: new Date(),
  };

  const mockPaymentPlan = {
    id: 'plan-123',
    orderId: 'order-123',
    userId: 'user-123',
    provider: BnplProvider.KLARNA,
    totalAmount: 500.0,
    downPayment: 0,
    numberOfInstallments: 4,
    installmentAmount: 125.0,
    frequency: 'MONTHLY',
    firstPaymentDate: new Date(),
    finalPaymentDate: new Date(),
    remainingBalance: 500.0,
    totalPaid: 0,
    interestRate: 0,
    fees: 0,
    status: BnplPaymentPlanStatus.PENDING,
    createdAt: new Date(),
  };

  const mockInstallment = {
    id: 'installment-1',
    paymentPlanId: 'plan-123',
    installmentNumber: 1,
    amount: 125.0,
    dueDate: new Date(),
    status: BnplInstallmentStatus.PENDING,
    paymentPlan: mockPaymentPlan,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BnplService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<BnplService>(BnplService);
    prisma = module.get<PrismaService>(PrismaService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createPaymentPlan', () => {
    it('should create a BNPL payment plan', async () => {
      // Arrange
      const dto = {
        orderId: 'order-123',
        provider: BnplProvider.KLARNA,
        numberOfInstallments: 4,
        downPayment: 0,
        frequency: 'MONTHLY' as any,
      };
      mockPrismaService.order.findUnique.mockResolvedValue(mockOrder);
      mockPrismaService.bnplPaymentPlan.create.mockResolvedValue(mockPaymentPlan);
      mockPrismaService.bnplInstallment.createMany.mockResolvedValue({ count: 4 });
      mockPrismaService.bnplPaymentPlan.findUnique.mockResolvedValue({
        ...mockPaymentPlan,
        order: mockOrder,
        installments: [mockInstallment],
      });

      // Act
      const result = await service.createPaymentPlan('user-123', dto);

      // Assert
      expect(result).toBeDefined();
      expect(mockPrismaService.bnplPaymentPlan.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          orderId: 'order-123',
          userId: 'user-123',
          provider: BnplProvider.KLARNA,
          numberOfInstallments: 4,
        }),
      });
      expect(mockPrismaService.bnplInstallment.createMany).toHaveBeenCalled();
    });

    it('should throw NotFoundException when order not found', async () => {
      // Arrange
      const dto = {
        orderId: 'nonexistent',
        provider: BnplProvider.KLARNA,
        numberOfInstallments: 4,
      };
      mockPrismaService.order.findUnique.mockResolvedValue(null);

      // Act & Assert
      await expect(service.createPaymentPlan('user-123', dto)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw BadRequestException when user does not own order', async () => {
      // Arrange
      const dto = {
        orderId: 'order-123',
        provider: BnplProvider.KLARNA,
        numberOfInstallments: 4,
      };
      mockPrismaService.order.findUnique.mockResolvedValue({
        ...mockOrder,
        userId: 'other-user',
      });

      // Act & Assert
      await expect(service.createPaymentPlan('user-123', dto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw ConflictException when order already has payment plan', async () => {
      // Arrange
      const dto = {
        orderId: 'order-123',
        provider: BnplProvider.KLARNA,
        numberOfInstallments: 4,
      };
      mockPrismaService.order.findUnique.mockResolvedValue({
        ...mockOrder,
        bnplPaymentPlan: mockPaymentPlan,
      });

      // Act & Assert
      await expect(service.createPaymentPlan('user-123', dto)).rejects.toThrow(
        ConflictException,
      );
    });

    it('should throw BadRequestException when order total is too low', async () => {
      // Arrange
      const dto = {
        orderId: 'order-123',
        provider: BnplProvider.KLARNA,
        numberOfInstallments: 4,
      };
      mockPrismaService.order.findUnique.mockResolvedValue({
        ...mockOrder,
        total: 25.0, // Below $50 minimum
      });

      // Act & Assert
      await expect(service.createPaymentPlan('user-123', dto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException when order total is too high', async () => {
      // Arrange
      const dto = {
        orderId: 'order-123',
        provider: BnplProvider.KLARNA,
        numberOfInstallments: 4,
      };
      mockPrismaService.order.findUnique.mockResolvedValue({
        ...mockOrder,
        total: 15000.0, // Above $10,000 maximum
      });

      // Act & Assert
      await expect(service.createPaymentPlan('user-123', dto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException when down payment exceeds total', async () => {
      // Arrange
      const dto = {
        orderId: 'order-123',
        provider: BnplProvider.KLARNA,
        numberOfInstallments: 4,
        downPayment: 600.0, // Exceeds order total of 500
      };
      mockPrismaService.order.findUnique.mockResolvedValue(mockOrder);

      // Act & Assert
      await expect(service.createPaymentPlan('user-123', dto)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('findOnePaymentPlan', () => {
    it('should return a payment plan by id', async () => {
      // Arrange
      const fullPlan = {
        ...mockPaymentPlan,
        order: { ...mockOrder, items: [] },
        installments: [mockInstallment],
      };
      mockPrismaService.bnplPaymentPlan.findUnique.mockResolvedValue(fullPlan);

      // Act
      const result = await service.findOnePaymentPlan('plan-123', 'user-123');

      // Assert
      expect(result).toEqual(fullPlan);
      expect(mockPrismaService.bnplPaymentPlan.findUnique).toHaveBeenCalledWith({
        where: { id: 'plan-123' },
        include: expect.any(Object),
      });
    });

    it('should throw NotFoundException when payment plan not found', async () => {
      // Arrange
      mockPrismaService.bnplPaymentPlan.findUnique.mockResolvedValue(null);

      // Act & Assert
      await expect(
        service.findOnePaymentPlan('nonexistent', 'user-123'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when user does not own plan', async () => {
      // Arrange
      mockPrismaService.bnplPaymentPlan.findUnique.mockResolvedValue({
        ...mockPaymentPlan,
        userId: 'other-user',
      });

      // Act & Assert
      await expect(
        service.findOnePaymentPlan('plan-123', 'user-123'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('findUserPaymentPlans', () => {
    it('should return all user payment plans', async () => {
      // Arrange
      mockPrismaService.bnplPaymentPlan.findMany.mockResolvedValue([
        {
          ...mockPaymentPlan,
          order: mockOrder,
          installments: [mockInstallment],
        },
      ]);

      // Act
      const result = await service.findUserPaymentPlans('user-123');

      // Assert
      expect(result).toHaveLength(1);
      expect(mockPrismaService.bnplPaymentPlan.findMany).toHaveBeenCalledWith({
        where: { userId: 'user-123' },
        include: expect.any(Object),
        orderBy: { createdAt: 'desc' },
      });
    });
  });

  describe('findByOrderId', () => {
    it('should return payment plan by order id', async () => {
      // Arrange
      mockPrismaService.bnplPaymentPlan.findUnique.mockResolvedValue({
        ...mockPaymentPlan,
        installments: [mockInstallment],
      });

      // Act
      const result = await service.findByOrderId('order-123', 'user-123');

      // Assert
      expect(result).toBeDefined();
      expect(mockPrismaService.bnplPaymentPlan.findUnique).toHaveBeenCalledWith({
        where: { orderId: 'order-123' },
        include: { installments: expect.any(Object) },
      });
    });

    it('should return null when payment plan not found', async () => {
      // Arrange
      mockPrismaService.bnplPaymentPlan.findUnique.mockResolvedValue(null);

      // Act
      const result = await service.findByOrderId('order-123', 'user-123');

      // Assert
      expect(result).toBeNull();
    });
  });

  describe('processInstallmentPayment', () => {
    it('should process installment payment successfully', async () => {
      // Arrange
      mockPrismaService.bnplInstallment.findUnique.mockResolvedValue(mockInstallment);
      mockPrismaService.bnplInstallment.update.mockResolvedValue({
        ...mockInstallment,
        status: BnplInstallmentStatus.PAID,
      });
      mockPrismaService.bnplPaymentPlan.update.mockResolvedValue({
        ...mockPaymentPlan,
        totalPaid: 125.0,
        remainingBalance: 375.0,
      });

      // Act
      const result = await service.processInstallmentPayment(
        'installment-1',
        'user-123',
      );

      // Assert
      expect(result.success).toBe(true);
      expect(mockPrismaService.bnplInstallment.update).toHaveBeenCalledWith({
        where: { id: 'installment-1' },
        data: expect.objectContaining({
          status: BnplInstallmentStatus.PAID,
          paidDate: expect.any(Date),
        }),
      });
    });

    it('should throw NotFoundException when installment not found', async () => {
      // Arrange
      mockPrismaService.bnplInstallment.findUnique.mockResolvedValue(null);

      // Act & Assert
      await expect(
        service.processInstallmentPayment('nonexistent', 'user-123'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when installment already paid', async () => {
      // Arrange
      mockPrismaService.bnplInstallment.findUnique.mockResolvedValue({
        ...mockInstallment,
        status: BnplInstallmentStatus.PAID,
      });

      // Act & Assert
      await expect(
        service.processInstallmentPayment('installment-1', 'user-123'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should mark payment plan as completed when all paid', async () => {
      // Arrange
      const lastInstallment = {
        ...mockInstallment,
        paymentPlan: { ...mockPaymentPlan, remainingBalance: 125.0 },
      };
      mockPrismaService.bnplInstallment.findUnique.mockResolvedValue(lastInstallment);
      mockPrismaService.bnplInstallment.update.mockResolvedValue({});
      mockPrismaService.bnplPaymentPlan.update.mockResolvedValue({});

      // Act
      await service.processInstallmentPayment('installment-1', 'user-123');

      // Assert
      expect(mockPrismaService.bnplPaymentPlan.update).toHaveBeenCalledWith({
        where: { id: 'plan-123' },
        data: expect.objectContaining({
          status: BnplPaymentPlanStatus.COMPLETED,
        }),
      });
    });
  });

  describe('cancelPaymentPlan', () => {
    it('should cancel a payment plan', async () => {
      // Arrange
      const fullPlan = {
        ...mockPaymentPlan,
        totalPaid: 0,
        order: { ...mockOrder, items: [] },
        installments: [mockInstallment],
      };
      mockPrismaService.bnplPaymentPlan.findUnique.mockResolvedValue(fullPlan);
      mockPrismaService.bnplPaymentPlan.update.mockResolvedValue({
        ...fullPlan,
        status: BnplPaymentPlanStatus.CANCELLED,
      });

      // Act
      const result = await service.cancelPaymentPlan('plan-123', 'user-123');

      // Assert
      expect(result.status).toBe(BnplPaymentPlanStatus.CANCELLED);
      expect(mockPrismaService.bnplPaymentPlan.update).toHaveBeenCalledWith({
        where: { id: 'plan-123' },
        data: { status: BnplPaymentPlanStatus.CANCELLED },
        include: { installments: true },
      });
    });

    it('should throw BadRequestException when plan is completed', async () => {
      // Arrange
      const completedPlan = {
        ...mockPaymentPlan,
        status: BnplPaymentPlanStatus.COMPLETED,
        order: { ...mockOrder, items: [] },
        installments: [mockInstallment],
      };
      mockPrismaService.bnplPaymentPlan.findUnique.mockResolvedValue(completedPlan);

      // Act & Assert
      await expect(
        service.cancelPaymentPlan('plan-123', 'user-123'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when plan already cancelled', async () => {
      // Arrange
      const cancelledPlan = {
        ...mockPaymentPlan,
        status: BnplPaymentPlanStatus.CANCELLED,
        order: { ...mockOrder, items: [] },
        installments: [mockInstallment],
      };
      mockPrismaService.bnplPaymentPlan.findUnique.mockResolvedValue(cancelledPlan);

      // Act & Assert
      await expect(
        service.cancelPaymentPlan('plan-123', 'user-123'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when payments already made', async () => {
      // Arrange
      const paidPlan = {
        ...mockPaymentPlan,
        totalPaid: 125.0,
        order: { ...mockOrder, items: [] },
        installments: [mockInstallment],
      };
      mockPrismaService.bnplPaymentPlan.findUnique.mockResolvedValue(paidPlan);

      // Act & Assert
      await expect(
        service.cancelPaymentPlan('plan-123', 'user-123'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('getUpcomingInstallments', () => {
    it('should return upcoming installments', async () => {
      // Arrange
      mockPrismaService.bnplInstallment.findMany.mockResolvedValue([
        {
          ...mockInstallment,
          paymentPlan: { ...mockPaymentPlan, order: mockOrder },
        },
      ]);

      // Act
      const result = await service.getUpcomingInstallments('user-123');

      // Assert
      expect(result).toHaveLength(1);
      expect(mockPrismaService.bnplInstallment.findMany).toHaveBeenCalledWith({
        where: expect.objectContaining({
          paymentPlan: {
            userId: 'user-123',
            status: BnplPaymentPlanStatus.ACTIVE,
          },
          status: BnplInstallmentStatus.PENDING,
        }),
        include: expect.any(Object),
        orderBy: { dueDate: 'asc' },
      });
    });
  });

  describe('getOverdueInstallments', () => {
    it('should return overdue installments', async () => {
      // Arrange
      mockPrismaService.bnplInstallment.findMany.mockResolvedValue([
        {
          ...mockInstallment,
          status: BnplInstallmentStatus.OVERDUE,
          paymentPlan: { ...mockPaymentPlan, order: mockOrder },
        },
      ]);

      // Act
      const result = await service.getOverdueInstallments('user-123');

      // Assert
      expect(result).toHaveLength(1);
      expect(mockPrismaService.bnplInstallment.findMany).toHaveBeenCalledWith({
        where: expect.objectContaining({
          paymentPlan: {
            userId: 'user-123',
          },
          status: {
            in: [BnplInstallmentStatus.PENDING, BnplInstallmentStatus.OVERDUE],
          },
        }),
        include: expect.any(Object),
        orderBy: { dueDate: 'asc' },
      });
    });
  });

  describe('checkEligibility', () => {
    it('should return eligibility for valid order', async () => {
      // Arrange
      mockPrismaService.order.findUnique.mockResolvedValue(mockOrder);

      // Act
      const result = await service.checkEligibility('order-123', BnplProvider.KLARNA);

      // Assert
      expect(result.eligible).toBe(true);
      expect(result.provider).toBe(BnplProvider.KLARNA);
      expect(result.minInstallments).toBe(2);
      expect(result.maxInstallments).toBe(4);
    });

    it('should return ineligible for order below minimum', async () => {
      // Arrange
      mockPrismaService.order.findUnique.mockResolvedValue({
        ...mockOrder,
        total: 25.0,
      });

      // Act
      const result = await service.checkEligibility('order-123', BnplProvider.KLARNA);

      // Assert
      expect(result.eligible).toBe(false);
    });

    it('should throw NotFoundException when order not found', async () => {
      // Arrange
      mockPrismaService.order.findUnique.mockResolvedValue(null);

      // Act & Assert
      await expect(
        service.checkEligibility('nonexistent', BnplProvider.KLARNA),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('processOverdueInstallments', () => {
    it('should mark overdue installments and defaulted plans', async () => {
      // Arrange
      mockPrismaService.bnplInstallment.updateMany.mockResolvedValue({ count: 5 });
      mockPrismaService.bnplPaymentPlan.findMany.mockResolvedValue([
        {
          ...mockPaymentPlan,
          installments: [mockInstallment, mockInstallment], // 2 overdue
        },
      ]);
      mockPrismaService.bnplPaymentPlan.update.mockResolvedValue({});

      // Act
      await service.processOverdueInstallments();

      // Assert
      expect(mockPrismaService.bnplInstallment.updateMany).toHaveBeenCalledWith({
        where: {
          status: BnplInstallmentStatus.PENDING,
          dueDate: { lt: expect.any(Date) },
        },
        data: {
          status: BnplInstallmentStatus.OVERDUE,
        },
      });
      expect(mockPrismaService.bnplPaymentPlan.update).toHaveBeenCalledWith({
        where: { id: 'plan-123' },
        data: {
          status: BnplPaymentPlanStatus.DEFAULTED,
        },
      });
    });
  });
});
