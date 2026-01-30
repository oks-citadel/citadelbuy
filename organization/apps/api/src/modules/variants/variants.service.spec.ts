import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { VariantsService } from './variants.service';
import { PrismaService } from '../../common/prisma/prisma.service';

describe('VariantsService', () => {
  let service: VariantsService;
  let prisma: PrismaService;

  const mockPrismaService = {
    variantOption: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    variantOptionValue: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    productVariant: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    productVariantOption: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    productVariantOptionValue: {
      createMany: jest.fn(),
      deleteMany: jest.fn(),
      count: jest.fn(),
    },
    product: {
      findUnique: jest.fn(),
    },
  };

  const mockVariantOption = {
    id: 'option-123',
    name: 'Size',
    displayName: 'Size',
    type: 'SELECT',
    position: 0,
    isRequired: true,
    createdAt: new Date('2025-01-01T10:00:00Z'),
    updatedAt: new Date('2025-01-15T10:00:00Z'),
    values: [],
  };

  const mockVariantOptionValue = {
    id: 'value-123',
    optionId: 'option-123',
    value: 'Large',
    displayValue: 'L',
    hexColor: null,
    imageUrl: null,
    position: 0,
    isAvailable: true,
    priceAdjustment: 0,
    createdAt: new Date('2025-01-01T10:00:00Z'),
    updatedAt: new Date('2025-01-15T10:00:00Z'),
    option: mockVariantOption,
  };

  const mockProduct = {
    id: 'product-123',
    name: 'Test Product',
    slug: 'test-product',
    sku: 'TEST-001',
    price: 99.99,
    createdAt: new Date('2025-01-01T10:00:00Z'),
  };

  const mockProductVariant = {
    id: 'variant-123',
    productId: 'product-123',
    sku: 'TEST-001-L',
    name: 'Large',
    price: 99.99,
    stock: 10,
    attributes: { size: 'Large' },
    images: [],
    isDefault: false,
    compareAtPrice: null,
    costPerItem: null,
    weight: null,
    barcode: null,
    taxable: true,
    trackQuantity: true,
    continueSellingWhenOutOfStock: false,
    requiresShipping: true,
    position: 0,
    isAvailable: true,
    createdAt: new Date('2025-01-01T10:00:00Z'),
    updatedAt: new Date('2025-01-15T10:00:00Z'),
    product: mockProduct,
    optionValues: [],
  };

  const mockProductVariantOption = {
    id: 'pvo-123',
    productId: 'product-123',
    optionId: 'option-123',
    position: 0,
    option: {
      ...mockVariantOption,
      values: [mockVariantOptionValue],
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VariantsService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<VariantsService>(VariantsService);
    prisma = module.get<PrismaService>(PrismaService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // ==================== VARIANT OPTION MANAGEMENT ====================

  describe('createVariantOption', () => {
    it('should create a variant option successfully', async () => {
      // Arrange
      const dto = {
        name: 'Color',
        displayName: 'Color',
        type: 'COLOR',
        position: 1,
        isRequired: true,
      };
      mockPrismaService.variantOption.findUnique.mockResolvedValue(null);
      mockPrismaService.variantOption.create.mockResolvedValue({
        ...mockVariantOption,
        ...dto,
        id: 'option-456',
      });

      // Act
      const result = await service.createVariantOption(dto);

      // Assert
      expect(result.name).toBe('Color');
      expect(mockPrismaService.variantOption.create).toHaveBeenCalledWith({
        data: {
          name: dto.name,
          displayName: dto.displayName,
          type: dto.type,
          position: dto.position,
          isRequired: dto.isRequired,
        },
        include: { values: true },
      });
    });

    it('should throw ConflictException when option name already exists', async () => {
      // Arrange
      const dto = { name: 'Size', displayName: 'Size' };
      mockPrismaService.variantOption.findUnique.mockResolvedValue(mockVariantOption);

      // Act & Assert
      await expect(service.createVariantOption(dto)).rejects.toThrow(ConflictException);
      await expect(service.createVariantOption(dto)).rejects.toThrow(
        "Variant option with name 'Size' already exists",
      );
    });

    it('should use default values for optional fields', async () => {
      // Arrange
      const dto = { name: 'Material', displayName: 'Material' };
      mockPrismaService.variantOption.findUnique.mockResolvedValue(null);
      mockPrismaService.variantOption.create.mockResolvedValue({
        ...mockVariantOption,
        name: 'Material',
        type: 'SELECT',
        position: 0,
        isRequired: true,
      });

      // Act
      await service.createVariantOption(dto);

      // Assert
      expect(mockPrismaService.variantOption.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          type: 'SELECT',
          position: 0,
          isRequired: true,
        }),
        include: { values: true },
      });
    });
  });

  describe('findAllVariantOptions', () => {
    it('should return all variant options with values', async () => {
      // Arrange
      const mockOptions = [mockVariantOption];
      mockPrismaService.variantOption.findMany.mockResolvedValue(mockOptions);

      // Act
      const result = await service.findAllVariantOptions();

      // Assert
      expect(result).toEqual(mockOptions);
      expect(mockPrismaService.variantOption.findMany).toHaveBeenCalledWith({
        include: {
          values: {
            orderBy: { position: 'asc' },
          },
        },
        orderBy: { position: 'asc' },
      });
    });
  });

  describe('findVariantOptionById', () => {
    it('should return variant option by ID', async () => {
      // Arrange
      const id = 'option-123';
      mockPrismaService.variantOption.findUnique.mockResolvedValue(mockVariantOption);

      // Act
      const result = await service.findVariantOptionById(id);

      // Assert
      expect(result).toEqual(mockVariantOption);
    });

    it('should throw NotFoundException when option not found', async () => {
      // Arrange
      const id = 'non-existent';
      mockPrismaService.variantOption.findUnique.mockResolvedValue(null);

      // Act & Assert
      await expect(service.findVariantOptionById(id)).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateVariantOption', () => {
    it('should update variant option successfully', async () => {
      // Arrange
      const id = 'option-123';
      const dto = { displayName: 'Updated Size', position: 2 };
      mockPrismaService.variantOption.findUnique.mockResolvedValue(mockVariantOption);
      mockPrismaService.variantOption.update.mockResolvedValue({
        ...mockVariantOption,
        ...dto,
      });

      // Act
      const result = await service.updateVariantOption(id, dto);

      // Assert
      expect(result.displayName).toBe('Updated Size');
      expect(result.position).toBe(2);
    });
  });

  describe('deleteVariantOption', () => {
    it('should delete variant option successfully', async () => {
      // Arrange
      const id = 'option-123';
      mockPrismaService.variantOption.findUnique.mockResolvedValue(mockVariantOption);
      mockPrismaService.productVariantOption.count.mockResolvedValue(0);
      mockPrismaService.variantOption.delete.mockResolvedValue(mockVariantOption);

      // Act
      const result = await service.deleteVariantOption(id);

      // Assert
      expect(result).toEqual(mockVariantOption);
    });

    it('should throw BadRequestException when option is in use', async () => {
      // Arrange
      const id = 'option-123';
      mockPrismaService.variantOption.findUnique.mockResolvedValue(mockVariantOption);
      mockPrismaService.productVariantOption.count.mockResolvedValue(5);

      // Act & Assert
      await expect(service.deleteVariantOption(id)).rejects.toThrow(BadRequestException);
      await expect(service.deleteVariantOption(id)).rejects.toThrow(
        'Cannot delete variant option that is used by 5 product(s)',
      );
    });
  });

  // ==================== VARIANT OPTION VALUE MANAGEMENT ====================

  describe('createVariantOptionValue', () => {
    it('should create a variant option value successfully', async () => {
      // Arrange
      const dto = {
        optionId: 'option-123',
        value: 'Medium',
        displayValue: 'M',
        position: 1,
      };
      mockPrismaService.variantOption.findUnique.mockResolvedValue(mockVariantOption);
      mockPrismaService.variantOptionValue.create.mockResolvedValue({
        ...mockVariantOptionValue,
        ...dto,
        id: 'value-456',
      });

      // Act
      const result = await service.createVariantOptionValue(dto);

      // Assert
      expect(result.value).toBe('Medium');
      expect(result.displayValue).toBe('M');
    });

    it('should create value with color and image', async () => {
      // Arrange
      const dto = {
        optionId: 'option-123',
        value: 'Red',
        displayValue: 'Red',
        hexColor: '#FF0000',
        imageUrl: 'https://example.com/red.png',
        priceAdjustment: 5.0,
      };
      mockPrismaService.variantOption.findUnique.mockResolvedValue(mockVariantOption);
      mockPrismaService.variantOptionValue.create.mockResolvedValue({
        ...mockVariantOptionValue,
        ...dto,
      });

      // Act
      const result = await service.createVariantOptionValue(dto);

      // Assert
      expect(result.hexColor).toBe('#FF0000');
      expect(result.priceAdjustment).toBe(5.0);
    });
  });

  describe('findAllVariantOptionValues', () => {
    it('should return all values', async () => {
      // Arrange
      mockPrismaService.variantOptionValue.findMany.mockResolvedValue([mockVariantOptionValue]);

      // Act
      const result = await service.findAllVariantOptionValues();

      // Assert
      expect(result).toHaveLength(1);
    });

    it('should filter by optionId', async () => {
      // Arrange
      const optionId = 'option-123';
      mockPrismaService.variantOptionValue.findMany.mockResolvedValue([mockVariantOptionValue]);

      // Act
      await service.findAllVariantOptionValues(optionId);

      // Assert
      expect(mockPrismaService.variantOptionValue.findMany).toHaveBeenCalledWith({
        where: { optionId },
        include: { option: true },
        orderBy: { position: 'asc' },
      });
    });
  });

  describe('findVariantOptionValueById', () => {
    it('should return value by ID', async () => {
      // Arrange
      const id = 'value-123';
      mockPrismaService.variantOptionValue.findUnique.mockResolvedValue(mockVariantOptionValue);

      // Act
      const result = await service.findVariantOptionValueById(id);

      // Assert
      expect(result).toEqual(mockVariantOptionValue);
    });

    it('should throw NotFoundException when value not found', async () => {
      // Arrange
      const id = 'non-existent';
      mockPrismaService.variantOptionValue.findUnique.mockResolvedValue(null);

      // Act & Assert
      await expect(service.findVariantOptionValueById(id)).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateVariantOptionValue', () => {
    it('should update value successfully', async () => {
      // Arrange
      const id = 'value-123';
      const dto = { displayValue: 'XL', priceAdjustment: 10.0 };
      mockPrismaService.variantOptionValue.findUnique.mockResolvedValue(mockVariantOptionValue);
      mockPrismaService.variantOptionValue.update.mockResolvedValue({
        ...mockVariantOptionValue,
        ...dto,
      });

      // Act
      const result = await service.updateVariantOptionValue(id, dto);

      // Assert
      expect(result.displayValue).toBe('XL');
      expect(result.priceAdjustment).toBe(10.0);
    });
  });

  describe('deleteVariantOptionValue', () => {
    it('should delete value successfully', async () => {
      // Arrange
      const id = 'value-123';
      mockPrismaService.variantOptionValue.findUnique.mockResolvedValue(mockVariantOptionValue);
      mockPrismaService.productVariantOptionValue.count.mockResolvedValue(0);
      mockPrismaService.variantOptionValue.delete.mockResolvedValue(mockVariantOptionValue);

      // Act
      const result = await service.deleteVariantOptionValue(id);

      // Assert
      expect(result).toEqual(mockVariantOptionValue);
    });

    it('should throw BadRequestException when value is in use', async () => {
      // Arrange
      const id = 'value-123';
      mockPrismaService.variantOptionValue.findUnique.mockResolvedValue(mockVariantOptionValue);
      mockPrismaService.productVariantOptionValue.count.mockResolvedValue(3);

      // Act & Assert
      await expect(service.deleteVariantOptionValue(id)).rejects.toThrow(BadRequestException);
    });
  });

  // ==================== PRODUCT VARIANT MANAGEMENT ====================

  describe('createProductVariant', () => {
    it('should create a product variant successfully', async () => {
      // Arrange
      const dto = {
        productId: 'product-123',
        sku: 'TEST-001-XL',
        name: 'Extra Large',
        price: 109.99,
        stock: 20,
      };
      const createdVariant = { ...mockProductVariant, ...dto, id: 'variant-456' };
      mockPrismaService.product.findUnique.mockResolvedValue(mockProduct);
      mockPrismaService.productVariant.findUnique.mockImplementation((args) => {
        if (args.where.sku) return Promise.resolve(null); // SKU uniqueness check
        return Promise.resolve(createdVariant); // getVariantWithDetails
      });
      mockPrismaService.productVariant.create.mockResolvedValue(createdVariant);

      // Act
      const result = await service.createProductVariant(dto);

      // Assert
      expect(result.sku).toBe('TEST-001-XL');
      expect(result.price).toBe(109.99);
    });

    it('should throw NotFoundException when product not found', async () => {
      // Arrange
      const dto = {
        productId: 'non-existent',
        sku: 'TEST-001-XL',
        name: 'Extra Large',
        price: 109.99,
      };
      mockPrismaService.product.findUnique.mockResolvedValue(null);

      // Act & Assert
      await expect(service.createProductVariant(dto)).rejects.toThrow(NotFoundException);
    });

    it('should throw ConflictException when SKU already exists', async () => {
      // Arrange
      const dto = {
        productId: 'product-123',
        sku: 'TEST-001-L',
        name: 'Large',
        price: 99.99,
      };
      mockPrismaService.product.findUnique.mockResolvedValue(mockProduct);
      mockPrismaService.productVariant.findUnique.mockResolvedValue(mockProductVariant);

      // Act & Assert
      await expect(service.createProductVariant(dto)).rejects.toThrow(ConflictException);
    });

    it('should throw ConflictException when barcode already exists', async () => {
      // Arrange
      const dto = {
        productId: 'product-123',
        sku: 'TEST-001-NEW',
        name: 'New Variant',
        price: 99.99,
        barcode: '123456789',
      };
      mockPrismaService.product.findUnique.mockResolvedValue(mockProduct);
      mockPrismaService.productVariant.findUnique
        .mockResolvedValueOnce(null) // SKU check
        .mockResolvedValueOnce({ barcode: '123456789' }); // Barcode check

      // Act & Assert
      await expect(service.createProductVariant(dto)).rejects.toThrow(ConflictException);
    });

    it('should link option values when provided', async () => {
      // Arrange
      const dto = {
        productId: 'product-123',
        sku: 'TEST-001-XL',
        name: 'Extra Large',
        price: 109.99,
        optionValueIds: ['value-123', 'value-456'],
      };
      mockPrismaService.product.findUnique.mockResolvedValue(mockProduct);
      mockPrismaService.productVariant.findUnique
        .mockResolvedValueOnce(null)
        .mockResolvedValue(mockProductVariant);
      mockPrismaService.productVariant.create.mockResolvedValue({
        ...mockProductVariant,
        ...dto,
      });
      mockPrismaService.productVariantOptionValue.createMany.mockResolvedValue({ count: 2 });

      // Act
      await service.createProductVariant(dto);

      // Assert
      expect(mockPrismaService.productVariantOptionValue.createMany).toHaveBeenCalledWith({
        data: [
          { variantId: mockProductVariant.id, valueId: 'value-123' },
          { variantId: mockProductVariant.id, valueId: 'value-456' },
        ],
        skipDuplicates: true,
      });
    });
  });

  describe('findAllProductVariants', () => {
    it('should return all variants', async () => {
      // Arrange
      mockPrismaService.productVariant.findMany.mockResolvedValue([mockProductVariant]);

      // Act
      const result = await service.findAllProductVariants();

      // Assert
      expect(result).toHaveLength(1);
    });

    it('should filter by productId', async () => {
      // Arrange
      const productId = 'product-123';
      mockPrismaService.productVariant.findMany.mockResolvedValue([mockProductVariant]);

      // Act
      await service.findAllProductVariants(productId);

      // Assert
      expect(mockPrismaService.productVariant.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { productId },
        }),
      );
    });
  });

  describe('findProductVariantById', () => {
    it('should return variant by ID', async () => {
      // Arrange
      const id = 'variant-123';
      mockPrismaService.productVariant.findUnique.mockResolvedValue(mockProductVariant);

      // Act
      const result = await service.findProductVariantById(id);

      // Assert
      expect(result).toEqual(mockProductVariant);
    });

    it('should throw NotFoundException when variant not found', async () => {
      // Arrange
      const id = 'non-existent';
      mockPrismaService.productVariant.findUnique.mockResolvedValue(null);

      // Act & Assert
      await expect(service.findProductVariantById(id)).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateProductVariant', () => {
    it('should update variant successfully', async () => {
      // Arrange
      const id = 'variant-123';
      const dto = { price: 119.99, stock: 50 };
      const updatedVariant = { ...mockProductVariant, ...dto };
      // First call: getVariantWithDetails (check existence), Second call: getVariantWithDetails (return updated)
      mockPrismaService.productVariant.findUnique
        .mockResolvedValueOnce(mockProductVariant)
        .mockResolvedValueOnce(updatedVariant);
      mockPrismaService.productVariant.update.mockResolvedValue(updatedVariant);

      // Act
      const result = await service.updateProductVariant(id, dto);

      // Assert
      expect(result.price).toBe(119.99);
      expect(result.stock).toBe(50);
    });

    it('should throw ConflictException when updating to existing SKU', async () => {
      // Arrange
      const id = 'variant-123';
      const dto = { sku: 'EXISTING-SKU' };
      mockPrismaService.productVariant.findUnique
        .mockResolvedValueOnce(mockProductVariant) // getVariantWithDetails
        .mockResolvedValueOnce({ id: 'other-variant', sku: 'EXISTING-SKU' }); // SKU check

      // Act & Assert
      await expect(service.updateProductVariant(id, dto)).rejects.toThrow(ConflictException);
    });

    it('should update option values when provided', async () => {
      // Arrange
      const id = 'variant-123';
      const dto = { optionValueIds: ['value-new'] };
      mockPrismaService.productVariant.findUnique.mockResolvedValue(mockProductVariant);
      mockPrismaService.productVariant.update.mockResolvedValue(mockProductVariant);
      mockPrismaService.productVariantOptionValue.deleteMany.mockResolvedValue({ count: 1 });
      mockPrismaService.productVariantOptionValue.createMany.mockResolvedValue({ count: 1 });

      // Act
      await service.updateProductVariant(id, dto);

      // Assert
      expect(mockPrismaService.productVariantOptionValue.deleteMany).toHaveBeenCalled();
      expect(mockPrismaService.productVariantOptionValue.createMany).toHaveBeenCalled();
    });
  });

  describe('deleteProductVariant', () => {
    it('should delete variant successfully', async () => {
      // Arrange
      const id = 'variant-123';
      mockPrismaService.productVariant.findUnique.mockResolvedValue(mockProductVariant);
      mockPrismaService.productVariant.delete.mockResolvedValue(mockProductVariant);

      // Act
      const result = await service.deleteProductVariant(id);

      // Assert
      expect(result).toEqual(mockProductVariant);
    });
  });

  describe('bulkCreateVariants', () => {
    it('should create multiple variants', async () => {
      // Arrange
      const dto = {
        productId: 'product-123',
        variants: [
          { sku: 'TEST-S', name: 'Small', price: 89.99 },
          { sku: 'TEST-M', name: 'Medium', price: 99.99 },
        ],
      };
      mockPrismaService.product.findUnique.mockResolvedValue(mockProduct);
      mockPrismaService.productVariant.findUnique.mockImplementation((args) => {
        if (args.where.sku) return Promise.resolve(null);
        return Promise.resolve(mockProductVariant);
      });
      mockPrismaService.productVariant.create.mockResolvedValue(mockProductVariant);

      // Act
      const result = await service.bulkCreateVariants(dto);

      // Assert
      expect(result).toHaveLength(2);
    });
  });

  describe('bulkUpdateInventory', () => {
    it('should update inventory for multiple variants', async () => {
      // Arrange
      const dto = {
        updates: [
          { variantId: 'variant-1', stock: 100 },
          { variantId: 'variant-2', stock: 50 },
        ],
      };
      mockPrismaService.productVariant.update.mockResolvedValue(mockProductVariant);

      // Act
      const result = await service.bulkUpdateInventory(dto);

      // Assert
      expect(result).toHaveLength(2);
      expect(mockPrismaService.productVariant.update).toHaveBeenCalledTimes(2);
    });
  });

  // ==================== PRODUCT-VARIANT OPTION LINKING ====================

  describe('addVariantOptionToProduct', () => {
    it('should link option to product successfully', async () => {
      // Arrange
      const dto = {
        productId: 'product-123',
        optionId: 'option-123',
        position: 0,
      };
      mockPrismaService.product.findUnique.mockResolvedValue(mockProduct);
      mockPrismaService.variantOption.findUnique.mockResolvedValue(mockVariantOption);
      mockPrismaService.productVariantOption.findUnique.mockResolvedValue(null);
      mockPrismaService.productVariantOption.create.mockResolvedValue(mockProductVariantOption);

      // Act
      const result = await service.addVariantOptionToProduct(dto);

      // Assert
      expect(result).toEqual(mockProductVariantOption);
    });

    it('should throw NotFoundException when product not found', async () => {
      // Arrange
      const dto = { productId: 'non-existent', optionId: 'option-123' };
      mockPrismaService.product.findUnique.mockResolvedValue(null);

      // Act & Assert
      await expect(service.addVariantOptionToProduct(dto)).rejects.toThrow(NotFoundException);
    });

    it('should throw ConflictException when already linked', async () => {
      // Arrange
      const dto = { productId: 'product-123', optionId: 'option-123' };
      mockPrismaService.product.findUnique.mockResolvedValue(mockProduct);
      mockPrismaService.variantOption.findUnique.mockResolvedValue(mockVariantOption);
      mockPrismaService.productVariantOption.findUnique.mockResolvedValue(mockProductVariantOption);

      // Act & Assert
      await expect(service.addVariantOptionToProduct(dto)).rejects.toThrow(ConflictException);
    });
  });

  describe('removeVariantOptionFromProduct', () => {
    it('should remove link successfully', async () => {
      // Arrange
      const dto = { productId: 'product-123', optionId: 'option-123' };
      mockPrismaService.productVariantOption.findUnique.mockResolvedValue(mockProductVariantOption);
      mockPrismaService.productVariantOption.delete.mockResolvedValue(mockProductVariantOption);

      // Act
      const result = await service.removeVariantOptionFromProduct(dto);

      // Assert
      expect(result).toEqual(mockProductVariantOption);
    });

    it('should throw NotFoundException when not linked', async () => {
      // Arrange
      const dto = { productId: 'product-123', optionId: 'option-456' };
      mockPrismaService.productVariantOption.findUnique.mockResolvedValue(null);

      // Act & Assert
      await expect(service.removeVariantOptionFromProduct(dto)).rejects.toThrow(NotFoundException);
    });
  });

  describe('bulkAddVariantOptions', () => {
    it('should add multiple options to product', async () => {
      // Arrange
      const dto = {
        productId: 'product-123',
        optionIds: ['option-1', 'option-2'],
      };
      mockPrismaService.product.findUnique.mockResolvedValue(mockProduct);
      mockPrismaService.variantOption.findUnique.mockResolvedValue(mockVariantOption);
      mockPrismaService.productVariantOption.findUnique.mockResolvedValue(null);
      mockPrismaService.productVariantOption.create.mockResolvedValue(mockProductVariantOption);

      // Act
      const result = await service.bulkAddVariantOptions(dto);

      // Assert
      expect(result).toHaveLength(2);
    });

    it('should handle errors gracefully for individual options', async () => {
      // Arrange
      const dto = {
        productId: 'product-123',
        optionIds: ['option-1', 'option-2'],
      };
      mockPrismaService.product.findUnique.mockResolvedValue(mockProduct);
      mockPrismaService.variantOption.findUnique
        .mockResolvedValueOnce(mockVariantOption)
        .mockResolvedValueOnce(null); // Second option not found
      mockPrismaService.productVariantOption.findUnique.mockResolvedValue(null);
      mockPrismaService.productVariantOption.create.mockResolvedValue(mockProductVariantOption);

      // Act
      const result = await service.bulkAddVariantOptions(dto);

      // Assert
      expect(result).toHaveLength(2);
      expect(result[1]).toHaveProperty('error');
    });
  });

  describe('getProductVariantOptions', () => {
    it('should return product variant options', async () => {
      // Arrange
      const productId = 'product-123';
      mockPrismaService.productVariantOption.findMany.mockResolvedValue([mockProductVariantOption]);

      // Act
      const result = await service.getProductVariantOptions(productId);

      // Assert
      expect(result).toHaveLength(1);
    });
  });

  // ==================== VARIANT COMBINATION GENERATION ====================

  describe('generateVariantCombinations', () => {
    it('should generate variant combinations', async () => {
      // Arrange
      const dto = {
        productId: 'product-123',
        basePrice: 99.99,
        baseStock: 10,
        autoGenerateSku: true,
      };
      mockPrismaService.product.findUnique.mockResolvedValue(mockProduct);
      mockPrismaService.productVariantOption.findMany.mockResolvedValue([
        {
          ...mockProductVariantOption,
          option: {
            ...mockVariantOption,
            values: [
              { ...mockVariantOptionValue, id: 'v1', value: 'Small', displayValue: 'S', priceAdjustment: 0 },
              { ...mockVariantOptionValue, id: 'v2', value: 'Large', displayValue: 'L', priceAdjustment: 10 },
            ],
          },
        },
      ]);
      // SKU uniqueness check returns null (no conflict), ID lookup returns the variant
      mockPrismaService.productVariant.findUnique.mockImplementation((args) => {
        if (args.where.sku) return Promise.resolve(null); // SKU check
        return Promise.resolve({ ...mockProductVariant, ...args.where }); // ID lookup
      });
      mockPrismaService.productVariant.create.mockImplementation((args) =>
        Promise.resolve({
          ...mockProductVariant,
          ...args.data,
          id: `variant-${Date.now()}`,
        }),
      );
      mockPrismaService.productVariantOptionValue.createMany.mockResolvedValue({ count: 1 });

      // Act
      const result = await service.generateVariantCombinations(dto);

      // Assert
      expect(result.productId).toBe(dto.productId);
      expect(result.totalCombinations).toBe(2);
      expect(result.createdVariants).toBe(2);
    });

    it('should throw NotFoundException when product not found', async () => {
      // Arrange
      const dto = { productId: 'non-existent' };
      mockPrismaService.product.findUnique.mockResolvedValue(null);

      // Act & Assert
      await expect(service.generateVariantCombinations(dto)).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when no options configured', async () => {
      // Arrange
      const dto = { productId: 'product-123' };
      mockPrismaService.product.findUnique.mockResolvedValue(mockProduct);
      mockPrismaService.productVariantOption.findMany.mockResolvedValue([]);

      // Act & Assert
      await expect(service.generateVariantCombinations(dto)).rejects.toThrow(BadRequestException);
      await expect(service.generateVariantCombinations(dto)).rejects.toThrow(
        'Product has no variant options configured',
      );
    });

    it('should use product price as base when not provided', async () => {
      // Arrange
      const dto = { productId: 'product-123' };
      mockPrismaService.product.findUnique.mockResolvedValue(mockProduct);
      mockPrismaService.productVariantOption.findMany.mockResolvedValue([
        {
          ...mockProductVariantOption,
          option: {
            ...mockVariantOption,
            values: [
              { ...mockVariantOptionValue, priceAdjustment: 0 },
            ],
          },
        },
      ]);
      mockPrismaService.productVariant.findUnique.mockImplementation((args) => {
        if (args.where.sku) return Promise.resolve(null);
        return Promise.resolve(mockProductVariant);
      });
      mockPrismaService.productVariant.create.mockResolvedValue(mockProductVariant);
      mockPrismaService.productVariantOptionValue.createMany.mockResolvedValue({ count: 1 });

      // Act
      const result = await service.generateVariantCombinations(dto);

      // Assert
      expect(result.createdVariants).toBe(1);
    });
  });
});
