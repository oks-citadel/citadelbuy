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
 * Avalara AvaTax API Integration
 * Documentation: https://developer.avalara.com/avatax/dev-guide/
 */
@Injectable()
export class AvalaraProvider implements TaxProviderInterface {
  private readonly logger = new Logger(AvalaraProvider.name);
  private readonly accountId: string;
  private readonly licenseKey: string;
  private readonly apiUrl: string;
  private readonly companyCode: string;

  constructor() {
    this.accountId = process.env.AVALARA_ACCOUNT_ID || '';
    this.licenseKey = process.env.AVALARA_LICENSE_KEY || '';
    this.companyCode = process.env.AVALARA_COMPANY_CODE || 'DEFAULT';

    // Use production or sandbox environment
    const environment = process.env.AVALARA_ENVIRONMENT || 'sandbox';
    this.apiUrl =
      environment === 'production'
        ? 'https://rest.avatax.com/api/v2'
        : 'https://sandbox-rest.avatax.com/api/v2';

    if (!this.accountId || !this.licenseKey) {
      this.logger.warn('Avalara credentials not configured. Tax calculations will fail.');
    }
  }

  getProviderName(): string {
    return 'Avalara';
  }

  private getAuthHeader(): string {
    const credentials = Buffer.from(`${this.accountId}:${this.licenseKey}`).toString(
      'base64',
    );
    return `Basic ${credentials}`;
  }

