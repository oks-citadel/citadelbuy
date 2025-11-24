'use client';

import { useState, useEffect } from 'react';
import { getBackorders, fulfillBackorders, getWarehouses } from '@/services/inventoryService';

export default function BackordersPage() {
  const [backorders, setBackorders] = useState<any[]>([]);
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    status: 'PENDING',
    productId: '',
    warehouseId: '',
  });
  const [showFulfillModal, setShowFulfillModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [fulfillQuantity, setFulfillQuantity] = useState(0);

  useEffect(() => {
    fetchData();
  }, [filters]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const params: any = {};

      if (filters.status) params.status = filters.status;
      if (filters.productId) params.productId = filters.productId;
      if (filters.warehouseId) params.warehouseId = filters.warehouseId;

      const [backordersData, warehousesData] = await Promise.all([
        getBackorders(params),
        getWarehouses(true),
      ]);

      setBackorders(backordersData || []);
      setWarehouses(warehousesData || []);
    } catch (error) {
      console.error('Error fetching backorders:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFulfillBackorders = async () => {
    if (!selectedProduct) return;

    try {
      const result = await fulfillBackorders(selectedProduct.productId, fulfillQuantity);
      alert(`Fulfilled ${result.fulfilledCount} backorders`);
      setShowFulfillModal(false);
      setSelectedProduct(null);
      setFulfillQuantity(0);
      fetchData();
    } catch (error) {
      console.error('Error fulfilling backorders:', error);
      alert('Failed to fulfill backorders');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PENDING':
        return 'bg-yellow-100 text-yellow-800';
      case 'FULFILLED':
        return 'bg-green-100 text-green-800';
      case 'CANCELLED':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (priority: number) => {
    if (priority <= 3) return 'text-red-600 font-bold';
    if (priority <= 7) return 'text-orange-600 font-semibold';
    return 'text-gray-600';
  };

  // Group backorders by product for summary
  const backordersByProduct = backorders.reduce((acc: any, bo: any) => {
    const key = bo.productId;
    if (!acc[key]) {
      acc[key] = {
        productId: bo.productId,
        product: bo.product,
        totalQuantity: 0,
        count: 0,
      };
    }
    acc[key].totalQuantity += bo.quantityOrdered;
    acc[key].count += 1;
    return acc;
  }, {});

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Backorders</h1>
          <p className="text-gray-600 mt-2">Manage backorder queue and fulfillment</p>
        </div>

        {/* Stats Summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-sm text-gray-600">Pending Backorders</div>
            <div className="text-2xl font-bold text-yellow-600">
              {backorders.filter(b => b.status === 'PENDING').length}
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-sm text-gray-600">Unique Products</div>
            <div className="text-2xl font-bold text-blue-600">
              {Object.keys(backordersByProduct).length}
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-sm text-gray-600">Total Units Backordered</div>
            <div className="text-2xl font-bold text-gray-900">
              {backorders.reduce((sum, b) => sum + b.quantityOrdered, 0)}
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Status
              </label>
              <select
                value={filters.status}
                onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              >
                <option value="">All Statuses</option>
                <option value="PENDING">Pending</option>
                <option value="FULFILLED">Fulfilled</option>
                <option value="CANCELLED">Cancelled</option>
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
                  status: 'PENDING',
                  productId: '',
                  warehouseId: '',
                });
              }}
              className="bg-gray-200 text-gray-800 px-4 py-2 rounded-md hover:bg-gray-300"
            >
              Clear Filters
            </button>
          </div>
        </div>

        {/* Product Summary - Only show for pending backorders */}
        {filters.status === 'PENDING' && Object.keys(backordersByProduct).length > 0 && (
          <div className="bg-blue-50 rounded-lg shadow p-6 mb-6 border border-blue-200">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Backorder Summary by Product
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Object.values(backordersByProduct).map((summary: any) => (
                <div
                  key={summary.productId}
                  className="bg-white rounded-lg p-4 border border-gray-200"
                >
                  <div className="font-medium text-gray-900 mb-1">
                    {summary.product?.name || 'Unknown Product'}
                  </div>
                  <div className="text-sm text-gray-600 mb-2">
                    SKU: {summary.product?.sku || 'N/A'}
                  </div>
                  <div className="flex justify-between items-center">
                    <div>
                      <div className="text-xs text-gray-500">Total Units</div>
                      <div className="text-lg font-bold text-blue-600">
                        {summary.totalQuantity}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-500">Orders</div>
                      <div className="text-lg font-bold text-gray-900">
                        {summary.count}
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setSelectedProduct(summary);
                      setShowFulfillModal(true);
                    }}
                    className="mt-3 w-full bg-green-600 text-white px-3 py-2 rounded-md hover:bg-green-700 text-sm"
                  >
                    Fulfill Backorders
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Backorders Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Priority
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Order Info
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Product
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Warehouse
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Quantity
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Dates
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center">
                    <div className="flex justify-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    </div>
                  </td>
                </tr>
              ) : backorders.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                    No backorders found
                  </td>
                </tr>
              ) : (
                backorders.map((backorder, index) => (
                  <tr key={backorder.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className={`text-lg font-bold ${getPriorityColor(index + 1)}`}>
                        #{index + 1}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        Order: {backorder.orderId?.slice(0, 8)}...
                      </div>
                      <div className="text-xs text-gray-500">
                        Customer: {backorder.customerId?.slice(0, 8)}...
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {backorder.product?.name || 'Unknown'}
                      </div>
                      <div className="text-xs text-gray-500">
                        SKU: {backorder.product?.sku || 'N/A'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {backorder.warehouse?.name || 'Any'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                      {backorder.quantityOrdered}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(backorder.status)}`}>
                        {backorder.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <div>Created: {new Date(backorder.createdAt).toLocaleDateString()}</div>
                      {backorder.fulfilledAt && (
                        <div className="text-green-600">
                          Fulfilled: {new Date(backorder.fulfilledAt).toLocaleDateString()}
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Fulfill Backorders Modal */}
      {showFulfillModal && selectedProduct && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-8 max-w-md w-full">
            <h2 className="text-2xl font-bold mb-4">Fulfill Backorders</h2>
            <div className="mb-4">
              <p className="text-sm text-gray-600">
                Product: {selectedProduct.product?.name}
              </p>
              <p className="text-sm text-gray-600">
                Total Backordered: {selectedProduct.totalQuantity} units
              </p>
              <p className="text-sm text-gray-600">
                Pending Orders: {selectedProduct.count}
              </p>
            </div>
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Quantity Available to Fulfill
              </label>
              <input
                type="number"
                min="1"
                value={fulfillQuantity}
                onChange={(e) => setFulfillQuantity(parseInt(e.target.value) || 0)}
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                placeholder="Enter quantity"
              />
              <p className="text-xs text-gray-500 mt-1">
                Backorders will be fulfilled in order of priority (oldest first)
              </p>
            </div>
            <div className="flex gap-4">
              <button
                onClick={handleFulfillBackorders}
                disabled={fulfillQuantity <= 0}
                className="flex-1 bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 disabled:opacity-50"
              >
                Fulfill Backorders
              </button>
              <button
                onClick={() => {
                  setShowFulfillModal(false);
                  setSelectedProduct(null);
                  setFulfillQuantity(0);
                }}
                className="flex-1 bg-gray-200 text-gray-800 px-4 py-2 rounded-md hover:bg-gray-300"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
