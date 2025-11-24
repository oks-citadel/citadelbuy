import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

const getAuthHeaders = () => ({
  headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
});

// ==================== Rate Calculation ====================

export const calculateRates = async (data: any) => {
  const response = await axios.post(`${API_URL}/shipping/rates/calculate`, data, getAuthHeaders());
  return response.data;
};

// ==================== Shipments & Labels ====================

export const createShipment = async (data: any) => {
  const response = await axios.post(`${API_URL}/shipping/shipments`, data, getAuthHeaders());
  return response.data;
};

export const trackShipment = async (trackingNumber: string, carrier?: string) => {
  const response = await axios.post(`${API_URL}/shipping/shipments/track`, {
    trackingNumber,
    carrier,
  }, getAuthHeaders());
  return response.data;
};

// ==================== Return Labels ====================

export const createReturnLabel = async (data: any) => {
  const response = await axios.post(`${API_URL}/shipping/returns/labels`, data, getAuthHeaders());
  return response.data;
};

// ==================== Provider Management ====================

export const getProviders = async () => {
  const response = await axios.get(`${API_URL}/shipping/providers`, getAuthHeaders());
  return response.data;
};

export const createProvider = async (data: any) => {
  const response = await axios.post(`${API_URL}/shipping/providers`, data, getAuthHeaders());
  return response.data;
};

export const updateProvider = async (id: string, data: any) => {
  const response = await axios.patch(`${API_URL}/shipping/providers/${id}`, data, getAuthHeaders());
  return response.data;
};

// ==================== Shipping Zones ====================

export const getZones = async (providerId?: string) => {
  const params = providerId ? { providerId } : {};
  const response = await axios.get(`${API_URL}/shipping/zones`, {
    params,
    ...getAuthHeaders(),
  });
  return response.data;
};

export const createZone = async (data: any) => {
  const response = await axios.post(`${API_URL}/shipping/zones`, data, getAuthHeaders());
  return response.data;
};

export const updateZone = async (id: string, data: any) => {
  const response = await axios.patch(`${API_URL}/shipping/zones/${id}`, data, getAuthHeaders());
  return response.data;
};

// ==================== Shipping Rules ====================

export const getRules = async (zoneId?: string) => {
  const params = zoneId ? { zoneId } : {};
  const response = await axios.get(`${API_URL}/shipping/rules`, {
    params,
    ...getAuthHeaders(),
  });
  return response.data;
};

export const createRule = async (data: any) => {
  const response = await axios.post(`${API_URL}/shipping/rules`, data, getAuthHeaders());
  return response.data;
};

export const updateRule = async (id: string, data: any) => {
  const response = await axios.patch(`${API_URL}/shipping/rules/${id}`, data, getAuthHeaders());
  return response.data;
};

// ==================== Warehouse Selection ====================

export const selectOptimalWarehouse = async (toAddress: any, productIds: string[]) => {
  const response = await axios.post(`${API_URL}/shipping/warehouse/select`, {
    toAddress,
    productIds,
  }, getAuthHeaders());
  return response.data;
};
