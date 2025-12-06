import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';

/**
 * VAT Service
 * Handles Value Added Tax calculations for global regions
 *
 * Supported regions:
 * - EU VAT (19-27%)
 * - UK VAT (20%)
 * - Nigeria VAT (7.5%)
 * - South Africa VAT (15%)
 * - Kenya VAT (16%)
 */

export interface VATCalculation {
  country: string;
  netAmount: number;
  vatRate: number;
  vatAmount: number;
  grossAmount: number;
  vatNumber?: string;
  isReverseCharge: boolean;
}

@Injectable()
export class VATService {
  private readonly logger = new Logger(VATService.name);

  // Standard VAT rates by country
  private readonly VAT_RATES = {
    // Europe
    AT: 0.20, // Austria
    BE: 0.21, // Belgium
    BG: 0.20, // Bulgaria
    HR: 0.25, // Croatia
    CY: 0.19, // Cyprus
    CZ: 0.21, // Czech Republic
    DK: 0.25, // Denmark
    EE: 0.20, // Estonia
    FI: 0.24, // Finland
    FR: 0.20, // France
    DE: 0.19, // Germany
    GR: 0.24, // Greece
    HU: 0.27, // Hungary (highest in EU)
    IE: 0.23, // Ireland
    IT: 0.22, // Italy
    LV: 0.21, // Latvia
    LT: 0.21, // Lithuania
    LU: 0.17, // Luxembourg
    MT: 0.18, // Malta
    NL: 0.21, // Netherlands
    PL: 0.23, // Poland
    PT: 0.23, // Portugal
    RO: 0.19, // Romania
    SK: 0.20, // Slovakia
    SI: 0.22, // Slovenia
    ES: 0.21, // Spain
    SE: 0.25, // Sweden
    GB: 0.20, // United Kingdom

    // Africa
    NG: 0.075, // Nigeria
    ZA: 0.15, // South Africa
    KE: 0.16, // Kenya
    GH: 0.125, // Ghana (VAT + NHIL)
    EG: 0.14, // Egypt
    TZ: 0.18, // Tanzania
    UG: 0.18, // Uganda

    // Middle East
    AE: 0.05, // UAE
    SA: 0.15, // Saudi Arabia

    // Asia
    IN: 0.18, // India (GST)
    CN: 0.13, // China
    JP: 0.10, // Japan
    SG: 0.08, // Singapore (GST)
    MY: 0.06, // Malaysia (SST)

    // Others
    AU: 0.10, // Australia (GST)
    NZ: 0.15, // New Zealand (GST)
    CA: 0.05, // Canada (GST, excluding provincial)
  };

  constructor(private prisma: PrismaService) {}

  calculateVAT(
    netAmount: number,
    country: string,
    vatNumber?: string,
    isB2B?: boolean,
  ): VATCalculation {
    const countryCode = country.toUpperCase();
    const vatRate = this.VAT_RATES[countryCode] || 0;

    // Reverse charge for B2B in EU
    const isReverseCharge = isB2B && this.isEUCountry(countryCode) && !!vatNumber;

    const vatAmount = isReverseCharge ? 0 : netAmount * vatRate;
    const grossAmount = netAmount + vatAmount;

    return {
      country: countryCode,
      netAmount,
      vatRate,
      vatAmount,
      grossAmount,
      vatNumber,
      isReverseCharge,
    };
  }

  getVATRate(country: string): number {
    return this.VAT_RATES[country.toUpperCase()] || 0;
  }

  validateVATNumber(vatNumber: string, country: string): boolean {
    // Basic format validation (in production, use VIES for EU)
    const patterns: Record<string, RegExp> = {
      GB: /^GB\d{9}$/,
      DE: /^DE\d{9}$/,
      FR: /^FR[A-Z0-9]{2}\d{9}$/,
      IT: /^IT\d{11}$/,
      ES: /^ES[A-Z0-9]\d{7}[A-Z0-9]$/,
      NL: /^NL\d{9}B\d{2}$/,
    };

    const pattern = patterns[country.toUpperCase()];
    return pattern ? pattern.test(vatNumber) : true;
  }

  private isEUCountry(country: string): boolean {
    const euCountries = [
      'AT', 'BE', 'BG', 'HR', 'CY', 'CZ', 'DK', 'EE', 'FI', 'FR',
      'DE', 'GR', 'HU', 'IE', 'IT', 'LV', 'LT', 'LU', 'MT', 'NL',
      'PL', 'PT', 'RO', 'SK', 'SI', 'ES', 'SE',
    ];
    return euCountries.includes(country);
  }
}
