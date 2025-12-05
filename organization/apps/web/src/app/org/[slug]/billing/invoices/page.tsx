'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Download, Filter, Loader2, Search } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { InvoiceTable, Invoice } from '@/components/billing/InvoiceTable';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { organizationsApi } from '@/lib/organizations-api';
import { downloadFile } from '@/lib/utils';
import { toast } from 'sonner';

export default function InvoicesPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;

  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [filteredInvoices, setFilteredInvoices] = useState<Invoice[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<string>('all');

  useEffect(() => {
    loadInvoices();
  }, [slug]);

  useEffect(() => {
    filterInvoices();
  }, [invoices, searchQuery, statusFilter, dateFilter]);

  const loadInvoices = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Mock data for now - replace with actual API call
      // const { invoices } = await organizationsApi.getInvoices('org_id');

      const mockInvoices: Invoice[] = [
        {
          id: 'inv_1',
          number: 'INV-2024-001',
          status: 'paid',
          amount: 4900,
          currency: 'USD',
          date: '2024-01-01T00:00:00Z',
          dueDate: '2024-01-15T00:00:00Z',
          pdfUrl: 'https://example.com/invoice-1.pdf',
        },
        {
          id: 'inv_2',
          number: 'INV-2023-012',
          status: 'paid',
          amount: 4900,
          currency: 'USD',
          date: '2023-12-01T00:00:00Z',
          dueDate: '2023-12-15T00:00:00Z',
          pdfUrl: 'https://example.com/invoice-2.pdf',
        },
        {
          id: 'inv_3',
          number: 'INV-2023-011',
          status: 'paid',
          amount: 4900,
          currency: 'USD',
          date: '2023-11-01T00:00:00Z',
          dueDate: '2023-11-15T00:00:00Z',
          pdfUrl: 'https://example.com/invoice-3.pdf',
        },
        {
          id: 'inv_4',
          number: 'INV-2023-010',
          status: 'void',
          amount: 4900,
          currency: 'USD',
          date: '2023-10-01T00:00:00Z',
          dueDate: '2023-10-15T00:00:00Z',
          pdfUrl: 'https://example.com/invoice-4.pdf',
        },
        {
          id: 'inv_5',
          number: 'INV-2023-009',
          status: 'paid',
          amount: 4900,
          currency: 'USD',
          date: '2023-09-01T00:00:00Z',
          dueDate: '2023-09-15T00:00:00Z',
          pdfUrl: 'https://example.com/invoice-5.pdf',
        },
      ];

      setInvoices(mockInvoices);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load invoices');
      toast.error('Failed to load invoices');
    } finally {
      setIsLoading(false);
    }
  };

  const filterInvoices = () => {
    let filtered = [...invoices];

    // Filter by search query
    if (searchQuery) {
      filtered = filtered.filter(
        (invoice) =>
          invoice.number.toLowerCase().includes(searchQuery.toLowerCase()) ||
          invoice.status.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Filter by status
    if (statusFilter !== 'all') {
      filtered = filtered.filter((invoice) => invoice.status === statusFilter);
    }

    // Filter by date
    const now = new Date();
    if (dateFilter !== 'all') {
      filtered = filtered.filter((invoice) => {
        const invoiceDate = new Date(invoice.date);
        const monthsAgo = parseInt(dateFilter);
        const cutoffDate = new Date(now.getFullYear(), now.getMonth() - monthsAgo, 1);
        return invoiceDate >= cutoffDate;
      });
    }

    setFilteredInvoices(filtered);
  };

  const handleDownload = async (invoice: Invoice) => {
    try {
      toast.info('Downloading invoice...');

      // In production, download from API
      // const blob = await organizationsApi.downloadInvoice('org_id', invoice.id);
      // const url = window.URL.createObjectURL(blob);
      // downloadFile(url, `${invoice.number}.pdf`);
      // window.URL.revokeObjectURL(url);

      // Mock download
      await new Promise(resolve => setTimeout(resolve, 1000));
      toast.success('Invoice downloaded successfully');
    } catch (err) {
      toast.error('Failed to download invoice');
    }
  };

  const handleDownloadAll = async () => {
    try {
      toast.info('Preparing invoices for download...');

      // Download all filtered invoices
      for (const invoice of filteredInvoices) {
        await handleDownload(invoice);
      }
    } catch (err) {
      toast.error('Failed to download invoices');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <Button
          variant="ghost"
          onClick={() => router.push(`/org/${slug}/billing`)}
          className="mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Billing
        </Button>

        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Invoice History</h1>
            <p className="text-muted-foreground mt-2">
              View and download your past invoices
            </p>
          </div>
          {filteredInvoices.length > 0 && (
            <Button onClick={handleDownloadAll} variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Download All
            </Button>
          )}
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters
          </CardTitle>
          <CardDescription>Search and filter your invoices</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search invoices..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
                <SelectItem value="open">Open</SelectItem>
                <SelectItem value="void">Void</SelectItem>
                <SelectItem value="uncollectible">Uncollectible</SelectItem>
              </SelectContent>
            </Select>

            <Select value={dateFilter} onValueChange={setDateFilter}>
              <SelectTrigger>
                <SelectValue placeholder="All Time" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Time</SelectItem>
                <SelectItem value="3">Last 3 Months</SelectItem>
                <SelectItem value="6">Last 6 Months</SelectItem>
                <SelectItem value="12">Last Year</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {(searchQuery || statusFilter !== 'all' || dateFilter !== 'all') && (
            <div className="mt-4 flex items-center gap-2">
              <p className="text-sm text-muted-foreground">
                Showing {filteredInvoices.length} of {invoices.length} invoices
              </p>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSearchQuery('');
                  setStatusFilter('all');
                  setDateFilter('all');
                }}
              >
                Clear Filters
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Invoices Table */}
      <Card>
        <CardHeader>
          <CardTitle>Invoices</CardTitle>
          <CardDescription>
            {filteredInvoices.length === 0
              ? 'No invoices found'
              : `${filteredInvoices.length} invoice${filteredInvoices.length === 1 ? '' : 's'}`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <InvoiceTable
            invoices={filteredInvoices}
            onDownload={handleDownload}
            isLoading={isLoading}
          />
        </CardContent>
      </Card>

      {/* Summary Stats */}
      {filteredInvoices.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              <div>
                <p className="text-sm text-muted-foreground">Total Invoices</p>
                <p className="text-2xl font-bold">{filteredInvoices.length}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Paid</p>
                <p className="text-2xl font-bold">
                  $
                  {(
                    filteredInvoices
                      .filter((i) => i.status === 'paid')
                      .reduce((sum, i) => sum + i.amount, 0) / 100
                  ).toLocaleString()}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Average Invoice</p>
                <p className="text-2xl font-bold">
                  $
                  {filteredInvoices.length > 0
                    ? (
                        filteredInvoices.reduce((sum, i) => sum + i.amount, 0) /
                        filteredInvoices.length /
                        100
                      ).toLocaleString()
                    : '0'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
