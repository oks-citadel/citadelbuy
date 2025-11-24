import { apiClient } from './client';

// ==================== Types & Interfaces ====================

export interface ReturnItem {
  orderItemId: string;
  productId: string;
  quantity: number;
  reason: string;
  condition?: string;
  notes?: string;
  itemPrice: number;
}

export interface CreateReturnRequest {
  orderId: string;
  returnType: 'REFUND' | 'EXCHANGE' | 'STORE_CREDIT' | 'PARTIAL_REFUND';
  reason: string;
  comments?: string;
  items: ReturnItem[];
}

export interface ReturnRequest {
  id: string;
  userId: string;
  orderId: string;
  rmaNumber: string;
  returnType: string;
  status: string;
  reason: string;
  comments?: string;
  totalAmount: number;
  restockingFee: number;
  shippingCost: number;
  inspectionNotes?: string;
  resolutionNotes?: string;
  createdAt: string;
  updatedAt: string;
  approvedAt?: string;
  rejectedAt?: string;
  completedAt?: string;
  items: ReturnRequestItem[];
  returnLabel?: ReturnLabel;
  refund?: Refund;
}

export interface ReturnRequestItem {
  id: string;
  returnRequestId: string;
  orderItemId: string;
  productId: string;
  quantity: number;
  reason: string;
  condition?: string;
  notes?: string;
  itemPrice: number;
  refundAmount: number;
  inspectionStatus?: string;
  product: {
    id: string;
    name: string;
    sku: string;
    imageUrl?: string;
  };
}

export interface ReturnLabel {
  id: string;
  returnRequestId: string;
  shipmentId: string;
  orderId: string;
  carrier: string;
  trackingNumber: string;
  labelUrl?: string;
  cost: number;
  createdAt: string;
}

export interface Refund {
  id: string;
  returnRequestId: string;
  userId: string;
  orderId: string;
  method: string;
  status: string;
  totalAmount: number;
  processingFee: number;
  transactionId?: string;
  failedReason?: string;
  processedAt?: string;
  createdAt: string;
}

export interface ReturnFilters {
  status?: string;
  returnType?: string;
  startDate?: string;
  endDate?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export interface ApproveReturnDto {
  approvedAmount?: number;
  adjustmentReason?: string;
  resolutionNotes?: string;
}

export interface RejectReturnDto {
  resolutionNotes: string;
}

export interface GenerateLabelDto {
  carrier?: string;
  serviceLevel?: string;
}

export interface InspectReturnDto {
  items: Array<{
    returnItemId: string;
    inspectionStatus: 'APPROVED' | 'REJECTED' | 'RESTOCKING_FEE';
    condition?: string;
    notes?: string;
    adjustedRefundAmount?: number;
  }>;
  inspectionNotes?: string;
}

export interface ReturnAnalytics {
  totalReturns: number;
  pendingReturns: number;
  approvedReturns: number;
  rejectedReturns: number;
  totalRefundAmount: number;
  averageProcessingTime: number;
  returnRate: number;
  topReasons: Array<{
    reason: string;
    count: number;
  }>;
  returnsByType: Array<{
    type: string;
    count: number;
  }>;
  monthlyTrends: Array<{
    month: string;
    count: number;
    refundAmount: number;
  }>;
}

// ==================== API Methods ====================

export const returnsApi = {
  /**
   * Create a new return request (Customer)
   */
  async create(data: CreateReturnRequest): Promise<ReturnRequest> {
    return apiClient.post<ReturnRequest>('/returns', data);
  },

  /**
   * Get current user's return requests (Customer)
   */
  async getMyReturns(filters?: ReturnFilters): Promise<ReturnRequest[]> {
    const params = new URLSearchParams();
    if (filters?.status) params.append('status', filters.status);
    if (filters?.returnType) params.append('returnType', filters.returnType);
    if (filters?.startDate) params.append('startDate', filters.startDate);
    if (filters?.endDate) params.append('endDate', filters.endDate);
    if (filters?.page) params.append('page', filters.page.toString());
    if (filters?.limit) params.append('limit', filters.limit.toString());

    const url = `/returns/my-returns${params.toString() ? `?${params.toString()}` : ''}`;
    return apiClient.get<ReturnRequest[]>(url);
  },

  /**
   * Get all return requests (Admin)
   */
  async getAll(filters?: ReturnFilters): Promise<{
    data: ReturnRequest[];
    total: number;
    page: number;
    limit: number;
  }> {
    const params = new URLSearchParams();
    if (filters?.status) params.append('status', filters.status);
    if (filters?.returnType) params.append('returnType', filters.returnType);
    if (filters?.startDate) params.append('startDate', filters.startDate);
    if (filters?.endDate) params.append('endDate', filters.endDate);
    if (filters?.search) params.append('search', filters.search);
    if (filters?.page) params.append('page', filters.page.toString());
    if (filters?.limit) params.append('limit', filters.limit.toString());

    const url = `/returns${params.toString() ? `?${params.toString()}` : ''}`;
    return apiClient.get<{ data: ReturnRequest[]; total: number; page: number; limit: number }>(url);
  },

  /**
   * Get a specific return request by ID
   */
  async getById(id: string): Promise<ReturnRequest> {
    return apiClient.get<ReturnRequest>(`/returns/${id}`);
  },

  /**
   * Cancel a return request (Customer)
   */
  async cancel(id: string): Promise<ReturnRequest> {
    return apiClient.post<ReturnRequest>(`/returns/${id}/cancel`);
  },

  /**
   * Approve a return request (Admin)
   */
  async approve(id: string, data?: ApproveReturnDto): Promise<ReturnRequest> {
    return apiClient.post<ReturnRequest>(`/returns/${id}/approve`, data || {});
  },

  /**
   * Reject a return request (Admin)
   */
  async reject(id: string, data: RejectReturnDto): Promise<ReturnRequest> {
    return apiClient.post<ReturnRequest>(`/returns/${id}/reject`, data);
  },

  /**
   * Generate return shipping label (Admin)
   */
  async generateLabel(id: string, data?: GenerateLabelDto): Promise<ReturnLabel> {
    return apiClient.post<ReturnLabel>(`/returns/${id}/label`, data || {});
  },

  /**
   * Mark return as received (Admin)
   */
  async markReceived(id: string): Promise<ReturnRequest> {
    return apiClient.post<ReturnRequest>(`/returns/${id}/receive`);
  },

  /**
   * Inspect returned items (Admin)
   */
  async inspect(id: string, data: InspectReturnDto): Promise<ReturnRequest> {
    return apiClient.post<ReturnRequest>(`/returns/${id}/inspect`, data);
  },

  /**
   * Process refund for return (Admin)
   */
  async processRefund(refundId: string): Promise<Refund> {
    return apiClient.post<Refund>(`/returns/refunds/${refundId}/process`);
  },

  /**
   * Issue store credit for return (Admin)
   */
  async issueStoreCredit(refundId: string): Promise<Refund> {
    return apiClient.post<Refund>(`/returns/refunds/${refundId}/store-credit`);
  },

  /**
   * Get return analytics (Admin)
   */
  async getAnalytics(startDate?: string, endDate?: string): Promise<ReturnAnalytics> {
    const params = new URLSearchParams();
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);

    const url = `/returns/analytics${params.toString() ? `?${params.toString()}` : ''}`;
    return apiClient.get<ReturnAnalytics>(url);
  },
};
