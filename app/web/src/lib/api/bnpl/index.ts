import { apiClient } from '../client';

export interface BnplPaymentPlan {
  id: string;
  orderId: string;
  provider: 'KLARNA' | 'AFFIRM' | 'AFTERPAY' | 'SEZZLE';
  status: string;
  totalAmount: number;
  downPayment: number;
  numberOfInstallments: number;
  installmentAmount: number;
  totalPaid: number;
  remainingBalance: number;
  firstPaymentDate: string;
  finalPaymentDate: string;
  installments?: BnplInstallment[];
}

export interface BnplInstallment {
  id: string;
  installmentNumber: number;
  amount: number;
  dueDate: string;
  paidDate?: string;
  status: string;
}

// BNPL APIs
export const bnplApi = {
  createPaymentPlan: async (data: {
    orderId: string;
    provider: string;
    numberOfInstallments: number;
    downPayment?: number;
  }) => {
    return await apiClient.post<BnplPaymentPlan>('/bnpl/payment-plans', data);
  },

  getPaymentPlans: async () => {
    return await apiClient.get<BnplPaymentPlan[]>('/bnpl/payment-plans');
  },

  getPaymentPlan: async (id: string) => {
    return await apiClient.get<BnplPaymentPlan>(`/bnpl/payment-plans/${id}`);
  },

  checkEligibility: async (orderId: string, provider: string) => {
    return await apiClient.get(`/bnpl/eligibility/${orderId}`);
  },

  payInstallment: async (installmentId: string) => {
    return await apiClient.post(`/bnpl/installments/${installmentId}/pay`);
  },

  getUpcomingInstallments: async () => {
    return await apiClient.get('/bnpl/installments/upcoming');
  },
};
