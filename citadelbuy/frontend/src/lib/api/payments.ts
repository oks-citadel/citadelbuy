import { api as apiClient } from '../api';

export interface CreatePaymentIntentRequest {
  amount: number;
  currency?: string;
  orderId?: string;
}

export interface CreatePaymentIntentResponse {
  clientSecret: string;
  paymentIntentId: string;
}

export const paymentsApi = {
  /**
   * Create a Stripe payment intent
   */
  async createPaymentIntent(
    data: CreatePaymentIntentRequest,
  ): Promise<CreatePaymentIntentResponse> {
    const response = await apiClient.post('/payments/create-intent', {
      amount: data.amount,
      currency: data.currency || 'usd',
      orderId: data.orderId,
    });
    return response.data;
  },
};
