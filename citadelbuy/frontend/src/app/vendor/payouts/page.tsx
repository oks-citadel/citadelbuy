'use client';

import { useEffect, useState } from 'react';
import { vendorService } from '@/services/vendorService';

interface Payout {
  id: string;
  amount: number;
  status: string;
  payoutMethod: string;
  periodStart: string;
  periodEnd: string;
  totalSales: number;
  commissionAmount: number;
  platformFees: number;
  adjustments: number;
  transactionReference?: string;
  processedAt?: string;
  failureReason?: string;
  createdAt: string;
}

export default function VendorPayouts() {
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalEarnings: 0,
    pendingAmount: 0,
    completedPayouts: 0,
  });

  const statusColors: { [key: string]: string } = {
    PENDING: 'bg-yellow-100 text-yellow-800',
    PROCESSING: 'bg-blue-100 text-blue-800',
    COMPLETED: 'bg-green-100 text-green-800',
    FAILED: 'bg-red-100 text-red-800',
    CANCELLED: 'bg-gray-100 text-gray-800',
  };

  useEffect(() => {
    loadPayouts();
  }, []);

  const loadPayouts = async () => {
    try {
      const data = await vendorService.getPayouts(50, 0);
      setPayouts(data.payouts || []);

      // Calculate stats
      const totalEarnings = data.payouts?.reduce(
        (sum: number, p: Payout) => sum + (p.status === 'COMPLETED' ? p.amount : 0),
        0
      ) || 0;

      const pendingAmount = data.payouts?.reduce(
        (sum: number, p: Payout) => sum + (p.status === 'PENDING' ? p.amount : 0),
        0
      ) || 0;

      const completedPayouts = data.payouts?.filter((p: Payout) => p.status === 'COMPLETED').length || 0;

      setStats({ totalEarnings, pendingAmount, completedPayouts });
    } catch (error) {
      console.error('Failed to load payouts:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  if (loading) return <div className="p-8">Loading payouts...</div>;

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Payouts</h1>
        <p className="text-gray-600 mt-1">Track your earnings and payment history</p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3 mb-8">
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-sm font-medium text-gray-500 mb-2">Total Earnings</h3>
          <p className="text-3xl font-bold text-green-600">${stats.totalEarnings.toFixed(2)}</p>
          <p className="text-sm text-gray-500 mt-1">All-time completed payouts</p>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-sm font-medium text-gray-500 mb-2">Pending Amount</h3>
          <p className="text-3xl font-bold text-yellow-600">${stats.pendingAmount.toFixed(2)}</p>
          <p className="text-sm text-gray-500 mt-1">Awaiting processing</p>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-sm font-medium text-gray-500 mb-2">Completed Payouts</h3>
          <p className="text-3xl font-bold text-blue-600">{stats.completedPayouts}</p>
          <p className="text-sm text-gray-500 mt-1">Total successful payments</p>
        </div>
      </div>

      {/* Payouts Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b bg-gray-50">
          <h2 className="text-lg font-semibold">Payment History</h2>
        </div>

        {payouts.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-600">No payouts yet</p>
            <p className="text-sm text-gray-500 mt-2">
              Payouts are processed automatically based on your schedule
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Period</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Sales</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Commission</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Fees</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Payout Amount</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Method</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Status</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {payouts.map((payout) => (
                  <tr key={payout.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm">
                      <div>
                        <p className="font-medium">{formatDate(payout.periodStart)}</p>
                        <p className="text-gray-500">to {formatDate(payout.periodEnd)}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm font-medium">
                      ${payout.totalSales.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 text-sm text-red-600">
                      -${payout.commissionAmount.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 text-sm text-red-600">
                      -${payout.platformFees.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <span className="font-bold text-green-600 text-lg">
                        ${payout.amount.toFixed(2)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <span className="px-2 py-1 bg-gray-100 rounded text-xs">
                        {payout.payoutMethod}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${statusColors[payout.status]}`}>
                        {payout.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {payout.processedAt ? formatDate(payout.processedAt) : formatDate(payout.createdAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Payout Information */}
      <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h3 className="font-semibold text-blue-900 mb-3">Payout Information</h3>
        <div className="space-y-2 text-sm text-blue-800">
          <p>• Payouts are processed automatically on a weekly basis</p>
          <p>• Minimum payout threshold is $50.00</p>
          <p>• Platform commission and fees are deducted before payout</p>
          <p>• Payment processing typically takes 2-5 business days</p>
          <p>• You can update your payout method in Settings</p>
        </div>
      </div>

      {/* Payout Breakdown Info */}
      <div className="mt-6 bg-gray-50 rounded-lg p-6">
        <h3 className="font-semibold text-gray-900 mb-4">Understanding Your Payouts</h3>
        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-2">Calculation Formula:</h4>
            <div className="bg-white rounded p-4 text-sm space-y-1">
              <p className="flex justify-between">
                <span>Total Sales</span>
                <span className="font-mono">$XXX.XX</span>
              </p>
              <p className="flex justify-between text-red-600">
                <span>- Platform Commission (X%)</span>
                <span className="font-mono">-$XX.XX</span>
              </p>
              <p className="flex justify-between text-red-600">
                <span>- Platform Fees</span>
                <span className="font-mono">-$XX.XX</span>
              </p>
              <p className="flex justify-between text-gray-600">
                <span>± Adjustments</span>
                <span className="font-mono">$X.XX</span>
              </p>
              <div className="border-t pt-2 mt-2">
                <p className="flex justify-between font-bold text-green-600">
                  <span>= Payout Amount</span>
                  <span className="font-mono">$XXX.XX</span>
                </p>
              </div>
            </div>
          </div>

          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-2">Payment Methods:</h4>
            <div className="bg-white rounded p-4 space-y-3">
              <div className="flex items-start">
                <div className="bg-blue-100 rounded p-2 mr-3">
                  <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                  </svg>
                </div>
                <div>
                  <p className="font-medium text-sm">Bank Transfer</p>
                  <p className="text-xs text-gray-600">Direct deposit to your bank account</p>
                </div>
              </div>
              <div className="flex items-start">
                <div className="bg-blue-100 rounded p-2 mr-3">
                  <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
                <div>
                  <p className="font-medium text-sm">PayPal</p>
                  <p className="text-xs text-gray-600">Fast payments to your PayPal account</p>
                </div>
              </div>
              <div className="flex items-start">
                <div className="bg-blue-100 rounded p-2 mr-3">
                  <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                  </svg>
                </div>
                <div>
                  <p className="font-medium text-sm">Stripe</p>
                  <p className="text-xs text-gray-600">Secure payments via Stripe Connect</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
