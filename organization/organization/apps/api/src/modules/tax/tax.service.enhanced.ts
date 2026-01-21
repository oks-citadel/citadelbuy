import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import {
  CreateTaxRateDto,
  UpdateTaxRateDto,
  CalculateTaxDto,
  TaxCalculationResultDto,
} from './dto/create-tax-rate.dto';
import {
  CreateTaxExemptionDto,
  UpdateTaxExemptionDto,
  VerifyTaxExemptionDto,
} from './dto/create-tax-exemption.dto';
import {
  TaxType,
  TaxRateStatus,
  TaxCalculationMethod,
} from '@prisma/client';
import { TaxProviderFactory } from './providers/tax-provider.factory';
import { TaxProviderInterface } from './providers/tax-provider.interface';
import { RedisService } from '../../common/redis/redis.service';

@Injectable()
export class TaxService {
  private readonly logger = new Logger(TaxService.name);
  private readonly CACHE_TTL = 3600; // 1 hour cache for tax rates
  private readonly CACHE_PREFIX = 'tax:';

  constructor(
    private prisma: PrismaService,
    private taxProviderFactory: TaxProviderFactory,
    private redisService: RedisService,
  ) {}

  // ==============================================
  // TAX RATE MANAGEMENT
  // ==============================================

  async createTaxRate(dto: CreateTaxRateDto) {
    this.logger.log(`Creating tax rate: ${dto.code}`);

    const taxRate = await this.prisma.taxRate.create({
      data: {
        name: dto.name,
        code: dto.code,
        description: dto.description,
        taxType: dto.taxType,
        calculationMethod: dto.calculationMethod,
        rate: dto.rate,
        country: dto.country,
        state: dto.state,
        city: dto.city,
        zipCode: dto.zipCode,
        county: dto.county,
        applyToShipping: dto.applyToShipping,
        applyToGiftCards: dto.applyToGiftCards,
        compoundTax: dto.compoundTax,
        priority: dto.priority,
        status: dto.status,
        effectiveFrom: dto.effectiveFrom ? new Date(dto.effectiveFrom) : new Date(),
        effectiveTo: dto.effectiveTo ? new Date(dto.effectiveTo) : undefined,
        externalId: dto.externalId,
        externalProvider: dto.externalProvider,
        categoryIds: dto.categoryIds || [],
        metadata: dto.metadata,
      },
    });

    // Invalidate cache for this location
    await this.invalidateTaxRateCache(dto.country, dto.state, dto.zipCode);

    return taxRate;
  }

  async findAllTaxRates(filters?: {
    country?: string;
    state?: string;
    status?: TaxRateStatus;
    taxType?: TaxType;
  }) {
    return this.prisma.taxRate.findMany({
      where: {
        country: filters?.country,
        state: filters?.state,
        status: filters?.status,
        taxType: filters?.taxType,
      },
      orderBy: [
        { priority: 'desc' },
        { effectiveFrom: 'desc' },
      ],
    });
  }

  async findTaxRateById(id: string) {
    const taxRate = await this.prisma.taxRate.findUnique({
      where: { id },
      include: {
        exemptions: true,
      },
    });

    if (!taxRate) {
      throw new NotFoundException(`Tax rate with ID ${id} not found`);
    }

    return taxRate;
  }

  async updateTaxRate(id: string, dto: UpdateTaxRateDto) {
    const existingRate = await this.findTaxRateById(id);

    const updated = await this.prisma.taxRate.update({
      where: { id },
      data: {
        name: dto.name,
        code: dto.code,
        description: dto.description,
        taxType: dto.taxType,
        calculationMethod: dto.calculationMethod,
        rate: dto.rate,
        country: dto.country,
        state: dto.state,
        city: dto.city,
        zipCode: dto.zipCode,
        county: dto.county,
        applyToShipping: dto.applyToShipping,
        applyToGiftCards: dto.applyToGiftCards,
        compoundTax: dto.compoundTax,
        priority: dto.priority,
        status: dto.status,
        effectiveFrom: dto.effectiveFrom ? new Date(dto.effectiveFrom) : undefined,
        effectiveTo: dto.effectiveTo ? new Date(dto.effectiveTo) : undefined,
        externalId: dto.externalId,
        externalProvider: dto.externalProvider,
        categoryIds: dto.categoryIds || [],
        metadata: dto.metadata,
      },
    });

    // Invalidate cache for both old and new locations
    await this.invalidateTaxRateCache(existingRate.country, existingRate.state, existingRate.zipCode);
    await this.invalidateTaxRateCache(dto.country, dto.state, dto.zipCode);

    return updated;
  }

