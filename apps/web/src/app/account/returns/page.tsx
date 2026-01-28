'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useReturnsStore } from '@/stores/account-store';
import {
  RotateCcw,
  Package,
  ChevronRight,
  Clock,
  CheckCircle,
  XCircle,
  Truck,
  Search,
  Plus,
  AlertCircle,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function ReturnsPage() {
  const { returns, isLoading, fetchReturns } = useReturnsStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    fetchReturns();
  }, [fetchReturns]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'PENDING':
        return <Clock className="w-5 h-5 text-yellow-500" />;
      case 'APPROVED':
        return <CheckCircle className="w-5 h-5 text-blue-500" />;
      case 'LABEL_GENERATED':
      case 'SHIPPED':
        return <Truck className="w-5 h-5 text-indigo-500" />;
      case 'RECEIVED':
      case 'INSPECTING':
        return <Search className="w-5 h-5 text-purple-500" />;
      case 'REFUNDED':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'REJECTED':
      case 'CANCELLED':
        return <XCircle className="w-5 h-5 text-red-500" />;
      default:
        return <AlertCircle className="w-5 h-5 text-gray-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const statusStyles: Record<string, string> = {
      PENDING: 'bg-yellow-100 text-yellow-800',
      APPROVED: 'bg-blue-100 text-blue-800',
      REJECTED: 'bg-red-100 text-red-800',
      LABEL_GENERATED: 'bg-indigo-100 text-indigo-800',
      SHIPPED: 'bg-purple-100 text-purple-800',
      RECEIVED: 'bg-cyan-100 text-cyan-800',
      INSPECTING: 'bg-orange-100 text-orange-800',
      REFUND_PROCESSING: 'bg-teal-100 text-teal-800',
      REFUNDED: 'bg-green-100 text-green-800',
      CANCELLED: 'bg-gray-100 text-gray-800',
    };
    return statusStyles[status] || 'bg-gray-100 text-gray-800';
  };

  const filteredReturns = returns.filter((ret) => {
    const matchesSearch =
      ret.returnNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ret.orderNumber.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus =
      statusFilter === 'all' ||
      ret.status.toLowerCase().includes(statusFilter.toLowerCase());
    return matchesSearch && matchesStatus;
  });

  // Return progress steps
  const getProgressSteps = (status: string) => {
    const steps = [
      { label: 'Requested', statuses: ['PENDING', 'APPROVED', 'REJECTED', 'LABEL_GENERATED', 'SHIPPED', 'RECEIVED', 'INSPECTING', 'REFUND_PROCESSING', 'REFUNDED'] },
      { label: 'Approved', statuses: ['APPROVED', 'LABEL_GENERATED', 'SHIPPED', 'RECEIVED', 'INSPECTING', 'REFUND_PROCESSING', 'REFUNDED'] },
      { label: 'Shipped', statuses: ['SHIPPED', 'RECEIVED', 'INSPECTING', 'REFUND_PROCESSING', 'REFUNDED'] },
      { label: 'Received', statuses: ['RECEIVED', 'INSPECTING', 'REFUND_PROCESSING', 'REFUNDED'] },
      { label: 'Refunded', statuses: ['REFUNDED'] },
    ];

    return steps.map((step) => ({
      ...step,
      completed: step.statuses.includes(status),
    }));
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="animate-pulse h-8 w-32 bg-gray-200 rounded" />
        </div>
        {[1, 2].map((i) => (
          <div key={i} className="bg-white rounded-lg shadow-sm p-6">
            <div className="animate-pulse space-y-4">
              <div className="h-6 w-40 bg-gray-200 rounded" />
              <div className="h-20 bg-gray-100 rounded" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Returns & Refunds</h1>
            <p className="text-gray-600 mt-1">
              Manage your return requests and track refunds
            </p>
          </div>
          <Link href="/account/returns/new">
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Start a Return
            </Button>
          </Link>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <Input
              placeholder="Search by return or order number..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex gap-2 overflow-x-auto pb-2 sm:pb-0">
            {[
              { value: 'all', label: 'All' },
              { value: 'pending', label: 'Pending' },
              { value: 'approved', label: 'In Progress' },
              { value: 'refunded', label: 'Completed' },
            ].map((filter) => (
              <Button
                key={filter.value}
                variant={statusFilter === filter.value ? 'default' : 'outline'}
                size="sm"
                onClick={() => setStatusFilter(filter.value)}
                className="whitespace-nowrap"
              >
                {filter.label}
              </Button>
            ))}
          </div>
        </div>
      </div>

      {/* Return Policy Info */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="p-4">
          <div className="flex gap-4">
            <div className="flex-shrink-0">
              <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                <RotateCcw className="w-5 h-5 text-blue-600" />
              </div>
            </div>
            <div>
              <h3 className="font-semibold text-blue-900">Return Policy</h3>
              <p className="text-sm text-blue-700 mt-1">
                Most items can be returned within 30 days of delivery. Items must be
                in original condition with tags attached. Some items like personalized
                products or intimate items may not be eligible.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Returns List */}
      {filteredReturns.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <RotateCcw className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {returns.length === 0 ? 'No returns yet' : 'No matching returns'}
            </h3>
            <p className="text-gray-500 mb-6">
              {returns.length === 0
                ? 'When you return items, they will appear here'
                : 'Try adjusting your search or filter'}
            </p>
            <Link href="/account/orders">
              <Button>View Orders to Return</Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredReturns.map((ret) => (
            <Card key={ret.id}>
              <div className="border-b border-gray-100 bg-gray-50 px-6 py-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <div className="flex items-center gap-3">
                    {getStatusIcon(ret.status)}
                    <div>
                      <p className="font-semibold text-gray-900">
                        Return #{ret.returnNumber}
                      </p>
                      <p className="text-sm text-gray-500">
                        Order #{ret.orderNumber} •{' '}
                        {new Date(ret.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <Badge className={getStatusBadge(ret.status)}>
                    {ret.status.replace(/_/g, ' ')}
                  </Badge>
                </div>
              </div>

              <CardContent className="p-6">
                {/* Progress Steps */}
                {!['REJECTED', 'CANCELLED'].includes(ret.status) && (
                  <div className="mb-6">
                    <div className="relative flex justify-between">
                      <div className="absolute top-4 left-0 right-0 h-0.5 bg-gray-200" />
                      {getProgressSteps(ret.status).map((step, index) => (
                        <div
                          key={step.label}
                          className="relative flex flex-col items-center"
                        >
                          <div
                            className={`w-8 h-8 rounded-full flex items-center justify-center z-10 ${
                              step.completed
                                ? 'bg-primary text-white'
                                : 'bg-gray-200 text-gray-400'
                            }`}
                          >
                            {step.completed ? (
                              <CheckCircle className="w-4 h-4" />
                            ) : (
                              <span className="text-xs font-medium">{index + 1}</span>
                            )}
                          </div>
                          <p
                            className={`mt-2 text-xs font-medium ${
                              step.completed ? 'text-gray-900' : 'text-gray-400'
                            }`}
                          >
                            {step.label}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Items */}
                <div className="space-y-3">
                  {ret.items.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center gap-4"
                    >
                      <div className="w-16 h-16 bg-gray-100 rounded-lg flex-shrink-0 overflow-hidden">
                        {item.productImage ? (
                          <img
                            src={item.productImage}
                            alt={item.productName}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Package className="w-8 h-8 text-gray-400" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900 truncate">
                          {item.productName}
                        </p>
                        <p className="text-sm text-gray-500">
                          Qty: {item.quantity} • Reason: {item.reason}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Refund Info */}
                {ret.refundAmount && (
                  <div className="mt-4 pt-4 border-t border-gray-100">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">Refund Amount</span>
                      <span className="font-semibold text-gray-900">
                        ${ret.refundAmount.toFixed(2)}
                      </span>
                    </div>
                    <p className="text-sm text-gray-500 mt-1">
                      Refund to: {ret.refundMethod.replace(/_/g, ' ').toLowerCase()}
                    </p>
                  </div>
                )}

                {/* Return Label */}
                {ret.returnLabel && ret.status === 'LABEL_GENERATED' && (
                  <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                    <p className="text-sm font-medium text-blue-900 mb-2">
                      Your return label is ready!
                    </p>
                    <Button variant="outline" size="sm">
                      Download Return Label
                    </Button>
                  </div>
                )}

                {/* Actions */}
                <div className="flex flex-wrap gap-3 mt-6 pt-4 border-t border-gray-100">
                  <Link href={`/account/returns/${ret.id}`}>
                    <Button variant="outline" size="sm">
                      View Details
                      <ChevronRight className="w-4 h-4 ml-1" />
                    </Button>
                  </Link>
                  {ret.status === 'PENDING' && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-red-600 hover:text-red-700"
                    >
                      Cancel Return
                    </Button>
                  )}
                  <Link href="/account/support">
                    <Button variant="outline" size="sm">
                      Need Help?
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
