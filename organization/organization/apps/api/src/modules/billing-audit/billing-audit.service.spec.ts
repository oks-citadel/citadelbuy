import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { BillingAuditService } from './billing-audit.service';
import { PrismaService } from '@/common/prisma/prisma.service';
import { RedisService } from '@/common/redis/redis.service';
import { BillingEventType, ActorType } from './dto/billing-event.dto';

describe('BillingAuditService', () => {
  let service: BillingAuditService;
  let prismaService: PrismaService;
  let redisService: RedisService;

  const mockPrismaService = {
    billingAuditLog: {
      create: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      count: jest.fn(),
    },
    order: {
      findUnique: jest.fn(),
    },
  };

  const mockRedisService = {
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
    lpush: jest.fn(),
    lrange: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn().mockReturnValue('test-value'),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BillingAuditService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: RedisService,
          useValue: mockRedisService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<BillingAuditService>(BillingAuditService);
    prismaService = module.get<PrismaService>(PrismaService);
    redisService = module.get<RedisService>(RedisService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('logBillingEvent', () => {
    const createEventDto = {
      eventType: BillingEventType.CHARGE_CREATED,
      orderId: 'order-123',
      chargeId: 'ch_123',
      amount: 99.99,
      currency: 'USD',
      actor: {
        type: ActorType.SYSTEM,
        source: 'payment-service',
      },
    };

    it('should log a billing event successfully', async () => {
      mockRedisService.get.mockResolvedValue(null);
      mockRedisService.set.mockResolvedValue('OK');
      mockRedisService.lpush.mockResolvedValue(1);
      mockRedisService.del.mockResolvedValue(1);
      mockPrismaService.billingAuditLog.create.mockResolvedValue({
        id: 'evt_123',
        ...createEventDto,
        timestamp: new Date(),
        createdAt: new Date(),
      });

      const result = await service.logBillingEvent(createEventDto);

      expect(result).toHaveProperty('id');
      expect(result.eventType).toBe(BillingEventType.CHARGE_CREATED);
      expect(result.orderId).toBe('order-123');
      expect(result.amount).toBe(99.99);
      expect(result.currency).toBe('USD');
    });

    it('should return existing event for duplicate idempotency key', async () => {
      const existingEvent = {
        id: 'evt_existing',
        eventType: BillingEventType.CHARGE_CREATED,
        orderId: 'order-123',
        chargeId: 'ch_123',
        amount: 99.99,
        currency: 'USD',
        actor: { type: ActorType.SYSTEM, source: 'payment-service' },
        timestamp: new Date(),
        createdAt: new Date(),
      };

      mockRedisService.get.mockResolvedValueOnce('evt_existing');
      mockRedisService.get.mockResolvedValueOnce(existingEvent);

      const result = await service.logBillingEvent({
        ...createEventDto,
        idempotencyKey: 'idem-123',
      });

      expect(result.id).toBe('evt_existing');
      expect(mockPrismaService.billingAuditLog.create).not.toHaveBeenCalled();
    });

    it('should set default actor when not provided', async () => {
      const eventWithoutActor = {
        eventType: BillingEventType.CHARGE_CREATED,
        orderId: 'order-123',
        amount: 99.99,
        currency: 'USD',
      };

      mockRedisService.get.mockResolvedValue(null);
      mockRedisService.set.mockResolvedValue('OK');
      mockRedisService.lpush.mockResolvedValue(1);
      mockRedisService.del.mockResolvedValue(1);
      mockPrismaService.billingAuditLog.create.mockResolvedValue({
        id: 'evt_123',
        ...eventWithoutActor,
        actor: { type: ActorType.SYSTEM, source: 'billing-audit-service' },
        timestamp: new Date(),
        createdAt: new Date(),
      });

      const result = await service.logBillingEvent(eventWithoutActor);

      expect(result.actor.type).toBe(ActorType.SYSTEM);
    });

    it('should convert currency to uppercase', async () => {
      mockRedisService.get.mockResolvedValue(null);
      mockRedisService.set.mockResolvedValue('OK');
      mockRedisService.lpush.mockResolvedValue(1);
      mockRedisService.del.mockResolvedValue(1);
      mockPrismaService.billingAuditLog.create.mockResolvedValue({
        id: 'evt_123',
        ...createEventDto,
        currency: 'USD',
        timestamp: new Date(),
        createdAt: new Date(),
      });

      const result = await service.logBillingEvent({
        ...createEventDto,
        currency: 'usd',
      });

      expect(result.currency).toBe('USD');
    });
  });

  describe('logChargeCreated', () => {
    it('should log a charge creation event', async () => {
      const feeCalculation = {
        baseAmount: 89.99,
        taxAmount: 7.20,
        shippingAmount: 9.99,
        handlingFee: 0,
        platformFee: 2.70,
        discountAmount: 10.00,
        totalAmount: 99.88,
      };

      const gatewayResponse = {
        gateway: 'stripe',
        transactionId: 'txn_123',
        chargeId: 'ch_123',
        status: 'succeeded',
        processedAt: new Date().toISOString(),
      };

      mockRedisService.get.mockResolvedValue(null);
      mockRedisService.set.mockResolvedValue('OK');
      mockRedisService.lpush.mockResolvedValue(1);
      mockRedisService.del.mockResolvedValue(1);
      mockPrismaService.billingAuditLog.create.mockResolvedValue({
        id: 'evt_123',
        eventType: BillingEventType.CHARGE_CREATED,
        orderId: 'order-123',
        chargeId: 'ch_123',
        amount: 99.88,
        currency: 'USD',
        feeCalculation,
        gatewayResponse,
        timestamp: new Date(),
        createdAt: new Date(),
      });

      const result = await service.logChargeCreated(
        'order-123',
        'ch_123',
        99.88,
        'USD',
        feeCalculation,
        gatewayResponse,
      );

      expect(result.eventType).toBe(BillingEventType.CHARGE_CREATED);
      expect(result.chargeId).toBe('ch_123');
    });
  });

  describe('logRefund', () => {
    it('should log a refund event', async () => {
      const gatewayResponse = {
        gateway: 'stripe',
        transactionId: 'ref_123',
        chargeId: 'ch_123',
        status: 'succeeded',
        processedAt: new Date().toISOString(),
      };

      mockRedisService.get.mockResolvedValue(null);
      mockRedisService.set.mockResolvedValue('OK');
      mockRedisService.lpush.mockResolvedValue(1);
      mockRedisService.del.mockResolvedValue(1);
      mockPrismaService.billingAuditLog.create.mockResolvedValue({
        id: 'evt_123',
        eventType: BillingEventType.REFUND_COMPLETED,
        orderId: 'order-123',
        chargeId: 'ch_123',
        amount: 50.00,
        currency: 'USD',
        reason: 'Customer requested',
        gatewayResponse,
        timestamp: new Date(),
        createdAt: new Date(),
      });

      const result = await service.logRefund(
        'order-123',
        'ch_123',
        50.00,
        'USD',
        'Customer requested',
        gatewayResponse,
      );

      expect(result.eventType).toBe(BillingEventType.REFUND_COMPLETED);
      expect(result.reason).toBe('Customer requested');
    });

    it('should log partial refund with isComplete=false', async () => {
      const gatewayResponse = {
        gateway: 'stripe',
        transactionId: 'ref_123',
        chargeId: 'ch_123',
        status: 'pending',
        processedAt: new Date().toISOString(),
      };

      mockRedisService.get.mockResolvedValue(null);
      mockRedisService.set.mockResolvedValue('OK');
      mockRedisService.lpush.mockResolvedValue(1);
      mockRedisService.del.mockResolvedValue(1);
      mockPrismaService.billingAuditLog.create.mockResolvedValue({
        id: 'evt_123',
        eventType: BillingEventType.REFUND_INITIATED,
        orderId: 'order-123',
        chargeId: 'ch_123',
        amount: 25.00,
        currency: 'USD',
        reason: 'Partial refund',
        gatewayResponse,
        timestamp: new Date(),
        createdAt: new Date(),
      });

      const result = await service.logRefund(
        'order-123',
        'ch_123',
        25.00,
        'USD',
        'Partial refund',
        gatewayResponse,
        undefined,
        false,
      );

      expect(result.eventType).toBe(BillingEventType.REFUND_INITIATED);
    });
  });

  describe('getOrderAuditTrail', () => {
    it('should return cached audit trail if available', async () => {
      const cachedTrail = {
        orderId: 'order-123',
        events: [],
        total: 0,
        limit: 50,
        offset: 0,
      };

      mockRedisService.get.mockResolvedValue(cachedTrail);

      const result = await service.getOrderAuditTrail('order-123');

      expect(result).toEqual(cachedTrail);
    });

    it('should fetch from storage if not cached', async () => {
      mockRedisService.get.mockResolvedValue(null);
      mockRedisService.lrange.mockResolvedValue([]);
      mockPrismaService.billingAuditLog.findMany.mockResolvedValue([]);
      mockRedisService.set.mockResolvedValue('OK');

      const result = await service.getOrderAuditTrail('order-123');

      expect(result.orderId).toBe('order-123');
      expect(result.events).toHaveLength(0);
    });
  });

  describe('explainCharge', () => {
    it('should throw NotFoundException if no events found', async () => {
      mockRedisService.get.mockResolvedValue(null);
      mockRedisService.lrange.mockResolvedValue([]);
      mockPrismaService.billingAuditLog.findMany.mockResolvedValue([]);

      await expect(service.explainCharge('ch_nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should return cached explanation if available', async () => {
      const cachedExplanation = {
        orderId: 'order-123',
        chargeId: 'ch_123',
        status: 'succeeded',
        currency: 'USD',
        summary: {
          subtotal: 89.99,
          shipping: 9.99,
          tax: 7.20,
          discount: -10.00,
          total: 97.18,
        },
      };

      mockRedisService.get.mockResolvedValue(cachedExplanation);

      const result = await service.explainCharge('ch_123');

      expect(result).toEqual(cachedExplanation);
    });
  });

  describe('generateChargeReport', () => {
    it('should generate a report for a date range', async () => {
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-12-31');

      mockPrismaService.billingAuditLog.findMany.mockResolvedValue([
        {
          id: 'evt_1',
          eventType: BillingEventType.CHARGE_CREATED,
          amount: 100,
          gatewayResponse: { gateway: 'stripe', status: 'succeeded' },
          timestamp: new Date(),
          createdAt: new Date(),
        },
        {
          id: 'evt_2',
          eventType: BillingEventType.REFUND_COMPLETED,
          amount: 25,
          gatewayResponse: { gateway: 'stripe', status: 'succeeded' },
          timestamp: new Date(),
          createdAt: new Date(),
        },
      ]);
      mockPrismaService.billingAuditLog.count.mockResolvedValue(2);

      const result = await service.generateChargeReport(startDate, endDate);

      expect(result.period.start).toBe(startDate.toISOString());
      expect(result.period.end).toBe(endDate.toISOString());
      expect(result.summary).toHaveProperty('totalCharges');
      expect(result.summary).toHaveProperty('totalRefunded');
      expect(result.summary).toHaveProperty('netAmount');
      expect(result.byStatus).toBeDefined();
      expect(result.byPaymentMethod).toBeDefined();
    });
  });

  describe('logAdjustment', () => {
    it('should log an adjustment event', async () => {
      mockRedisService.get.mockResolvedValue(null);
      mockRedisService.set.mockResolvedValue('OK');
      mockRedisService.lpush.mockResolvedValue(1);
      mockRedisService.del.mockResolvedValue(1);
      mockPrismaService.billingAuditLog.create.mockResolvedValue({
        id: 'evt_123',
        eventType: BillingEventType.ADJUSTMENT_APPLIED,
        orderId: 'order-123',
        chargeId: 'ch_123',
        amount: 15.00,
        currency: 'USD',
        reason: 'Goodwill credit',
        timestamp: new Date(),
        createdAt: new Date(),
      });

      const result = await service.logAdjustment(
        'order-123',
        'ch_123',
        15.00,
        'USD',
        'Goodwill credit',
        { type: ActorType.ADMIN, id: 'admin-123', name: 'Admin User' },
      );

      expect(result.eventType).toBe(BillingEventType.ADJUSTMENT_APPLIED);
      expect(result.reason).toBe('Goodwill credit');
    });
  });

  describe('logTaxCalculation', () => {
    it('should log a tax calculation event', async () => {
      const taxDetails = [
        {
          jurisdiction: 'California',
          rate: 0.0725,
          taxableAmount: 100,
          taxAmount: 7.25,
        },
      ];

      mockRedisService.get.mockResolvedValue(null);
      mockRedisService.set.mockResolvedValue('OK');
      mockRedisService.lpush.mockResolvedValue(1);
      mockRedisService.del.mockResolvedValue(1);
      mockPrismaService.billingAuditLog.create.mockResolvedValue({
        id: 'evt_123',
        eventType: BillingEventType.TAX_CALCULATED,
        orderId: 'order-123',
        amount: 7.25,
        currency: 'USD',
        timestamp: new Date(),
        createdAt: new Date(),
      });

      const result = await service.logTaxCalculation(
        'order-123',
        7.25,
        'USD',
        taxDetails,
      );

      expect(result.eventType).toBe(BillingEventType.TAX_CALCULATED);
      expect(result.amount).toBe(7.25);
    });
  });

  describe('logDiscountApplied', () => {
    it('should log a discount application event', async () => {
      const discounts = [
        {
          code: 'SAVE10',
          type: 'PERCENTAGE',
          value: 10,
          amount: 10.00,
        },
      ];

      mockRedisService.get.mockResolvedValue(null);
      mockRedisService.set.mockResolvedValue('OK');
      mockRedisService.lpush.mockResolvedValue(1);
      mockRedisService.del.mockResolvedValue(1);
      mockPrismaService.billingAuditLog.create.mockResolvedValue({
        id: 'evt_123',
        eventType: BillingEventType.DISCOUNT_APPLIED,
        orderId: 'order-123',
        amount: 10.00,
        currency: 'USD',
        timestamp: new Date(),
        createdAt: new Date(),
      });

      const result = await service.logDiscountApplied(
        'order-123',
        10.00,
        'USD',
        discounts,
      );

      expect(result.eventType).toBe(BillingEventType.DISCOUNT_APPLIED);
    });
  });

  describe('logCurrencyConversion', () => {
    it('should log a currency conversion event', async () => {
      const conversionDetails = {
        fromCurrency: 'EUR',
        toCurrency: 'USD',
        originalAmount: 100,
        convertedAmount: 108.50,
        exchangeRate: 1.085,
        rateSource: 'ECB',
        convertedAt: new Date().toISOString(),
      };

      mockRedisService.get.mockResolvedValue(null);
      mockRedisService.set.mockResolvedValue('OK');
      mockRedisService.lpush.mockResolvedValue(1);
      mockRedisService.del.mockResolvedValue(1);
      mockPrismaService.billingAuditLog.create.mockResolvedValue({
        id: 'evt_123',
        eventType: BillingEventType.CURRENCY_CONVERTED,
        orderId: 'order-123',
        amount: 108.50,
        currency: 'USD',
        currencyConversion: conversionDetails,
        timestamp: new Date(),
        createdAt: new Date(),
      });

      const result = await service.logCurrencyConversion(
        'order-123',
        conversionDetails,
      );

      expect(result.eventType).toBe(BillingEventType.CURRENCY_CONVERTED);
      expect(result.amount).toBe(108.50);
    });
  });

  describe('queryBillingEvents', () => {
    it('should query events with filters', async () => {
      mockPrismaService.billingAuditLog.findMany.mockResolvedValue([]);
      mockPrismaService.billingAuditLog.count.mockResolvedValue(0);

      const result = await service.queryBillingEvents({
        orderId: 'order-123',
        eventType: BillingEventType.CHARGE_CREATED,
        limit: 10,
        offset: 0,
      });

      expect(result.data).toHaveLength(0);
      expect(result.total).toBe(0);
      expect(result.limit).toBe(10);
      expect(result.offset).toBe(0);
    });
  });
});