  async deleteTaxRate(id: string) {
    const taxRate = await this.findTaxRateById(id);

    // Invalidate cache
    await this.invalidateTaxRateCache(taxRate.country, taxRate.state, taxRate.zipCode);

    return this.prisma.taxRate.delete({ where: { id } });
  }

  // ==============================================
  // TAX EXEMPTION MANAGEMENT
  // ==============================================

  async createTaxExemption(dto: CreateTaxExemptionDto, verifiedBy?: string) {
    this.logger.log(`Creating tax exemption for type: ${dto.exemptionType}`);

    return this.prisma.taxExemption.create({
      data: {
        userId: dto.userId,
        productId: dto.productId,
        categoryId: dto.categoryId,
        taxRateId: dto.taxRateId,
        exemptionType: dto.exemptionType,
        exemptionReason: dto.exemptionReason,
        certificateNumber: dto.certificateNumber,
        certificateFile: dto.certificateFile,
        country: dto.country,
        state: dto.state,
        validFrom: dto.validFrom ? new Date(dto.validFrom) : new Date(),
        validUntil: dto.validUntil ? new Date(dto.validUntil) : undefined,
        isActive: dto.isActive,
        verifiedBy: verifiedBy,
        verifiedAt: verifiedBy ? new Date() : undefined,
        verificationNotes: dto.verificationNotes,
        metadata: dto.metadata,
      },
    });
  }

