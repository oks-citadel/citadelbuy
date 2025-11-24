'use client';

import { useEffect, useState } from 'react';
import { vendorService } from '@/services/vendorService';

export default function VendorAnalytics() {
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('monthly');
  const [metrics, setMetrics] = useState({
    totalRevenue: 0,
    totalOrders: 0,
    averageOrderValue: 0,
    conversionRate: 0,
    topProducts: [],
    salesByCategory: [],
    revenueGrowth: 0,
    orderGrowth: 0,
  });

  useEffect(() => {
    loadAnalytics();
  }, [period]);

  const loadAnalytics = async () => {
    try {
      setLoading(true);
      const data = await vendorService.getDashboard();
      // Mock analytics data
      setMetrics({
        totalRevenue: data?.metrics?.totalRevenue || 0,
        totalOrders: data?.metrics?.totalOrders || 0,
        averageOrderValue: data?.metrics?.totalRevenue / (data?.metrics?.totalOrders || 1) || 0,
        conversionRate: 3.5,
        topProducts: data?.topProducts || [],
        salesByCategory: data?.salesByCategory || [],
        revenueGrowth: 12.5,
        orderGrowth: 8.3,
      });
    } catch (error) {
      console.error('Failed to load analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="p-8">Loading analytics...</div>;

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Analytics</h1>
          <p className="text-gray-600 mt-1">Track your performance and insights</p>
        </div>
        <select
          value={period}
          onChange={(e) => setPeriod(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value="daily">Last 7 Days</option>
          <option value="weekly">Last 4 Weeks</option>
          <option value="monthly">Last 12 Months</option>
          <option value="yearly">All Time</option>
        </select>
      </div>

      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm text-gray-500">Total Revenue</p>
              <p className="text-2xl font-bold mt-2">${metrics.totalRevenue.toFixed(2)}</p>
            </div>
            <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
              +{metrics.revenueGrowth}%
            </span>
          </div>
          <p className="text-xs text-gray-500 mt-2">vs. previous period</p>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm text-gray-500">Total Orders</p>
              <p className="text-2xl font-bold mt-2">{metrics.totalOrders}</p>
            </div>
            <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
              +{metrics.orderGrowth}%
            </span>
          </div>
          <p className="text-xs text-gray-500 mt-2">vs. previous period</p>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-sm text-gray-500">Avg Order Value</p>
          <p className="text-2xl font-bold mt-2">${metrics.averageOrderValue.toFixed(2)}</p>
          <p className="text-xs text-gray-500 mt-2">per transaction</p>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-sm text-gray-500">Conversion Rate</p>
          <p className="text-2xl font-bold mt-2">{metrics.conversionRate}%</p>
          <p className="text-xs text-gray-500 mt-2">visitors to customers</p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2 mb-8">
        {/* Sales Chart Placeholder */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">Revenue Over Time</h3>
          <div className="h-64 flex items-center justify-center bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
            <div className="text-center">
              <svg className="w-16 h-16 text-gray-400 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              <p className="text-gray-500">Chart visualization would appear here</p>
              <p className="text-sm text-gray-400">Integrate with Chart.js or Recharts</p>
            </div>
          </div>
        </div>

        {/* Orders Chart Placeholder */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">Orders Over Time</h3>
          <div className="h-64 flex items-center justify-center bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
            <div className="text-center">
              <svg className="w-16 h-16 text-gray-400 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
              </svg>
              <p className="text-gray-500">Chart visualization would appear here</p>
              <p className="text-sm text-gray-400">Integrate with Chart.js or Recharts</p>
            </div>
          </div>
        </div>
      </div>

      {/* Top Products */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h3 className="text-lg font-semibold mb-4">Top Performing Products</h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Product</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Units Sold</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Revenue</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Avg Rating</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {metrics.topProducts.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-gray-500">
                    No product data available yet
                  </td>
                </tr>
              ) : (
                metrics.topProducts.map((product: any, index: number) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm font-medium">{product.name}</td>
                    <td className="px-6 py-4 text-sm">{product.unitsSold}</td>
                    <td className="px-6 py-4 text-sm">${product.revenue.toFixed(2)}</td>
                    <td className="px-6 py-4 text-sm">{product.rating} ⭐</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Additional Insights */}
      <div className="grid gap-6 md:grid-cols-3">
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-sm font-medium text-gray-500 mb-4">Customer Insights</h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-sm">New Customers</span>
              <span className="font-semibold">245</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm">Returning Customers</span>
              <span className="font-semibold">189</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm">Retention Rate</span>
              <span className="font-semibold text-green-600">43.5%</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-sm font-medium text-gray-500 mb-4">Product Performance</h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-sm">Active Products</span>
              <span className="font-semibold">58</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm">Out of Stock</span>
              <span className="font-semibold text-red-600">3</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm">Avg Rating</span>
              <span className="font-semibold">4.7 ⭐</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-sm font-medium text-gray-500 mb-4">Order Fulfillment</h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-sm">Pending</span>
              <span className="font-semibold text-yellow-600">12</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm">Processing</span>
              <span className="font-semibold text-blue-600">8</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm">Avg Fulfillment Time</span>
              <span className="font-semibold">2.3 days</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
