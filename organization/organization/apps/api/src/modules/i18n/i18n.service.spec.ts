import { Test, TestingModule } from '@nestjs/testing';
import { I18nService } from './i18n.service';
import { PrismaService } from '@/common/prisma/prisma.service';
import {
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';

describe('I18nService', () => {
  let service: I18nService;
  let prismaService: PrismaService;

  const mockPrismaService = {
    language: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
      delete: jest.fn(),
    },
    translation: {
      upsert: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
      groupBy: jest.fn(),
    },
    product: {
      findUnique: jest.fn(),
      count: jest.fn(),
    },
    productTranslation: {
      upsert: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    category: {
      findUnique: jest.fn(),
      count: jest.fn(),
    },
    categoryTranslation: {
      upsert: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  const mockLanguage = {
    code: 'en',
    name: 'English',
    nativeName: 'English',
    isDefault: true,
    isEnabled: true,
    isRTL: false,
    flag: '🇺🇸',
    sortOrder: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockTranslation = {
    id: 'trans-123',
    languageCode: 'en',
    key: 'welcome.message',
    value: 'Welcome to our store!',
    namespace: 'common',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockProduct = {
    id: 'product-123',
    name: 'Test Product',
    description: 'Test Description',
  };

  const mockProductTranslation = {
    id: 'pt-123',
    productId: 'product-123',
    languageCode: 'es',
    name: 'Producto de Prueba',
    description: 'Descripción de Prueba',
    slug: 'producto-de-prueba',
    language: {
      code: 'es',
      name: 'Spanish',
    },
  };

  const mockCategory = {
    id: 'category-123',
    name: 'Test Category',
  };

  const mockCategoryTranslation = {
    id: 'ct-123',
    categoryId: 'category-123',
    languageCode: 'es',
    name: 'Categoría de Prueba',
    description: 'Descripción de Categoría',
    slug: 'categoria-de-prueba',
    language: {
      code: 'es',
      name: 'Spanish',
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        I18nService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<I18nService>(I18nService);
    prismaService = module.get<PrismaService>(PrismaService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // ==================== LANGUAGE MANAGEMENT ====================

  describe('createLanguage', () => {
    it('should create a new language', async () => {
      const dto = {
        code: 'es',
        name: 'Spanish',
        nativeName: 'Español',
        isDefault: false,
        flag: '🇪🇸',
        sortOrder: 1,
      };

      mockPrismaService.language.findUnique.mockResolvedValue(null);
      mockPrismaService.language.create.mockResolvedValue({
        ...mockLanguage,
        ...dto,
      });

      const result = await service.createLanguage(dto);

      expect(result.code).toBe('es');
      expect(mockPrismaService.language.create).toHaveBeenCalled();
    });

    it('should throw BadRequestException when language code already exists', async () => {
      const dto = {
        code: 'en',
        name: 'English',
        nativeName: 'English',
      };

      mockPrismaService.language.findUnique.mockResolvedValue(mockLanguage);

      await expect(service.createLanguage(dto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should unset other defaults when creating default language', async () => {
      const dto = {
        code: 'es',
        name: 'Spanish',
        nativeName: 'Español',
        isDefault: true,
      };

      mockPrismaService.language.findUnique.mockResolvedValue(null);
      mockPrismaService.language.updateMany.mockResolvedValue({ count: 1 });
      mockPrismaService.language.create.mockResolvedValue({
        ...mockLanguage,
        ...dto,
      });

      await service.createLanguage(dto);

      expect(mockPrismaService.language.updateMany).toHaveBeenCalledWith({
        where: { isDefault: true },
        data: { isDefault: false },
      });
    });
  });

  describe('getAllLanguages', () => {
    it('should return only enabled languages by default', async () => {
      mockPrismaService.language.findMany.mockResolvedValue([mockLanguage]);

      const result = await service.getAllLanguages();

      expect(result).toHaveLength(1);
      expect(mockPrismaService.language.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { isEnabled: true },
        }),
      );
    });

    it('should return all languages when includeDisabled is true', async () => {
      mockPrismaService.language.findMany.mockResolvedValue([mockLanguage]);

      await service.getAllLanguages(true);

      expect(mockPrismaService.language.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {},
        }),
      );
    });
  });

  describe('getLanguageByCode', () => {
    it('should return language by code', async () => {
      mockPrismaService.language.findUnique.mockResolvedValue(mockLanguage);

      const result = await service.getLanguageByCode('en');

      expect(result).toEqual(mockLanguage);
    });

    it('should throw NotFoundException when language not found', async () => {
      mockPrismaService.language.findUnique.mockResolvedValue(null);

      await expect(service.getLanguageByCode('invalid')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('getDefaultLanguage', () => {
    it('should return default language', async () => {
      mockPrismaService.language.findFirst.mockResolvedValue(mockLanguage);

      const result = await service.getDefaultLanguage();

      expect(result.isDefault).toBe(true);
    });

    it('should fallback to first enabled language when no default', async () => {
      mockPrismaService.language.findFirst
        .mockResolvedValueOnce(null) // No default
        .mockResolvedValueOnce(mockLanguage); // Fallback

      const result = await service.getDefaultLanguage();

      expect(result).toBeDefined();
    });
  });

  describe('updateLanguage', () => {
    it('should update language', async () => {
      const dto = {
        name: 'Updated English',
        isEnabled: false,
      };

      mockPrismaService.language.findUnique.mockResolvedValue(mockLanguage);
      mockPrismaService.language.update.mockResolvedValue({
        ...mockLanguage,
        ...dto,
      });

      const result = await service.updateLanguage('en', dto);

      expect(result.name).toBe('Updated English');
    });

    it('should unset other defaults when updating to default', async () => {
      const dto = {
        isDefault: true,
      };

      mockPrismaService.language.findUnique.mockResolvedValue(mockLanguage);
      mockPrismaService.language.updateMany.mockResolvedValue({ count: 1 });
      mockPrismaService.language.update.mockResolvedValue({
        ...mockLanguage,
        ...dto,
      });

      await service.updateLanguage('es', dto);

      expect(mockPrismaService.language.updateMany).toHaveBeenCalledWith({
        where: { code: { not: 'es' }, isDefault: true },
        data: { isDefault: false },
      });
    });
  });

  describe('deleteLanguage', () => {
    it('should delete language', async () => {
      const nonDefaultLang = { ...mockLanguage, isDefault: false };

      mockPrismaService.language.findUnique.mockResolvedValue(nonDefaultLang);
      mockPrismaService.language.delete.mockResolvedValue(nonDefaultLang);

      const result = await service.deleteLanguage('es');

      expect(result).toEqual(nonDefaultLang);
    });

    it('should throw BadRequestException when deleting default language', async () => {
      mockPrismaService.language.findUnique.mockResolvedValue(mockLanguage);

      await expect(service.deleteLanguage('en')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  // ==================== TRANSLATION MANAGEMENT ====================

  describe('upsertTranslation', () => {
    it('should create or update translation', async () => {
      const dto = {
        languageCode: 'en',
        key: 'welcome.message',
        value: 'Welcome to our store!',
        namespace: 'common',
      };

      mockPrismaService.language.findUnique.mockResolvedValue(mockLanguage);
      mockPrismaService.translation.upsert.mockResolvedValue(mockTranslation);

      const result = await service.upsertTranslation(dto);

      expect(result).toEqual(mockTranslation);
      expect(mockPrismaService.translation.upsert).toHaveBeenCalled();
    });
  });

  describe('bulkUpsertTranslations', () => {
    it('should bulk upsert translations in transaction', async () => {
      const dto = {
        languageCode: 'en',
        namespace: 'common',
        translations: {
          'welcome.message': 'Welcome!',
          'goodbye.message': 'Goodbye!',
        },
      };

      mockPrismaService.language.findUnique.mockResolvedValue(mockLanguage);
      mockPrismaService.translation.upsert.mockResolvedValue(mockTranslation);
      mockPrismaService.$transaction.mockResolvedValue([]);

      const result = await service.bulkUpsertTranslations(dto);

      expect(result.success).toBe(true);
      expect(result.count).toBe(2);
      expect(mockPrismaService.$transaction).toHaveBeenCalled();
    });
  });

  describe('getTranslations', () => {
    it('should return translations as key-value object', async () => {
      const translations = [
        mockTranslation,
        {
          ...mockTranslation,
          key: 'goodbye.message',
          value: 'Goodbye!',
        },
      ];

      mockPrismaService.language.findUnique.mockResolvedValue(mockLanguage);
      mockPrismaService.translation.findMany.mockResolvedValue(translations);

      const result = await service.getTranslations('en');

      expect(result['welcome.message']).toBe('Welcome to our store!');
      expect(result['goodbye.message']).toBe('Goodbye!');
    });

    it('should filter by namespace', async () => {
      mockPrismaService.language.findUnique.mockResolvedValue(mockLanguage);
      mockPrismaService.translation.findMany.mockResolvedValue([]);

      await service.getTranslations('en', 'auth');

      expect(mockPrismaService.translation.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            namespace: 'auth',
          }),
        }),
      );
    });
  });

  describe('getAllTranslations', () => {
    it('should return translations grouped by namespace', async () => {
      const translations = [
        { ...mockTranslation, namespace: 'common', key: 'welcome', value: 'Welcome!' },
        { ...mockTranslation, namespace: 'common', key: 'goodbye', value: 'Goodbye!' },
        { ...mockTranslation, namespace: 'auth', key: 'login', value: 'Login' },
      ];

      mockPrismaService.language.findUnique.mockResolvedValue(mockLanguage);
      mockPrismaService.translation.findMany.mockResolvedValue(translations);

      const result = await service.getAllTranslations('en');

      expect(result.common).toBeDefined();
      expect(result.common.welcome).toBe('Welcome!');
      expect(result.auth).toBeDefined();
      expect(result.auth.login).toBe('Login');
    });
  });

  describe('updateTranslation', () => {
    it('should update translation', async () => {
      const dto = {
        value: 'Updated Welcome Message',
      };

      mockPrismaService.translation.findUnique.mockResolvedValue(mockTranslation);
      mockPrismaService.translation.update.mockResolvedValue({
        ...mockTranslation,
        ...dto,
      });

      const result = await service.updateTranslation('en', 'welcome.message', 'common', dto);

      expect(result.value).toBe('Updated Welcome Message');
    });

    it('should throw NotFoundException when translation not found', async () => {
      mockPrismaService.translation.findUnique.mockResolvedValue(null);

      await expect(
        service.updateTranslation('en', 'invalid.key', 'common', { value: 'test' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('deleteTranslation', () => {
    it('should delete translation', async () => {
      mockPrismaService.translation.delete.mockResolvedValue(mockTranslation);

      const result = await service.deleteTranslation('en', 'welcome.message', 'common');

      expect(result).toEqual(mockTranslation);
    });
  });

  // ==================== PRODUCT TRANSLATIONS ====================

  describe('upsertProductTranslation', () => {
    it('should create or update product translation', async () => {
      const dto = {
        productId: 'product-123',
        languageCode: 'es',
        name: 'Producto de Prueba',
        description: 'Descripción de Prueba',
        slug: 'producto-de-prueba',
      };

      mockPrismaService.language.findUnique.mockResolvedValue(mockLanguage);
      mockPrismaService.product.findUnique.mockResolvedValue(mockProduct);
      mockPrismaService.productTranslation.upsert.mockResolvedValue(
        mockProductTranslation,
      );

      const result = await service.upsertProductTranslation(dto);

      expect(result).toEqual(mockProductTranslation);
    });

    it('should throw NotFoundException when product not found', async () => {
      const dto = {
        productId: 'invalid-product',
        languageCode: 'es',
        name: 'Test',
      };

      mockPrismaService.language.findUnique.mockResolvedValue(mockLanguage);
      mockPrismaService.product.findUnique.mockResolvedValue(null);

      await expect(service.upsertProductTranslation(dto)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('getProductTranslations', () => {
    it('should return all product translations', async () => {
      mockPrismaService.productTranslation.findMany.mockResolvedValue([
        mockProductTranslation,
      ]);

      const result = await service.getProductTranslations('product-123');

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual(mockProductTranslation);
    });
  });

  describe('getProductTranslation', () => {
    it('should return product translation for specific language', async () => {
      mockPrismaService.productTranslation.findUnique.mockResolvedValue(
        mockProductTranslation,
      );

      const result = await service.getProductTranslation('product-123', 'es');

      expect(result).toEqual(mockProductTranslation);
    });

    it('should throw NotFoundException when translation not found', async () => {
      mockPrismaService.productTranslation.findUnique.mockResolvedValue(null);

      await expect(
        service.getProductTranslation('product-123', 'invalid'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('deleteProductTranslation', () => {
    it('should delete product translation', async () => {
      mockPrismaService.productTranslation.delete.mockResolvedValue(
        mockProductTranslation,
      );

      const result = await service.deleteProductTranslation('product-123', 'es');

      expect(result).toEqual(mockProductTranslation);
    });
  });

  // ==================== CATEGORY TRANSLATIONS ====================

  describe('upsertCategoryTranslation', () => {
    it('should create or update category translation', async () => {
      const dto = {
        categoryId: 'category-123',
        languageCode: 'es',
        name: 'Categoría de Prueba',
        description: 'Descripción de Categoría',
        slug: 'categoria-de-prueba',
      };

      mockPrismaService.language.findUnique.mockResolvedValue(mockLanguage);
      mockPrismaService.category.findUnique.mockResolvedValue(mockCategory);
      mockPrismaService.categoryTranslation.upsert.mockResolvedValue(
        mockCategoryTranslation,
      );

      const result = await service.upsertCategoryTranslation(dto);

      expect(result).toEqual(mockCategoryTranslation);
    });

    it('should throw NotFoundException when category not found', async () => {
      const dto = {
        categoryId: 'invalid-category',
        languageCode: 'es',
        name: 'Test',
      };

      mockPrismaService.language.findUnique.mockResolvedValue(mockLanguage);
      mockPrismaService.category.findUnique.mockResolvedValue(null);

      await expect(service.upsertCategoryTranslation(dto)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('getCategoryTranslations', () => {
    it('should return all category translations', async () => {
      mockPrismaService.categoryTranslation.findMany.mockResolvedValue([
        mockCategoryTranslation,
      ]);

      const result = await service.getCategoryTranslations('category-123');

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual(mockCategoryTranslation);
    });
  });

  describe('getCategoryTranslation', () => {
    it('should return category translation for specific language', async () => {
      mockPrismaService.categoryTranslation.findUnique.mockResolvedValue(
        mockCategoryTranslation,
      );

      const result = await service.getCategoryTranslation('category-123', 'es');

      expect(result).toEqual(mockCategoryTranslation);
    });

    it('should throw NotFoundException when translation not found', async () => {
      mockPrismaService.categoryTranslation.findUnique.mockResolvedValue(null);

      await expect(
        service.getCategoryTranslation('category-123', 'invalid'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('deleteCategoryTranslation', () => {
    it('should delete category translation', async () => {
      mockPrismaService.categoryTranslation.delete.mockResolvedValue(
        mockCategoryTranslation,
      );

      const result = await service.deleteCategoryTranslation('category-123', 'es');

      expect(result).toEqual(mockCategoryTranslation);
    });
  });

  // ==================== UTILITY METHODS ====================

  describe('getTranslationCoverage', () => {
    it('should return translation coverage statistics', async () => {
      mockPrismaService.translation.groupBy.mockResolvedValue([
        { key: 'key1', namespace: 'common' },
        { key: 'key2', namespace: 'common' },
      ]);
      mockPrismaService.translation.count.mockResolvedValue(1);
      mockPrismaService.product.count.mockResolvedValue(100);
      mockPrismaService.productTranslation.count.mockResolvedValue(50);
      mockPrismaService.category.count.mockResolvedValue(20);
      mockPrismaService.categoryTranslation.count.mockResolvedValue(10);

      const result = await service.getTranslationCoverage('es');

      expect(result.ui.total).toBe(2);
      expect(result.ui.translated).toBe(1);
      expect(result.ui.percentage).toBe(50);
      expect(result.products.total).toBe(100);
      expect(result.products.translated).toBe(50);
      expect(result.products.percentage).toBe(50);
      expect(result.categories.total).toBe(20);
      expect(result.categories.translated).toBe(10);
      expect(result.categories.percentage).toBe(50);
    });
  });

  describe('initializeDefaultLanguages', () => {
    it('should initialize default languages', async () => {
      mockPrismaService.language.findUnique.mockResolvedValue(null);
      mockPrismaService.language.create.mockResolvedValue(mockLanguage);

      const result = await service.initializeDefaultLanguages();

      expect(result.created).toBe(6); // en, es, fr, de, zh, ar
      expect(mockPrismaService.language.create).toHaveBeenCalledTimes(6);
    });

    it('should not create existing languages', async () => {
      mockPrismaService.language.findUnique.mockResolvedValue(mockLanguage);

      const result = await service.initializeDefaultLanguages();

      expect(result.created).toBe(0);
      expect(mockPrismaService.language.create).not.toHaveBeenCalled();
    });
  });
});
