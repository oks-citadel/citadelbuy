import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

// ==================== WAREHOUSE API ====================

export const getWarehouses = async (isActive?: boolean) => {
  const params = isActive !== undefined ? { isActive } : {};
  const response = await axios.get(`${API_URL}/inventory/warehouses`, {
    params,
    headers: {
      Authorization: `Bearer ${localStorage.getItem('token')}`,
    },
  });
  return response.data;
};

export const getWarehouse = async (id: string) => {
  const response = await axios.get(`${API_URL}/inventory/warehouses/${id}`, {
    headers: {
      Authorization: `Bearer ${localStorage.getItem('token')}`,
    },
  });
  return response.data;
};

export const createWarehouse = async (data: any) => {
  const response = await axios.post(`${API_URL}/inventory/warehouses`, data, {
    headers: {
      Authorization: `Bearer ${localStorage.getItem('token')}`,
    },
  });
  return response.data;
};

export const updateWarehouse = async (id: string, data: any) => {
  const response = await axios.patch(`${API_URL}/inventory/warehouses/${id}`, data, {
    headers: {
      Authorization: `Bearer ${localStorage.getItem('token')}`,
    },
  });
  return response.data;
};

// ==================== INVENTORY API ====================

export const getInventory = async (params?: any) => {
  const response = await axios.get(`${API_URL}/inventory`, {
    params,
    headers: {
      Authorization: `Bearer ${localStorage.getItem('token')}`,
    },
  });
  return response.data;
};

export const getInventoryByProduct = async (productId: string, warehouseId?: string) => {
  const params = warehouseId ? { warehouseId } : {};
  const response = await axios.get(`${API_URL}/inventory/product/${productId}`, {
    params,
    headers: {
      Authorization: `Bearer ${localStorage.getItem('token')}`,
    },
  });
  return response.data;
};

export const adjustStock = async (data: any) => {
  const response = await axios.post(`${API_URL}/inventory/adjust`, data, {
    headers: {
      Authorization: `Bearer ${localStorage.getItem('token')}`,
    },
  });
  return response.data;
};

export const reserveStock = async (data: any) => {
  const response = await axios.post(`${API_URL}/inventory/reserve`, data, {
    headers: {
      Authorization: `Bearer ${localStorage.getItem('token')}`,
    },
  });
  return response.data;
};

export const releaseStock = async (orderId: string) => {
  const response = await axios.post(`${API_URL}/inventory/release/${orderId}`, {}, {
    headers: {
      Authorization: `Bearer ${localStorage.getItem('token')}`,
    },
  });
  return response.data;
};

// ==================== TRANSFERS API ====================

export const createTransfer = async (data: any) => {
  const response = await axios.post(`${API_URL}/inventory/transfers`, data, {
    headers: {
      Authorization: `Bearer ${localStorage.getItem('token')}`,
    },
  });
  return response.data;
};

export const getTransfers = async (params?: any) => {
  const response = await axios.get(`${API_URL}/inventory/transfers`, {
    params,
    headers: {
      Authorization: `Bearer ${localStorage.getItem('token')}`,
    },
  });
  return response.data;
};

export const approveTransfer = async (id: string) => {
  const response = await axios.patch(`${API_URL}/inventory/transfers/${id}/approve`, {}, {
    headers: {
      Authorization: `Bearer ${localStorage.getItem('token')}`,
    },
  });
  return response.data;
};

export const receiveTransfer = async (id: string) => {
  const response = await axios.patch(`${API_URL}/inventory/transfers/${id}/receive`, {}, {
    headers: {
      Authorization: `Bearer ${localStorage.getItem('token')}`,
    },
  });
  return response.data;
};

export const cancelTransfer = async (id: string, reason?: string) => {
  const response = await axios.patch(`${API_URL}/inventory/transfers/${id}/cancel`, { reason }, {
    headers: {
      Authorization: `Bearer ${localStorage.getItem('token')}`,
    },
  });
  return response.data;
};

// ==================== MOVEMENTS API ====================

export const getStockMovements = async (params?: any) => {
  const response = await axios.get(`${API_URL}/inventory/movements`, {
    params,
    headers: {
      Authorization: `Bearer ${localStorage.getItem('token')}`,
    },
  });
  return response.data;
};

// ==================== REORDERS API ====================

export const checkReorderPoints = async () => {
  const response = await axios.post(`${API_URL}/inventory/reorders/check`, {}, {
    headers: {
      Authorization: `Bearer ${localStorage.getItem('token')}`,
    },
  });
  return response.data;
};

export const createReorderRequest = async (data: any) => {
  const response = await axios.post(`${API_URL}/inventory/reorders`, data, {
    headers: {
      Authorization: `Bearer ${localStorage.getItem('token')}`,
    },
  });
  return response.data;
};

export const fulfillReorderRequest = async (id: string, data: any) => {
  const response = await axios.patch(`${API_URL}/inventory/reorders/${id}/fulfill`, data, {
    headers: {
      Authorization: `Bearer ${localStorage.getItem('token')}`,
    },
  });
  return response.data;
};

// ==================== ALERTS API ====================

export const checkLowStockAlerts = async () => {
  const response = await axios.post(`${API_URL}/inventory/alerts/check`, {}, {
    headers: {
      Authorization: `Bearer ${localStorage.getItem('token')}`,
    },
  });
  return response.data;
};

export const getActiveAlerts = async (params?: any) => {
  const response = await axios.get(`${API_URL}/inventory/alerts`, {
    params,
    headers: {
      Authorization: `Bearer ${localStorage.getItem('token')}`,
    },
  });
  return response.data;
};

export const resolveAlert = async (id: string) => {
  const response = await axios.patch(`${API_URL}/inventory/alerts/${id}/resolve`, {}, {
    headers: {
      Authorization: `Bearer ${localStorage.getItem('token')}`,
    },
  });
  return response.data;
};

// ==================== BACKORDERS API ====================

export const createBackorder = async (data: any) => {
  const response = await axios.post(`${API_URL}/inventory/backorders`, data, {
    headers: {
      Authorization: `Bearer ${localStorage.getItem('token')}`,
    },
  });
  return response.data;
};

export const getBackorders = async (params?: any) => {
  const response = await axios.get(`${API_URL}/inventory/backorders`, {
    params,
    headers: {
      Authorization: `Bearer ${localStorage.getItem('token')}`,
    },
  });
  return response.data;
};

export const fulfillBackorders = async (productId: string, quantity: number) => {
  const response = await axios.post(`${API_URL}/inventory/backorders/fulfill/${productId}`,
    { quantity },
    {
      headers: {
        Authorization: `Bearer ${localStorage.getItem('token')}`,
      },
    }
  );
  return response.data;
};

// ==================== FORECASTS API ====================

export const generateForecast = async (data: any) => {
  const response = await axios.post(`${API_URL}/inventory/forecasts/generate`, data, {
    headers: {
      Authorization: `Bearer ${localStorage.getItem('token')}`,
    },
  });
  return response.data;
};

export const getForecasts = async (params?: any) => {
  const response = await axios.get(`${API_URL}/inventory/forecasts`, {
    params,
    headers: {
      Authorization: `Bearer ${localStorage.getItem('token')}`,
    },
  });
  return response.data;
};
