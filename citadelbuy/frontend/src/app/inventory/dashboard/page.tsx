'use client';

import { useState, useEffect } from 'react';
import { getInventory, getActiveAlerts, getWarehouses, getTransfers } from '@/services/inventoryService';

export default function InventoryDashboard() {
  const [stats, setStats] = useState({
    totalItems: 0,
    lowStockItems: 0,
    outOfStockItems: 0,
    activeAlerts: 0,
    pendingTransfers: 0,
    totalWarehouses: 0,
  });
  const [recentAlerts, setRecentAlerts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);

      // Fetch inventory statistics
      const inventoryData = await getInventory({ limit: 1000 });
      const lowStock = inventoryData.inventory?.filter((item: any) => item.status === 'LOW_STOCK') || [];
      const outOfStock = inventoryData.inventory?.filter((item: any) => item.status === 'OUT_OF_STOCK') || [];

      // Fetch alerts
      const alertsData = await getActiveAlerts();
      setRecentAlerts(alertsData?.slice(0, 5) || []);

      // Fetch warehouses
      const warehousesData = await getWarehouses(true);

      // Fetch transfers
      const transfersData = await getTransfers({ status: 'PENDING' });

      setStats({
        totalItems: inventoryData.total || 0,
        lowStockItems: lowStock.length,
        outOfStockItems: outOfStock.length,
        activeAlerts: alertsData?.length || 0,
        pendingTransfers: transfersData?.length || 0,
        totalWarehouses: warehousesData?.length || 0,
      });
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const StatCard = ({ title, value, subtitle, color }: any) => (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-600">{title}</p>
          <p className={`text-3xl font-bold ${color}`}>{value}</p>
          {subtitle && <p className="text-xs text-gray-500 mt-1">{subtitle}</p>}
        </div>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Inventory Dashboard</h1>
          <p className="text-gray-600 mt-2">Overview of your inventory system</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          <StatCard
            title="Total Inventory Items"
            value={stats.totalItems}
            color="text-blue-600"
          />
          <StatCard
            title="Low Stock Items"
            value={stats.lowStockItems}
            subtitle="Below reorder point"
            color="text-yellow-600"
          />
          <StatCard
            title="Out of Stock"
            value={stats.outOfStockItems}
            subtitle="Needs immediate attention"
            color="text-red-600"
          />
          <StatCard
            title="Active Alerts"
            value={stats.activeAlerts}
            subtitle="Unresolved alerts"
            color="text-orange-600"
          />
          <StatCard
            title="Pending Transfers"
            value={stats.pendingTransfers}
            subtitle="Awaiting approval"
            color="text-purple-600"
          />
          <StatCard
            title="Active Warehouses"
            value={stats.totalWarehouses}
            color="text-green-600"
          />
        </div>

        {/* Recent Alerts */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b">
            <h2 className="text-xl font-semibold text-gray-900">Recent Alerts</h2>
          </div>
          <div className="p-6">
            {recentAlerts.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No active alerts</p>
            ) : (
              <div className="space-y-4">
                {recentAlerts.map((alert) => (
                  <div
                    key={alert.id}
                    className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span
                          className={`px-2 py-1 text-xs font-semibold rounded ${
                            alert.severity === 'CRITICAL'
                              ? 'bg-red-100 text-red-800'
                              : alert.severity === 'HIGH'
                              ? 'bg-orange-100 text-orange-800'
                              : 'bg-yellow-100 text-yellow-800'
                          }`}
                        >
                          {alert.severity}
                        </span>
                        <span className="text-sm font-medium text-gray-900">
                          {alert.alertNumber}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 mt-1">{alert.message}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        Current Qty: {alert.currentQty} | Threshold: {alert.threshold}
                      </p>
                    </div>
                    <a
                      href={`/inventory/alerts`}
                      className="ml-4 text-blue-600 hover:text-blue-700 text-sm font-medium"
                    >
                      View Details →
                    </a>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <a
            href="/inventory/stock"
            className="bg-blue-600 text-white rounded-lg p-6 hover:bg-blue-700 transition-colors"
          >
            <h3 className="font-semibold text-lg">View Stock</h3>
            <p className="text-sm text-blue-100 mt-1">Check inventory levels</p>
          </a>
          <a
            href="/inventory/transfers"
            className="bg-purple-600 text-white rounded-lg p-6 hover:bg-purple-700 transition-colors"
          >
            <h3 className="font-semibold text-lg">Stock Transfers</h3>
            <p className="text-sm text-purple-100 mt-1">Manage transfers</p>
          </a>
          <a
            href="/inventory/alerts"
            className="bg-orange-600 text-white rounded-lg p-6 hover:bg-orange-700 transition-colors"
          >
            <h3 className="font-semibold text-lg">Alerts</h3>
            <p className="text-sm text-orange-100 mt-1">View all alerts</p>
          </a>
          <a
            href="/inventory/warehouses"
            className="bg-green-600 text-white rounded-lg p-6 hover:bg-green-700 transition-colors"
          >
            <h3 className="font-semibold text-lg">Warehouses</h3>
            <p className="text-sm text-green-100 mt-1">Manage locations</p>
          </a>
        </div>
      </div>
    </div>
  );
}
