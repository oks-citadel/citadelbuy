'use client';

import { useState, useEffect } from 'react';
import { getActiveAlerts, resolveAlert, checkLowStockAlerts, getWarehouses } from '@/services/inventoryService';

export default function AlertsPage() {
  const [alerts, setAlerts] = useState<any[]>([]);
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [checking, setChecking] = useState(false);
  const [filters, setFilters] = useState({
    severity: '',
    productId: '',
    warehouseId: '',
    isResolved: 'false',
  });

  useEffect(() => {
    fetchData();
  }, [filters]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const params: any = {};

      if (filters.productId) params.productId = filters.productId;
      if (filters.warehouseId) params.warehouseId = filters.warehouseId;
      if (filters.severity) params.severity = filters.severity;
      if (filters.isResolved) params.isResolved = filters.isResolved === 'true';

      const [alertsData, warehousesData] = await Promise.all([
        getActiveAlerts(params),
        getWarehouses(true),
      ]);

      setAlerts(alertsData || []);
      setWarehouses(warehousesData || []);
    } catch (error) {
      console.error('Error fetching alerts:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCheckAlerts = async () => {
    try {
      setChecking(true);
      const result = await checkLowStockAlerts();
      alert(`Checked for low stock. Created ${result.createdCount} new alerts.`);
      fetchData();
    } catch (error) {
      console.error('Error checking alerts:', error);
      alert('Failed to check alerts');
    } finally {
      setChecking(false);
    }
  };

  const handleResolveAlert = async (id: string) => {
    if (!confirm('Are you sure you want to resolve this alert?')) return;

    try {
      await resolveAlert(id);
      fetchData();
    } catch (error) {
      console.error('Error resolving alert:', error);
      alert('Failed to resolve alert');
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'CRITICAL':
        return 'bg-red-100 text-red-800 border-red-300';
      case 'HIGH':
        return 'bg-orange-100 text-orange-800 border-orange-300';
      case 'MEDIUM':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'LOW':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const getSeverityBadge = (severity: string) => {
    const colors = getSeverityColor(severity);
    return (
      <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${colors}`}>
        {severity}
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Inventory Alerts</h1>
            <p className="text-gray-600 mt-2">Monitor and manage stock alerts</p>
          </div>
          <button
            onClick={handleCheckAlerts}
            disabled={checking}
            className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {checking ? 'Checking...' : '🔍 Check for Alerts'}
          </button>
        </div>

        {/* Stats Summary */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-sm text-gray-600">Total Active Alerts</div>
            <div className="text-2xl font-bold text-gray-900">{alerts.length}</div>
          </div>
          <div className="bg-red-50 rounded-lg shadow p-4 border border-red-200">
            <div className="text-sm text-red-600">Critical</div>
            <div className="text-2xl font-bold text-red-900">
              {alerts.filter(a => a.severity === 'CRITICAL').length}
            </div>
          </div>
          <div className="bg-orange-50 rounded-lg shadow p-4 border border-orange-200">
            <div className="text-sm text-orange-600">High</div>
            <div className="text-2xl font-bold text-orange-900">
              {alerts.filter(a => a.severity === 'HIGH').length}
            </div>
          </div>
          <div className="bg-yellow-50 rounded-lg shadow p-4 border border-yellow-200">
            <div className="text-sm text-yellow-600">Medium/Low</div>
            <div className="text-2xl font-bold text-yellow-900">
              {alerts.filter(a => a.severity === 'MEDIUM' || a.severity === 'LOW').length}
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Severity
              </label>
              <select
                value={filters.severity}
                onChange={(e) => setFilters({ ...filters, severity: e.target.value })}
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              >
                <option value="">All Severities</option>
                <option value="CRITICAL">Critical</option>
                <option value="HIGH">High</option>
                <option value="MEDIUM">Medium</option>
                <option value="LOW">Low</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Product ID
              </label>
              <input
                type="text"
                value={filters.productId}
                onChange={(e) => setFilters({ ...filters, productId: e.target.value })}
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                placeholder="Enter product ID"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Warehouse
              </label>
              <select
                value={filters.warehouseId}
                onChange={(e) => setFilters({ ...filters, warehouseId: e.target.value })}
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              >
                <option value="">All Warehouses</option>
                {warehouses.map((warehouse) => (
                  <option key={warehouse.id} value={warehouse.id}>
                    {warehouse.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Status
              </label>
              <select
                value={filters.isResolved}
                onChange={(e) => setFilters({ ...filters, isResolved: e.target.value })}
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              >
                <option value="false">Active Only</option>
                <option value="true">Resolved Only</option>
                <option value="">All</option>
              </select>
            </div>
          </div>
          <div className="mt-4 flex gap-4">
            <button
              onClick={fetchData}
              className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
            >
              Apply Filters
            </button>
            <button
              onClick={() => {
                setFilters({
                  severity: '',
                  productId: '',
                  warehouseId: '',
                  isResolved: 'false',
                });
              }}
              className="bg-gray-200 text-gray-800 px-4 py-2 rounded-md hover:bg-gray-300"
            >
              Clear Filters
            </button>
          </div>
        </div>

        {/* Alerts List */}
        <div className="space-y-4">
          {loading ? (
            <div className="bg-white rounded-lg shadow p-12 text-center">
              <div className="flex justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            </div>
          ) : alerts.length === 0 ? (
            <div className="bg-white rounded-lg shadow p-12 text-center text-gray-500">
              No alerts found
            </div>
          ) : (
            alerts.map((alert) => (
              <div
                key={alert.id}
                className={`bg-white rounded-lg shadow-md p-6 border-l-4 ${
                  alert.severity === 'CRITICAL'
                    ? 'border-red-500'
                    : alert.severity === 'HIGH'
                    ? 'border-orange-500'
                    : alert.severity === 'MEDIUM'
                    ? 'border-yellow-500'
                    : 'border-blue-500'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3">
                      {getSeverityBadge(alert.severity)}
                      <span className="text-sm font-medium text-gray-900">
                        Alert #{alert.alertNumber}
                      </span>
                      {alert.isResolved && (
                        <span className="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                          RESOLVED
                        </span>
                      )}
                    </div>

                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      {alert.message}
                    </h3>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                      <div>
                        <p className="text-xs text-gray-500">Product</p>
                        <p className="text-sm font-medium text-gray-900">
                          {alert.product?.name || 'Unknown'}
                        </p>
                        <p className="text-xs text-gray-500">
                          SKU: {alert.product?.sku || 'N/A'}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Warehouse</p>
                        <p className="text-sm font-medium text-gray-900">
                          {alert.warehouse?.name || 'Unknown'}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Current Quantity</p>
                        <p className="text-sm font-bold text-red-600">
                          {alert.currentQty}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Threshold</p>
                        <p className="text-sm font-medium text-gray-900">
                          {alert.threshold}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 text-xs text-gray-500">
                      <span>
                        Created: {new Date(alert.createdAt).toLocaleString()}
                      </span>
                      {alert.resolvedAt && (
                        <span>
                          Resolved: {new Date(alert.resolvedAt).toLocaleString()}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="ml-4">
                    {!alert.isResolved && (
                      <button
                        onClick={() => handleResolveAlert(alert.id)}
                        className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 text-sm"
                      >
                        ✓ Resolve
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
