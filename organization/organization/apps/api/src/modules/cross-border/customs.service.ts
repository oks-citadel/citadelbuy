import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

export interface CustomsEstimate {
  hsCode: string;
  originCountry: string;
  destinationCountry: string;
  productValue: number;
  currency: string;
  duties: number;
  taxes: number;
  fees: number;
  totalCost: number;
  estimatedDays: number;
}

@Injectable()
export class CustomsService {
  private readonly logger = new Logger(CustomsService.name);

  // Simplified duty rates by country and HS code prefix
  private readonly dutyRates: Record<string, Record<string, number>> = {
    US: { '84': 0.025, '85': 0.03, '94': 0.05 },
    GB: { '84': 0.02, '85': 0.035, '94': 0.04 },
    DE: { '84': 0.02, '85': 0.035, '94': 0.04 },
    CN: { '84': 0.10, '85': 0.12, '94': 0.15 },
  };

  // VAT rates by country
  private readonly vatRates: Record<string, number> = {
    US: 0,
    GB: 0.20,
    DE: 0.19,
    FR: 0.20,
    IT: 0.22,
    ES: 0.21,
    CN: 0.13,
  };

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Calculate customs duties and taxes
   */
  async calculateCustoms(params: {
    hsCode: string;
    originCountry: string;
    destinationCountry: string;
    productValue: number;
    currency?: string;
    shippingCost?: number;
  }): Promise<CustomsEstimate> {
    this.logger.log(
      `Calculating customs: ${params.hsCode} from ${params.originCountry} to ${params.destinationCountry}`,
    );

    const currency = params.currency || 'USD';
    const shippingCost = params.shippingCost || 0;

    // Get duty rate
    const dutyRate = this.getDutyRate(params.destinationCountry, params.hsCode);
    const duties = params.productValue * dutyRate;

    // Get VAT/tax rate
    const taxRate = this.vatRates[params.destinationCountry] || 0;
    const taxableValue = params.productValue + duties + shippingCost;
    const taxes = taxableValue * taxRate;

    // Customs processing fees
    const fees = this.calculateCustomsFees(params.destinationCountry, params.productValue);

    // Total customs cost
    const totalCost = duties + taxes + fees;

    // Estimated clearance days
    const estimatedDays = this.estimateClearanceTime(params.destinationCountry);

    // Store calculation
    await this.prisma.customsCalculation.create({
      data: {
        hsCode: params.hsCode,
        originCountry: params.originCountry,
        destinationCountry: params.destinationCountry,
        productValue: params.productValue,
        currency,
        duties,
        taxes,
        fees,
        totalCost,
      },
    });

    return {
      hsCode: params.hsCode,
      originCountry: params.originCountry,
      destinationCountry: params.destinationCountry,
      productValue: params.productValue,
      currency,
      duties,
      taxes,
      fees,
      totalCost,
      estimatedDays,
    };
  }

  /**
   * Get HS code classification
   */
  async getHSCodeClassification(productDescription: string) {
    this.logger.log(`Getting HS code classification for: ${productDescription}`);

    // In production, this would use ML/AI to suggest HS codes
    // For now, return a simplified result

    const suggestions = await this.prisma.hSCode.findMany({
      where: {
        description: {
          contains: productDescription,
          mode: 'insensitive',
        },
      },
      take: 5,
    });

    return {
      productDescription,
      suggestions: suggestions.map((s) => ({
        hsCode: s.code,
        description: s.description,
        confidence: 0.85, // Mock confidence score
      })),
    };
  }

  /**
   * Validate HS code
   */
  async validateHSCode(hsCode: string) {
    const code = await this.prisma.hSCode.findUnique({
      where: { code: hsCode },
    });

    if (!code) {
      return {
        valid: false,
        message: 'Invalid HS code',
      };
    }

    return {
      valid: true,
      hsCode: code.code,
      description: code.description,
      chapter: code.code.substring(0, 2),
      heading: code.code.substring(0, 4),
    };
  }

  /**
   * Get duty exemptions
   */
  async getDutyExemptions(params: {
    originCountry: string;
    destinationCountry: string;
    hsCode: string;
  }) {
    this.logger.log('Checking duty exemptions');

    const exemptions: string[] = [];

    // Check for free trade agreements
    const hasFTA = await this.checkFreeTradeAgreement(
      params.originCountry,
      params.destinationCountry,
    );

    if (hasFTA) {
      exemptions.push('FREE_TRADE_AGREEMENT');
    }

    // Check for GSP (Generalized System of Preferences)
    const hasGSP = await this.checkGSPEligibility(
      params.originCountry,
      params.destinationCountry,
      params.hsCode,
    );

    if (hasGSP) {
      exemptions.push('GSP_ELIGIBLE');
    }

    return {
      originCountry: params.originCountry,
      destinationCountry: params.destinationCountry,
      hsCode: params.hsCode,
      exemptions,
      dutyReduction: exemptions.length > 0 ? 100 : 0, // Percentage
    };
  }