  async findAllTaxExemptions(filters?: {
    userId?: string;
    productId?: string;
    categoryId?: string;
    isActive?: boolean;
  }) {
    return this.prisma.taxExemption.findMany({
      where: {
        userId: filters?.userId,
        productId: filters?.productId,
        categoryId: filters?.categoryId,
        isActive: filters?.isActive,
      },
      include: {
        user: true,
        product: true,
        category: true,
        taxRate: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findTaxExemptionById(id: string) {
    const exemption = await this.prisma.taxExemption.findUnique({
      where: { id },
      include: {
        user: true,
        product: true,
        category: true,
        taxRate: true,
      },
    });

    if (!exemption) {
      throw new NotFoundException(`Tax exemption with ID ${id} not found`);
    }

    return exemption;
  }

  async verifyTaxExemption(dto: VerifyTaxExemptionDto, verifiedBy: string) {
    await this.findTaxExemptionById(dto.exemptionId);

    // If we have an external provider, validate with them
    const provider = this.taxProviderFactory.getProvider();
    if (provider && dto.approved) {
      try {
        const exemption = await this.findTaxExemptionById(dto.exemptionId);
        const validationResult = await provider.validateExemption(
          exemption.certificateNumber || '',
          {
            customerId: exemption.userId || '',
            exemptionType: exemption.exemptionType,
            exemptRegion: exemption.state || exemption.country,
          },
        );

        if (!validationResult.valid) {
          this.logger.warn(
            `External provider rejected exemption: ${validationResult.reason}`,
          );
          // You may want to set approved to false here
        }
      } catch (error) {
        this.logger.error('Error validating exemption with external provider:', error);
        // Continue with manual approval
      }
    }

    return this.prisma.taxExemption.update({
      where: { id: dto.exemptionId },
      data: {
        isActive: dto.approved,
        verifiedBy,
        verifiedAt: new Date(),
        verificationNotes: dto.verificationNotes,
      },
    });
  }

  async deleteTaxExemption(id: string) {
    await this.findTaxExemptionById(id);
    return this.prisma.taxExemption.delete({ where: { id } });
  }

  // ==============================================
  // TAX CALCULATION WITH EXTERNAL PROVIDER SUPPORT
  // ==============================================

  async calculateTax(dto: CalculateTaxDto): Promise<TaxCalculationResultDto> {
    this.logger.log(`Calculating tax for ${dto.country}-${dto.state}-${dto.zipCode}`);

    // Try to get cached result first
    const cacheKey = this.getTaxCacheKey(dto);
    const cachedResult = await this.getCachedTaxResult(cacheKey);
    if (cachedResult) {
      this.logger.log('Returning cached tax calculation');
      return cachedResult;
    }

    // Check if external provider is available
    const provider = this.taxProviderFactory.getProvider();

    if (provider && this.shouldUseExternalProvider(dto)) {
      try {
        const result = await this.calculateTaxWithProvider(provider, dto);

        // Cache the result
        await this.cacheTaxResult(cacheKey, result);

        return result;
      } catch (error) {
        this.logger.error('External tax provider failed, falling back to internal calculation:', error);
        // Fall through to internal calculation
      }
    }

    // Use internal calculation as fallback or default
    const result = await this.calculateTaxInternal(dto);

    // Cache the result
    await this.cacheTaxResult(cacheKey, result);

    return result;
  }

  private async calculateTaxWithProvider(
    provider: TaxProviderInterface,
    dto: CalculateTaxDto,
  ): Promise<TaxCalculationResultDto> {
    this.logger.log(`Using external provider: ${provider.getProviderName()}`);

    // Check for exemptions first
    const exemptions = await this.findApplicableExemptions({
      customerId: dto.customerId,
      productIds: dto.productIds,
      categoryIds: dto.categoryIds,
      country: dto.country,
      state: dto.state,
    });

    const exemptionsApplied = exemptions.map((ex) => ({
      exemptionId: ex.id,
      exemptionType: ex.exemptionType,
      reason: ex.exemptionReason,
      amount: 0,
    }));

    // If customer is fully exempt, return zero tax
    if (exemptions.length > 0 && exemptions.some((ex) => !ex.taxRateId)) {
      return {
        taxableAmount: dto.subtotal + dto.shippingAmount,
        taxAmount: 0,
        taxBreakdown: [],
        exemptionsApplied,
        calculationMethod: provider.getProviderName(),
        totalAmount: dto.subtotal + dto.shippingAmount,
      };
    }

    // Call external provider
    const providerResult = await provider.calculateTax({
      amount: dto.subtotal,
      shipping: dto.shippingAmount,
      toCountry: dto.country,
      toState: dto.state,
      toCity: dto.city,
      toZip: dto.zipCode,
      lineItems: dto.productIds?.map((id, index) => ({
        id,
        quantity: 1,
        unitPrice: dto.subtotal / (dto.productIds?.length || 1),
      })),
    });

    // Transform provider result to our format
    const taxBreakdown = providerResult.breakdown.map((item) => ({
      taxRateId: `${provider.getProviderName()}-${item.jurisdictionType}`,
      name: item.jurisdictionName,
      code: `${item.jurisdictionType.toUpperCase()}`,
      rate: item.rate * 100, // Convert to percentage
      amount: item.taxAmount,
      taxType: this.mapJurisdictionTypeToTaxType(item.jurisdictionType),
    }));

    return {
      taxableAmount: providerResult.taxableAmount,
      taxAmount: providerResult.taxAmount,
      taxBreakdown,
      exemptionsApplied,
      calculationMethod: provider.getProviderName(),
      totalAmount: dto.subtotal + dto.shippingAmount + providerResult.taxAmount,
    };
  }

  private async calculateTaxInternal(dto: CalculateTaxDto): Promise<TaxCalculationResultDto> {
    this.logger.log('Using internal tax calculation');

    // 1. Find applicable tax rates
    const applicableTaxRates = await this.findApplicableTaxRates({
      country: dto.country,
      state: dto.state,
      city: dto.city,
      zipCode: dto.zipCode,
      categoryIds: dto.categoryIds,
    });

    if (applicableTaxRates.length === 0) {
      this.logger.log('No tax rates found for location');
      return {
        taxableAmount: dto.subtotal + dto.shippingAmount,
        taxAmount: 0,
        taxBreakdown: [],
        exemptionsApplied: [],
        calculationMethod: 'Internal',
        totalAmount: dto.subtotal + dto.shippingAmount,
      };
    }

    // 2. Check for exemptions
    const exemptions = await this.findApplicableExemptions({
      customerId: dto.customerId,
      productIds: dto.productIds,
      categoryIds: dto.categoryIds,
      country: dto.country,
      state: dto.state,
    });

    // 3. Calculate taxable amount
    const taxableAmount = dto.subtotal;
    let shippingTax = 0;

    // 4. Calculate tax for each applicable rate
    const taxBreakdown = [];
    let totalTaxAmount = 0;

    for (const taxRate of applicableTaxRates) {
      // Check if this tax rate has an exemption
      const isExempt = exemptions.some(
        (ex) => !ex.taxRateId || ex.taxRateId === taxRate.id,
      );

      if (isExempt) {
        this.logger.log(`Tax rate ${taxRate.code} is exempt`);
        continue;
      }

      // Calculate tax for this rate
      let taxAmount = 0;

      if (taxRate.calculationMethod === TaxCalculationMethod.PERCENTAGE) {
        // Calculate percentage tax
        taxAmount = (taxableAmount * taxRate.rate) / 100;

        // Add shipping tax if applicable
        if (taxRate.applyToShipping) {
          const shippingTaxAmount = (dto.shippingAmount * taxRate.rate) / 100;
          taxAmount += shippingTaxAmount;
          shippingTax += shippingTaxAmount;
        }
      } else if (taxRate.calculationMethod === TaxCalculationMethod.FLAT_RATE) {
        taxAmount = taxRate.rate;
      }

      // Round tax amount
      taxAmount = this.roundTax(taxAmount);

      totalTaxAmount += taxAmount;

      taxBreakdown.push({
        taxRateId: taxRate.id,
        name: taxRate.name,
        code: taxRate.code,
        rate: taxRate.rate,
        amount: taxAmount,
        taxType: taxRate.taxType,
      });
    }

    // 5. Format exemptions applied
    const exemptionsApplied = exemptions.map((ex) => ({
      exemptionId: ex.id,
      exemptionType: ex.exemptionType,
      reason: ex.exemptionReason,
      amount: 0, // Calculate actual exemption amount if needed
    }));

    // 6. Return result
    return {
      taxableAmount,
      taxAmount: totalTaxAmount,
      taxBreakdown,
      exemptionsApplied,
      calculationMethod: 'Internal',
      totalAmount: dto.subtotal + dto.shippingAmount + totalTaxAmount,
    };
  }

  private shouldUseExternalProvider(dto: CalculateTaxDto): boolean {
    // Use external provider for US addresses by default
    // You can add more logic here based on your requirements
    return dto.country === 'US' && dto.zipCode !== undefined;
  }

  private mapJurisdictionTypeToTaxType(jurisdictionType: string): string {
    const mapping: Record<string, string> = {
      state: TaxType.SALES_TAX,
      county: TaxType.SALES_TAX,
      city: TaxType.SALES_TAX,
      country: TaxType.VAT,
      special: TaxType.EXCISE_TAX,
    };

    return mapping[jurisdictionType.toLowerCase()] || TaxType.SALES_TAX;
  }

  // ==============================================
  // CACHE MANAGEMENT
  // ==============================================

  private getTaxCacheKey(dto: CalculateTaxDto): string {
    const parts = [
      dto.country,
      dto.state || '',
      dto.city || '',
      dto.zipCode || '',
      dto.subtotal.toString(),
      dto.shippingAmount.toString(),
      dto.customerId || '',
      (dto.categoryIds || []).sort().join(','),
    ];

    return `${this.CACHE_PREFIX}calc:${parts.join(':')}`;
  }

  private async getCachedTaxResult(cacheKey: string): Promise<TaxCalculationResultDto | null> {
    try {
      const cached = await this.redisService.get(cacheKey);
      if (cached) {
        return cached as TaxCalculationResultDto;
      }
    } catch (error) {
      this.logger.warn('Failed to get cached tax result:', error);
    }
    return null;
  }

  private async cacheTaxResult(cacheKey: string, result: TaxCalculationResultDto): Promise<void> {
    try {
      await this.redisService.set(cacheKey, JSON.stringify(result), this.CACHE_TTL);
    } catch (error) {
      this.logger.warn('Failed to cache tax result:', error);
    }
  }

  private async invalidateTaxRateCache(country: string, state?: string | null, zipCode?: string | null): Promise<void> {
    try {
      // Invalidate all cache entries for this location
      const pattern = `${this.CACHE_PREFIX}calc:${country}:${state || '*'}:*`;
      const keys = await this.redisService.keys(pattern);

      if (keys.length > 0) {
        await Promise.all(keys.map(key => this.redisService.del(key)));
        this.logger.log(`Invalidated ${keys.length} cached tax calculations`);
      }
    } catch (error) {
      this.logger.warn('Failed to invalidate tax cache:', error);
    }
  }

  // ==============================================
  // HELPER METHODS
  // ==============================================

  private async findApplicableTaxRates(location: {
    country: string;
    state?: string;
    city?: string;
    zipCode?: string;
    categoryIds?: string[];
  }) {
    const now = new Date();

    // Build where clause for location matching
    const where: any = {
      status: TaxRateStatus.ACTIVE,
      country: location.country,
      effectiveFrom: { lte: now },
      OR: [
        { effectiveTo: null },
        { effectiveTo: { gte: now } },
      ],
    };

    // Add state filter
    if (location.state) {
      where.state = location.state;
    }

    // Add city filter
    if (location.city) {
      where.OR = [
        { city: null },
        { city: location.city },
      ];
    }

    // Find matching tax rates
    const taxRates = await this.prisma.taxRate.findMany({
      where,
      orderBy: [
        { priority: 'desc' },
        { createdAt: 'asc' },
      ],
    });

    // Filter by ZIP code (supports wildcards)
    let filteredRates = taxRates.filter((rate) => {
      if (!rate.zipCode) return true; // No ZIP code restriction

      if (location.zipCode) {
        // Support wildcard matching (e.g., "900*" matches "90210")
        if (rate.zipCode.includes('*')) {
          const pattern = rate.zipCode.replace('*', '');
          return location.zipCode.startsWith(pattern);
        }
        return rate.zipCode === location.zipCode;
      }

      return false;
    });

    // Filter by category IDs if specified
    if (location.categoryIds && location.categoryIds.length > 0) {
      filteredRates = filteredRates.filter((rate) => {
        if (rate.categoryIds.length === 0) return true; // No category restriction

        // Check if any of the order categories match the tax rate categories
        return location.categoryIds?.some((catId) =>
          rate.categoryIds.includes(catId),
        );
      });
    }

    return filteredRates;
  }

  private async findApplicableExemptions(params: {
    customerId?: string;
    productIds?: string[];
    categoryIds?: string[];
    country: string;
    state?: string;
  }) {
    const now = new Date();

    const exemptions = await this.prisma.taxExemption.findMany({
      where: {
        isActive: true,
        country: params.country,
        state: params.state,
        validFrom: { lte: now },
        OR: [
          { validUntil: null },
          { validUntil: { gte: now } },
          // Customer exemptions
          { userId: params.customerId },
          // Product exemptions
          ...(params.productIds && params.productIds.length > 0
            ? [{ productId: { in: params.productIds } }]
            : []),
          // Category exemptions
          ...(params.categoryIds && params.categoryIds.length > 0
            ? [{ categoryId: { in: params.categoryIds } }]
            : []),
        ],
      },
    });

    return exemptions;
  }

  private roundTax(amount: number, precision: number = 2): number {
    // Default to "half up" rounding
    const multiplier = Math.pow(10, precision);
    return Math.round(amount * multiplier) / multiplier;
  }

  // ==============================================
  // ORDER TAX CALCULATION
  // ==============================================

  async calculateOrderTax(orderId: string, taxDto: CalculateTaxDto) {
    const result = await this.calculateTax(taxDto);

    // Store tax calculation in database
    const taxCalculation = await this.prisma.taxCalculation.create({
      data: {
        orderId,
        country: taxDto.country,
        state: taxDto.state,
        city: taxDto.city,
        zipCode: taxDto.zipCode,
        subtotal: taxDto.subtotal,
        shippingAmount: taxDto.shippingAmount,
        taxableAmount: result.taxableAmount,
        taxAmount: result.taxAmount,
        taxBreakdown: result.taxBreakdown as any,
        calculationMethod: result.calculationMethod,
        exemptionsApplied: result.exemptionsApplied as any,
      },
    });

    // If external provider is available, create transaction record
    const provider = this.taxProviderFactory.getProvider();
    if (provider && this.shouldUseExternalProvider(taxDto)) {
      try {
        await this.createProviderTransaction(provider, orderId, taxDto, result);
      } catch (error) {
        this.logger.error('Failed to create transaction in external provider:', error);
        // Don't fail the order if transaction creation fails
      }
    }

    return { ...result, calculationId: taxCalculation.id };
  }

  private async createProviderTransaction(
    provider: TaxProviderInterface,
    orderId: string,
    taxDto: CalculateTaxDto,
    result: TaxCalculationResultDto,
  ) {
    await provider.createTransaction({
      transactionId: orderId,
      transactionDate: new Date(),
      amount: taxDto.subtotal,
      shipping: taxDto.shippingAmount,
      taxAmount: result.taxAmount,
      toCountry: taxDto.country,
      toState: taxDto.state,
      toCity: taxDto.city,
      toZip: taxDto.zipCode,
      lineItems: taxDto.productIds?.map((id, index) => ({
        id,
        quantity: 1,
        unitPrice: taxDto.subtotal / (taxDto.productIds?.length || 1),
        taxAmount: result.taxAmount / (taxDto.productIds?.length || 1),
      })) || [],
    });

    this.logger.log(`Created transaction in ${provider.getProviderName()}`);
  }

  // ==============================================
  // TAX REPORTING
  // ==============================================

  async generateTaxReport(params: {
    reportType: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'annual';
    periodStart: Date;
    periodEnd: Date;
    country: string;
    state?: string;
  }) {
    this.logger.log(`Generating ${params.reportType} tax report for ${params.country}`);

    // Get all tax calculations for the period
    const calculations = await this.prisma.taxCalculation.findMany({
      where: {
        country: params.country,
        state: params.state,
        calculatedAt: {
          gte: params.periodStart,
          lte: params.periodEnd,
        },
      },
      include: {
        order: true,
      },
    });

    // Calculate totals
    const totalOrders = calculations.length;
    const taxableAmount = calculations.reduce((sum, calc) => sum + calc.taxableAmount, 0);
    const totalTaxCollected = calculations.reduce((sum, calc) => sum + calc.taxAmount, 0);

    // Group by tax type
    const breakdown: any = {};
    calculations.forEach((calc) => {
      const taxBreakdown = calc.taxBreakdown as any[];
      taxBreakdown.forEach((item: any) => {
        const key = `${item.taxType}-${item.code}`;
        if (!breakdown[key]) {
          breakdown[key] = {
            taxType: item.taxType,
            code: item.code,
            name: item.name,
            totalAmount: 0,
            orderCount: 0,
          };
        }
        breakdown[key].totalAmount += item.amount;
        breakdown[key].orderCount += 1;
      });
    });

    // Create tax report
    return this.prisma.taxReport.create({
      data: {
        reportType: params.reportType,
        periodStart: params.periodStart,
        periodEnd: params.periodEnd,
        country: params.country,
        state: params.state,
        totalOrders,
        taxableAmount,
        totalTaxCollected,
        totalExemptions: 0, // Calculate if needed
        breakdown,
        status: 'draft',
      },
    });
  }

  async getTaxReports(filters?: {
    country?: string;
    state?: string;
    reportType?: string;
    status?: string;
  }) {
    return this.prisma.taxReport.findMany({
      where: {
        country: filters?.country,
        state: filters?.state,
        reportType: filters?.reportType,
        status: filters?.status,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async finalizeTaxReport(id: string, filedBy: string) {
    return this.prisma.taxReport.update({
      where: { id },
      data: {
        status: 'finalized',
        filedAt: new Date(),
        filedBy,
      },
    });
  }

  // ==============================================
  // TAX RATE SYNC FROM EXTERNAL PROVIDER
  // ==============================================

  async syncTaxRatesFromProvider(location: {
    country: string;
    state?: string;
    city?: string;
    zipCode?: string;
  }) {
    const provider = this.taxProviderFactory.getProvider();

    if (!provider) {
      throw new Error('No external tax provider configured');
    }

    this.logger.log(`Syncing tax rates from ${provider.getProviderName()}`);

    try {
      const rates = await provider.getTaxRates(location);

      // Create or update tax rates
      const updates = [];

      if (rates.stateRate > 0) {
        updates.push(this.upsertTaxRate({
          code: `${location.country}-${location.state}-STATE`,
          name: `${location.state} State Tax`,
          rate: rates.stateRate * 100,
          country: location.country,
          state: location.state,
          taxType: TaxType.SALES_TAX,
          externalProvider: provider.getProviderName(),
        }));
      }

      if (rates.countyRate && rates.countyRate > 0) {
        updates.push(this.upsertTaxRate({
          code: `${location.country}-${location.state}-COUNTY`,
          name: `County Tax`,
          rate: rates.countyRate * 100,
          country: location.country,
          state: location.state,
          taxType: TaxType.SALES_TAX,
          externalProvider: provider.getProviderName(),
        }));
      }

      if (rates.cityRate && rates.cityRate > 0) {
        updates.push(this.upsertTaxRate({
          code: `${location.country}-${location.state}-${location.city}-CITY`,
          name: `${location.city} City Tax`,
          rate: rates.cityRate * 100,
          country: location.country,
          state: location.state,
          city: location.city,
          taxType: TaxType.SALES_TAX,
          externalProvider: provider.getProviderName(),
        }));
      }

      await Promise.all(updates);

      // Invalidate cache
      await this.invalidateTaxRateCache(location.country, location.state, location.zipCode);

      this.logger.log(`Successfully synced ${updates.length} tax rates`);

      return { synced: updates.length, provider: provider.getProviderName() };
    } catch (error) {
      this.logger.error('Failed to sync tax rates from provider:', error);
      throw error;
    }
  }

  private async upsertTaxRate(data: {
    code: string;
    name: string;
    rate: number;
    country: string;
    state?: string;
    city?: string;
    taxType: TaxType;
    externalProvider: string;
  }) {
    const existing = await this.prisma.taxRate.findFirst({
      where: {
        code: data.code,
        externalProvider: data.externalProvider,
      },
    });

    if (existing) {
      return this.prisma.taxRate.update({
        where: { id: existing.id },
        data: {
          rate: data.rate,
          updatedAt: new Date(),
        },
      });
    }

    return this.prisma.taxRate.create({
      data: {
        ...data,
        description: `Synced from ${data.externalProvider}`,
        calculationMethod: TaxCalculationMethod.PERCENTAGE,
        applyToShipping: false,
        applyToGiftCards: false,
        compoundTax: false,
        priority: 0,
        status: TaxRateStatus.ACTIVE,
        categoryIds: [],
      },
    });
  }
}
