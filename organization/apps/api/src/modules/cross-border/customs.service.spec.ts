import { Test, TestingModule } from '@nestjs/testing';
import { CustomsService } from './customs.service';
import { PrismaService } from '../../common/prisma/prisma.service';

describe('CustomsService', () => {
  let service: CustomsService;
  let prismaService: PrismaService;

  const mockPrismaService = {
    customsCalculation: {
      create: jest.fn(),
    },
    hSCode: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
    },
    order: {
      findUnique: jest.fn(),
    },
    customsDeclaration: {
      create: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CustomsService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<CustomsService>(CustomsService);
    prismaService = module.get<PrismaService>(PrismaService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('calculateCustoms', () => {
    beforeEach(() => {
      mockPrismaService.customsCalculation.create.mockResolvedValue({});
    });

    it('should calculate customs for US destination with defined duty rate', async () => {
      const result = await service.calculateCustoms({
        hsCode: '8471.30.00', // Computers - HS prefix 84
        originCountry: 'CN',
        destinationCountry: 'US',
        productValue: 1000,
      });

      expect(result.hsCode).toBe('8471.30.00');
      expect(result.originCountry).toBe('CN');
      expect(result.destinationCountry).toBe('US');
      expect(result.productValue).toBe(1000);
      expect(result.currency).toBe('USD');
      expect(result.duties).toBe(25); // 1000 * 0.025 (US rate for 84 prefix)
      expect(result.taxes).toBe(0); // US has no VAT
      expect(result.fees).toBeGreaterThan(0);
      expect(result.estimatedDays).toBe(1); // US clearance
    });

    it('should calculate customs for GB destination with VAT', async () => {
      const result = await service.calculateCustoms({
        hsCode: '8528.72.00', // Electronics - HS prefix 85
        originCountry: 'US',
        destinationCountry: 'GB',
        productValue: 1000,
      });

      expect(result.destinationCountry).toBe('GB');
      expect(result.duties).toBe(35); // 1000 * 0.035 (GB rate for 85 prefix)
      // Tax = (1000 + 35 + 0) * 0.20 = 207
      expect(result.taxes).toBe(207);
      expect(result.estimatedDays).toBe(2); // GB clearance
    });

    it('should calculate customs with shipping cost included in taxable value', async () => {
      const result = await service.calculateCustoms({
        hsCode: '9403.60.00', // Furniture - HS prefix 94
        originCountry: 'US',
        destinationCountry: 'DE',
        productValue: 1000,
        shippingCost: 100,
      });

      expect(result.duties).toBe(40); // 1000 * 0.04 (DE rate for 94 prefix)
      // Tax = (1000 + 40 + 100) * 0.19 = 216.6
      expect(result.taxes).toBeCloseTo(216.6, 1);
    });

    it('should use default 5% duty rate for unknown HS codes', async () => {
      const result = await service.calculateCustoms({
        hsCode: '9999.99.99', // Unknown HS code
        originCountry: 'US',
        destinationCountry: 'US',
        productValue: 1000,
      });

      expect(result.duties).toBe(50); // 1000 * 0.05 (default rate)
    });

    it('should use default 5% duty rate for unknown countries', async () => {
      const result = await service.calculateCustoms({
        hsCode: '8471.30.00',
        originCountry: 'US',
        destinationCountry: 'XX', // Unknown country
        productValue: 1000,
      });

      expect(result.duties).toBe(50); // 1000 * 0.05 (default rate)
    });

    it('should calculate customs fees as base fee plus percentage', async () => {
      const result = await service.calculateCustoms({
        hsCode: '8471.30.00',
        originCountry: 'US',
        destinationCountry: 'US',
        productValue: 1000,
      });

      // Fees = 25 (base) + 1000 * 0.003 = 28
      expect(result.fees).toBe(28);
    });

    it('should use default currency when not provided', async () => {
      const result = await service.calculateCustoms({
        hsCode: '8471.30.00',
        originCountry: 'US',
        destinationCountry: 'GB',
        productValue: 1000,
      });

      expect(result.currency).toBe('USD');
    });

    it('should use provided currency', async () => {
      const result = await service.calculateCustoms({
        hsCode: '8471.30.00',
        originCountry: 'US',
        destinationCountry: 'GB',
        productValue: 1000,
        currency: 'EUR',
      });

      expect(result.currency).toBe('EUR');
    });

    it('should store calculation in database', async () => {
      await service.calculateCustoms({
        hsCode: '8471.30.00',
        originCountry: 'US',
        destinationCountry: 'GB',
        productValue: 1000,
      });

      expect(mockPrismaService.customsCalculation.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          hsCode: '8471.30.00',
          originCountry: 'US',
          destinationCountry: 'GB',
          productValue: 1000,
          currency: 'USD',
        }),
      });
    });

    it('should estimate clearance time based on destination country', async () => {
      const usResult = await service.calculateCustoms({
        hsCode: '8471.30.00',
        originCountry: 'CN',
        destinationCountry: 'US',
        productValue: 1000,
      });
      expect(usResult.estimatedDays).toBe(1);

      const cnResult = await service.calculateCustoms({
        hsCode: '8471.30.00',
        originCountry: 'US',
        destinationCountry: 'CN',
        productValue: 1000,
      });
      expect(cnResult.estimatedDays).toBe(5);

      const frResult = await service.calculateCustoms({
        hsCode: '8471.30.00',
        originCountry: 'US',
        destinationCountry: 'FR',
        productValue: 1000,
      });
      expect(frResult.estimatedDays).toBe(3);

      const unknownResult = await service.calculateCustoms({
        hsCode: '8471.30.00',
        originCountry: 'US',
        destinationCountry: 'XX',
        productValue: 1000,
      });
      expect(unknownResult.estimatedDays).toBe(3); // Default
    });
  });

  describe('getHSCodeClassification', () => {
    it('should return HS code suggestions based on product description', async () => {
      const mockSuggestions = [
        { code: '8471.30.00', description: 'Portable computers' },
        { code: '8471.41.00', description: 'Computer workstations' },
      ];

      mockPrismaService.hSCode.findMany.mockResolvedValue(mockSuggestions);

      const result = await service.getHSCodeClassification('laptop computer');

      expect(result.productDescription).toBe('laptop computer');
      expect(result.suggestions).toHaveLength(2);
      expect(result.suggestions[0]).toEqual({
        hsCode: '8471.30.00',
        description: 'Portable computers',
        confidence: 0.85,
      });
    });

    it('should return empty suggestions when no matches found', async () => {
      mockPrismaService.hSCode.findMany.mockResolvedValue([]);

      const result = await service.getHSCodeClassification('unknown product xyz');

      expect(result.suggestions).toHaveLength(0);
    });

    it('should query prisma with case-insensitive search', async () => {
      mockPrismaService.hSCode.findMany.mockResolvedValue([]);

      await service.getHSCodeClassification('LAPTOP');

      expect(mockPrismaService.hSCode.findMany).toHaveBeenCalledWith({
        where: {
          description: {
            contains: 'LAPTOP',
            mode: 'insensitive',
          },
        },
        take: 5,
      });
    });
  });

  describe('validateHSCode', () => {
    it('should return valid response for existing HS code', async () => {
      mockPrismaService.hSCode.findUnique.mockResolvedValue({
        code: '8471.30.00',
        description: 'Portable computers',
      });

      const result = await service.validateHSCode('8471.30.00');

      expect(result.valid).toBe(true);
      expect(result.hsCode).toBe('8471.30.00');
      expect(result.description).toBe('Portable computers');
      expect(result.chapter).toBe('84');
      expect(result.heading).toBe('8471');
    });

    it('should return invalid response for non-existing HS code', async () => {
      mockPrismaService.hSCode.findUnique.mockResolvedValue(null);

      const result = await service.validateHSCode('9999.99.99');

      expect(result.valid).toBe(false);
      expect(result.message).toBe('Invalid HS code');
    });
  });

  describe('getDutyExemptions', () => {
    it('should return FREE_TRADE_AGREEMENT exemption for FTA countries', async () => {
      const result = await service.getDutyExemptions({
        originCountry: 'US',
        destinationCountry: 'CA', // USMCA agreement
        hsCode: '8471.30.00',
      });

      expect(result.exemptions).toContain('FREE_TRADE_AGREEMENT');
      expect(result.dutyReduction).toBe(100);
    });

    it('should return no exemptions for non-FTA countries', async () => {
      const result = await service.getDutyExemptions({
        originCountry: 'US',
        destinationCountry: 'CN',
        hsCode: '8471.30.00',
      });

      expect(result.exemptions).not.toContain('FREE_TRADE_AGREEMENT');
    });

    it('should check both directions of FTA', async () => {
      // US -> CA
      const result1 = await service.getDutyExemptions({
        originCountry: 'US',
        destinationCountry: 'CA',
        hsCode: '8471.30.00',
      });
      expect(result1.exemptions).toContain('FREE_TRADE_AGREEMENT');

      // CA -> US
      const result2 = await service.getDutyExemptions({
        originCountry: 'CA',
        destinationCountry: 'US',
        hsCode: '8471.30.00',
      });
      expect(result2.exemptions).toContain('FREE_TRADE_AGREEMENT');
    });

    it('should include origin and destination in response', async () => {
      const result = await service.getDutyExemptions({
        originCountry: 'US',
        destinationCountry: 'GB',
        hsCode: '8471.30.00',
      });

      expect(result.originCountry).toBe('US');
      expect(result.destinationCountry).toBe('GB');
      expect(result.hsCode).toBe('8471.30.00');
    });
  });

  describe('getDeMinimisThreshold', () => {
    it('should return correct threshold for US', async () => {
      const result = await service.getDeMinimisThreshold('US');

      expect(result.country).toBe('US');
      expect(result.threshold).toBe(800);
      expect(result.currency).toBe('USD');
    });

    it('should return correct threshold for EU', async () => {
      const result = await service.getDeMinimisThreshold('EU');

      expect(result.threshold).toBe(150);
    });

    it('should return correct threshold for AU', async () => {
      const result = await service.getDeMinimisThreshold('AU');

      expect(result.threshold).toBe(1000);
    });

    it('should return 0 for unknown countries', async () => {
      const result = await service.getDeMinimisThreshold('XX');

      expect(result.threshold).toBe(0);
    });

    it('should include description', async () => {
      const result = await service.getDeMinimisThreshold('US');

      expect(result.description).toBe('Value below which duties and taxes are not charged');
    });
  });

  describe('generateCustomsDeclaration', () => {
    it('should generate declaration for existing order', async () => {
      const mockOrder = {
        id: 'order-123',
        shippingAddress: JSON.stringify({
          name: 'John Doe',
          address1: '123 Main St',
          city: 'New York',
          country: 'US',
        }),
        subtotal: 500,
        currency: 'USD',
        shippingCost: 50,
        insurance: 10,
        items: [
          {
            quantity: 2,
            price: 100,
            product: {
              name: 'Laptop',
              weight: 2.5,
              hsCode: '8471.30.00',
              originCountry: 'CN',
            },
          },
          {
            quantity: 1,
            price: 300,
            product: {
              name: 'Monitor',
              weight: 5.0,
            },
          },
        ],
      };

      mockPrismaService.order.findUnique.mockResolvedValue(mockOrder);
      mockPrismaService.customsDeclaration.create.mockResolvedValue({});

      const result = await service.generateCustomsDeclaration('order-123');

      expect(result.orderId).toBe('order-123');
      expect(result.declarationNumber).toMatch(/^CD\d{8}[A-Z0-9]{4}$/);
      expect(result.declarationDate).toBeInstanceOf(Date);
      expect(result.shipper.name).toBe('Broxiva Marketplace');
      expect(result.consignee.name).toBe('John Doe');
      expect(result.items).toHaveLength(2);
      expect(result.totalValue).toBe(500);
      expect(result.currency).toBe('USD');
      expect(result.incoterms).toBe('DDP');
    });

    it('should throw error for non-existing order', async () => {
      mockPrismaService.order.findUnique.mockResolvedValue(null);

      await expect(
        service.generateCustomsDeclaration('non-existing-order'),
      ).rejects.toThrow('Order not found');
    });

    it('should store declaration in database', async () => {
      const mockOrder = {
        id: 'order-123',
        shippingAddress: JSON.stringify({ name: 'Test', address1: '123', city: 'City', country: 'US' }),
        subtotal: 100,
        currency: 'USD',
        shippingCost: 10,
        insurance: 5,
        items: [],
      };

      mockPrismaService.order.findUnique.mockResolvedValue(mockOrder);
      mockPrismaService.customsDeclaration.create.mockResolvedValue({});

      await service.generateCustomsDeclaration('order-123');

      expect(mockPrismaService.customsDeclaration.create).toHaveBeenCalledWith({
        data: {
          orderId: 'order-123',
          declarationNumber: expect.any(String),
          data: expect.any(Object),
          status: 'GENERATED',
        },
      });
    });

    it('should handle missing product fields with defaults', async () => {
      const mockOrder = {
        id: 'order-123',
        shippingAddress: JSON.stringify({ name: 'Test', address1: '123', city: 'City', country: 'US' }),
        subtotal: 100,
        currency: 'USD',
        shippingCost: null,
        insurance: null,
        items: [
          {
            quantity: 1,
            price: 100,
            product: {
              name: 'Product without details',
              weight: null,
            },
          },
        ],
      };

      mockPrismaService.order.findUnique.mockResolvedValue(mockOrder);
      mockPrismaService.customsDeclaration.create.mockResolvedValue({});

      const result = await service.generateCustomsDeclaration('order-123');

      expect(result.items[0].weight).toBe(0);
      expect(result.items[0].hsCode).toBe('9999.99.99');
      expect(result.items[0].originCountry).toBe('US');
      expect(result.shippingCost).toBe(0);
      expect(result.insurance).toBe(0);
    });

    it('should handle empty shipping address', async () => {
      const mockOrder = {
        id: 'order-123',
        shippingAddress: null,
        subtotal: 100,
        currency: 'USD',
        shippingCost: 0,
        insurance: 0,
        items: [],
      };

      mockPrismaService.order.findUnique.mockResolvedValue(mockOrder);
      mockPrismaService.customsDeclaration.create.mockResolvedValue({});

      const result = await service.generateCustomsDeclaration('order-123');

      expect(result.consignee.name).toBe('');
    });

    it('should format consignee address correctly', async () => {
      const mockOrder = {
        id: 'order-123',
        shippingAddress: JSON.stringify({
          name: 'John Doe',
          address1: '123 Main St',
          city: 'London',
          country: 'GB',
        }),
        subtotal: 100,
        currency: null,
        shippingCost: 0,
        insurance: 0,
        items: [],
      };

      mockPrismaService.order.findUnique.mockResolvedValue(mockOrder);
      mockPrismaService.customsDeclaration.create.mockResolvedValue({});

      const result = await service.generateCustomsDeclaration('order-123');

      expect(result.consignee.address).toBe('123 Main St, London');
      expect(result.consignee.country).toBe('GB');
      expect(result.currency).toBe('USD'); // Default currency
    });
  });
});
