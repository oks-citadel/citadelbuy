'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Download, Loader2, FileText, Shield } from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AuditLogTable, type AuditLog } from '@/components/audit/AuditLogTable';
import {
  AuditFilters,
  type AuditFilterOptions,
} from '@/components/audit/AuditFilters';
import { apiClient } from '@/lib/api-client';
import { toast } from 'sonner';

export default function AuditLogPage() {
  const params = useParams();
  const slug = params.slug as string;

  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [filteredLogs, setFilteredLogs] = useState<AuditLog[]>([]);
  const [filters, setFilters] = useState<AuditFilterOptions>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalLogs, setTotalLogs] = useState(0);
  const logsPerPage = 20;

  useEffect(() => {
    loadAuditLogs();
  }, [slug, currentPage, filters]);

  const loadAuditLogs = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Build query parameters
      const params: any = {
        page: currentPage,
        limit: logsPerPage,
      };

      // Add filters to params
      if (filters.actionType) {
        params.action = filters.actionType;
      }
      if (filters.userId) {
        params.userId = filters.userId;
      }
      if (filters.dateFrom) {
        params.startDate = filters.dateFrom;
      }
      if (filters.dateTo) {
        params.endDate = filters.dateTo;
      }
      if (filters.search) {
        params.search = filters.search;
      }

      const response = await apiClient.get(
        `/api/v1/organizations/${slug}/audit-logs`,
        { params }
      );

      // Transform the response data
      const transformedLogs = response.data.logs.map((log: any) => ({
        id: log.id,
        timestamp: new Date(log.timestamp),
        user: {
          name: log.user?.name || 'Unknown User',
          email: log.user?.email || 'unknown@email.com',
        },
        action: log.action,
        resource: log.resource,
        details: log.details,
        oldValue: log.oldValue,
        newValue: log.newValue,
        ipAddress: log.ipAddress,
        userAgent: log.userAgent,
      }));

      setLogs(transformedLogs);
      setFilteredLogs(transformedLogs);
      setTotalLogs(response.data.total || transformedLogs.length);
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to load audit logs';
      setError(errorMessage);
      toast.error(errorMessage);
      setLogs([]);
      setFilteredLogs([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleExport = async () => {
    try {
      setIsExporting(true);

      // Build query parameters for export (same filters as current view)
      const params: any = {};

      if (filters.actionType) {
        params.action = filters.actionType;
      }
      if (filters.userId) {
        params.userId = filters.userId;
      }
      if (filters.dateFrom) {
        params.startDate = filters.dateFrom;
      }
      if (filters.dateTo) {
        params.endDate = filters.dateTo;
      }
      if (filters.search) {
        params.search = filters.search;
      }

      // Call backend export endpoint
      const response = await apiClient.get(
        `/api/v1/organizations/${slug}/audit-logs/export`,
        {
          params,
          responseType: 'blob', // Important for file downloads
        }
      );

      // Create and download file
      const blob = new Blob([response.data], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `audit-logs-${slug}-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      toast.success('Audit logs exported successfully');
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to export audit logs';
      toast.error(errorMessage);
    } finally {
      setIsExporting(false);
    }
  };

  const uniqueUsers = Array.from(
    new Set(logs.map((log) => log.user.email))
  ).map((email) => {
    const log = logs.find((l) => l.user.email === email)!;
    return {
      id: email,
      name: log.user.name,
    };
  });

  // Pagination - use server-side total count
  const totalPages = Math.ceil(totalLogs / logsPerPage);
  // Since we're fetching paginated data from the server, we use filteredLogs directly
  const paginatedLogs = filteredLogs;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Audit Logs</h1>
          <p className="text-muted-foreground mt-2">
            Track all activities and changes in your organization
          </p>
        </div>
        <Button
          variant="outline"
          onClick={handleExport}
          disabled={isExporting || filteredLogs.length === 0}
          isLoading={isExporting}
          leftIcon={<Download className="h-4 w-4" />}
        >
          Export CSV
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Total Events</CardDescription>
            <CardTitle className="text-3xl">{filteredLogs.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Active Users</CardDescription>
            <CardTitle className="text-3xl">{uniqueUsers.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Date Range</CardDescription>
            <CardTitle className="text-lg">
              {filteredLogs.length > 0
                ? `${Math.ceil(
                    (filteredLogs[0].timestamp.getTime() -
                      filteredLogs[filteredLogs.length - 1].timestamp.getTime()) /
                      (1000 * 60 * 60 * 24)
                  )} days`
                : 'N/A'}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive">
          <AlertDescription>
            <p className="font-medium">Error loading audit logs</p>
            <p className="text-sm mt-1">{error}</p>
            <Button
              variant="outline"
              size="sm"
              onClick={loadAuditLogs}
              className="mt-2"
            >
              Retry
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Info Alert */}
      {!error && (
        <Alert>
          <Shield className="h-4 w-4" />
          <AlertDescription>
            <div className="space-y-1">
              <p className="font-medium">Audit Log Retention</p>
              <p className="text-sm text-muted-foreground">
                Audit logs are retained for 90 days. Export logs regularly for
                long-term record keeping.
              </p>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Filters */}
      <AuditFilters
        filters={filters}
        onFiltersChange={setFilters}
        users={uniqueUsers}
      />

      {/* Audit Log Table */}
      <div className="space-y-4">
        <AuditLogTable logs={paginatedLogs} isLoading={isLoading} />

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Showing {(currentPage - 1) * logsPerPage + 1} to{' '}
              {Math.min(currentPage * logsPerPage, totalLogs)} of{' '}
              {totalLogs} results
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
              >
                Previous
              </Button>
              <div className="flex items-center gap-1">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum;
                  if (totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (currentPage <= 3) {
                    pageNum = i + 1;
                  } else if (currentPage >= totalPages - 2) {
                    pageNum = totalPages - 4 + i;
                  } else {
                    pageNum = currentPage - 2 + i;
                  }

                  return (
                    <Button
                      key={pageNum}
                      variant={currentPage === pageNum ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setCurrentPage(pageNum)}
                    >
                      {pageNum}
                    </Button>
                  );
                })}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  setCurrentPage((p) => Math.min(totalPages, p + 1))
                }
                disabled={currentPage === totalPages}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