  /**
   * Get de minimis threshold
   */
  async getDeMinimisThreshold(country: string) {
    // De minimis values by country (in USD)
    const thresholds: Record<string, number> = {
      US: 800,
      GB: 170,
      EU: 150,
      CA: 20,
      AU: 1000,
      CN: 50,
    };

    return {
      country,
      threshold: thresholds[country] || 0,
      currency: 'USD',
      description: 'Value below which duties and taxes are not charged',
    };
  }

  /**
   * Generate customs declaration
   */
  async generateCustomsDeclaration(orderId: string) {
    this.logger.log(`Generating customs declaration for order: ${orderId}`);

    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: {
          include: {
            product: true,
          },
        },
      },
    });

    if (!order) {
      throw new Error('Order not found');
    }

    // Parse shipping address from JSON string
    const shippingAddr = order.shippingAddress ? JSON.parse(order.shippingAddress) : {};

    const declaration = {
      orderId: order.id,
      declarationNumber: this.generateDeclarationNumber(),
      declarationDate: new Date(),
      shipper: {
        // Seller information
        name: 'Broxiva Marketplace',
        address: 'Marketplace Address',
        country: 'US',
      },
      consignee: {
        name: shippingAddr?.name || '',
        address: `${shippingAddr?.address1 || ''}, ${shippingAddr?.city || ''}`,
        country: shippingAddr?.country || '',
      },
      items: order.items.map((item) => ({
        description: item.product?.name || 'Unknown Product',
        hsCode: (item.product as any)?.hsCode || '9999.99.99',
        quantity: item.quantity,
        unitValue: item.price,
        totalValue: item.price * item.quantity,
        weight: item.product?.weight || 0,
        originCountry: (item.product as any)?.originCountry || 'US',
      })),
      totalValue: order.subtotal,
      currency: order.currency || 'USD',
      shippingCost: order.shippingCost || 0,
      insurance: order.insurance || 0,
      incoterms: 'DDP', // Delivered Duty Paid
    };

    // Store declaration
    await this.prisma.customsDeclaration.create({
      data: {
        orderId,
        declarationNumber: declaration.declarationNumber,
        data: declaration as any,
        status: 'GENERATED',
      },
    });

    return declaration;
  }

  /**
   * Get duty rate for destination and HS code
   */
  private getDutyRate(destinationCountry: string, hsCode: string): number {
    const countryRates = this.dutyRates[destinationCountry];

    if (!countryRates) {
      return 0.05; // Default 5% duty
    }

    const hsPrefix = hsCode.substring(0, 2);
    return countryRates[hsPrefix] || 0.05;
  }

  /**
   * Calculate customs processing fees
   */
  private calculateCustomsFees(country: string, value: number): number {
    // Simplified fee structure
    const baseFee = 25;
    const percentageFee = value * 0.003; // 0.3%

    return baseFee + percentageFee;
  }

  /**
   * Estimate customs clearance time
   */
  private estimateClearanceTime(country: string): number {
    const clearanceDays: Record<string, number> = {
      US: 1,
      GB: 2,
      DE: 2,
      FR: 3,
      CN: 5,
    };

    return clearanceDays[country] || 3;
  }

  /**
   * Check for free trade agreement
   */
  private async checkFreeTradeAgreement(origin: string, destination: string): Promise<boolean> {
    // Simplified FTA check
    const ftas = [
      ['US', 'CA'], // USMCA
      ['US', 'MX'],
      ['GB', 'EU'],
    ];

    return ftas.some(
      (fta) =>
        (fta[0] === origin && fta[1] === destination) ||
        (fta[1] === origin && fta[0] === destination),
    );
  }

  /**
   * Check GSP eligibility
   */
  private async checkGSPEligibility(
    origin: string,
    destination: string,
    hsCode: string,
  ): Promise<boolean> {
    // Simplified GSP check
    // In production, check actual GSP country and product lists
    return false;
  }

  /**
   * Generate customs declaration number
   */
  private generateDeclarationNumber(): string {
    const prefix = 'CD';
    const timestamp = Date.now().toString().slice(-8);
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `${prefix}${timestamp}${random}`;
  }
}
