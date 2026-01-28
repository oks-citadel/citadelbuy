'use client';

import * as React from 'react';
import { Eye, Download, AlertCircle, User, Mail, Calendar, MapPin, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScreeningStatusBadge, ScreeningStatus } from './ScreeningStatusBadge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';

export interface ScreeningResult {
  id: string;
  entityName: string;
  entityType: 'INDIVIDUAL' | 'BUSINESS';
  email?: string;
  status: ScreeningStatus;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  matchScore?: number;
  matchedList?: string;
  screenedAt: string;
  screenedBy?: string;
  country?: string;
  notes?: string;
  flaggedReasons?: string[];
}

interface ScreeningResultsTableProps {
  results: ScreeningResult[];
  onViewDetails?: (result: ScreeningResult) => void;
  onExport?: (result: ScreeningResult) => void;
  className?: string;
  emptyMessage?: string;
}

export function ScreeningResultsTable({
  results,
  onViewDetails,
  onExport,
  className,
  emptyMessage = 'No screening results found',
}: ScreeningResultsTableProps) {
  const getRiskBadge = (riskLevel: ScreeningResult['riskLevel']) => {
    const styles = {
      LOW: 'bg-blue-100 text-blue-800 border-blue-200',
      MEDIUM: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      HIGH: 'bg-orange-100 text-orange-800 border-orange-200',
      CRITICAL: 'bg-red-100 text-red-800 border-red-200',
    };
    return (
      <Badge variant="outline" className={cn(styles[riskLevel])}>
        {riskLevel}
      </Badge>
    );
  };

  const getEntityTypeBadge = (entityType: ScreeningResult['entityType']) => {
    const styles = {
      INDIVIDUAL: 'bg-purple-100 text-purple-800 border-purple-200',
      BUSINESS: 'bg-indigo-100 text-indigo-800 border-indigo-200',
    };
    return (
      <Badge variant="outline" className={cn(styles[entityType])}>
        {entityType}
      </Badge>
    );
  };

  return (
    <div className={cn('rounded-lg border bg-card overflow-hidden', className)}>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="w-[250px]">Entity</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Risk Level</TableHead>
              <TableHead>Match Score</TableHead>
              <TableHead>Matched List</TableHead>
              <TableHead>Screened At</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {results.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="h-32 text-center">
                  <div className="flex flex-col items-center justify-center text-muted-foreground">
                    <AlertCircle className="h-8 w-8 mb-2" />
                    <p>{emptyMessage}</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              results.map((result) => (
                <TableRow key={result.id} className="hover:bg-muted/50">
                  {/* Entity */}
                  <TableCell>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">{result.entityName}</span>
                      </div>
                      {result.email && (
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Mail className="h-3 w-3" />
                          <span>{result.email}</span>
                        </div>
                      )}
                      {result.country && (
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <MapPin className="h-3 w-3" />
                          <span>{result.country}</span>
                        </div>
                      )}
                    </div>
                  </TableCell>

                  {/* Entity Type */}
                  <TableCell>{getEntityTypeBadge(result.entityType)}</TableCell>

                  {/* Status */}
                  <TableCell>
                    <ScreeningStatusBadge status={result.status} />
                  </TableCell>

                  {/* Risk Level */}
                  <TableCell>{getRiskBadge(result.riskLevel)}</TableCell>

                  {/* Match Score */}
                  <TableCell>
                    {result.matchScore !== undefined ? (
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-2 bg-muted rounded-full overflow-hidden">
                          <div
                            className={cn(
                              'h-full transition-all',
                              result.matchScore >= 90
                                ? 'bg-red-500'
                                : result.matchScore >= 70
                                ? 'bg-orange-500'
                                : result.matchScore >= 50
                                ? 'bg-yellow-500'
                                : 'bg-blue-500'
                            )}
                            style={{ width: `${result.matchScore}%` }}
                          />
                        </div>
                        <span className="text-sm font-medium">{result.matchScore}%</span>
                      </div>
                    ) : (
                      <span className="text-muted-foreground text-sm">-</span>
                    )}
                  </TableCell>

                  {/* Matched List */}
                  <TableCell>
                    {result.matchedList ? (
                      <div className="flex items-center gap-1 text-sm">
                        <FileText className="h-3 w-3 text-muted-foreground" />
                        <span className="truncate max-w-[150px]" title={result.matchedList}>
                          {result.matchedList}
                        </span>
                      </div>
                    ) : (
                      <span className="text-muted-foreground text-sm">-</span>
                    )}
                  </TableCell>

                  {/* Screened At */}
                  <TableCell>
                    <div className="space-y-1">
                      <div className="flex items-center gap-1 text-sm">
                        <Calendar className="h-3 w-3 text-muted-foreground" />
                        <span>{new Date(result.screenedAt).toLocaleDateString()}</span>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {new Date(result.screenedAt).toLocaleTimeString()}
                      </div>
                      {result.screenedBy && (
                        <div className="text-xs text-muted-foreground">
                          By: {result.screenedBy}
                        </div>
                      )}
                    </div>
                  </TableCell>

                  {/* Actions */}
                  <TableCell>
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => onViewDetails?.(result)}
                        title="View Details"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => onExport?.(result)}
                        title="Export"
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
