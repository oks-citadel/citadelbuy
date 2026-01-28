/**
 * Global Tax Rates Configuration
 * Comprehensive tax rate data for B2B transactions
 */

export interface TaxRateConfig {
  country: string;
  countryName: string;
  vat: number;
  salesTax: number;
  corporateTax: number;
  withholdingTax: number;
  region: string;
}

export const GLOBAL_TAX_RATES: TaxRateConfig[] = [
  // Africa
  { country: 'NG', countryName: 'Nigeria', vat: 0.075, salesTax: 0, corporateTax: 0.30, withholdingTax: 0.10, region: 'Africa' },
  { country: 'ZA', countryName: 'South Africa', vat: 0.15, salesTax: 0, corporateTax: 0.27, withholdingTax: 0.15, region: 'Africa' },
  { country: 'KE', countryName: 'Kenya', vat: 0.16, salesTax: 0, corporateTax: 0.30, withholdingTax: 0.05, region: 'Africa' },
  { country: 'GH', countryName: 'Ghana', vat: 0.125, salesTax: 0, corporateTax: 0.25, withholdingTax: 0.075, region: 'Africa' },
  { country: 'EG', countryName: 'Egypt', vat: 0.14, salesTax: 0, corporateTax: 0.225, withholdingTax: 0.05, region: 'Africa' },

  // Europe
  { country: 'GB', countryName: 'United Kingdom', vat: 0.20, salesTax: 0, corporateTax: 0.19, withholdingTax: 0.20, region: 'Europe' },
  { country: 'DE', countryName: 'Germany', vat: 0.19, salesTax: 0, corporateTax: 0.30, withholdingTax: 0.25, region: 'Europe' },
  { country: 'FR', countryName: 'France', vat: 0.20, salesTax: 0, corporateTax: 0.26, withholdingTax: 0.12, region: 'Europe' },
  { country: 'IT', countryName: 'Italy', vat: 0.22, salesTax: 0, corporateTax: 0.24, withholdingTax: 0.26, region: 'Europe' },
  { country: 'ES', countryName: 'Spain', vat: 0.21, salesTax: 0, corporateTax: 0.25, withholdingTax: 0.19, region: 'Europe' },
  { country: 'NL', countryName: 'Netherlands', vat: 0.21, salesTax: 0, corporateTax: 0.25, withholdingTax: 0.25, region: 'Europe' },

  // North America
  { country: 'US', countryName: 'United States', vat: 0, salesTax: 0.08, corporateTax: 0.21, withholdingTax: 0.30, region: 'North America' },
  { country: 'CA', countryName: 'Canada', vat: 0.05, salesTax: 0.05, corporateTax: 0.15, withholdingTax: 0.25, region: 'North America' },
  { country: 'MX', countryName: 'Mexico', vat: 0.16, salesTax: 0, corporateTax: 0.30, withholdingTax: 0.10, region: 'North America' },

  // Asia
  { country: 'CN', countryName: 'China', vat: 0.13, salesTax: 0, corporateTax: 0.25, withholdingTax: 0.10, region: 'Asia' },
  { country: 'IN', countryName: 'India', vat: 0.18, salesTax: 0, corporateTax: 0.30, withholdingTax: 0.10, region: 'Asia' },
  { country: 'JP', countryName: 'Japan', vat: 0.10, salesTax: 0, corporateTax: 0.30, withholdingTax: 0.20, region: 'Asia' },
  { country: 'SG', countryName: 'Singapore', vat: 0.08, salesTax: 0, corporateTax: 0.17, withholdingTax: 0.15, region: 'Asia' },

  // Middle East
  { country: 'AE', countryName: 'UAE', vat: 0.05, salesTax: 0, corporateTax: 0.09, withholdingTax: 0, region: 'Middle East' },
  { country: 'SA', countryName: 'Saudi Arabia', vat: 0.15, salesTax: 0, corporateTax: 0.20, withholdingTax: 0.05, region: 'Middle East' },
];

export function getTaxRate(country: string, type: 'vat' | 'salesTax' | 'corporateTax' | 'withholdingTax'): number {
  const rate = GLOBAL_TAX_RATES.find((r) => r.country === country.toUpperCase());
  return rate ? rate[type] : 0;
}
