import { Injectable, Logger } from '@nestjs/common';
import { TaxService } from '../tax/tax.service';
import { CalculateTaxDto } from '../tax/dto/create-tax-rate.dto';

export interface CheckoutAddress {
  street: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
}

export interface CheckoutItem {
  productId: string;
  quantity: number;
  price: number;
  categoryId?: string;
}

export interface CheckoutTaxCalculationParams {
  items: CheckoutItem[];
  subtotal: number;
  shippingAmount: number;
  shippingAddress: CheckoutAddress;
  customerId?: string;
}

export interface CheckoutTaxResult {
  taxAmount: number;
  taxableAmount: number;
  taxBreakdown: Array<{
    taxRateId: string;
    name: string;
    code: string;
    rate: number;
    amount: number;
    taxType: string;
  }>;
  totalWithTax: number;
}

@Injectable()
export class CheckoutTaxHelper {
  private readonly logger = new Logger(CheckoutTaxHelper.name);

  constructor(private taxService: TaxService) {}

  /**
   * Calculate tax for checkout
   */
  async calculateCheckoutTax(
    params: CheckoutTaxCalculationParams,
  ): Promise<CheckoutTaxResult> {
    try {
      // Extract product IDs and category IDs
      const productIds = params.items.map((item) => item.productId);
      const categoryIds = params.items
        .filter((item) => item.categoryId)
        .map((item) => item.categoryId!);

      // Prepare tax calculation DTO
      const taxDto: CalculateTaxDto = {
        subtotal: params.subtotal,
        shippingAmount: params.shippingAmount,
        country: params.shippingAddress.country,
        state: params.shippingAddress.state,
        city: params.shippingAddress.city,
        zipCode: params.shippingAddress.postalCode,
        customerId: params.customerId,
        productIds,
        categoryIds: categoryIds.length > 0 ? categoryIds : undefined,
      };

      // Calculate tax
      const taxResult = await this.taxService.calculateTax(taxDto);

      return {
        taxAmount: taxResult.taxAmount,
        taxableAmount: taxResult.taxableAmount,
        taxBreakdown: taxResult.taxBreakdown,
        totalWithTax: taxResult.totalAmount,
      };
    } catch (error) {
      this.logger.error('Failed to calculate tax for checkout:', error);

      // Return zero tax on error (fallback)
      return {
        taxAmount: 0,
        taxableAmount: params.subtotal + params.shippingAmount,
        taxBreakdown: [],
        totalWithTax: params.subtotal + params.shippingAmount,
      };
    }
  }

  /**
   * Calculate tax and store for order
   */
  async calculateAndStoreOrderTax(
    orderId: string,
    params: CheckoutTaxCalculationParams,
  ): Promise<CheckoutTaxResult> {
    try {
      // Extract product IDs and category IDs
      const productIds = params.items.map((item) => item.productId);
      const categoryIds = params.items
        .filter((item) => item.categoryId)
        .map((item) => item.categoryId!);

      // Prepare tax calculation DTO
      const taxDto: CalculateTaxDto = {
        subtotal: params.subtotal,
        shippingAmount: params.shippingAmount,
        country: params.shippingAddress.country,
        state: params.shippingAddress.state,
        city: params.shippingAddress.city,
        zipCode: params.shippingAddress.postalCode,
        customerId: params.customerId,
        productIds,
        categoryIds: categoryIds.length > 0 ? categoryIds : undefined,
      };

      // Calculate and store tax
      const taxResult = await this.taxService.calculateOrderTax(orderId, taxDto);

      return {
        taxAmount: taxResult.taxAmount,
        taxableAmount: taxResult.taxableAmount,
        taxBreakdown: taxResult.taxBreakdown,
        totalWithTax: taxResult.totalAmount,
      };
    } catch (error) {
      this.logger.error('Failed to calculate and store tax for order:', error);

      // Return zero tax on error (fallback)
      return {
        taxAmount: 0,
        taxableAmount: params.subtotal + params.shippingAmount,
        taxBreakdown: [],
        totalWithTax: params.subtotal + params.shippingAmount,
      };
    }
  }

  /**
   * Estimate shipping cost (placeholder - implement actual shipping calculation)
   */
  estimateShipping(
    items: CheckoutItem[],
    address: CheckoutAddress,
  ): number {
    // Simple flat rate for now - replace with actual shipping calculation
    const totalWeight = items.reduce((sum, item) => sum + item.quantity, 0);

    // Domestic shipping
    if (address.country === 'US') {
      return 9.99;
    }

    // International shipping
    return 24.99;
  }

  /**
   * Calculate order totals including tax
   */
  async calculateOrderTotals(params: {
    items: CheckoutItem[];
    shippingAddress: CheckoutAddress;
    customerId?: string;
    couponDiscount?: number;
  }): Promise<{
    subtotal: number;
    shippingAmount: number;
    taxAmount: number;
    discount: number;
    total: number;
    taxBreakdown: any[];
  }> {
    // Calculate subtotal
    const subtotal = params.items.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0,
    );

    // Calculate shipping
    const shippingAmount = this.estimateShipping(
      params.items,
      params.shippingAddress,
    );

    // Apply discount
    const discount = params.couponDiscount || 0;
    const subtotalAfterDiscount = Math.max(0, subtotal - discount);

    // Calculate tax
    const taxResult = await this.calculateCheckoutTax({
      items: params.items,
      subtotal: subtotalAfterDiscount,
      shippingAmount,
      shippingAddress: params.shippingAddress,
      customerId: params.customerId,
    });

    // Calculate total
    const total = subtotalAfterDiscount + shippingAmount + taxResult.taxAmount;

    return {
      subtotal,
      shippingAmount,
      taxAmount: taxResult.taxAmount,
      discount,
      total,
      taxBreakdown: taxResult.taxBreakdown,
    };
  }
}
