import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';

export interface LocalizedPrice {
  id: string;
  productId: string;
  countryCode: string;
  price: number;
  currency: string;
  compareAtPrice?: number;
  taxInclusive: boolean;
}

export interface CurrencyRate {
  baseCurrency: string;
  targetCurrency: string;
  rate: number;
  updatedAt: Date;
}

export interface GeoLocation {
  ip: string;
  countryCode: string;
  countryName: string;
  regionCode?: string;
  regionName?: string;
  city?: string;
  postalCode?: string;
  timezone?: string;
  currency?: string;
  language?: string;
}

export interface RegionalCompliance {
  id: string;
  region: string;
  organizationId?: string;
  complianceType: string;
  rules: Record<string, any>;
  isActive: boolean;
  createdAt: Date;
}

@Injectable()
export class LocalizationService {
  private readonly logger = new Logger(LocalizationService.name);

  private localizedPrices: Map<string, LocalizedPrice> = new Map();
  private currencyRates: Map<string, CurrencyRate> = new Map();
  private complianceRules: Map<string, RegionalCompliance> = new Map();

  constructor(private readonly prisma: PrismaService) {
    // Initialize some default currency rates
    this.initDefaultRates();
  }

  private initDefaultRates() {
    const rates = [
      { base: 'USD', target: 'EUR', rate: 0.92 },
      { base: 'USD', target: 'GBP', rate: 0.79 },
      { base: 'USD', target: 'CAD', rate: 1.36 },
      { base: 'USD', target: 'AUD', rate: 1.53 },
      { base: 'USD', target: 'JPY', rate: 149.50 },
      { base: 'USD', target: 'INR', rate: 83.12 },
    ];
    rates.forEach(r => {
      const key = `${r.base}-${r.target}`;
      this.currencyRates.set(key, {
        baseCurrency: r.base,
        targetCurrency: r.target,
        rate: r.rate,
        updatedAt: new Date(),
      });
    });
  }

  // Localized Pricing
  async createLocalizedPrice(data: Partial<LocalizedPrice>): Promise<LocalizedPrice> {
    const id = `lprice-${Date.now()}`;
    const price: LocalizedPrice = {
      id,
      productId: data.productId!,
      countryCode: data.countryCode!,
      price: data.price!,
      currency: data.currency!,
      compareAtPrice: data.compareAtPrice,
      taxInclusive: data.taxInclusive || false,
    };
    this.localizedPrices.set(id, price);
    return price;
  }

  async getLocalizedPrice(productId: string, countryCode: string): Promise<LocalizedPrice | null> {
    return Array.from(this.localizedPrices.values())
      .find(p => p.productId === productId && p.countryCode === countryCode) || null;
  }

  async getLocalizedPrices(productId: string): Promise<LocalizedPrice[]> {
    return Array.from(this.localizedPrices.values())
      .filter(p => p.productId === productId);
  }

  async updateLocalizedPrice(id: string, data: Partial<LocalizedPrice>): Promise<LocalizedPrice> {
    const price = this.localizedPrices.get(id);
    if (!price) throw new NotFoundException(`Price ${id} not found`);
    const updated = { ...price, ...data };
    this.localizedPrices.set(id, updated);
    return updated;
  }

  async deleteLocalizedPrice(id: string): Promise<void> {
    this.localizedPrices.delete(id);
  }

  // Currency Conversion
  async convertCurrency(amount: number, fromCurrency: string, toCurrency: string): Promise<{
    amount: number;
    fromCurrency: string;
    toCurrency: string;
    convertedAmount: number;
    rate: number;
  }> {
    if (fromCurrency === toCurrency) {
      return { amount, fromCurrency, toCurrency, convertedAmount: amount, rate: 1 };
    }

    let rate = 1;
    const directKey = `${fromCurrency}-${toCurrency}`;
    const inverseKey = `${toCurrency}-${fromCurrency}`;

    if (this.currencyRates.has(directKey)) {
      rate = this.currencyRates.get(directKey)!.rate;
    } else if (this.currencyRates.has(inverseKey)) {
      rate = 1 / this.currencyRates.get(inverseKey)!.rate;
    } else if (fromCurrency !== 'USD' && toCurrency !== 'USD') {
      // Convert through USD
      const toUSD = this.currencyRates.get(`USD-${fromCurrency}`);
      const fromUSD = this.currencyRates.get(`USD-${toCurrency}`);
      if (toUSD && fromUSD) {
        rate = fromUSD.rate / toUSD.rate;
      }
    }

    return {
      amount,
      fromCurrency,
      toCurrency,
      convertedAmount: amount * rate,
      rate,
    };
  }

