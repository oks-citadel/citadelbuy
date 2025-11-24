'use client';

import { useEffect, useState } from 'react';

interface Vendor {
  id: string;
  userId: string;
  businessName: string;
  businessEmail: string;
  status: string;
  isVerified: boolean;
  canSell: boolean;
  commissionRate: number;
  totalRevenue: number;
  totalOrders: number;
  createdAt: string;
}

export default function AdminVendors() {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [selectedVendor, setSelectedVendor] = useState<Vendor | null>(null);

  const statuses = [
    { value: '', label: 'All Vendors' },
    { value: 'PENDING_VERIFICATION', label: 'Pending Verification' },
    { value: 'ACTIVE', label: 'Active' },
    { value: 'SUSPENDED', label: 'Suspended' },
    { value: 'REJECTED', label: 'Rejected' },
    { value: 'INACTIVE', label: 'Inactive' },
  ];

  const statusColors: { [key: string]: string } = {
    PENDING_VERIFICATION: 'bg-yellow-100 text-yellow-800',
    ACTIVE: 'bg-green-100 text-green-800',
    SUSPENDED: 'bg-red-100 text-red-800',
    REJECTED: 'bg-gray-100 text-gray-800',
    INACTIVE: 'bg-gray-100 text-gray-600',
  };

  useEffect(() => {
    loadVendors();
  }, [statusFilter]);

  const loadVendors = async () => {
    try {
      setLoading(true);
      // Mock API call - replace with actual admin API
      const mockVendors: Vendor[] = [
        {
          id: '1',
          userId: 'user1',
          businessName: 'TechGear Store',
          businessEmail: 'contact@techgear.com',
          status: 'ACTIVE',
          isVerified: true,
          canSell: true,
          commissionRate: 15,
          totalRevenue: 45000,
          totalOrders: 320,
          createdAt: new Date().toISOString(),
        },
        {
          id: '2',
          userId: 'user2',
          businessName: 'Fashion Hub',
          businessEmail: 'info@fashionhub.com',
          status: 'PENDING_VERIFICATION',
          isVerified: false,
          canSell: false,
          commissionRate: 12,
          totalRevenue: 0,
          totalOrders: 0,
          createdAt: new Date().toISOString(),
        },
      ];
      setVendors(mockVendors);
    } catch (error) {
      console.error('Failed to load vendors:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (vendorId: string, newStatus: string) => {
    try {
      // API call to update vendor status
      console.log(`Updating vendor ${vendorId} to ${newStatus}`);
      loadVendors();
    } catch (error) {
      console.error('Failed to update vendor status:', error);
    }
  };

  const handleVerify = async (vendorId: string) => {
    try {
      // API call to verify vendor
      console.log(`Verifying vendor ${vendorId}`);
      loadVendors();
    } catch (error) {
      console.error('Failed to verify vendor:', error);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  if (loading) return <div className="p-8">Loading vendors...</div>;

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Vendor Management</h1>
        <p className="text-gray-600 mt-1">Manage vendor applications and accounts</p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4 mb-6">
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm text-gray-500">Total Vendors</p>
          <p className="text-2xl font-bold">{vendors.length}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm text-gray-500">Pending Verification</p>
          <p className="text-2xl font-bold text-yellow-600">
            {vendors.filter(v => v.status === 'PENDING_VERIFICATION').length}
          </p>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm text-gray-500">Active Vendors</p>
          <p className="text-2xl font-bold text-green-600">
            {vendors.filter(v => v.status === 'ACTIVE').length}
          </p>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm text-gray-500">Verified</p>
          <p className="text-2xl font-bold text-blue-600">
            {vendors.filter(v => v.isVerified).length}
          </p>
        </div>
      </div>

      {/* Filter */}
      <div className="mb-6 flex items-center space-x-4">
        <label className="text-sm font-medium text-gray-700">Filter by status:</label>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          {statuses.map((status) => (
            <option key={status.value} value={status.value}>
              {status.label}
            </option>
          ))}
        </select>
      </div>

      {/* Vendors Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Business</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Status</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Verified</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Commission</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Revenue</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Orders</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Joined</th>
              <th className="px-6 py-3 text-right text-sm font-semibold text-gray-900">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {vendors.map((vendor) => (
              <tr key={vendor.id} className="hover:bg-gray-50">
                <td className="px-6 py-4">
                  <div>
                    <p className="font-medium text-gray-900">{vendor.businessName}</p>
                    <p className="text-sm text-gray-500">{vendor.businessEmail}</p>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${statusColors[vendor.status]}`}>
                    {vendor.status.replace('_', ' ')}
                  </span>
                </td>
                <td className="px-6 py-4">
                  {vendor.isVerified ? (
                    <span className="text-green-600 flex items-center">
                      <svg className="w-5 h-5 mr-1" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      Yes
                    </span>
                  ) : (
                    <span className="text-gray-400">No</span>
                  )}
                </td>
                <td className="px-6 py-4 text-sm">{vendor.commissionRate}%</td>
                <td className="px-6 py-4 text-sm font-medium">${vendor.totalRevenue.toLocaleString()}</td>
                <td className="px-6 py-4 text-sm">{vendor.totalOrders}</td>
                <td className="px-6 py-4 text-sm text-gray-600">{formatDate(vendor.createdAt)}</td>
                <td className="px-6 py-4 text-right">
                  <button
                    onClick={() => setSelectedVendor(vendor)}
                    className="text-blue-600 hover:text-blue-800 font-medium text-sm"
                  >
                    Manage
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Vendor Detail Modal */}
      {selectedVendor && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h2 className="text-2xl font-bold">{selectedVendor.businessName}</h2>
                <p className="text-gray-600">{selectedVendor.businessEmail}</p>
              </div>
              <button
                onClick={() => setSelectedVendor(null)}
                className="text-gray-500 hover:text-gray-700"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-6">
              <div>
                <h3 className="font-semibold mb-3">Vendor Information</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-gray-500">Status</p>
                    <p className="font-medium">{selectedVendor.status}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Verified</p>
                    <p className="font-medium">{selectedVendor.isVerified ? 'Yes' : 'No'}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Can Sell</p>
                    <p className="font-medium">{selectedVendor.canSell ? 'Yes' : 'No'}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Commission Rate</p>
                    <p className="font-medium">{selectedVendor.commissionRate}%</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Total Revenue</p>
                    <p className="font-medium">${selectedVendor.totalRevenue.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Total Orders</p>
                    <p className="font-medium">{selectedVendor.totalOrders}</p>
                  </div>
                </div>
              </div>

              <div className="border-t pt-6">
                <h3 className="font-semibold mb-4">Actions</h3>
                <div className="space-y-3">
                  {selectedVendor.status === 'PENDING_VERIFICATION' && (
                    <>
                      <button
                        onClick={() => handleStatusChange(selectedVendor.id, 'ACTIVE')}
                        className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                      >
                        Approve Vendor
                      </button>
                      <button
                        onClick={() => handleStatusChange(selectedVendor.id, 'REJECTED')}
                        className="w-full px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                      >
                        Reject Application
                      </button>
                    </>
                  )}

                  {!selectedVendor.isVerified && selectedVendor.status === 'ACTIVE' && (
                    <button
                      onClick={() => handleVerify(selectedVendor.id)}
                      className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                      Verify Vendor
                    </button>
                  )}

                  {selectedVendor.status === 'ACTIVE' && (
                    <button
                      onClick={() => handleStatusChange(selectedVendor.id, 'SUSPENDED')}
                      className="w-full px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700"
                    >
                      Suspend Vendor
                    </button>
                  )}

                  {selectedVendor.status === 'SUSPENDED' && (
                    <button
                      onClick={() => handleStatusChange(selectedVendor.id, 'ACTIVE')}
                      className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                    >
                      Reactivate Vendor
                    </button>
                  )}

                  <button
                    onClick={() => setSelectedVendor(null)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
