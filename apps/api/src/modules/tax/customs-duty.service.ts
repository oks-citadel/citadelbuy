import { Injectable, Logger } from '@nestjs/common';

/**
 * Customs Duty Service
 * Calculates import duties and tariffs for international shipments
 */

export interface CustomsDutyCalculation {
  hsCode: string;
  description: string;
  originCountry: string;
  destinationCountry: string;
  customsValue: number;
  dutyRate: number;
  dutyAmount: number;
  additionalFees: number;
  totalDuty: number;
}

@Injectable()
export class CustomsDutyService {
  private readonly logger = new Logger(CustomsDutyService.name);

  // Sample duty rates (in production, integrate with customs APIs)
  private readonly DUTY_RATES: Record<string, Record<string, number>> = {
    // US import duties
    US: {
      '8471': 0.0, // Computers (duty-free)
      '8517': 0.0, // Telecom equipment
      '6203': 0.164, // Men's clothing (16.4%)
      '6204': 0.164, // Women's clothing
      '6403': 0.10, // Footwear (10%)
      '8528': 0.05, // TV/Monitors (5%)
      default: 0.05,
    },
    // EU import duties
    EU: {
      '8471': 0.0,
      '8517': 0.0,
      '6203': 0.12,
      '6204': 0.12,
      '6403': 0.08,
      '8528': 0.14,
      default: 0.05,
    },
    // Nigeria import duties
    NG: {
      '8471': 0.05,
      '8517': 0.05,
      '6203': 0.20,
      '6204': 0.20,
      '6403': 0.20,
      '8528': 0.20,
      default: 0.10,
    },
  };

  calculateCustomsDuty(
    customsValue: number,
    hsCode: string,
    destinationCountry: string,
    originCountry: string,
  ): CustomsDutyCalculation {
    const destCode = destinationCountry.toUpperCase();
    const dutyRates = this.DUTY_RATES[destCode] || this.DUTY_RATES['US'];
    const dutyRate = dutyRates[hsCode] || dutyRates['default'] || 0.05;

    const dutyAmount = customsValue * dutyRate;

    // Additional fees (processing, documentation)
    const additionalFees = this.calculateAdditionalFees(customsValue, destCode);

    return {
      hsCode,
      description: this.getHSDescription(hsCode),
      originCountry,
      destinationCountry: destCode,
      customsValue,
      dutyRate,
      dutyAmount,
      additionalFees,
      totalDuty: dutyAmount + additionalFees,
    };
  }

  private calculateAdditionalFees(value: number, country: string): number {
    // Processing fees vary by country
    const fees = {
      US: Math.min(value * 0.003464, 538.40), // MPF fee
      EU: 0,
      NG: 0.07 * value, // 7% ETLS levy
    };

    return (fees as Record<string, number>)[country] || 0;
  }

  private getHSDescription(hsCode: string): string {
    const descriptions: Record<string, string> = {
      '8471': 'Computers and computer equipment',
      '8517': 'Telephone sets and telecommunications equipment',
      '6203': 'Men\'s suits, jackets, and trousers',
      '6204': 'Women\'s suits, jackets, and dresses',
      '6403': 'Footwear with leather uppers',
      '8528': 'Monitors and projectors',
    };

    return descriptions[hsCode] || 'General merchandise';
  }

  getDutyRate(hsCode: string, country: string): number {
    const rates = this.DUTY_RATES[country.toUpperCase()];
    return rates ? (rates[hsCode] || rates['default'] || 0.05) : 0.05;
  }
}
