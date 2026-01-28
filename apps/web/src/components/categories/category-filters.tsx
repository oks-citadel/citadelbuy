'use client';

import * as React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronDown,
  ChevronUp,
  X,
  SlidersHorizontal,
  Check,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CategoryFilter } from '@/stores/category-store';
import { cn } from '@/lib/utils';

interface FilterState {
  [key: string]: any;
}

interface CategoryFiltersProps {
  filters: CategoryFilter[];
  activeFilters: FilterState;
  onFilterChange: (filters: FilterState) => void;
  onClearFilters: () => void;
  className?: string;
}

export function CategoryFilters({
  filters,
  activeFilters,
  onFilterChange,
  onClearFilters,
  className,
}: CategoryFiltersProps) {
  const [expandedFilters, setExpandedFilters] = React.useState<string[]>(
    filters.slice(0, 3).map((f) => f.id)
  );

  const activeCount = Object.keys(activeFilters).filter(
    (key) => activeFilters[key] !== undefined && activeFilters[key] !== null
  ).length;

  const toggleFilter = (filterId: string) => {
    setExpandedFilters((prev) =>
      prev.includes(filterId)
        ? prev.filter((id) => id !== filterId)
        : [...prev, filterId]
    );
  };

  const handleFilterChange = (filterId: string, value: any) => {
    const newFilters = { ...activeFilters };
    if (value === undefined || value === null || (Array.isArray(value) && value.length === 0)) {
      delete newFilters[filterId];
    } else {
      newFilters[filterId] = value;
    }
    onFilterChange(newFilters);
  };

  return (
    <div className={cn('space-y-4', className)}>
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b">
        <div className="flex items-center gap-2">
          <SlidersHorizontal className="h-5 w-5" />
          <span className="font-semibold">Filters</span>
          {activeCount > 0 && (
            <span className="px-2 py-0.5 bg-primary text-primary-foreground text-xs rounded-full">
              {activeCount}
            </span>
          )}
        </div>
        {activeCount > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onClearFilters}
            className="text-muted-foreground hover:text-foreground"
          >
            Clear All
          </Button>
        )}
      </div>

      {/* Filter Sections */}
      <div className="space-y-2">
        {filters.map((filter) => (
          <FilterSection
            key={filter.id}
            filter={filter}
            isExpanded={expandedFilters.includes(filter.id)}
            onToggle={() => toggleFilter(filter.id)}
            value={activeFilters[filter.id]}
            onChange={(value) => handleFilterChange(filter.id, value)}
          />
        ))}
      </div>
    </div>
  );
}

