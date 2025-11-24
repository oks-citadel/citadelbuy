'use client';

import { cn } from '@/lib/utils';
import { DealType } from '@/lib/api/deals';
import { Zap, Percent, Gift, Star, Calendar, Package } from 'lucide-react';

interface DealBadgeProps {
  type: DealType;
  customBadge?: string | null;
  customColor?: string | null;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const DEAL_TYPE_CONFIG: Record<
  DealType,
  {
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    color: string;
    bgColor: string;
    borderColor: string;
  }
> = {
  [DealType.FLASH_SALE]: {
    label: 'FLASH SALE',
    icon: Zap,
    color: 'text-yellow-900',
    bgColor: 'bg-yellow-100',
    borderColor: 'border-yellow-400',
  },
  [DealType.DAILY_DEAL]: {
    label: 'DAILY DEAL',
    icon: Calendar,
    color: 'text-blue-900',
    bgColor: 'bg-blue-100',
    borderColor: 'border-blue-400',
  },
  [DealType.BUNDLE_DEAL]: {
    label: 'BUNDLE',
    icon: Package,
    color: 'text-purple-900',
    bgColor: 'bg-purple-100',
    borderColor: 'border-purple-400',
  },
  [DealType.BOGO]: {
    label: 'BOGO',
    icon: Gift,
    color: 'text-green-900',
    bgColor: 'bg-green-100',
    borderColor: 'border-green-400',
  },
  [DealType.PERCENTAGE_DISCOUNT]: {
    label: 'DISCOUNT',
    icon: Percent,
    color: 'text-red-900',
    bgColor: 'bg-red-100',
    borderColor: 'border-red-400',
  },
  [DealType.FIXED_DISCOUNT]: {
    label: 'SAVE $',
    icon: Percent,
    color: 'text-orange-900',
    bgColor: 'bg-orange-100',
    borderColor: 'border-orange-400',
  },
  [DealType.VOLUME_DISCOUNT]: {
    label: 'VOLUME SALE',
    icon: Package,
    color: 'text-indigo-900',
    bgColor: 'bg-indigo-100',
    borderColor: 'border-indigo-400',
  },
  [DealType.SEASONAL_SALE]: {
    label: 'SEASONAL',
    icon: Star,
    color: 'text-pink-900',
    bgColor: 'bg-pink-100',
    borderColor: 'border-pink-400',
  },
};

const SIZE_CONFIG = {
  sm: {
    container: 'px-2 py-0.5 text-[10px]',
    icon: 'h-3 w-3',
  },
  md: {
    container: 'px-2.5 py-1 text-xs',
    icon: 'h-3.5 w-3.5',
  },
  lg: {
    container: 'px-3 py-1.5 text-sm',
    icon: 'h-4 w-4',
  },
};

export function DealBadge({
  type,
  customBadge,
  customColor,
  size = 'md',
  className,
}: DealBadgeProps) {
  const config = DEAL_TYPE_CONFIG[type];
  const sizeConfig = SIZE_CONFIG[size];
  const Icon = config.icon;

  const label = customBadge || config.label;

  // Use custom color if provided
  const style = customColor
    ? {
        backgroundColor: `${customColor}20`,
        borderColor: customColor,
        color: customColor,
      }
    : undefined;

  return (
    <div
      className={cn(
        'inline-flex items-center gap-1 rounded-md border font-bold uppercase tracking-wide',
        !customColor && config.bgColor,
        !customColor && config.color,
        !customColor && config.borderColor,
        sizeConfig.container,
        className,
      )}
      style={style}
    >
      <Icon className={sizeConfig.icon} />
      <span>{label}</span>
    </div>
  );
}
