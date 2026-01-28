import { Test, TestingModule } from '@nestjs/testing';
import { TaxService } from './tax.service';
import { PrismaService } from '../../common/prisma/prisma.service';
import { RedisService } from '../../common/redis/redis.service';
import { TaxProviderFactory } from './providers/tax-provider.factory';
import { TaxRateStatus, TaxCalculationMethod, TaxType } from '@prisma/client';

describe('TaxService', () => {
  let service: TaxService;
  let prismaService: PrismaService;
  let redisService: RedisService;
  let taxProviderFactory: TaxProviderFactory;

  const mockPrismaService = {
    taxRate: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    taxExemption: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    taxCalculation: {
      create: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      aggregate: jest.fn(),
      groupBy: jest.fn(),
    },
    taxReport: {
      create: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
    },
  };

  const mockRedisService = {
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
    keys: jest.fn(),
  };

  const mockTaxProviderFactory = {
    getProvider: jest.fn().mockReturnValue(null),
    hasProvider: jest.fn().mockReturnValue(false),
    getProviderName: jest.fn().mockReturnValue('Internal'),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TaxService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: RedisService,
          useValue: mockRedisService,
        },
        {
          provide: TaxProviderFactory,
          useValue: mockTaxProviderFactory,
        },
      ],
    }).compile();

    service = module.get<TaxService>(TaxService);
    prismaService = module.get<PrismaService>(PrismaService);
    redisService = module.get<RedisService>(RedisService);
    taxProviderFactory = module.get<TaxProviderFactory>(TaxProviderFactory);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createTaxRate', () => {
    it('should create a tax rate successfully', async () => {
      const createDto = {
        name: 'California Sales Tax',
        code: 'US-CA-SALES',
        description: 'State sales tax',
        taxType: TaxType.SALES_TAX,
        calculationMethod: TaxCalculationMethod.PERCENTAGE,
        rate: 7.5,
        country: 'US',
        state: 'CA',
        applyToShipping: false,
        applyToGiftCards: false,
        compoundTax: false,
        priority: 0,
        status: TaxRateStatus.ACTIVE,
      };

      const expectedResult = {
        id: 'tax-rate-1',
        ...createDto,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrismaService.taxRate.create.mockResolvedValue(expectedResult);
      mockRedisService.keys.mockResolvedValue([]);

      const result = await service.createTaxRate(createDto);

      expect(result).toEqual(expectedResult);
      expect(mockPrismaService.taxRate.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          name: createDto.name,
          code: createDto.code,
          rate: createDto.rate,
        }),
      });
    });
  });

  describe('calculateTax', () => {
    it('should calculate tax using internal method', async () => {
      const calculateDto = {
        subtotal: 100,
        shippingAmount: 10,
        country: 'US',
        state: 'CA',
        city: 'Los Angeles',
        zipCode: '90210',
      };

      const mockTaxRates = [
        {
          id: 'rate-1',
          name: 'California Sales Tax',
          code: 'CA-SALES',
          rate: 7.5,
          taxType: TaxType.SALES_TAX,
          calculationMethod: TaxCalculationMethod.PERCENTAGE,
          applyToShipping: false,
          status: TaxRateStatus.ACTIVE,
          country: 'US',
          state: 'CA',
          city: null,
          zipCode: null,
          effectiveFrom: new Date('2020-01-01'),
          effectiveTo: null,
          priority: 0,
          categoryIds: [],
        },
      ];

      mockRedisService.get.mockResolvedValue(null); // No cache
      mockPrismaService.taxRate.findMany.mockResolvedValue(mockTaxRates);
      mockPrismaService.taxExemption.findMany.mockResolvedValue([]);

      const result = await service.calculateTax(calculateDto);

      expect(result).toBeDefined();
      expect(result.taxAmount).toBe(7.5); // 7.5% of $100
      expect(result.totalAmount).toBe(117.5); // $100 + $10 + $7.50
      expect(result.taxBreakdown).toHaveLength(1);
      expect(result.taxBreakdown[0].code).toBe('CA-SALES');
    });

    it('should return zero tax when no rates found', async () => {
      const calculateDto = {
        subtotal: 100,
        shippingAmount: 10,
        country: 'XX',
        state: 'YY',
        zipCode: '00000',
      };

      mockRedisService.get.mockResolvedValue(null);
      mockPrismaService.taxRate.findMany.mockResolvedValue([]);
      mockPrismaService.taxExemption.findMany.mockResolvedValue([]);

      const result = await service.calculateTax(calculateDto);

      expect(result.taxAmount).toBe(0);
      expect(result.totalAmount).toBe(110); // $100 + $10
      expect(result.taxBreakdown).toHaveLength(0);
    });

    it('should apply tax to shipping when configured', async () => {
      const calculateDto = {
        subtotal: 100,
        shippingAmount: 10,
        country: 'US',
        state: 'CA',
        zipCode: '90210',
      };

      const mockTaxRates = [
        {
          id: 'rate-1',
          name: 'California Sales Tax',
          code: 'CA-SALES',
          rate: 7.5,
          taxType: TaxType.SALES_TAX,
          calculationMethod: TaxCalculationMethod.PERCENTAGE,
          applyToShipping: true, // Apply to shipping
          status: TaxRateStatus.ACTIVE,
          country: 'US',
          state: 'CA',
          city: null,
          zipCode: null,
          effectiveFrom: new Date('2020-01-01'),
          effectiveTo: null,
          priority: 0,
          categoryIds: [],
        },
      ];

      mockRedisService.get.mockResolvedValue(null);
      mockPrismaService.taxRate.findMany.mockResolvedValue(mockTaxRates);
      mockPrismaService.taxExemption.findMany.mockResolvedValue([]);

      const result = await service.calculateTax(calculateDto);

      expect(result.taxAmount).toBe(8.25); // 7.5% of ($100 + $10)
      expect(result.totalAmount).toBe(118.25); // $100 + $10 + $8.25
    });

    it('should use cached result when available', async () => {
      const calculateDto = {
        subtotal: 100,
        shippingAmount: 10,
        country: 'US',
        state: 'CA',
        zipCode: '90210',
      };

      const cachedResult = {
        taxableAmount: 110,
        taxAmount: 7.5,
        taxBreakdown: [],
        exemptionsApplied: [],
        calculationMethod: 'Internal',
        totalAmount: 117.5,
      };

      mockRedisService.get.mockResolvedValue(JSON.stringify(cachedResult));

      const result = await service.calculateTax(calculateDto);

      expect(result).toEqual(cachedResult);
      expect(mockPrismaService.taxRate.findMany).not.toHaveBeenCalled();
    });
  });

  describe('calculateOrderTax', () => {
    it('should calculate and store tax for an order', async () => {
      const orderId = 'order-123';
      const calculateDto = {
        subtotal: 100,
        shippingAmount: 10,
        country: 'US',
        state: 'CA',
        zipCode: '90210',
      };

      const mockTaxRates = [
        {
          id: 'rate-1',
          name: 'California Sales Tax',
          code: 'CA-SALES',
          rate: 7.5,
          taxType: TaxType.SALES_TAX,
          calculationMethod: TaxCalculationMethod.PERCENTAGE,
          applyToShipping: false,
          status: TaxRateStatus.ACTIVE,
          country: 'US',
          state: 'CA',
          city: null,
          zipCode: null,
          effectiveFrom: new Date('2020-01-01'),
          effectiveTo: null,
          priority: 0,
          categoryIds: [],
        },
      ];

      const mockCalculation = {
        id: 'calc-123',
        orderId,
        taxAmount: 7.5,
        calculatedAt: new Date(),
      };

      mockRedisService.get.mockResolvedValue(null);
      mockPrismaService.taxRate.findMany.mockResolvedValue(mockTaxRates);
      mockPrismaService.taxExemption.findMany.mockResolvedValue([]);
      mockPrismaService.taxCalculation.create.mockResolvedValue(mockCalculation);

      const result = await service.calculateOrderTax(orderId, calculateDto);

      expect(result.calculationId).toBe('calc-123');
      expect(result.taxAmount).toBe(7.5);
      expect(mockPrismaService.taxCalculation.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          orderId,
          taxAmount: 7.5,
        }),
      });
    });
  });

  describe('Tax Exemptions', () => {
    it('should apply customer exemption', async () => {
      const calculateDto = {
        subtotal: 100,
        shippingAmount: 10,
        country: 'US',
        state: 'CA',
        zipCode: '90210',
        customerId: 'customer-123',
      };

      const mockTaxRates = [
        {
          id: 'rate-1',
          name: 'California Sales Tax',
          code: 'CA-SALES',
          rate: 7.5,
          taxType: TaxType.SALES_TAX,
          calculationMethod: TaxCalculationMethod.PERCENTAGE,
          applyToShipping: false,
          status: TaxRateStatus.ACTIVE,
          country: 'US',
          state: 'CA',
          city: null,
          zipCode: null,
          effectiveFrom: new Date('2020-01-01'),
          effectiveTo: null,
          priority: 0,
          categoryIds: [],
        },
      ];

      const mockExemptions = [
        {
          id: 'exempt-1',
          userId: 'customer-123',
          taxRateId: null, // General exemption
          exemptionType: 'RESALE',
          exemptionReason: 'Resale certificate',
          isActive: true,
          country: 'US',
          state: 'CA',
          validFrom: new Date('2020-01-01'),
          validUntil: null,
        },
      ];

      mockRedisService.get.mockResolvedValue(null);
      mockPrismaService.taxRate.findMany.mockResolvedValue(mockTaxRates);
      mockPrismaService.taxExemption.findMany.mockResolvedValue(mockExemptions);

      const result = await service.calculateTax(calculateDto);

      expect(result.taxAmount).toBe(0);
      expect(result.exemptionsApplied).toHaveLength(1);
      expect(result.exemptionsApplied[0].exemptionType).toBe('RESALE');
    });
  });

  describe('createTaxExemption', () => {
    it('should create a tax exemption', async () => {
      const createDto = {
        userId: 'customer-123',
        exemptionType: 'RESALE' as any,
        exemptionReason: 'Resale certificate',
        certificateNumber: 'CERT-123',
        country: 'US',
        state: 'CA',
        isActive: true,
      };

      const expectedResult = {
        id: 'exempt-1',
        ...createDto,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrismaService.taxExemption.create.mockResolvedValue(expectedResult);

      const result = await service.createTaxExemption(createDto, 'admin-123');

      expect(result).toEqual(expectedResult);
      expect(mockPrismaService.taxExemption.create).toHaveBeenCalled();
    });
  });

  describe('Tax Reporting', () => {
    it('should generate a tax report', async () => {
      const reportParams = {
        reportType: 'monthly' as const,
        periodStart: new Date('2025-12-01'),
        periodEnd: new Date('2025-12-31'),
        country: 'US',
        state: 'CA',
      };

      const mockCalculations = [
        {
          id: 'calc-1',
          taxAmount: 7.5,
          taxableAmount: 100,
          taxBreakdown: [
            {
              taxType: 'SALES_TAX',
              code: 'CA-SALES',
              name: 'California Sales Tax',
              amount: 7.5,
            },
          ],
        },
        {
          id: 'calc-2',
          taxAmount: 10.0,
          taxableAmount: 150,
          taxBreakdown: [
            {
              taxType: 'SALES_TAX',
              code: 'CA-SALES',
              name: 'California Sales Tax',
              amount: 10.0,
            },
          ],
        },
      ];

      const expectedReport = {
        id: 'report-1',
        totalOrders: 2,
        totalTaxCollected: 17.5,
      };

      mockPrismaService.taxCalculation.findMany.mockResolvedValue(mockCalculations);
      mockPrismaService.taxReport.create.mockResolvedValue(expectedReport);

      const result = await service.generateTaxReport(reportParams);

      expect(result.totalOrders).toBe(2);
      expect(result.totalTaxCollected).toBe(17.5);
      expect(mockPrismaService.taxReport.create).toHaveBeenCalled();
    });
  });
});