// Individual Filter Section
function FilterSection({
  filter,
  isExpanded,
  onToggle,
  value,
  onChange,
}: {
  filter: CategoryFilter;
  isExpanded: boolean;
  onToggle: () => void;
  value: any;
  onChange: (value: any) => void;
}) {
  return (
    <div className="border rounded-lg overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between p-3 hover:bg-accent transition-colors"
      >
        <span className="font-medium text-sm">{filter.name}</span>
        {isExpanded ? (
          <ChevronUp className="h-4 w-4 text-muted-foreground" />
        ) : (
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        )}
      </button>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="p-3 pt-0">
              {filter.type === 'SELECT' && (
                <SelectFilter
                  options={filter.options || []}
                  value={value}
                  onChange={onChange}
                />
              )}
              {filter.type === 'MULTI_SELECT' && (
                <MultiSelectFilter
                  options={filter.options || []}
                  value={value || []}
                  onChange={onChange}
                />
              )}
              {filter.type === 'RANGE' && (
                <RangeFilter
                  min={filter.min || 0}
                  max={filter.max || 1000}
                  value={value || { min: filter.min, max: filter.max }}
                  onChange={onChange}
                />
              )}
              {filter.type === 'BOOLEAN' && (
                <BooleanFilter value={value} onChange={onChange} />
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Select Filter (Single Choice)
function SelectFilter({
  options,
  value,
  onChange,
}: {
  options: string[];
  value: string;
  onChange: (value: string | undefined) => void;
}) {
  return (
    <div className="space-y-1.5 max-h-48 overflow-y-auto">
      {options.map((option) => (
        <button
          key={option}
          onClick={() => onChange(value === option ? undefined : option)}
          className={cn(
            'w-full flex items-center gap-2 px-2 py-1.5 rounded text-sm text-left transition-colors',
            value === option
              ? 'bg-primary/10 text-primary'
              : 'hover:bg-accent'
          )}
        >
          <div
            className={cn(
              'w-4 h-4 rounded-full border flex items-center justify-center',
              value === option ? 'border-primary bg-primary' : 'border-muted-foreground'
            )}
          >
            {value === option && <Check className="h-3 w-3 text-primary-foreground" />}
          </div>
          <span>{option}</span>
        </button>
      ))}
    </div>
  );
}

// Multi-Select Filter (Multiple Choice)
function MultiSelectFilter({
  options,
  value,
  onChange,
}: {
  options: string[];
  value: string[];
  onChange: (value: string[]) => void;
}) {
  const toggleOption = (option: string) => {
    if (value.includes(option)) {
      onChange(value.filter((v) => v !== option));
    } else {
      onChange([...value, option]);
    }
  };

  return (
    <div className="space-y-1.5 max-h-48 overflow-y-auto">
      {options.map((option) => (
        <button
          key={option}
          onClick={() => toggleOption(option)}
          className={cn(
            'w-full flex items-center gap-2 px-2 py-1.5 rounded text-sm text-left transition-colors',
            value.includes(option)
              ? 'bg-primary/10 text-primary'
              : 'hover:bg-accent'
          )}
        >
          <div
            className={cn(
              'w-4 h-4 rounded border flex items-center justify-center',
              value.includes(option)
                ? 'border-primary bg-primary'
                : 'border-muted-foreground'
            )}
          >
            {value.includes(option) && (
              <Check className="h-3 w-3 text-primary-foreground" />
            )}
          </div>
          <span>{option}</span>
        </button>
      ))}
    </div>
  );
}

// Range Filter (Price, etc.)
function RangeFilter({
  min,
  max,
  value,
  onChange,
}: {
  min: number;
  max: number;
  value: { min?: number; max?: number };
  onChange: (value: { min?: number; max?: number }) => void;
}) {
  const [localMin, setLocalMin] = React.useState(value.min?.toString() || '');
  const [localMax, setLocalMax] = React.useState(value.max?.toString() || '');

  const handleApply = () => {
    const newValue: { min?: number; max?: number } = {};
    if (localMin) newValue.min = parseFloat(localMin);
    if (localMax) newValue.max = parseFloat(localMax);
    onChange(newValue);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <div className="flex-1">
          <label className="text-xs text-muted-foreground mb-1 block">Min</label>
          <Input
            type="number"
            placeholder={min.toString()}
            value={localMin}
            onChange={(e) => setLocalMin(e.target.value)}
            className="h-8 text-sm"
          />
        </div>
        <span className="text-muted-foreground mt-5">-</span>
        <div className="flex-1">
          <label className="text-xs text-muted-foreground mb-1 block">Max</label>
          <Input
            type="number"
            placeholder={max.toString()}
            value={localMax}
            onChange={(e) => setLocalMax(e.target.value)}
            className="h-8 text-sm"
          />
        </div>
      </div>
      <Button size="sm" onClick={handleApply} className="w-full">
        Apply
      </Button>
    </div>
  );
}

// Boolean Filter (Toggle)
function BooleanFilter({
  value,
  onChange,
}: {
  value: boolean | undefined;
  onChange: (value: boolean | undefined) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <button
        onClick={() => onChange(value === true ? undefined : true)}
        className={cn(
          'flex-1 py-2 px-3 rounded text-sm font-medium transition-colors',
          value === true
            ? 'bg-primary text-primary-foreground'
            : 'bg-muted hover:bg-accent'
        )}
      >
        Yes
      </button>
      <button
        onClick={() => onChange(value === false ? undefined : false)}
        className={cn(
          'flex-1 py-2 px-3 rounded text-sm font-medium transition-colors',
          value === false
            ? 'bg-primary text-primary-foreground'
            : 'bg-muted hover:bg-accent'
        )}
      >
        No
      </button>
    </div>
  );
}

// Mobile Filter Modal
interface MobileFiltersProps extends CategoryFiltersProps {
  isOpen: boolean;
  onClose: () => void;
}

export function MobileFilters({
  isOpen,
  onClose,
  ...filterProps
}: MobileFiltersProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-40"
            onClick={onClose}
          />

          {/* Drawer */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed right-0 top-0 bottom-0 w-full max-w-sm bg-background z-50 shadow-xl"
          >
            <div className="flex flex-col h-full">
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b">
                <span className="font-semibold text-lg">Filters</span>
                <Button variant="ghost" size="icon" onClick={onClose}>
                  <X className="h-5 w-5" />
                </Button>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto p-4">
                <CategoryFilters {...filterProps} />
              </div>

              {/* Footer */}
              <div className="p-4 border-t bg-background">
                <Button className="w-full" onClick={onClose}>
                  Show Results
                </Button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// Active Filters Tags
export function ActiveFilterTags({
  filters,
  activeFilters,
  onRemove,
  onClearAll,
  className,
}: {
  filters: CategoryFilter[];
  activeFilters: FilterState;
  onRemove: (filterId: string, value?: string) => void;
  onClearAll: () => void;
  className?: string;
}) {
  const activeFilterEntries = Object.entries(activeFilters).filter(
    ([, value]) => value !== undefined && value !== null
  );

  if (activeFilterEntries.length === 0) return null;

  return (
    <div className={cn('flex flex-wrap items-center gap-2', className)}>
      <span className="text-sm text-muted-foreground">Active filters:</span>
      {activeFilterEntries.map(([filterId, value]) => {
        const filter = filters.find((f) => f.id === filterId);
        if (!filter) return null;

        if (Array.isArray(value)) {
          return value.map((v) => (
            <FilterTag
              key={`${filterId}-${v}`}
              label={`${filter.name}: ${v}`}
              onRemove={() => onRemove(filterId, v)}
            />
          ));
        }

        let displayValue: string = String(value);
        if (typeof value === 'object' && value !== null && 'min' in value) {
          const rangeValue = value as { min?: number; max?: number };
          displayValue = `$${rangeValue.min || 0} - $${rangeValue.max || '∞'}`;
        } else if (typeof value === 'boolean') {
          displayValue = value ? 'Yes' : 'No';
        }

        return (
          <FilterTag
            key={filterId}
            label={`${filter.name}: ${displayValue}`}
            onRemove={() => onRemove(filterId)}
          />
        );
      })}
      <button
        onClick={onClearAll}
        className="text-sm text-primary hover:underline"
      >
        Clear all
      </button>
    </div>
  );
}

function FilterTag({
  label,
  onRemove,
}: {
  label: string;
  onRemove: () => void;
}) {
  return (
    <span className="inline-flex items-center gap-1 px-2 py-1 bg-muted rounded-full text-sm">
      {label}
      <button
        onClick={onRemove}
        className="p-0.5 hover:bg-accent rounded-full transition-colors"
      >
        <X className="h-3 w-3" />
      </button>
    </span>
  );
}
