'use client';

import React, { useState } from 'react';
import { Search, Filter, X, Calendar as CalendarIcon } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import {
  Card,
  CardContent,
} from '@/components/ui/card';
import { cn } from '@/lib/utils';

export interface AuditFilterOptions {
  search?: string;
  actionType?: string;
  userId?: string;
  dateFrom?: string;
  dateTo?: string;
}

interface AuditFiltersProps {
  filters: AuditFilterOptions;
  onFiltersChange: (filters: AuditFilterOptions) => void;
  users?: Array<{ id: string; name: string }>;
  className?: string;
}

const actionTypes = [
  { value: 'all', label: 'All Actions' },
  { value: 'create', label: 'Create' },
  { value: 'update', label: 'Update' },
  { value: 'delete', label: 'Delete' },
  { value: 'login', label: 'Login' },
  { value: 'logout', label: 'Logout' },
  { value: 'invite', label: 'Invite' },
  { value: 'export', label: 'Export' },
];

export function AuditFilters({
  filters,
  onFiltersChange,
  users = [],
  className,
}: AuditFiltersProps) {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [localFilters, setLocalFilters] = useState<AuditFilterOptions>(filters);

  const handleSearchChange = (value: string) => {
    const newFilters = { ...localFilters, search: value };
    setLocalFilters(newFilters);
    onFiltersChange(newFilters);
  };

  const handleFilterChange = (key: keyof AuditFilterOptions, value: string) => {
    const newFilters = {
      ...localFilters,
      [key]: value === 'all' ? undefined : value,
    };
    setLocalFilters(newFilters);
    onFiltersChange(newFilters);
  };

  const handleClearFilters = () => {
    const clearedFilters: AuditFilterOptions = {};
    setLocalFilters(clearedFilters);
    onFiltersChange(clearedFilters);
  };

  const activeFilterCount = Object.values(localFilters).filter(
    (v) => v !== undefined && v !== ''
  ).length;

  const hasActiveFilters = activeFilterCount > 0;

  return (
    <div className={cn('space-y-4', className)}>
      {/* Search and Quick Actions */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search logs..."
            value={localFilters.search || ''}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex gap-2">
          <Button
            variant={showAdvanced ? 'default' : 'outline'}
            onClick={() => setShowAdvanced(!showAdvanced)}
            leftIcon={<Filter className="h-4 w-4" />}
          >
            Filters
            {activeFilterCount > 0 && (
              <Badge
                variant="secondary"
                className="ml-2 h-5 w-5 rounded-full p-0 flex items-center justify-center"
              >
                {activeFilterCount}
              </Badge>
            )}
          </Button>
          {hasActiveFilters && (
            <Button
              variant="ghost"
              onClick={handleClearFilters}
              leftIcon={<X className="h-4 w-4" />}
            >
              Clear
            </Button>
          )}
        </div>
      </div>

      {/* Advanced Filters */}
      {showAdvanced && (
        <Card>
          <CardContent className="p-4">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              {/* Action Type */}
              <div className="space-y-2">
                <Label htmlFor="action-type">Action Type</Label>
                <Select
                  value={localFilters.actionType || 'all'}
                  onValueChange={(value) =>
                    handleFilterChange('actionType', value)
                  }
                >
                  <SelectTrigger id="action-type">
                    <SelectValue placeholder="Select action" />
                  </SelectTrigger>
                  <SelectContent>
                    {actionTypes.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* User */}
              <div className="space-y-2">
                <Label htmlFor="user">User</Label>
                <Select
                  value={localFilters.userId || 'all'}
                  onValueChange={(value) => handleFilterChange('userId', value)}
                >
                  <SelectTrigger id="user">
                    <SelectValue placeholder="Select user" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Users</SelectItem>
                    {users.map((user) => (
                      <SelectItem key={user.id} value={user.id}>
                        {user.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Date From */}
              <div className="space-y-2">
                <Label htmlFor="date-from">From Date</Label>
                <div className="relative">
                  <CalendarIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="date-from"
                    type="date"
                    value={localFilters.dateFrom || ''}
                    onChange={(e) =>
                      handleFilterChange('dateFrom', e.target.value)
                    }
                    className="pl-10"
                  />
                </div>
              </div>

              {/* Date To */}
              <div className="space-y-2">
                <Label htmlFor="date-to">To Date</Label>
                <div className="relative">
                  <CalendarIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="date-to"
                    type="date"
                    value={localFilters.dateTo || ''}
                    onChange={(e) =>
                      handleFilterChange('dateTo', e.target.value)
                    }
                    className="pl-10"
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Active Filters Display */}
      {hasActiveFilters && (
        <div className="flex flex-wrap gap-2">
          {localFilters.search && (
            <Badge variant="secondary" className="gap-2">
              Search: {localFilters.search}
              <button
                onClick={() => handleSearchChange('')}
                className="hover:bg-destructive/20 rounded-full"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
          {localFilters.actionType && (
            <Badge variant="secondary" className="gap-2">
              Action:{' '}
              {actionTypes.find((t) => t.value === localFilters.actionType)
                ?.label}
              <button
                onClick={() => handleFilterChange('actionType', 'all')}
                className="hover:bg-destructive/20 rounded-full"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
          {localFilters.userId && (
            <Badge variant="secondary" className="gap-2">
              User: {users.find((u) => u.id === localFilters.userId)?.name}
              <button
                onClick={() => handleFilterChange('userId', 'all')}
                className="hover:bg-destructive/20 rounded-full"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
          {localFilters.dateFrom && (
            <Badge variant="secondary" className="gap-2">
              From: {localFilters.dateFrom}
              <button
                onClick={() => handleFilterChange('dateFrom', '')}
                className="hover:bg-destructive/20 rounded-full"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
          {localFilters.dateTo && (
            <Badge variant="secondary" className="gap-2">
              To: {localFilters.dateTo}
              <button
                onClick={() => handleFilterChange('dateTo', '')}
                className="hover:bg-destructive/20 rounded-full"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
        </div>
      )}
    </div>
  );
}
