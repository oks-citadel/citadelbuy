'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Plus, Package, Search, Filter } from 'lucide-react';
import { useAuthStore } from '@/store/auth-store';
import type { ReturnRequest, ReturnFilters } from '@/lib/api/returns';

export default function ReturnsPage() {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();

  const [returns, setReturns] = useState<ReturnRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filters, setFilters] = useState<ReturnFilters>({});
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/auth/login?redirect=/returns');
      return;
    }

    fetchReturns();
  }, [isAuthenticated, router, filters]);

  const fetchReturns = async () => {
    try {
      setIsLoading(true);
      const { returnsApi } = await import('@/lib/api/returns');
      const data = await returnsApi.getMyReturns(filters);
      setReturns(data);
    } catch (err) {
      console.error('Failed to fetch returns:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleStatusFilter = (status: string) => {
    if (status === 'ALL') {
      setFilters({});
    } else {
      setFilters({ ...filters, status });
    }
  };

  const handleSearch = () => {
    // Search by RMA number
    const filtered = returns.filter((ret) =>
      ret.rmaNumber.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setReturns(filtered);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'REQUESTED':
      case 'PENDING_APPROVAL':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'APPROVED':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'LABEL_GENERATED':
      case 'IN_TRANSIT':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200';
      case 'RECEIVED':
      case 'INSPECTING':
        return 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200';
      case 'REFUND_PENDING':
      case 'REFUND_PROCESSING':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200';
      case 'COMPLETED':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'REJECTED':
      case 'CANCELLED':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  const getStatusLabel = (status: string) => {
    return status
      .split('_')
      .map((word) => word.charAt(0) + word.slice(1).toLowerCase())
      .join(' ');
  };

  const getReturnTypeLabel = (type: string) => {
    switch (type) {
      case 'REFUND':
        return 'Refund';
      case 'EXCHANGE':
        return 'Exchange';
      case 'STORE_CREDIT':
        return 'Store Credit';
      case 'PARTIAL_REFUND':
        return 'Partial Refund';
      default:
        return type;
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-16">
        <div className="flex min-h-[400px] items-center justify-center">
          <div className="text-center">
            <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />
            <p className="mt-4 text-muted-foreground">Loading your returns...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">My Returns</h1>
          <p className="mt-2 text-muted-foreground">
            Track and manage your return requests
          </p>
        </div>
        <Link href="/returns/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            New Return
          </Button>
        </Link>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="flex items-center gap-2">
              <Search className="h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by RMA number..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              />
            </div>
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <Select onValueChange={handleStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Status</SelectItem>
                  <SelectItem value="REQUESTED">Requested</SelectItem>
                  <SelectItem value="PENDING_APPROVAL">Pending Approval</SelectItem>
                  <SelectItem value="APPROVED">Approved</SelectItem>
                  <SelectItem value="IN_TRANSIT">In Transit</SelectItem>
                  <SelectItem value="COMPLETED">Completed</SelectItem>
                  <SelectItem value="REJECTED">Rejected</SelectItem>
                  <SelectItem value="CANCELLED">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button variant="outline" onClick={fetchReturns}>
              Refresh
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Returns List */}
      {returns.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <Package className="mx-auto h-12 w-12 text-muted-foreground" />
            <h3 className="mt-4 text-lg font-semibold">No returns found</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              You haven&apos;t created any return requests yet.
            </p>
            <Link href="/returns/new">
              <Button className="mt-4">
                <Plus className="mr-2 h-4 w-4" />
                Create Return Request
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {returns.map((returnRequest) => (
            <Card
              key={returnRequest.id}
              className="cursor-pointer transition-all hover:border-primary"
              onClick={() => router.push(`/returns/${returnRequest.id}`)}
            >
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      RMA #{returnRequest.rmaNumber}
                      <span
                        className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${getStatusColor(
                          returnRequest.status
                        )}`}
                      >
                        {getStatusLabel(returnRequest.status)}
                      </span>
                    </CardTitle>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Created {new Date(returnRequest.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">${returnRequest.totalAmount.toFixed(2)}</p>
                    <p className="text-sm text-muted-foreground">
                      {getReturnTypeLabel(returnRequest.returnType)}
                    </p>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Items:</span>
                    <span className="font-medium">{returnRequest.items.length}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Reason:</span>
                    <span className="font-medium">
                      {returnRequest.reason.split('_').join(' ')}
                    </span>
                  </div>
                  {returnRequest.returnLabel && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Tracking:</span>
                      <span className="font-mono font-medium">
                        {returnRequest.returnLabel.trackingNumber}
                      </span>
                    </div>
                  )}
                  {returnRequest.refund && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Refund Status:</span>
                      <span
                        className={`font-medium ${
                          returnRequest.refund.status === 'COMPLETED'
                            ? 'text-green-600'
                            : returnRequest.refund.status === 'FAILED'
                            ? 'text-red-600'
                            : 'text-orange-600'
                        }`}
                      >
                        {getStatusLabel(returnRequest.refund.status)}
                      </span>
                    </div>
                  )}
                </div>
                <div className="mt-4 flex justify-end">
                  <Button variant="outline" size="sm">
                    View Details
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
