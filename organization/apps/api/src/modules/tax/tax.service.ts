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

@Injectable()
export class TaxService {
  private readonly logger = new Logger(TaxService.name);

  constructor(
    private prisma: PrismaService,
    private taxProviderFactory: TaxProviderFactory,
  ) {}

  // ==============================================
  // TAX RATE MANAGEMENT
  // ==============================================

  async createTaxRate(dto: CreateTaxRateDto) {
    this.logger.log(`Creating tax rate: ${dto.code}`);

    return this.prisma.taxRate.create({
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
    await this.findTaxRateById(id);

    return this.prisma.taxRate.update({
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
  }

  async deleteTaxRate(id: string) {
    await this.findTaxRateById(id);
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
    const exemption = await this.findTaxExemptionById(dto.exemptionId);

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
  // TAX CALCULATION
  // ==============================================

  async calculateTax(dto: CalculateTaxDto): Promise<TaxCalculationResultDto> {
    this.logger.log(`Calculating tax for ${dto.country}-${dto.state}-${dto.zipCode}`);

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
        calculationMethod: 'automatic',
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
    let taxableAmount = dto.subtotal;
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
      calculationMethod: 'automatic',
      totalAmount: dto.subtotal + dto.shippingAmount + totalTaxAmount,
    };
  }

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
        calculationMethod: 'automatic',
        exemptionsApplied: result.exemptionsApplied as any,
      },
    });

    return { ...result, calculationId: taxCalculation.id };
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
}