  async getCurrencyRates(baseCurrency: string = 'USD'): Promise<CurrencyRate[]> {
    return Array.from(this.currencyRates.values())
      .filter(r => r.baseCurrency === baseCurrency);
  }

  async setCurrencyRate(baseCurrency: string, targetCurrency: string, rate: number): Promise<CurrencyRate> {
    const key = `${baseCurrency}-${targetCurrency}`;
    const currencyRate: CurrencyRate = {
      baseCurrency,
      targetCurrency,
      rate,
      updatedAt: new Date(),
    };
    this.currencyRates.set(key, currencyRate);
    return currencyRate;
  }

  // Geo Detection
  async detectGeoLocation(ipAddress?: string): Promise<GeoLocation> {
    // Mock geo detection - in production, use a real IP geolocation service
    this.logger.log(`Detecting geo for IP: ${ipAddress || 'auto'}`);

    return {
      ip: ipAddress || '127.0.0.1',
      countryCode: 'US',
      countryName: 'United States',
      regionCode: 'CA',
      regionName: 'California',
      city: 'San Francisco',
      postalCode: '94105',
      timezone: 'America/Los_Angeles',
      currency: 'USD',
      language: 'en-US',
    };
  }

  async getCountryInfo(countryCode: string): Promise<{
    countryCode: string;
    name: string;
    currency: string;
    languages: string[];
    timezone: string;
  }> {
    const countryData: Record<string, any> = {
      US: { name: 'United States', currency: 'USD', languages: ['en'], timezone: 'America/New_York' },
      GB: { name: 'United Kingdom', currency: 'GBP', languages: ['en'], timezone: 'Europe/London' },
      DE: { name: 'Germany', currency: 'EUR', languages: ['de'], timezone: 'Europe/Berlin' },
      FR: { name: 'France', currency: 'EUR', languages: ['fr'], timezone: 'Europe/Paris' },
      JP: { name: 'Japan', currency: 'JPY', languages: ['ja'], timezone: 'Asia/Tokyo' },
      IN: { name: 'India', currency: 'INR', languages: ['hi', 'en'], timezone: 'Asia/Kolkata' },
    };

    const info = countryData[countryCode] || { name: 'Unknown', currency: 'USD', languages: ['en'], timezone: 'UTC' };
    return { countryCode, ...info };
  }

  // Regional Compliance
  async createRegionalCompliance(data: Partial<RegionalCompliance>): Promise<RegionalCompliance> {
    const id = `compliance-${Date.now()}`;
    const compliance: RegionalCompliance = {
      id,
      region: data.region!,
      organizationId: data.organizationId,
      complianceType: data.complianceType!,
      rules: data.rules!,
      isActive: data.isActive !== false,
      createdAt: new Date(),
    };
    this.complianceRules.set(id, compliance);
    return compliance;
  }

  async getRegionalCompliance(region: string): Promise<RegionalCompliance[]> {
    return Array.from(this.complianceRules.values())
      .filter(c => c.region === region && c.isActive);
  }

  async checkCompliance(countryCode: string, regionCode?: string, types?: string[]): Promise<{
    compliant: boolean;
    requirements: Array<{ type: string; rules: any; required: boolean }>;
  }> {
    const compliance = await this.getRegionalCompliance(countryCode);
    let filtered = compliance;
    if (types?.length) {
      filtered = compliance.filter(c => types.includes(c.complianceType));
    }

    return {
      compliant: true,
      requirements: filtered.map(c => ({
        type: c.complianceType,
        rules: c.rules,
        required: true,
      })),
    };
  }

  async updateRegionalCompliance(id: string, data: Partial<RegionalCompliance>): Promise<RegionalCompliance> {
    const compliance = this.complianceRules.get(id);
    if (!compliance) throw new NotFoundException(`Compliance ${id} not found`);
    const updated = { ...compliance, ...data };
    this.complianceRules.set(id, updated);
    return updated;
  }

  async deleteRegionalCompliance(id: string): Promise<void> {
    this.complianceRules.delete(id);
  }
}
