'use client';

import * as React from 'react';
import { Search, Filter, Calendar, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

export interface ScreeningFiltersProps {
  onSearchChange?: (value: string) => void;
  onStatusChange?: (value: string) => void;
  onRiskLevelChange?: (value: string) => void;
  onDateRangeChange?: (from: string, to: string) => void;
  onClear?: () => void;
  searchValue?: string;
  statusValue?: string;
  riskLevelValue?: string;
  className?: string;
}

export function ScreeningFilters({
  onSearchChange,
  onStatusChange,
  onRiskLevelChange,
  onDateRangeChange,
  onClear,
  searchValue = '',
  statusValue = 'all',
  riskLevelValue = 'all',
  className,
}: ScreeningFiltersProps) {
  const [dateFrom, setDateFrom] = React.useState('');
  const [dateTo, setDateTo] = React.useState('');
  const [localSearch, setLocalSearch] = React.useState(searchValue);

  const hasActiveFilters =
    localSearch !== '' ||
    statusValue !== 'all' ||
    riskLevelValue !== 'all' ||
    dateFrom !== '' ||
    dateTo !== '';

  const handleClear = () => {
    setLocalSearch('');
    setDateFrom('');
    setDateTo('');
    onSearchChange?.('');
    onStatusChange?.('all');
    onRiskLevelChange?.('all');
    onClear?.();
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLocalSearch(e.target.value);
    onSearchChange?.(e.target.value);
  };

  const handleDateFromChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setDateFrom(e.target.value);
    onDateRangeChange?.(e.target.value, dateTo);
  };

  const handleDateToChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setDateTo(e.target.value);
    onDateRangeChange?.(dateFrom, e.target.value);
  };

  return (
    <Card className={cn(className)}>
      <CardContent className="p-4">
        <div className="space-y-4">
          {/* Search and Quick Actions Row */}
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, email, or entity..."
                value={localSearch}
                onChange={handleSearchChange}
                className="pl-10"
              />
            </div>

            {/* Clear Filters Button */}
            {hasActiveFilters && (
              <Button
                variant="outline"
                onClick={handleClear}
                className="whitespace-nowrap"
              >
                <X className="h-4 w-4 mr-2" />
                Clear Filters
              </Button>
            )}
          </div>

          {/* Filter Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Status Filter */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Filter className="h-3 w-3" />
                Status
              </label>
              <select
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                value={statusValue}
                onChange={(e) => onStatusChange?.(e.target.value)}
              >
                <option value="all">All Status</option>
                <option value="CLEAR">Clear</option>
                <option value="FLAGGED">Flagged</option>
                <option value="PENDING">Pending</option>
              </select>
            </div>

            {/* Risk Level Filter */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Filter className="h-3 w-3" />
                Risk Level
              </label>
              <select
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                value={riskLevelValue}
                onChange={(e) => onRiskLevelChange?.(e.target.value)}
              >
                <option value="all">All Risk Levels</option>
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
                <option value="CRITICAL">Critical</option>
              </select>
            </div>

            {/* Date From */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Calendar className="h-3 w-3" />
                Date From
              </label>
              <input
                type="date"
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                value={dateFrom}
                onChange={handleDateFromChange}
              />
            </div>

            {/* Date To */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Calendar className="h-3 w-3" />
                Date To
              </label>
              <input
                type="date"
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                value={dateTo}
                onChange={handleDateToChange}
              />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
