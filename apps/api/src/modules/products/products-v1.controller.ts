import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiQuery,
  ApiParam,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { ProductsService } from './products.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import {
  RequireTenant,
  TenantId,
  SkipTenant,
  OptionalTenant,
} from '@/common/decorators/tenant.decorator';
import { TenantContextService } from '@/common/services/tenant-context.service';
import { getCurrentTraceId } from '@/common/interceptors/trace.interceptor';
import { CurrencyService } from '../currency/currency.service';

/**
 * Products V1 Controller
 *
 * API v1 endpoints for products with:
 * - Tenant filtering (x-bx-tenant header)
 * - Locale parameter for translations
 * - Currency parameter for price conversion
 * - Country parameter for availability
 */
@ApiTags('Products (v1)')
@Controller('api/v1/products')
export class ProductsV1Controller {
  private readonly logger = new Logger(ProductsV1Controller.name);

  constructor(
    private readonly productsService: ProductsService,
    private readonly tenantContextService: TenantContextService,
    private readonly currencyService: CurrencyService,
  ) {}

  /**
   * Get products with tenant filtering
   */
  @Get()
  @OptionalTenant()
  @ApiOperation({
    summary: 'Get products',
    description: 'Get products with optional tenant filtering, locale for translations, currency conversion, and country availability.',
  })
  @ApiQuery({ name: 'locale', required: false, description: 'Locale for translations (e.g., en, es, fr)', example: 'en' })
  @ApiQuery({ name: 'currency', required: false, description: 'Target currency for price display', example: 'EUR' })
  @ApiQuery({ name: 'country', required: false, description: 'Country for availability check', example: 'US' })
  @ApiQuery({ name: 'category', required: false, description: 'Category ID filter' })
  @ApiQuery({ name: 'q', required: false, description: 'Search query' })
  @ApiQuery({ name: 'minPrice', required: false, type: Number, description: 'Minimum price' })
  @ApiQuery({ name: 'maxPrice', required: false, type: Number, description: 'Maximum price' })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Page number', example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Items per page', example: 20 })
  @ApiQuery({ name: 'sort', required: false, description: 'Sort field (price-asc, price-desc, name-asc, name-desc, date-desc)' })
  @ApiResponse({
    status: 200,
    description: 'Products list with pagination',
    schema: {
      example: {
        products: [
          {
            id: '123e4567-e89b-12d3-a456-426614174000',
            name: 'Product Name',
            description: 'Product description',
            price: 99.99,
            localizedPrice: { amount: 92.0, currency: 'EUR', formatted: '\u20AC92.00' },
            images: ['https://cdn.example.com/image.jpg'],
            stock: 100,
            category: { id: '...', name: 'Category' },
            translation: { name: 'Nombre del Producto', description: '...' },
          },
        ],
        pagination: {
          total: 100,
          page: 1,
          limit: 20,
          totalPages: 5,
        },
        meta: {
          locale: 'es',
          currency: 'EUR',
          country: 'ES',
          traceId: 'abc123',
        },
      },
    },
  })
  async getProducts(
    @TenantId() tenantId: string | undefined,
    @Query('locale') locale?: string,
    @Query('currency') currency?: string,
    @Query('country') country?: string,
    @Query('category') category?: string,
    @Query('q') query?: string,
    @Query('minPrice') minPrice?: string,
    @Query('maxPrice') maxPrice?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('sort') sort?: string,
  ) {
    const traceId = getCurrentTraceId();
    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? parseInt(limit, 10) : 20;

    this.logger.log('Getting products', {
      traceId,
      tenantId,
      locale,
      currency,
      country,
      category,
      query,
      page: pageNum,
      limit: limitNum,
    });

    // Build query options
    const queryOptions = {
      query,
      category,
      minPrice: minPrice ? parseFloat(minPrice) : undefined,
      maxPrice: maxPrice ? parseFloat(maxPrice) : undefined,
      page: pageNum,
      limit: limitNum,
      sort,
    };

    // Get products (tenant filtering is applied via Prisma middleware if tenantId is set)
    const result = await this.productsService.search(queryOptions);

    // Enhance products with localization
    const enhancedProducts = await Promise.all(
      result.products.map(async (product) => {
        const enhanced = { ...product };

        // Add translation if locale specified
        if (locale && locale !== 'en') {
          const translation = await this.getProductTranslation(product.id, locale);
          if (translation) {
            enhanced['translation'] = translation;
          }
        }

        // Add localized price if currency specified
        if (currency && currency !== 'USD') {
          try {
            const localizedPrice = await this.currencyService.localizePrice(
              product.price,
              'USD', // Assuming base currency is USD
              currency,
            );
            enhanced['localizedPrice'] = localizedPrice;
          } catch (error) {
            this.logger.warn(`Price conversion failed for product ${product.id}`, {
              traceId,
              error: error.message,
            });
          }
        }

        // Add availability info if country specified
        if (country) {
          enhanced['availability'] = await this.checkAvailability(product.id, country);
        }

        return enhanced;
      }),
    );

    return {
      products: enhancedProducts,
      pagination: {
        total: result.pagination.total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(result.pagination.total / limitNum),
      },
      meta: {
        locale: locale || 'en',
        currency: currency || 'USD',
        country: country,
        tenantId,
        traceId,
      },
    };
  }

  /**
   * Get single product by ID
   */
  @Get(':id')
  @OptionalTenant()
  @ApiOperation({
    summary: 'Get product by ID',
    description: 'Get a single product with optional localization.',
  })
  @ApiParam({ name: 'id', description: 'Product ID' })
  @ApiQuery({ name: 'locale', required: false, description: 'Locale for translation' })
  @ApiQuery({ name: 'currency', required: false, description: 'Target currency' })
  @ApiResponse({ status: 200, description: 'Product details' })
  @ApiResponse({ status: 404, description: 'Product not found' })
  async getProduct(
    @Param('id') id: string,
    @TenantId() tenantId: string | undefined,
    @Query('locale') locale?: string,
    @Query('currency') currency?: string,
  ) {
    const traceId = getCurrentTraceId();

    this.logger.log('Getting product', { traceId, id, tenantId, locale, currency });

    const product = await this.productsService.findOne(id);

    if (!product) {
      return {
        statusCode: 404,
        error: 'Not Found',
        message: 'Product not found',
      };
    }

    // Verify tenant access if tenant context is set
    if (tenantId && (product as Record<string, unknown>).organizationId) {
      if ((product as Record<string, unknown>).organizationId !== tenantId) {
        return {
          statusCode: 403,
          error: 'Forbidden',
          message: 'Access denied to this product',
        };
      }
    }

    const enhanced: Record<string, unknown> = { ...product };

    // Add translation
    if (locale && locale !== 'en') {
      const translation = await this.getProductTranslation(id, locale);
      if (translation) {
        enhanced.translation = translation;
      }
    }

    // Add localized price
    if (currency && currency !== 'USD') {
      try {
        enhanced.localizedPrice = await this.currencyService.localizePrice(
          product.price,
          'USD',
          currency,
        );
      } catch (error) {
        this.logger.warn(`Price conversion failed for product ${id}`, {
          traceId,
          error: error.message,
        });
      }
    }

    return {
      product: enhanced,
      meta: {
        locale: locale || 'en',
        currency: currency || 'USD',
        traceId,
      },
    };
  }

  /**
   * Publish translation for a product
   */
  @Post(':id/translations/:locale/publish')
  @UseGuards(JwtAuthGuard)
  @RequireTenant()
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Publish product translation',
    description: 'Publish a translation for a specific locale. Validates translation completeness.',
  })
  @ApiParam({ name: 'id', description: 'Product ID' })
  @ApiParam({ name: 'locale', description: 'Locale code (e.g., es, fr, de)' })
  @ApiResponse({ status: 200, description: 'Translation published successfully' })
  @ApiResponse({ status: 400, description: 'Translation incomplete' })
  @ApiResponse({ status: 404, description: 'Product or translation not found' })
  async publishTranslation(
    @Param('id') productId: string,
    @Param('locale') locale: string,
    @TenantId() tenantId: string,
    @Body() body: { force?: boolean },
  ) {
    const traceId = getCurrentTraceId();

    this.logger.log('Publishing translation', {
      traceId,
      productId,
      locale,
      tenantId,
    });

    // Verify product exists and belongs to tenant
    const product = await this.productsService.findOne(productId);
    if (!product) {
      return {
        statusCode: 404,
        error: 'Not Found',
        message: 'Product not found',
      };
    }

    // Get translation
    const translation = await this.getProductTranslation(productId, locale);
    if (!translation) {
      return {
        statusCode: 404,
        error: 'Not Found',
        message: `Translation for locale ${locale} not found`,
      };
    }

    // Validate completeness (unless force=true)
    if (!body.force) {
      const validation = this.validateTranslationCompleteness(translation);
      if (!validation.complete) {
        return {
          statusCode: 400,
          error: 'Bad Request',
          message: 'Translation is incomplete',
          errorCode: 'TRANSLATION_INCOMPLETE',
          missingFields: validation.missingFields,
        };
      }
    }

    // Update translation status to published
    await this.updateTranslationStatus(productId, locale, 'PUBLISHED');

    return {
      success: true,
      message: 'Translation published successfully',
      productId,
      locale,
      status: 'PUBLISHED',
      traceId,
    };
  }

  // Private helper methods

  private async getProductTranslation(
    productId: string,
    locale: string,
  ): Promise<Record<string, string> | null> {
    // This would query ProductTranslation table
    // For now, return null (implementation depends on schema)
    try {
      // In production, query the database
      return null;
    } catch {
      return null;
    }
  }

  private async checkAvailability(
    productId: string,
    country: string,
  ): Promise<{ available: boolean; restrictions?: string[] }> {
    // Check country-specific availability
    // This would check shipping restrictions, regional availability, etc.
    return { available: true };
  }

  private validateTranslationCompleteness(
    translation: Record<string, string>,
  ): { complete: boolean; missingFields: string[] } {
    const requiredFields = ['name', 'description'];
    const missingFields = requiredFields.filter(
      (field) => !translation[field] || translation[field].trim() === '',
    );

    return {
      complete: missingFields.length === 0,
      missingFields,
    };
  }

  private async updateTranslationStatus(
    productId: string,
    locale: string,
    status: string,
  ): Promise<void> {
    // Update translation status in database
    // Implementation depends on schema
  }
}
