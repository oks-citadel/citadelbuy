import { Injectable, Logger } from '@nestjs/common';
import {
  TaxProviderInterface,
  TaxCalculationParams,
  TaxCalculationResponse,
  CustomerDetails,
  ExemptionValidationResponse,
  LocationDetails,
  TaxRateResponse,
  TransactionDetails,
  TransactionResponse,
} from './tax-provider.interface';

/**
 * TaxJar API Integration
 * Documentation: https://developers.taxjar.com/api/reference/
 */
@Injectable()
export class TaxJarProvider implements TaxProviderInterface {
  private readonly logger = new Logger(TaxJarProvider.name);
  private readonly apiKey: string;
  private readonly apiUrl = 'https://api.taxjar.com/v2';

  constructor() {
    this.apiKey = process.env.TAXJAR_API_KEY || '';

    if (!this.apiKey) {
      this.logger.warn('TaxJar API key not configured. Tax calculations will fail.');
    }
  }

  getProviderName(): string {
    return 'TaxJar';
  }

  async calculateTax(
    params: TaxCalculationParams,
  ): Promise<TaxCalculationResponse> {
    if (!this.apiKey) {
      throw new Error('TaxJar API key not configured');
    }

    try {
      const requestBody = {
        from_country: params.fromCountry || 'US',
        from_zip: params.fromZip,
        from_state: params.fromState,
        from_city: params.fromCity,
        to_country: params.toCountry,
        to_zip: params.toZip,
        to_state: params.toState,
        to_city: params.toCity,
        amount: params.amount,
        shipping: params.shipping,
        line_items: params.lineItems?.map((item) => ({
          id: item.id,
          quantity: item.quantity,
          unit_price: item.unitPrice,
          product_tax_code: item.productTaxCode,
        })),
      };

      const response = await fetch(`${this.apiUrl}/taxes`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(`TaxJar API error: ${error.error || response.statusText}`);
      }

      const data = await response.json();
      const tax = data.tax;

      // Build breakdown from TaxJar response
      const breakdown: TaxCalculationResponse['breakdown'] = [];

      if (tax.breakdown) {
        if (tax.breakdown.state_taxable_amount > 0) {
          breakdown.push({
            taxableAmount: tax.breakdown.state_taxable_amount,
            taxAmount: tax.breakdown.state_tax_rate * tax.breakdown.state_taxable_amount,
            rate: tax.breakdown.state_tax_rate,
            jurisdictionName: params.toState || 'State',
            jurisdictionType: 'state',
          });
        }

        if (tax.breakdown.county_taxable_amount > 0) {
          breakdown.push({
            taxableAmount: tax.breakdown.county_taxable_amount,
            taxAmount: tax.breakdown.county_tax_rate * tax.breakdown.county_taxable_amount,
            rate: tax.breakdown.county_tax_rate,
            jurisdictionName: 'County',
            jurisdictionType: 'county',
          });
        }

        if (tax.breakdown.city_taxable_amount > 0) {
          breakdown.push({
            taxableAmount: tax.breakdown.city_taxable_amount,
            taxAmount: tax.breakdown.city_tax_rate * tax.breakdown.city_taxable_amount,
            rate: tax.breakdown.city_tax_rate,
            jurisdictionName: params.toCity || 'City',
            jurisdictionType: 'city',
          });
        }
      }

      return {
        taxAmount: tax.amount_to_collect,
        rate: tax.rate,
        shipping: tax.shipping,
        taxableAmount: tax.taxable_amount,
        breakdown,
      };
    } catch (error) {
      this.logger.error('TaxJar tax calculation failed:', error);
      throw error;
    }
  }

  async validateExemption(
    certificateNumber: string,
    customerDetails: CustomerDetails,
  ): Promise<ExemptionValidationResponse> {
    if (!this.apiKey) {
      throw new Error('TaxJar API key not configured');
    }

    try {
      // TaxJar exemption certificate validation
      // Note: This requires TaxJar Plus subscription
      const response = await fetch(
        `${this.apiUrl}/customers/${customerDetails.customerId}/exemptions/${certificateNumber}`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
          },
        },
      );

      if (!response.ok) {
        if (response.status === 404) {
          return {
            valid: false,
            reason: 'Certificate not found',
          };
        }
        throw new Error(`TaxJar API error: ${response.statusText}`);
      }

      const data = await response.json();
      const exemption = data.exemption_certificate;

      return {
        valid: true,
        exemptionType: exemption.exempt_regions?.[0]?.region || 'general',
        expirationDate: exemption.expiration_date
          ? new Date(exemption.expiration_date)
          : undefined,
      };
    } catch (error) {
      this.logger.error('TaxJar exemption validation failed:', error);
      // Return invalid on error
      return {
        valid: false,
        reason: error.message,
      };
    }
  }

  async getTaxRates(location: LocationDetails): Promise<TaxRateResponse> {
    if (!this.apiKey) {
      throw new Error('TaxJar API key not configured');
    }

    try {
      const params = new URLSearchParams({
        country: location.country,
        ...(location.zip && { zip: location.zip }),
        ...(location.state && { state: location.state }),
        ...(location.city && { city: location.city }),
        ...(location.street && { street: location.street }),
      });

      const response = await fetch(`${this.apiUrl}/rates/${location.zip}?${params}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`TaxJar API error: ${response.statusText}`);
      }

      const data = await response.json();
      const rate = data.rate;

      return {
        combinedRate: parseFloat(rate.combined_rate) || 0,
        stateRate: parseFloat(rate.state_rate) || 0,
        countyRate: parseFloat(rate.county_rate) || 0,
        cityRate: parseFloat(rate.city_rate) || 0,
        specialRate: parseFloat(rate.special_rate) || 0,
        country: rate.country,
        state: rate.state,
        city: rate.city,
        zip: rate.zip,
      };
    } catch (error) {
      this.logger.error('TaxJar get rates failed:', error);
      throw error;
    }
  }

  async createTransaction(
    transaction: TransactionDetails,
  ): Promise<TransactionResponse> {
    if (!this.apiKey) {
      throw new Error('TaxJar API key not configured');
    }

    try {
      const requestBody = {
        transaction_id: transaction.transactionId,
        transaction_date: transaction.transactionDate.toISOString().split('T')[0],
        to_country: transaction.toCountry,
        to_zip: transaction.toZip,
        to_state: transaction.toState,
        to_city: transaction.toCity,
        amount: transaction.amount,
        shipping: transaction.shipping,
        sales_tax: transaction.taxAmount,
        line_items: transaction.lineItems.map((item) => ({
          id: item.id,
          quantity: item.quantity,
          unit_price: item.unitPrice,
          sales_tax: item.taxAmount,
          product_tax_code: item.productTaxCode,
        })),
      };

      const response = await fetch(`${this.apiUrl}/transactions/orders`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ transaction: requestBody }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(`TaxJar API error: ${error.error || response.statusText}`);
      }

      const data = await response.json();

      return {
        transactionId: data.transaction.transaction_id,
        taxAmount: parseFloat(data.transaction.sales_tax) || 0,
        status: 'success',
      };
    } catch (error) {
      this.logger.error('TaxJar create transaction failed:', error);
      throw error;
    }
  }
}
