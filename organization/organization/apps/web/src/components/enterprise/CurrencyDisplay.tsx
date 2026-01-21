'use client';

import * as React from 'react';
import { DollarSign } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface Currency {
  code: string;
  symbol: string;
  name: string;
  decimals: number;
}

const currencies: Record<string, Currency> = {
  USD: { code: 'USD', symbol: '$', name: 'US Dollar', decimals: 2 },
  EUR: { code: 'EUR', symbol: '€', name: 'Euro', decimals: 2 },
  GBP: { code: 'GBP', symbol: '£', name: 'British Pound', decimals: 2 },
  JPY: { code: 'JPY', symbol: '¥', name: 'Japanese Yen', decimals: 0 },
  CNY: { code: 'CNY', symbol: '¥', name: 'Chinese Yuan', decimals: 2 },
  AUD: { code: 'AUD', symbol: 'A$', name: 'Australian Dollar', decimals: 2 },
  CAD: { code: 'CAD', symbol: 'C$', name: 'Canadian Dollar', decimals: 2 },
  CHF: { code: 'CHF', symbol: 'Fr', name: 'Swiss Franc', decimals: 2 },
  INR: { code: 'INR', symbol: '₹', name: 'Indian Rupee', decimals: 2 },
  BRL: { code: 'BRL', symbol: 'R$', name: 'Brazilian Real', decimals: 2 },
};

export interface CurrencyDisplayProps {
  amount: number;
  currency?: string;
  showCode?: boolean;
  showSymbol?: boolean;
  locale?: string;
  className?: string;
  variant?: 'default' | 'compact' | 'detailed';
}

export function CurrencyDisplay({
  amount,
  currency = 'USD',
  showCode = false,
  showSymbol = true,
  locale = 'en-US',
  className,
  variant = 'default',
}: CurrencyDisplayProps) {
  const currencyInfo = currencies[currency] || currencies.USD;

  const formatCurrency = (value: number): string => {
    const formatted = new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: currencyInfo.code,
      minimumFractionDigits: currencyInfo.decimals,
      maximumFractionDigits: currencyInfo.decimals,
    }).format(value);

    if (!showSymbol && showCode) {
      return `${value.toFixed(currencyInfo.decimals)} ${currencyInfo.code}`;
    }

    if (showSymbol && showCode) {
      return `${formatted} (${currencyInfo.code})`;
    }

    return formatted;
  };

  if (variant === 'compact') {
    return (
      <span className={cn('font-medium', className)}>
        {formatCurrency(amount)}
      </span>
    );
  }

  if (variant === 'detailed') {
    return (
      <div className={cn('flex items-center gap-2', className)}>
        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
          <DollarSign className="h-4 w-4 text-primary" />
        </div>
        <div>
          <p className="font-semibold">{formatCurrency(amount)}</p>
          <p className="text-xs text-muted-foreground">{currencyInfo.name}</p>
        </div>
      </div>
    );
  }

  return (
    <span className={cn('font-semibold', className)}>
      {formatCurrency(amount)}
    </span>
  );
}

export interface MultiCurrencyDisplayProps {
  amounts: Record<string, number>;
  className?: string;
}

export function MultiCurrencyDisplay({
  amounts,
  className,
}: MultiCurrencyDisplayProps) {
  return (
    <div className={cn('space-y-2', className)}>
      {Object.entries(amounts).map(([currency, amount]) => (
        <div key={currency} className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">
            {currencies[currency]?.name || currency}
          </span>
          <CurrencyDisplay amount={amount} currency={currency} variant="compact" />
        </div>
      ))}
    </div>
  );
}

export { currencies };
