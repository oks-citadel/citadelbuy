'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Loader2, Search, Filter, ChevronLeft, ChevronRight, FileText, CheckCircle, XCircle, Package } from 'lucide-react';
import { useAuthStore } from '@/store/auth-store';
import type { ReturnRequest, ReturnFilters } from '@/lib/api/returns';

export default function AdminReturnsPage() {
  const router = useRouter();
  const { isAuthenticated, user } = useAuthStore();

  const [returns, setReturns] = useState<ReturnRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [filters, setFilters] = useState<ReturnFilters>({ page: 1, limit: 20 });
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [typeFilter, setTypeFilter] = useState('ALL');

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/auth/login?redirect=/admin/returns');
      return;
    }

    if (user?.role !== 'admin') {
      router.push('/');
      return;
    }

    fetchReturns();
  }, [isAuthenticated, user, router, filters]);

  const fetchReturns = async () => {
    try {
      setIsLoading(true);
      const { returnsApi } = await import('@/lib/api/returns');
      const result = await returnsApi.getAll(filters);
      setReturns(result.data);
      setTotal(result.total);
    } catch (err: any) {
      console.error('Failed to fetch returns:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = () => {
    setFilters({ ...filters, search: searchTerm, page: 1 });
    setPage(1);
  };

  const handleStatusFilter = (status: string) => {
    setStatusFilter(status);
    if (status === 'ALL') {
      const { status: _, ...rest } = filters;
      setFilters({ ...rest, page: 1 });
    } else {
      setFilters({ ...filters, status, page: 1 });
    }
    setPage(1);
  };

  const handleTypeFilter = (type: string) => {
    setTypeFilter(type);
    if (type === 'ALL') {
      const { returnType: _, ...rest } = filters;
      setFilters({ ...rest, page: 1 });
    } else {
      setFilters({ ...filters, returnType: type, page: 1 });
    }
    setPage(1);
  };

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
    setFilters({ ...filters, page: newPage });
  };

  const handleQuickAction = async (returnId: string, action: 'approve' | 'reject', data?: any) => {
    try {
      const { returnsApi } = await import('@/lib/api/returns');

      if (action === 'approve') {
        await returnsApi.approve(returnId, data);
        console.log('Return approved successfully');
      } else {
        await returnsApi.reject(returnId, data || { resolutionNotes: 'Rejected by admin' });
        console.log('Return rejected');
      }

      fetchReturns(); // Refresh the list
    } catch (err: any) {
      console.error(`Failed to ${action} return:`, err);
      alert(err.response?.data?.message || `Failed to ${action} return`);
    }
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

  const totalPages = Math.ceil(total / limit);

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-16">
        <div className="flex min-h-[400px] items-center justify-center">
          <div className="text-center">
            <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />
            <p className="mt-4 text-muted-foreground">Loading returns...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Returns Management</h1>
        <p className="mt-2 text-muted-foreground">
          Manage and process customer return requests
        </p>
      </div>

      {/* Statistics Cards */}
      <div className="mb-6 grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Total Returns</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Pending Approval</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {returns.filter((r) => r.status === 'PENDING_APPROVAL').length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">In Progress</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {returns.filter((r) => ['APPROVED', 'LABEL_GENERATED', 'IN_TRANSIT', 'RECEIVED', 'INSPECTING'].includes(r.status)).length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {returns.filter((r) => r.status === 'COMPLETED').length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="grid gap-4 md:grid-cols-4">
            <div className="flex items-center gap-2">
              <Search className="h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search RMA, customer..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              />
            </div>
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <Select value={statusFilter} onValueChange={handleStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Status</SelectItem>
                  <SelectItem value="REQUESTED">Requested</SelectItem>
                  <SelectItem value="PENDING_APPROVAL">Pending Approval</SelectItem>
                  <SelectItem value="APPROVED">Approved</SelectItem>
                  <SelectItem value="LABEL_GENERATED">Label Generated</SelectItem>
                  <SelectItem value="IN_TRANSIT">In Transit</SelectItem>
                  <SelectItem value="RECEIVED">Received</SelectItem>
                  <SelectItem value="INSPECTING">Inspecting</SelectItem>
                  <SelectItem value="REFUND_PENDING">Refund Pending</SelectItem>
                  <SelectItem value="COMPLETED">Completed</SelectItem>
                  <SelectItem value="REJECTED">Rejected</SelectItem>
                  <SelectItem value="CANCELLED">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <Select value={typeFilter} onValueChange={handleTypeFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Types</SelectItem>
                  <SelectItem value="REFUND">Refund</SelectItem>
                  <SelectItem value="EXCHANGE">Exchange</SelectItem>
                  <SelectItem value="STORE_CREDIT">Store Credit</SelectItem>
                  <SelectItem value="PARTIAL_REFUND">Partial Refund</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button onClick={handleSearch}>Search</Button>
          </div>
        </CardContent>
      </Card>

      {/* Returns Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>RMA Number</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Items</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {returns.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8">
                    <Package className="mx-auto h-12 w-12 text-muted-foreground" />
                    <p className="mt-2 text-muted-foreground">No returns found</p>
                  </TableCell>
                </TableRow>
              ) : (
                returns.map((returnRequest) => (
                  <TableRow
                    key={returnRequest.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => router.push(`/admin/returns/${returnRequest.id}`)}
                  >
                    <TableCell className="font-mono">{returnRequest.rmaNumber}</TableCell>
                    <TableCell>{returnRequest.userId}</TableCell>
                    <TableCell>{returnRequest.returnType.split('_').join(' ')}</TableCell>
                    <TableCell>
                      <span
                        className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${getStatusColor(
                          returnRequest.status
                        )}`}
                      >
                        {getStatusLabel(returnRequest.status)}
                      </span>
                    </TableCell>
                    <TableCell>${returnRequest.totalAmount.toFixed(2)}</TableCell>
                    <TableCell>{returnRequest.items.length}</TableCell>
                    <TableCell>
                      {new Date(returnRequest.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                        {returnRequest.status === 'PENDING_APPROVAL' && (
                          <>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleQuickAction(returnRequest.id, 'approve')}
                            >
                              <CheckCircle className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleQuickAction(returnRequest.id, 'reject')}
                            >
                              <XCircle className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                        <Link href={`/admin/returns/${returnRequest.id}`}>
                          <Button size="sm" variant="outline">
                            <FileText className="h-4 w-4" />
                          </Button>
                        </Link>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-6 flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Showing {(page - 1) * limit + 1} to {Math.min(page * limit, total)} of {total} returns
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(page - 1)}
              disabled={page === 1}
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </Button>
            <div className="flex items-center gap-1">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                const pageNum = i + 1;
                return (
                  <Button
                    key={pageNum}
                    variant={page === pageNum ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => handlePageChange(pageNum)}
                  >
                    {pageNum}
                  </Button>
                );
              })}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(page + 1)}
              disabled={page === totalPages}
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
