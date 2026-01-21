'use client';

import React, { useState } from 'react';
import { Download, ExternalLink, Calendar, ChevronDown, ChevronUp } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { formatCurrency, formatDate } from '@/lib/utils';
import { downloadFile } from '@/lib/utils';

export interface Invoice {
  id: string;
  number: string;
  status: 'paid' | 'open' | 'void' | 'uncollectible';
  amount: number;
  currency: string;
  date: string;
  dueDate: string;
  pdfUrl: string;
}

interface InvoiceTableProps {
  invoices: Invoice[];
  onDownload: (invoice: Invoice) => void;
  isLoading?: boolean;
}

type SortField = 'date' | 'amount' | 'status';
type SortDirection = 'asc' | 'desc';

const getStatusBadgeVariant = (status: Invoice['status']) => {
  switch (status) {
    case 'paid':
      return 'success' as const;
    case 'open':
      return 'warning' as const;
    case 'void':
    case 'uncollectible':
      return 'destructive' as const;
    default:
      return 'secondary' as const;
  }
};

const getStatusLabel = (status: Invoice['status']) => {
  return status.charAt(0).toUpperCase() + status.slice(1);
};

export function InvoiceTable({ invoices, onDownload, isLoading }: InvoiceTableProps) {
  const [sortField, setSortField] = useState<SortField>('date');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const sortedInvoices = [...invoices].sort((a, b) => {
    let comparison = 0;

    switch (sortField) {
      case 'date':
        comparison = new Date(a.date).getTime() - new Date(b.date).getTime();
        break;
      case 'amount':
        comparison = a.amount - b.amount;
        break;
      case 'status':
        comparison = a.status.localeCompare(b.status);
        break;
    }

    return sortDirection === 'asc' ? comparison : -comparison;
  });

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return null;
    return sortDirection === 'asc' ? (
      <ChevronUp className="h-4 w-4 inline ml-1" />
    ) : (
      <ChevronDown className="h-4 w-4 inline ml-1" />
    );
  };

  if (invoices.length === 0) {
    return (
      <div className="text-center py-12 border rounded-lg">
        <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
        <h3 className="text-lg font-medium mb-2">No invoices yet</h3>
        <p className="text-sm text-muted-foreground">
          Your invoices will appear here once you start a subscription
        </p>
      </div>
    );
  }

  return (
    <div className="border rounded-lg">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Invoice</TableHead>
            <TableHead>
              <button
                onClick={() => handleSort('status')}
                className="flex items-center hover:text-foreground"
              >
                Status
                <SortIcon field="status" />
              </button>
            </TableHead>
            <TableHead>
              <button
                onClick={() => handleSort('amount')}
                className="flex items-center hover:text-foreground"
              >
                Amount
                <SortIcon field="amount" />
              </button>
            </TableHead>
            <TableHead>
              <button
                onClick={() => handleSort('date')}
                className="flex items-center hover:text-foreground"
              >
                Date
                <SortIcon field="date" />
              </button>
            </TableHead>
            <TableHead>Due Date</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedInvoices.map((invoice) => (
            <TableRow key={invoice.id}>
              <TableCell>
                <div className="font-medium">{invoice.number}</div>
              </TableCell>
              <TableCell>
                <Badge variant={getStatusBadgeVariant(invoice.status)}>
                  {getStatusLabel(invoice.status)}
                </Badge>
              </TableCell>
              <TableCell className="font-medium">
                {formatCurrency(invoice.amount / 100, invoice.currency)}
              </TableCell>
              <TableCell>{formatDate(invoice.date)}</TableCell>
              <TableCell>
                {invoice.status === 'open' ? (
                  <span className="text-warning font-medium">
                    {formatDate(invoice.dueDate)}
                  </span>
                ) : (
                  formatDate(invoice.dueDate)
                )}
              </TableCell>
              <TableCell className="text-right">
                <div className="flex items-center justify-end gap-2">
                  {invoice.pdfUrl && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => window.open(invoice.pdfUrl, '_blank')}
                      disabled={isLoading}
                    >
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onDownload(invoice)}
                    disabled={isLoading}
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
