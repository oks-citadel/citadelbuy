import { Test, TestingModule } from '@nestjs/testing';
import { TradeComplianceService } from './trade-compliance.service';
import { PrismaService } from '../../common/prisma/prisma.service';

describe('TradeComplianceService', () => {
  let service: TradeComplianceService;
  let prismaService: PrismaService;

  const mockPrismaService = {
    product: {
      findUnique: jest.fn(),
    },
    complianceCheck: {
      create: jest.fn(),
      count: jest.fn(),
    },
    sanctionCheck: {
      create: jest.fn(),
    },
    tradeLicense: {
      findUnique: jest.fn(),
    },
    categoryRestriction: {
      findMany: jest.fn(),
    },
    hSCodeRestriction: {
      findMany: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TradeComplianceService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<TradeComplianceService>(TradeComplianceService);
    prismaService = module.get<PrismaService>(PrismaService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('checkCompliance', () => {
    beforeEach(() => {
      mockPrismaService.complianceCheck.create.mockResolvedValue({});
      mockPrismaService.product.findUnique.mockResolvedValue(null);
      mockPrismaService.categoryRestriction.findMany.mockResolvedValue([]);
      mockPrismaService.hSCodeRestriction.findMany.mockResolvedValue([]);
    });

    it('should return PROHIBITED for embargoed countries', async () => {
      const result = await service.checkCompliance({
        productId: 'product-1',
        originCountry: 'US',
        destinationCountry: 'KP', // North Korea
      });

      expect(result.result).toBe('PROHIBITED');
      expect(result.restrictions).toContain('Destination country is under trade embargo');
    });

    it('should return PROHIBITED for Syria', async () => {
      const result = await service.checkCompliance({
        productId: 'product-1',
        originCountry: 'US',
        destinationCountry: 'SY',
      });

      expect(result.result).toBe('PROHIBITED');
    });

    it('should return PROHIBITED for Iran', async () => {
      const result = await service.checkCompliance({
        productId: 'product-1',
        originCountry: 'US',
        destinationCountry: 'IR',
      });

      expect(result.result).toBe('PROHIBITED');
    });

    it('should return PROHIBITED for Cuba', async () => {
      const result = await service.checkCompliance({
        productId: 'product-1',
        originCountry: 'US',
        destinationCountry: 'CU',
      });

      expect(result.result).toBe('PROHIBITED');
    });

    it('should return APPROVED for non-restricted destination', async () => {
      const result = await service.checkCompliance({
        productId: 'product-1',
        originCountry: 'US',
        destinationCountry: 'GB',
      });

      expect(result.result).toBe('APPROVED');
      expect(result.restrictions).toHaveLength(0);
    });

    it('should return RESTRICTED when product category is restricted', async () => {
      mockPrismaService.product.findUnique.mockResolvedValue({
        id: 'product-1',
        categoryId: 'cat-electronics',
      });

      mockPrismaService.categoryRestriction.findMany.mockResolvedValue([
        { description: 'Electronics require special permit' },
      ]);

      const result = await service.checkCompliance({
        productId: 'product-1',
        originCountry: 'US',
        destinationCountry: 'CN',
      });

      expect(result.result).toBe('RESTRICTED');
      expect(result.restrictions).toContain('Electronics require special permit');
    });

    it('should return RESTRICTED when HS code is restricted', async () => {
      mockPrismaService.hSCodeRestriction.findMany.mockResolvedValue([
        { description: 'Dual-use technology restriction' },
      ]);

      const result = await service.checkCompliance({
        productId: 'product-1',
        originCountry: 'US',
        destinationCountry: 'CN',
        hsCode: '8471.30.00',
      });

      expect(result.result).toBe('RESTRICTED');
      expect(result.restrictions).toContain('Dual-use technology restriction');
    });

    it('should return REQUIRES_LICENSE for high-value shipments', async () => {
      const result = await service.checkCompliance({
        productId: 'product-1',
        originCountry: 'US',
        destinationCountry: 'GB',
        value: 150000, // Over 100,000 threshold
      });

      expect(result.result).toBe('REQUIRES_LICENSE');
      expect(result.licenses).toContain('EXPORT_LICENSE');
    });

    it('should not require license for value under threshold', async () => {
      const result = await service.checkCompliance({
        productId: 'product-1',
        originCountry: 'US',
        destinationCountry: 'GB',
        value: 50000,
      });

      expect(result.result).toBe('APPROVED');
      expect(result.licenses).toHaveLength(0);
    });

    it('should store compliance check in database', async () => {
      await service.checkCompliance({
        productId: 'product-1',
        originCountry: 'US',
        destinationCountry: 'GB',
        hsCode: '8471.30.00',
      });

      expect(mockPrismaService.complianceCheck.create).toHaveBeenCalledWith({
        data: {
          productId: 'product-1',
          originCountry: 'US',
          destinationCountry: 'GB',
          hsCode: '8471.30.00',
          result: 'APPROVED',
          restrictions: expect.any(Array),
          licenses: expect.any(Array),
        },
      });
    });

    it('should include notes when restrictions exist', async () => {
      mockPrismaService.hSCodeRestriction.findMany.mockResolvedValue([
        { description: 'Some restriction' },
      ]);

      const result = await service.checkCompliance({
        productId: 'product-1',
        originCountry: 'US',
        destinationCountry: 'GB',
        hsCode: '8471.30.00',
      });

      expect(result.notes).toBe('See restrictions list');
    });

    it('should include notes when no restrictions', async () => {
      const result = await service.checkCompliance({
        productId: 'product-1',
        originCountry: 'US',
        destinationCountry: 'GB',
      });

      expect(result.notes).toBe('No restrictions found');
    });

    it('should combine multiple restrictions', async () => {
      mockPrismaService.product.findUnique.mockResolvedValue({
        id: 'product-1',
        categoryId: 'cat-1',
      });

      mockPrismaService.categoryRestriction.findMany.mockResolvedValue([
        { description: 'Category restriction 1' },
      ]);

      mockPrismaService.hSCodeRestriction.findMany.mockResolvedValue([
        { description: 'HS code restriction 1' },
        { description: 'HS code restriction 2' },
      ]);

      const result = await service.checkCompliance({
        productId: 'product-1',
        originCountry: 'US',
        destinationCountry: 'GB',
        hsCode: '8471.30.00',
      });

      expect(result.restrictions).toHaveLength(3);
    });

    it('should use default description when category restriction has none', async () => {
      mockPrismaService.product.findUnique.mockResolvedValue({
        id: 'product-1',
        categoryId: 'cat-1',
      });

      mockPrismaService.categoryRestriction.findMany.mockResolvedValue([
        { description: null },
      ]);

      const result = await service.checkCompliance({
        productId: 'product-1',
        originCountry: 'US',
        destinationCountry: 'GB',
      });

      expect(result.restrictions).toContain('Category restricted');
    });
  });

  describe('checkSanctions', () => {
    beforeEach(() => {
      mockPrismaService.sanctionCheck.create.mockResolvedValue({});
    });

    it('should return MATCH for sanctioned entities', async () => {
      const result = await service.checkSanctions({
        entityName: 'Sanctioned Entity 1',
        country: 'US',
        entityType: 'ORGANIZATION',
      });

      expect(result.result).toBe('MATCH');
      expect(result.matchedLists).toContain('OFAC_SDN');
      expect(result.riskScore).toBe(100);
    });

    it('should normalize entity name for matching', async () => {
      const result = await service.checkSanctions({
        entityName: 'sanctioned entity 2', // lowercase with spaces
        country: 'US',
        entityType: 'ORGANIZATION',
      });

      expect(result.result).toBe('MATCH');
    });

    it('should return CLEAR for non-sanctioned entities', async () => {
      const result = await service.checkSanctions({
        entityName: 'Legitimate Company Inc',
        country: 'US',
        entityType: 'ORGANIZATION',
      });

      expect(result.result).toBe('CLEAR');
      expect(result.riskScore).toBe(0);
    });

    it('should return POTENTIAL_MATCH for entities in restricted countries', async () => {
      const result = await service.checkSanctions({
        entityName: 'Some Company',
        country: 'KP', // North Korea
        entityType: 'ORGANIZATION',
      });

      expect(result.result).toBe('POTENTIAL_MATCH');
      expect(result.matchedLists).toContain('RESTRICTED_COUNTRY');
      expect(result.riskScore).toBe(50);
    });

    it('should add country risk to sanction match risk', async () => {
      const result = await service.checkSanctions({
        entityName: 'Sanctioned Entity 1',
        country: 'KP', // Restricted country
        entityType: 'ORGANIZATION',
      });

      expect(result.result).toBe('MATCH');
      expect(result.riskScore).toBe(150); // 100 (sanction) + 50 (country)
    });

    it('should store sanction check in database', async () => {
      await service.checkSanctions({
        entityName: 'Test Company',
        country: 'US',
        entityType: 'INDIVIDUAL',
      });

      expect(mockPrismaService.sanctionCheck.create).toHaveBeenCalledWith({
        data: {
          entityName: 'Test Company',
          country: 'US',
          entityType: 'INDIVIDUAL',
          result: 'CLEAR',
          matchedLists: expect.any(Array),
          riskScore: 0,
        },
      });
    });

    it('should handle INDIVIDUAL entity type', async () => {
      const result = await service.checkSanctions({
        entityName: 'John Doe',
        country: 'GB',
        entityType: 'INDIVIDUAL',
      });

      expect(result.entityName).toBe('John Doe');
    });
  });

  describe('getExportDocumentation', () => {
    it('should always include COMMERCIAL_INVOICE and PACKING_LIST', async () => {
      const result = await service.getExportDocumentation({
        originCountry: 'US',
        destinationCountry: 'US', // Same country
        productValue: 100,
      });

      expect(result.requiredDocuments).toContain('COMMERCIAL_INVOICE');
      expect(result.requiredDocuments).toContain('PACKING_LIST');
    });

    it('should include CUSTOMS_DECLARATION for international shipments', async () => {
      const result = await service.getExportDocumentation({
        originCountry: 'US',
        destinationCountry: 'GB',
        productValue: 100,
      });

      expect(result.requiredDocuments).toContain('CUSTOMS_DECLARATION');
    });

    it('should not include CUSTOMS_DECLARATION for domestic shipments', async () => {
      const result = await service.getExportDocumentation({
        originCountry: 'US',
        destinationCountry: 'US',
        productValue: 100,
      });

      expect(result.requiredDocuments).not.toContain('CUSTOMS_DECLARATION');
    });

    it('should include CERTIFICATE_OF_ORIGIN for high-value shipments', async () => {
      const result = await service.getExportDocumentation({
        originCountry: 'US',
        destinationCountry: 'GB',
        productValue: 15000, // Over 10,000 threshold
      });

      expect(result.requiredDocuments).toContain('CERTIFICATE_OF_ORIGIN');
    });

    it('should not include CERTIFICATE_OF_ORIGIN for low-value shipments', async () => {
      const result = await service.getExportDocumentation({
        originCountry: 'US',
        destinationCountry: 'GB',
        productValue: 5000,
      });

      expect(result.requiredDocuments).not.toContain('CERTIFICATE_OF_ORIGIN');
    });

    it('should include EXPORT_LICENSE for restricted countries', async () => {
      const result = await service.getExportDocumentation({
        originCountry: 'US',
        destinationCountry: 'CU', // Cuba
        productValue: 100,
      });

      expect(result.requiredDocuments).toContain('EXPORT_LICENSE');
    });

    it('should include special documentation for specific HS codes', async () => {
      const result = await service.getExportDocumentation({
        originCountry: 'US',
        destinationCountry: 'GB',
        productValue: 100,
        hsCode: '8471.30.00', // Computers - starts with 8471
      });

      expect(result.requiredDocuments).toContain('SPECIAL_PERMIT');
      expect(result.requiredDocuments).toContain('PRODUCT_CERTIFICATION');
    });

    it('should include special documentation for TV/display HS codes', async () => {
      const result = await service.getExportDocumentation({
        originCountry: 'US',
        destinationCountry: 'GB',
        productValue: 100,
        hsCode: '8528.72.00', // TV/displays
      });

      expect(result.requiredDocuments).toContain('SPECIAL_PERMIT');
    });

    it('should not include special documentation for regular HS codes', async () => {
      const result = await service.getExportDocumentation({
        originCountry: 'US',
        destinationCountry: 'GB',
        productValue: 100,
        hsCode: '9403.60.00', // Furniture
      });

      expect(result.requiredDocuments).not.toContain('SPECIAL_PERMIT');
    });

    it('should estimate processing time based on document count', async () => {
      // Minimal documents
      const minResult = await service.getExportDocumentation({
        originCountry: 'US',
        destinationCountry: 'US',
        productValue: 100,
      });

      // Many documents
      const maxResult = await service.getExportDocumentation({
        originCountry: 'US',
        destinationCountry: 'CU', // Restricted
        productValue: 50000, // High value
        hsCode: '8471.30.00', // Special documentation
      });

      expect(maxResult.estimatedProcessingDays).toBeGreaterThan(
        minResult.estimatedProcessingDays,
      );
    });

    it('should have minimum 1 day processing time', async () => {
      const result = await service.getExportDocumentation({
        originCountry: 'US',
        destinationCountry: 'US',
        productValue: 100,
      });

      expect(result.estimatedProcessingDays).toBeGreaterThanOrEqual(1);
    });
  });

  describe('validateLicense', () => {
    it('should return valid for existing matching license', async () => {
      const futureDate = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);
      mockPrismaService.tradeLicense.findUnique.mockResolvedValue({
        licenseNumber: 'LIC-123',
        country: 'US',
        expiryDate: futureDate,
      });

      const result = await service.validateLicense('LIC-123', 'US');

      expect(result.valid).toBe(true);
      expect(result.license).toBeDefined();
    });

    it('should return invalid for non-existing license', async () => {
      mockPrismaService.tradeLicense.findUnique.mockResolvedValue(null);

      const result = await service.validateLicense('FAKE-LICENSE', 'US');

      expect(result.valid).toBe(false);
      expect(result.reason).toBe('License not found');
    });

    it('should return invalid for country mismatch', async () => {
      mockPrismaService.tradeLicense.findUnique.mockResolvedValue({
        licenseNumber: 'LIC-123',
        country: 'GB', // Different country
        expiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      });

      const result = await service.validateLicense('LIC-123', 'US');

      expect(result.valid).toBe(false);
      expect(result.reason).toBe('License country mismatch');
    });

    it('should return invalid for expired license', async () => {
      const pastDate = new Date(Date.now() - 24 * 60 * 60 * 1000); // Yesterday
      mockPrismaService.tradeLicense.findUnique.mockResolvedValue({
        licenseNumber: 'LIC-123',
        country: 'US',
        expiryDate: pastDate,
      });

      const result = await service.validateLicense('LIC-123', 'US');

      expect(result.valid).toBe(false);
      expect(result.reason).toBe('License expired');
    });

    it('should handle license with no expiry date', async () => {
      mockPrismaService.tradeLicense.findUnique.mockResolvedValue({
        licenseNumber: 'LIC-123',
        country: 'US',
        expiryDate: null,
      });

      const result = await service.validateLicense('LIC-123', 'US');

      expect(result.valid).toBe(true);
    });
  });

  describe('getComplianceAnalytics', () => {
    beforeEach(() => {
      mockPrismaService.complianceCheck.count.mockResolvedValue(0);
    });

    it('should return analytics for all checks when no params', async () => {
      mockPrismaService.complianceCheck.count
        .mockResolvedValueOnce(100) // total
        .mockResolvedValueOnce(80) // approved
        .mockResolvedValueOnce(10) // restricted
        .mockResolvedValueOnce(5) // prohibited
        .mockResolvedValueOnce(5); // requiresLicense

      const result = await service.getComplianceAnalytics();

      expect(result.total).toBe(100);
      expect(result.approved).toBe(80);
      expect(result.restricted).toBe(10);
      expect(result.prohibited).toBe(5);
      expect(result.requiresLicense).toBe(5);
      expect(result.approvalRate).toBe(80);
    });

    it('should filter by date range', async () => {
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-31');

      mockPrismaService.complianceCheck.count.mockResolvedValue(50);

      await service.getComplianceAnalytics({ startDate, endDate });

      expect(mockPrismaService.complianceCheck.count).toHaveBeenCalledWith({
        where: expect.objectContaining({
          createdAt: {
            gte: startDate,
            lte: endDate,
          },
        }),
      });
    });

    it('should filter by country', async () => {
      mockPrismaService.complianceCheck.count.mockResolvedValue(25);

      await service.getComplianceAnalytics({ country: 'GB' });

      expect(mockPrismaService.complianceCheck.count).toHaveBeenCalledWith({
        where: expect.objectContaining({
          destinationCountry: 'GB',
        }),
      });
    });

    it('should return 0 approval rate when no checks', async () => {
      mockPrismaService.complianceCheck.count.mockResolvedValue(0);

      const result = await service.getComplianceAnalytics();

      expect(result.approvalRate).toBe(0);
    });

    it('should calculate approval rate correctly', async () => {
      mockPrismaService.complianceCheck.count
        .mockResolvedValueOnce(200) // total
        .mockResolvedValueOnce(150) // approved
        .mockResolvedValueOnce(30)
        .mockResolvedValueOnce(10)
        .mockResolvedValueOnce(10);

      const result = await service.getComplianceAnalytics();

      expect(result.approvalRate).toBe(75); // 150/200 * 100
    });

    it('should combine date and country filters', async () => {
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-12-31');

      mockPrismaService.complianceCheck.count.mockResolvedValue(0);

      await service.getComplianceAnalytics({
        startDate,
        endDate,
        country: 'DE',
      });

      expect(mockPrismaService.complianceCheck.count).toHaveBeenCalledWith({
        where: {
          createdAt: {
            gte: startDate,
            lte: endDate,
          },
          destinationCountry: 'DE',
        },
      });
    });
  });

  describe('checkCategoryRestrictions (private method tested via checkCompliance)', () => {
    beforeEach(() => {
      mockPrismaService.complianceCheck.create.mockResolvedValue({});
      mockPrismaService.hSCodeRestriction.findMany.mockResolvedValue([]);
    });

    it('should query category restrictions with correct parameters', async () => {
      mockPrismaService.product.findUnique.mockResolvedValue({
        id: 'product-1',
        categoryId: 'electronics',
      });

      mockPrismaService.categoryRestriction.findMany.mockResolvedValue([]);

      await service.checkCompliance({
        productId: 'product-1',
        originCountry: 'US',
        destinationCountry: 'CN',
      });

      expect(mockPrismaService.categoryRestriction.findMany).toHaveBeenCalledWith({
        where: {
          categoryId: 'electronics',
          country: 'CN',
        },
      });
    });
  });

  describe('checkHSCodeRestrictions (private method tested via checkCompliance)', () => {
    beforeEach(() => {
      mockPrismaService.complianceCheck.create.mockResolvedValue({});
      mockPrismaService.product.findUnique.mockResolvedValue(null);
      mockPrismaService.categoryRestriction.findMany.mockResolvedValue([]);
    });

    it('should query HS code restrictions with correct parameters', async () => {
      mockPrismaService.hSCodeRestriction.findMany.mockResolvedValue([]);

      await service.checkCompliance({
        productId: 'product-1',
        originCountry: 'US',
        destinationCountry: 'RU',
        hsCode: '8471.30.00',
      });

      expect(mockPrismaService.hSCodeRestriction.findMany).toHaveBeenCalledWith({
        where: {
          hsCode: '8471.30.00',
          country: 'RU',
        },
      });
    });

    it('should not check HS code restrictions when hsCode is not provided', async () => {
      await service.checkCompliance({
        productId: 'product-1',
        originCountry: 'US',
        destinationCountry: 'GB',
      });

      expect(mockPrismaService.hSCodeRestriction.findMany).not.toHaveBeenCalled();
    });
  });

  describe('requiresSpecialDocumentation (private method tested via getExportDocumentation)', () => {
    it('should require special docs for 8471 (computers)', async () => {
      const result = await service.getExportDocumentation({
        originCountry: 'US',
        destinationCountry: 'GB',
        productValue: 100,
        hsCode: '8471.50.00',
      });

      expect(result.requiredDocuments).toContain('SPECIAL_PERMIT');
    });

    it('should require special docs for 8528 (displays)', async () => {
      const result = await service.getExportDocumentation({
        originCountry: 'US',
        destinationCountry: 'GB',
        productValue: 100,
        hsCode: '8528.51.00',
      });

      expect(result.requiredDocuments).toContain('SPECIAL_PERMIT');
    });

    it('should require special docs for 9999 (catch-all)', async () => {
      const result = await service.getExportDocumentation({
        originCountry: 'US',
        destinationCountry: 'GB',
        productValue: 100,
        hsCode: '9999.00.00',
      });

      expect(result.requiredDocuments).toContain('SPECIAL_PERMIT');
    });

    it('should not require special docs for other HS codes', async () => {
      const result = await service.getExportDocumentation({
        originCountry: 'US',
        destinationCountry: 'GB',
        productValue: 100,
        hsCode: '6201.11.00', // Apparel
      });

      expect(result.requiredDocuments).not.toContain('SPECIAL_PERMIT');
    });
  });

  describe('estimateProcessingTime (private method tested via getExportDocumentation)', () => {
    it('should calculate processing time as ceil(documentCount / 2)', async () => {
      // 2 docs (commercial invoice, packing list) = ceil(2/2) = 1 day
      const result1 = await service.getExportDocumentation({
        originCountry: 'US',
        destinationCountry: 'US',
        productValue: 100,
      });
      expect(result1.estimatedProcessingDays).toBe(1);

      // 5 docs = ceil(5/2) = 3 days
      const result2 = await service.getExportDocumentation({
        originCountry: 'US',
        destinationCountry: 'GB',
        productValue: 15000, // Certificate of origin
        hsCode: '8471.30.00', // Special permit + product certification
      });
      // Documents: commercial invoice, packing list, customs declaration, certificate of origin, special permit, product certification = 6
      // ceil(6/2) = 3
      expect(result2.estimatedProcessingDays).toBe(3);
    });
  });
});
