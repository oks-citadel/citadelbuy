'use client';

import { useEffect, useState } from 'react';
import { vendorService } from '@/services/vendorService';

export default function VendorDashboard() {
  const [dashboard, setDashboard] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      const data = await vendorService.getDashboard();
      setDashboard(data);
    } catch (error) {
      console.error('Failed to load dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="p-8">Loading dashboard...</div>;

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Vendor Dashboard</h1>
        <p className="text-gray-600 mt-1">Manage your business</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <div className="p-6 bg-white rounded-lg shadow">
          <h3 className="text-sm font-medium text-gray-500">Total Revenue</h3>
          <p className="text-2xl font-bold mt-2">
            \${dashboard?.metrics?.totalRevenue?.toFixed(2) || '0.00'}
          </p>
        </div>

        <div className="p-6 bg-white rounded-lg shadow">
          <h3 className="text-sm font-medium text-gray-500">Total Orders</h3>
          <p className="text-2xl font-bold mt-2">
            {dashboard?.metrics?.totalOrders || 0}
          </p>
        </div>

        <div className="p-6 bg-white rounded-lg shadow">
          <h3 className="text-sm font-medium text-gray-500">Products</h3>
          <p className="text-2xl font-bold mt-2">
            {dashboard?.metrics?.totalProducts || 0}
          </p>
        </div>

        <div className="p-6 bg-white rounded-lg shadow">
          <h3 className="text-sm font-medium text-gray-500">Rating</h3>
          <p className="text-2xl font-bold mt-2">
            {dashboard?.metrics?.averageRating?.toFixed(1) || '0.0'} ⭐
          </p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="p-6 bg-white rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-4">Quick Actions</h3>
          <div className="space-y-2">
            <a href="/vendor/products" className="block p-3 border rounded hover:bg-gray-50">
              Manage Products
            </a>
            <a href="/vendor/orders" className="block p-3 border rounded hover:bg-gray-50">
              View Orders
            </a>
            <a href="/vendor/payouts" className="block p-3 border rounded hover:bg-gray-50">
              Payouts
            </a>
            <a href="/vendor/settings" className="block p-3 border rounded hover:bg-gray-50">
              Settings
            </a>
          </div>
        </div>

        <div className="p-6 bg-white rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-4">Business Status</h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span>Status:</span>
              <span className="font-semibold">{dashboard?.profile?.status || 'PENDING'}</span>
            </div>
            <div className="flex justify-between">
              <span>Verified:</span>
              <span className="font-semibold">{dashboard?.profile?.isVerified ? 'Yes' : 'No'}</span>
            </div>
            <div className="flex justify-between">
              <span>Can Sell:</span>
              <span className="font-semibold">{dashboard?.profile?.canSell ? 'Yes' : 'No'}</span>
            </div>
            <div className="flex justify-between">
              <span>Commission:</span>
              <span className="font-semibold">{dashboard?.profile?.commissionRate || 0}%</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
