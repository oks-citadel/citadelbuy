/**
 * Organizations API - Handles organization and billing operations
 */

import { apiClient } from './api-client';

// Organizations API
export const organizationsApi = {
  // Organization management
  getById: async (orgId: string) => {
    const response = await apiClient.get<any>(`/api/organizations/${orgId}`);
    return response.data;
  },

  update: async (orgId: string, data: Partial<{
    name: string;
    slug: string;
    description: string;
    logo: string;
    website: string;
    contactEmail: string;
    contactPhone: string;
  }>) => {
    const response = await apiClient.patch<any>(`/api/organizations/${orgId}`, data);
    return response.data;
  },

  uploadLogo: async (orgId: string, file: File) => {
    const formData = new FormData();
    formData.append('logo', file);
    const response = await apiClient.post<{ logoUrl: string }>(
      `/api/organizations/${orgId}/logo`,
      formData,
      { headers: { 'Content-Type': 'multipart/form-data' } }
    );
    return response.data;
  },

  // Billing
  getBilling: async (orgId: string) => {
    const response = await apiClient.get<{
      plan: {
        id: string;
        name: string;
        price: number;
        interval: 'monthly' | 'yearly';
        features: string[];
      };
      usage: {
        members: { current: number; limit: number };
        products: { current: number; limit: number };
        apiCalls: { current: number; limit: number };
      };
      subscription: {
        status: 'active' | 'canceled' | 'past_due' | 'trialing';
        currentPeriodStart: string;
        currentPeriodEnd: string;
        cancelAtPeriodEnd: boolean;
      };
      paymentMethod?: {
        type: string;
        last4: string;
        brand: string;
        expiryMonth: number;
        expiryYear: number;
      };
    }>(`/api/organizations/${orgId}/billing`);
    return response.data;
  },

  subscribe: async (orgId: string, data: {
    planId: string;
    interval: 'monthly' | 'yearly';
    paymentMethodId?: string;
  }) => {
    const response = await apiClient.post<{
      subscriptionId: string;
      clientSecret?: string;
      status: string;
    }>(`/api/organizations/${orgId}/billing/subscribe`, data);
    return response.data;
  },

  updateSubscription: async (orgId: string, data: {
    planId?: string;
    interval?: 'monthly' | 'yearly';
  }) => {
    const response = await apiClient.patch<any>(`/api/organizations/${orgId}/billing/subscription`, data);
    return response.data;
  },

  cancelSubscription: async (orgId: string, cancelAtPeriodEnd: boolean = true) => {
    const response = await apiClient.post<any>(`/api/organizations/${orgId}/billing/cancel`, {
      cancelAtPeriodEnd,
    });
    return response.data;
  },

  getInvoices: async (orgId: string, params?: { page?: number; limit?: number }) => {
    const response = await apiClient.get<{
      invoices: Array<{
        id: string;
        number: string;
        status: 'paid' | 'open' | 'void' | 'uncollectible';
        amount: number;
        currency: string;
        date: string;
        dueDate: string;
        pdfUrl: string;
      }>;
      total: number;
    }>(`/api/organizations/${orgId}/billing/invoices`, { params });
    return response.data;
  },

  downloadInvoice: async (orgId: string, invoiceId: string) => {
    const response = await apiClient.get<Blob>(
      `/api/organizations/${orgId}/billing/invoices/${invoiceId}/pdf`,
      { responseType: 'blob' }
    );
    return response.data;
  },

  addPaymentMethod: async (orgId: string, data: {
    paymentMethodId: string;
    setAsDefault?: boolean;
  }) => {
    const response = await apiClient.post<any>(`/api/organizations/${orgId}/billing/payment-methods`, data);
    return response.data;
  },

  getPaymentMethods: async (orgId: string) => {
    const response = await apiClient.get<Array<{
      id: string;
      type: string;
      last4: string;
      brand: string;
      expiryMonth: number;
      expiryYear: number;
      isDefault: boolean;
    }>>(`/api/organizations/${orgId}/billing/payment-methods`);
    return response.data;
  },

  removePaymentMethod: async (orgId: string, paymentMethodId: string) => {
    await apiClient.delete(`/api/organizations/${orgId}/billing/payment-methods/${paymentMethodId}`);
  },

  setDefaultPaymentMethod: async (orgId: string, paymentMethodId: string) => {
    const response = await apiClient.post<any>(
      `/api/organizations/${orgId}/billing/payment-methods/${paymentMethodId}/default`
    );
    return response.data;
  },

  // Audit Logs
  getAuditLogs: async (orgId: string, params?: {
    userId?: string;
    action?: string;
    resource?: string;
    resourceId?: string;
    startDate?: string;
    endDate?: string;
    limit?: number;
    offset?: number;
  }) => {
    const response = await apiClient.get<{
      data: Array<{
        id: string;
        organizationId: string;
        userId?: string;
        action: string;
        resource: string;
        resourceId?: string;
        oldValue?: any;
        newValue?: any;
        metadata?: any;
        ipAddress?: string;
        userAgent?: string;
        createdAt: string;
        organization: {
          id: string;
          name: string;
          slug: string;
        };
      }>;
      total: number;
      limit: number;
      offset: number;
    }>(`/api/organizations/${orgId}/audit`, { params });
    return response.data;
  },

  getAuditStats: async (orgId: string, days?: number) => {
    const response = await apiClient.get<{
      totalActions: number;
      actionsByType: Array<{ action: string; count: number }>;
      actionsByUser: Array<{ userId: string; count: number }>;
      period: {
        start: string;
        end: string;
        days: number;
      };
    }>(`/api/organizations/${orgId}/audit/stats`, {
      params: { days },
    });
    return response.data;
  },

  getRecentActivity: async (orgId: string, limit?: number) => {
    const response = await apiClient.get<Array<{
      id: string;
      organizationId: string;
      userId?: string;
      action: string;
      resource: string;
      resourceId?: string;
      oldValue?: any;
      newValue?: any;
      metadata?: any;
      ipAddress?: string;
      userAgent?: string;
      createdAt: string;
    }>>(`/api/organizations/${orgId}/audit/recent`, {
      params: { limit },
    });
    return response.data;
  },

  getResourceHistory: async (orgId: string, resource: string, resourceId: string) => {
    const response = await apiClient.get<Array<{
      id: string;
      organizationId: string;
      userId?: string;
      action: string;
      resource: string;
      resourceId?: string;
      oldValue?: any;
      newValue?: any;
      metadata?: any;
      ipAddress?: string;
      userAgent?: string;
      createdAt: string;
    }>>(`/api/organizations/${orgId}/audit/resource/${resource}/${resourceId}`);
    return response.data;
  },

  getUserActivity: async (orgId: string, userId: string, limit?: number) => {
    const response = await apiClient.get<Array<{
      id: string;
      organizationId: string;
      userId?: string;
      action: string;
      resource: string;
      resourceId?: string;
      oldValue?: any;
      newValue?: any;
      metadata?: any;
      ipAddress?: string;
      userAgent?: string;
      createdAt: string;
    }>>(`/api/organizations/${orgId}/audit/user/${userId}`, {
      params: { limit },
    });
    return response.data;
  },
};
