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
  const [currentPage, setCurrentPage] = useState(1);
  const logsPerPage = 20;

  useEffect(() => {
    loadAuditLogs();
  }, [slug]);

  useEffect(() => {
    applyFilters();
  }, [logs, filters]);

  const loadAuditLogs = async () => {
    try {
      setIsLoading(true);

      // TODO: Replace with real API endpoint when backend is ready
      // const response = await apiClient.get(`/api/v1/organizations/${slug}/audit-logs`, {
      //   params: { limit: 100, sort: 'timestamp', order: 'desc' }
      // });
      // setLogs(response.data.logs.map((log: any) => ({
      //   ...log,
      //   timestamp: new Date(log.timestamp)
      // })));

      // Temporary: Show message that API integration is pending
      toast.info('Audit log data will be loaded from API when backend endpoints are ready');
      setLogs([]);
    } catch (err) {
      toast.error('Failed to load audit logs');
    } finally {
      setIsLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...logs];

    // Apply search filter
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter(
        (log) =>
          log.action.toLowerCase().includes(searchLower) ||
          log.resource.toLowerCase().includes(searchLower) ||
          log.user.name.toLowerCase().includes(searchLower) ||
          log.user.email.toLowerCase().includes(searchLower) ||
          log.details?.toLowerCase().includes(searchLower)
      );
    }

    // Apply action type filter
    if (filters.actionType) {
      filtered = filtered.filter((log) =>
        log.action.toLowerCase().includes(filters.actionType!.toLowerCase())
      );
    }

    // Apply user filter
    if (filters.userId) {
      filtered = filtered.filter(
        (log) => log.user.email === filters.userId
      );
    }

    // Apply date range filters
    if (filters.dateFrom) {
      const dateFrom = new Date(filters.dateFrom);
      filtered = filtered.filter((log) => log.timestamp >= dateFrom);
    }

    if (filters.dateTo) {
      const dateTo = new Date(filters.dateTo);
      dateTo.setHours(23, 59, 59, 999);
      filtered = filtered.filter((log) => log.timestamp <= dateTo);
    }

    // Sort by timestamp descending
    filtered.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    setFilteredLogs(filtered);
    setCurrentPage(1);
  };

  const handleExport = async () => {
    try {
      setIsExporting(true);

      // Generate CSV content
      const headers = [
        'Timestamp',
        'User',
        'Email',
        'Action',
        'Resource',
        'Details',
        'IP Address',
      ];
      const csvContent = [
        headers.join(','),
        ...filteredLogs.map((log) =>
          [
            log.timestamp.toISOString(),
            `"${log.user.name}"`,
            log.user.email,
            `"${log.action}"`,
            log.resource,
            `"${log.details || ''}"`,
            log.ipAddress || '',
          ].join(',')
        ),
      ].join('\n');

      // Create and download file
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `audit-logs-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      toast.success('Audit logs exported successfully');
    } catch (err) {
      toast.error('Failed to export audit logs');
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

  // Pagination
  const totalPages = Math.ceil(filteredLogs.length / logsPerPage);
  const paginatedLogs = filteredLogs.slice(
    (currentPage - 1) * logsPerPage,
    currentPage * logsPerPage
  );

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

      {/* Info Alert */}
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
              {Math.min(currentPage * logsPerPage, filteredLogs.length)} of{' '}
              {filteredLogs.length} results
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
