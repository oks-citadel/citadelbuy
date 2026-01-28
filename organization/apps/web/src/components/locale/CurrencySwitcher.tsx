'use client';

/**
 * CurrencySwitcher Component
 *
 * Currency selector with popular currencies and full list
 */

import * as React from 'react';
import { Check, ChevronDown, DollarSign, Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useTenant } from '@/lib/tenant';
import {
  CURRENCIES,
  getPopularCurrencies,
  getAllCurrencies,
  type Currency,
} from '@/lib/i18n-edge/currency-map';

// ============================================================================
// Types
// ============================================================================

export interface CurrencySwitcherProps {
  className?: string;
  showSymbol?: boolean;
  showCode?: boolean;
  showSearch?: boolean;
  variant?: 'dropdown' | 'popover';
  align?: 'start' | 'center' | 'end';
  side?: 'top' | 'bottom' | 'left' | 'right';
}

// ============================================================================
// Currency Item Component
// ============================================================================

function CurrencyItem({
  currency,
  isSelected,
  onClick,
}: {
  currency: Currency;
  isSelected: boolean;
  onClick: () => void;
}) {
  return (
    <DropdownMenuItem
      onClick={onClick}
      className="flex items-center justify-between gap-2"
    >
      <div className="flex items-center gap-2">
        <span className="w-8 text-center font-mono text-sm">
          {currency.symbol}
        </span>
        <div className="flex flex-col">
          <span className="font-medium">{currency.code}</span>
          <span className="text-xs text-muted-foreground">{currency.name}</span>
        </div>
      </div>
      {isSelected && <Check className="h-4 w-4 text-primary" />}
    </DropdownMenuItem>
  );
}

// ============================================================================
// Dropdown Variant
// ============================================================================

