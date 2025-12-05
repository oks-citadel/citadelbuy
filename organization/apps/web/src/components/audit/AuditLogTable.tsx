'use client';

import React, { useState } from 'react';
import { ChevronDown, ChevronRight, User, Calendar } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
} from '@/components/ui/card';
import { cn } from '@/lib/utils';

export interface AuditLog {
  id: string;
  timestamp: Date;
  user: {
    name: string;
    email: string;
  };
  action: string;
  resource: string;
  details?: string;
  oldValue?: any;
  newValue?: any;
  ipAddress?: string;
  userAgent?: string;
}

interface AuditLogTableProps {
  logs: AuditLog[];
  isLoading?: boolean;
}

const actionColors: Record<string, string> = {
  create: 'success',
  update: 'default',
  delete: 'destructive',
  login: 'default',
  logout: 'secondary',
  export: 'default',
  invite: 'success',
  remove: 'destructive',
};

export function AuditLogTable({ logs, isLoading }: AuditLogTableProps) {
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  const toggleRow = (id: string) => {
    setExpandedRows((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const formatTimestamp = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    }).format(date);
  };

  const getActionVariant = (action: string): any => {
    const actionLower = action.toLowerCase();
    if (actionLower.includes('create')) return 'success';
    if (actionLower.includes('delete') || actionLower.includes('remove'))
      return 'destructive';
    if (actionLower.includes('update') || actionLower.includes('edit'))
      return 'default';
    return 'secondary';
  };

  const renderDiff = (oldValue: any, newValue: any) => {
    if (typeof oldValue === 'object' && typeof newValue === 'object') {
      const keys = new Set([
        ...Object.keys(oldValue || {}),
        ...Object.keys(newValue || {}),
      ]);

      return (
        <div className="space-y-2">
          {Array.from(keys).map((key) => {
            const hasChanged =
              JSON.stringify(oldValue?.[key]) !== JSON.stringify(newValue?.[key]);

            if (!hasChanged) return null;

            return (
              <div key={key} className="text-xs">
                <span className="font-medium">{key}:</span>
                <div className="flex gap-2 mt-1">
                  {oldValue?.[key] !== undefined && (
                    <div className="flex-1 p-2 bg-destructive/10 text-destructive rounded">
                      <span className="font-mono">
                        {JSON.stringify(oldValue[key])}
                      </span>
                    </div>
                  )}
                  {newValue?.[key] !== undefined && (
                    <div className="flex-1 p-2 bg-success/10 text-success rounded">
                      <span className="font-mono">
                        {JSON.stringify(newValue[key])}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      );
    }

    return (
      <div className="flex gap-2 text-xs">
        {oldValue !== undefined && (
          <div className="flex-1 p-2 bg-destructive/10 text-destructive rounded">
            <span className="font-mono">{JSON.stringify(oldValue)}</span>
          </div>
        )}
        {newValue !== undefined && (
          <div className="flex-1 p-2 bg-success/10 text-success rounded">
            <span className="font-mono">{JSON.stringify(newValue)}</span>
          </div>
        )}
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="space-y-2">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-16 bg-muted animate-pulse rounded" />
        ))}
      </div>
    );
  }

  if (logs.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <p className="text-muted-foreground">No audit logs found</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="border rounded-lg">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-12"></TableHead>
            <TableHead>Timestamp</TableHead>
            <TableHead>User</TableHead>
            <TableHead>Action</TableHead>
            <TableHead>Resource</TableHead>
            <TableHead>Details</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {logs.map((log) => {
            const isExpanded = expandedRows.has(log.id);
            const hasDetails = log.oldValue || log.newValue || log.ipAddress;

            return (
              <React.Fragment key={log.id}>
                <TableRow
                  className={cn(
                    'cursor-pointer',
                    isExpanded && 'border-b-0'
                  )}
                  onClick={() => hasDetails && toggleRow(log.id)}
                >
                  <TableCell>
                    {hasDetails && (
                      <Button variant="ghost" size="icon-sm">
                        {isExpanded ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : (
                          <ChevronRight className="h-4 w-4" />
                        )}
                      </Button>
                    )}
                  </TableCell>
                  <TableCell className="font-mono text-xs">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-3 w-3 text-muted-foreground" />
                      {formatTimestamp(log.timestamp)}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className="p-1 bg-primary/10 rounded">
                        <User className="h-3 w-3 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">{log.user.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {log.user.email}
                        </p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={getActionVariant(log.action)}>
                      {log.action}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-medium">{log.resource}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {log.details || '-'}
                  </TableCell>
                </TableRow>
                {isExpanded && (
                  <TableRow>
                    <TableCell colSpan={6}>
                      <Card className="bg-muted/50">
                        <CardContent className="p-4 space-y-4">
                          {(log.oldValue || log.newValue) && (
                            <div>
                              <h4 className="text-sm font-medium mb-2">
                                Changes
                              </h4>
                              {renderDiff(log.oldValue, log.newValue)}
                            </div>
                          )}
                          {(log.ipAddress || log.userAgent) && (
                            <div className="grid gap-2 md:grid-cols-2 pt-2 border-t">
                              {log.ipAddress && (
                                <div>
                                  <span className="text-xs font-medium">
                                    IP Address:
                                  </span>
                                  <p className="text-xs text-muted-foreground font-mono">
                                    {log.ipAddress}
                                  </p>
                                </div>
                              )}
                              {log.userAgent && (
                                <div>
                                  <span className="text-xs font-medium">
                                    User Agent:
                                  </span>
                                  <p className="text-xs text-muted-foreground font-mono truncate">
                                    {log.userAgent}
                                  </p>
                                </div>
                              )}
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    </TableCell>
                  </TableRow>
                )}
              </React.Fragment>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
