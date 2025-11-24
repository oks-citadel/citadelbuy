/**
 * Interface for external tax calculation providers (TaxJar, Avalara, etc.)
 */
export interface TaxProviderInterface {
  /**
   * Calculate tax for an order using the external provider
   */
  calculateTax(params: TaxCalculationParams): Promise<TaxCalculationResponse>;

  /**
   * Validate a tax exemption certificate with the provider
   */
  validateExemption(
    certificateNumber: string,
    customerDetails: CustomerDetails,
  ): Promise<ExemptionValidationResponse>;

  /**
   * Get tax rates for a specific location from the provider
   */
  getTaxRates(location: LocationDetails): Promise<TaxRateResponse>;

  /**
   * Create or update a transaction in the provider's system
   */
  createTransaction(
    transaction: TransactionDetails,
  ): Promise<TransactionResponse>;

  /**
   * Get provider name
   */
  getProviderName(): string;
}

export interface TaxCalculationParams {
  amount: number;
  shipping: number;
  toCountry: string;
  toState?: string;
  toCity?: string;
  toZip?: string;
  fromCountry?: string;
  fromState?: string;
  fromCity?: string;
  fromZip?: string;
  customerExemptionType?: string;
  lineItems?: Array<{
    id: string;
    quantity: number;
    unitPrice: number;
    productTaxCode?: string;
  }>;
}

export interface TaxCalculationResponse {
  taxAmount: number;
  rate: number;
  shipping: number;
  taxableAmount: number;
  breakdown: Array<{
    taxableAmount: number;
    taxAmount: number;
    rate: number;
    jurisdictionName: string;
    jurisdictionType: string;
  }>;
}

export interface CustomerDetails {
  customerId?: string;
  exemptionType: string;
  exemptRegion?: string;
  name?: string;
  address?: {
    street: string;
    city: string;
    state: string;
    zip: string;
    country: string;
  };
}

export interface ExemptionValidationResponse {
  valid: boolean;
  exemptionType?: string;
  reason?: string;
  expirationDate?: Date;
}

export interface LocationDetails {
  country: string;
  state?: string;
  city?: string;
  zip?: string;
  street?: string;
}

export interface TaxRateResponse {
  combinedRate: number;
  stateRate: number;
  countyRate?: number;
  cityRate?: number;
  specialRate?: number;
  country: string;
  state?: string;
  city?: string;
  zip?: string;
}

export interface TransactionDetails {
  transactionId: string;
  transactionDate: Date;
  amount: number;
  shipping: number;
  taxAmount: number;
  toCountry: string;
  toState?: string;
  toCity?: string;
  toZip?: string;
  lineItems: Array<{
    id: string;
    quantity: number;
    unitPrice: number;
    taxAmount: number;
    productTaxCode?: string;
  }>;
}

export interface TransactionResponse {
  transactionId: string;
  taxAmount: number;
  status: string;
}