function CurrencyDropdown({
  className,
  showSymbol,
  showCode,
  align,
  side,
  currency,
  currentCurrency,
  setCurrency,
}: {
  className?: string;
  showSymbol: boolean;
  showCode: boolean;
  align: 'start' | 'center' | 'end';
  side: 'top' | 'bottom' | 'left' | 'right';
  currency: string;
  currentCurrency: Currency;
  setCurrency: (currency: string) => void;
}) {
  const popularCurrencies = React.useMemo(() => getPopularCurrencies(), []);
  const allCurrencies = React.useMemo(() => getAllCurrencies(), []);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="default" className={cn('flex items-center gap-2', className)}>
          {showSymbol && (
            <span className="font-mono">{currentCurrency.symbol}</span>
          )}
          {showCode && <span>{currentCurrency.code}</span>}
          {!showSymbol && !showCode && (
            <>
              <DollarSign className="h-4 w-4" />
              <span>{currentCurrency.code}</span>
            </>
          )}
          <ChevronDown className="h-4 w-4 opacity-50" />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align={align} side={side} className="w-64">
        <DropdownMenuLabel className="flex items-center gap-2">
          <DollarSign className="h-4 w-4" />
          Select Currency
        </DropdownMenuLabel>
        <DropdownMenuSeparator />

        <DropdownMenuGroup>
          <DropdownMenuLabel className="text-xs text-muted-foreground">
            Popular Currencies
          </DropdownMenuLabel>
          {popularCurrencies.map((curr) => (
            <CurrencyItem
              key={curr.code}
              currency={curr}
              isSelected={curr.code === currency}
              onClick={() => setCurrency(curr.code)}
            />
          ))}
        </DropdownMenuGroup>

        <DropdownMenuSeparator />

        <DropdownMenuGroup>
          <DropdownMenuLabel className="text-xs text-muted-foreground">
            All Currencies
          </DropdownMenuLabel>
          <ScrollArea className="h-48">
            {allCurrencies
              .filter((c) => !popularCurrencies.find((p) => p.code === c.code))
              .map((curr) => (
                <CurrencyItem
                  key={curr.code}
                  currency={curr}
                  isSelected={curr.code === currency}
                  onClick={() => setCurrency(curr.code)}
                />
              ))}
          </ScrollArea>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// ============================================================================
// Popover Variant with Search
// ============================================================================

function CurrencyPopover({
  className,
  showSymbol,
  showCode,
  align,
  side,
  currency,
  currentCurrency,
  setCurrency,
}: {
  className?: string;
  showSymbol: boolean;
  showCode: boolean;
  align: 'start' | 'center' | 'end';
  side: 'top' | 'bottom' | 'left' | 'right';
  currency: string;
  currentCurrency: Currency;
  setCurrency: (currency: string) => void;
}) {
  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState('');

  const allCurrencies = React.useMemo(() => getAllCurrencies(), []);

  const filteredCurrencies = React.useMemo(() => {
    if (!search.trim()) return allCurrencies;

    const query = search.toLowerCase();
    return allCurrencies.filter(
      (curr) =>
        curr.code.toLowerCase().includes(query) ||
        curr.name.toLowerCase().includes(query) ||
        curr.symbol.includes(query)
    );
  }, [allCurrencies, search]);

  const handleSelect = React.useCallback(
    (currencyCode: string) => {
      setCurrency(currencyCode);
      setOpen(false);
      setSearch('');
    },
    [setCurrency]
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="default" className={cn('flex items-center gap-2', className)}>
          {showSymbol && (
            <span className="font-mono">{currentCurrency.symbol}</span>
          )}
          {showCode && <span>{currentCurrency.code}</span>}
          {!showSymbol && !showCode && (
            <>
              <DollarSign className="h-4 w-4" />
              <span>{currentCurrency.code}</span>
            </>
          )}
          <ChevronDown className="h-4 w-4 opacity-50" />
        </Button>
      </PopoverTrigger>

      <PopoverContent
        align={align}
        side={side}
        className="w-72 p-0"
      >
        <div className="p-3 border-b">
          <div className="flex items-center gap-2 text-sm font-medium mb-2">
            <DollarSign className="h-4 w-4" />
            Select Currency
          </div>
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search currencies..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8"
            />
          </div>
        </div>

        <ScrollArea className="h-64">
          <div className="p-2">
            {filteredCurrencies.length === 0 ? (
              <div className="py-6 text-center text-sm text-muted-foreground">
                No currencies found
              </div>
            ) : (
              filteredCurrencies.map((curr) => (
                <button
                  key={curr.code}
                  onClick={() => handleSelect(curr.code)}
                  className={cn(
                    'flex w-full items-center justify-between gap-2 rounded-sm px-2 py-1.5 text-sm outline-none',
                    'hover:bg-accent hover:text-accent-foreground',
                    'focus:bg-accent focus:text-accent-foreground',
                    curr.code === currency && 'bg-accent'
                  )}
                >
                  <div className="flex items-center gap-2">
                    <span className="w-8 text-center font-mono">
                      {curr.symbol}
                    </span>
                    <div className="flex flex-col items-start">
                      <span className="font-medium">{curr.code}</span>
                      <span className="text-xs text-muted-foreground">
                        {curr.name}
                      </span>
                    </div>
                  </div>
                  {curr.code === currency && (
                    <Check className="h-4 w-4 text-primary" />
                  )}
                </button>
              ))
            )}
          </div>
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function CurrencySwitcher({
  className,
  showSymbol = true,
  showCode = true,
  showSearch = false,
  variant = 'dropdown',
  align = 'end',
  side = 'bottom',
}: CurrencySwitcherProps) {
  const { currency, setCurrency } = useTenant();

  const currentCurrency = CURRENCIES[currency] || CURRENCIES.USD;

  const commonProps = {
    className,
    showSymbol,
    showCode,
    align,
    side,
    currency,
    currentCurrency,
    setCurrency,
  };

  if (variant === 'popover' || showSearch) {
    return <CurrencyPopover {...commonProps} />;
  }

  return <CurrencyDropdown {...commonProps} />;
}

// ============================================================================
// Exports
// ============================================================================

export default CurrencySwitcher;
