'use client';

import { Coins } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PointsDisplayProps {
  points: number;
  label?: string;
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
  className?: string;
}

const SIZE_CONFIG = {
  sm: {
    container: 'text-sm',
    icon: 'h-4 w-4',
    points: 'text-lg',
  },
  md: {
    container: 'text-base',
    icon: 'h-5 w-5',
    points: 'text-2xl',
  },
  lg: {
    container: 'text-lg',
    icon: 'h-6 w-6',
    points: 'text-3xl',
  },
};

export function PointsDisplay({
  points,
  label = 'Points',
  size = 'md',
  showIcon = true,
  className,
}: PointsDisplayProps) {
  const config = SIZE_CONFIG[size];

  return (
    <div className={cn('flex items-center gap-2', config.container, className)}>
      {showIcon && <Coins className={cn('text-yellow-500', config.icon)} />}
      <div className="flex flex-col">
        <span className={cn('font-bold tabular-nums', config.points)}>
          {points.toLocaleString()}
        </span>
        <span className="text-xs text-muted-foreground">{label}</span>
      </div>
    </div>
  );
}