  async calculateTax(
    params: TaxCalculationParams,
  ): Promise<TaxCalculationResponse> {
    if (!this.accountId || !this.licenseKey) {
      throw new Error('Avalara credentials not configured');
    }

    try {
      // Build AvaTax transaction request
      const requestBody = {
        type: 'SalesOrder',
        companyCode: this.companyCode,
        date: new Date().toISOString().split('T')[0],
        customerCode: 'CUSTOMER',
        addresses: {
          singleLocation: {
            line1: '',
            city: params.toCity || '',
            region: params.toState || '',
            country: params.toCountry,
            postalCode: params.toZip || '',
          },
        },
        lines: params.lineItems?.map((item, index) => ({
          number: `${index + 1}`,
          quantity: item.quantity,
          amount: item.unitPrice * item.quantity,
          taxCode: item.productTaxCode,
          itemCode: item.id,
        })) || [
          {
            number: '1',
            quantity: 1,
            amount: params.amount,
          },
        ],
        commit: false, // Don't commit transaction during calculation
      };

      // Add shipping as a separate line if present
      if (params.shipping > 0) {
        requestBody.lines.push({
          number: `${requestBody.lines.length + 1}`,
          quantity: 1,
          amount: params.shipping,
          taxCode: 'FR', // Freight/Shipping tax code
          itemCode: 'SHIPPING',
        });
      }

      const response = await fetch(`${this.apiUrl}/transactions/create`, {
        method: 'POST',
        headers: {
          'Authorization': this.getAuthHeader(),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(
          `Avalara API error: ${error.error?.message || response.statusText}`,
        );
      }

      const data = await response.json();

      // Build breakdown from Avalara response
      const breakdown: TaxCalculationResponse['breakdown'] = [];

      if (data.summary) {
        data.summary.forEach((jurisdiction: any) => {
          breakdown.push({
            taxableAmount: jurisdiction.taxable || 0,
            taxAmount: jurisdiction.tax || 0,
            rate: jurisdiction.rate || 0,
            jurisdictionName: jurisdiction.jurisName || 'Unknown',
            jurisdictionType: jurisdiction.jurisType?.toLowerCase() || 'unknown',
          });
        });
      }

      return {
        taxAmount: data.totalTax || 0,
        rate: data.totalTax / (params.amount + params.shipping) || 0,
        shipping: params.shipping,
        taxableAmount: data.totalTaxable || params.amount + params.shipping,
        breakdown,
      };
    } catch (error) {
      this.logger.error('Avalara tax calculation failed:', error);
      throw error;
    }
  }

  async validateExemption(
    certificateNumber: string,
    customerDetails: CustomerDetails,
  ): Promise<ExemptionValidationResponse> {
    if (!this.accountId || !this.licenseKey) {
      throw new Error('Avalara credentials not configured');
    }

    try {
      // Avalara CertCapture API for exemption certificate management
      const response = await fetch(
        `${this.apiUrl}/companies/${this.companyCode}/certificates/${certificateNumber}`,
        {
          method: 'GET',
          headers: {
            'Authorization': this.getAuthHeader(),
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
        throw new Error(`Avalara API error: ${response.statusText}`);
      }

      const certificate = await response.json();

      // Check if certificate is valid and not expired
      const now = new Date();
      const expirationDate = certificate.expirationDate
        ? new Date(certificate.expirationDate)
        : null;
      const isExpired = expirationDate && expirationDate < now;

      return {
        valid: certificate.valid && !isExpired,
        exemptionType: certificate.exemptionReason?.name || 'general',
        expirationDate: expirationDate || undefined,
        reason: isExpired ? 'Certificate expired' : undefined,
      };
    } catch (error) {
      this.logger.error('Avalara exemption validation failed:', error);
      return {
        valid: false,
        reason: error.message,
      };
    }
  }

  async getTaxRates(location: LocationDetails): Promise<TaxRateResponse> {
    if (!this.accountId || !this.licenseKey) {
      throw new Error('Avalara credentials not configured');
    }

    try {
      const params = new URLSearchParams({
        ...(location.street && { line1: location.street }),
        ...(location.city && { city: location.city }),
        ...(location.state && { region: location.state }),
        country: location.country,
        ...(location.zip && { postalCode: location.zip }),
      });

      const response = await fetch(`${this.apiUrl}/taxrates/byaddress?${params}`, {
        method: 'GET',
        headers: {
          'Authorization': this.getAuthHeader(),
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Avalara API error: ${response.statusText}`);
      }

      const data = await response.json();

      // Extract rates from response
      let stateRate = 0;
      let countyRate = 0;
      let cityRate = 0;
      let specialRate = 0;

      if (data.rates && Array.isArray(data.rates)) {
        data.rates.forEach((rate: any) => {
          switch (rate.type?.toLowerCase()) {
            case 'state':
              stateRate += rate.rate || 0;
              break;
            case 'county':
              countyRate += rate.rate || 0;
              break;
            case 'city':
              cityRate += rate.rate || 0;
              break;
            case 'special':
              specialRate += rate.rate || 0;
              break;
          }
        });
      }

      const combinedRate = data.totalRate || stateRate + countyRate + cityRate + specialRate;

      return {
        combinedRate,
        stateRate,
        countyRate,
        cityRate,
        specialRate,
        country: location.country,
        state: location.state,
        city: location.city,
        zip: location.zip,
      };
    } catch (error) {
      this.logger.error('Avalara get rates failed:', error);
      throw error;
    }
  }

  async createTransaction(
    transaction: TransactionDetails,
  ): Promise<TransactionResponse> {
    if (!this.accountId || !this.licenseKey) {
      throw new Error('Avalara credentials not configured');
    }

    try {
      const requestBody = {
        type: 'SalesInvoice', // Committed transaction
        companyCode: this.companyCode,
        code: transaction.transactionId,
        date: transaction.transactionDate.toISOString().split('T')[0],
        customerCode: 'CUSTOMER',
        addresses: {
          singleLocation: {
            line1: '',
            city: transaction.toCity || '',
            region: transaction.toState || '',
            country: transaction.toCountry,
            postalCode: transaction.toZip || '',
          },
        },
        lines: transaction.lineItems.map((item, index) => ({
          number: `${index + 1}`,
          quantity: item.quantity,
          amount: item.unitPrice * item.quantity,
          tax: item.taxAmount,
          taxCode: item.productTaxCode,
          itemCode: item.id,
        })),
        commit: true, // Commit the transaction
      };

      // Add shipping as a separate line
      if (transaction.shipping > 0) {
        requestBody.lines.push({
          number: `${requestBody.lines.length + 1}`,
          quantity: 1,
          amount: transaction.shipping,
          tax: 0,
          taxCode: 'FR',
          itemCode: 'SHIPPING',
        });
      }

      const response = await fetch(`${this.apiUrl}/transactions/create`, {
        method: 'POST',
        headers: {
          'Authorization': this.getAuthHeader(),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(
          `Avalara API error: ${error.error?.message || response.statusText}`,
        );
      }

      const data = await response.json();

      return {
        transactionId: data.code,
        taxAmount: data.totalTax || 0,
        status: data.status || 'success',
      };
    } catch (error) {
      this.logger.error('Avalara create transaction failed:', error);
      throw error;
    }
  }
}
