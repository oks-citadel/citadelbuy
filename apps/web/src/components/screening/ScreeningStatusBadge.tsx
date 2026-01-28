'use client';

import * as React from 'react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { CheckCircle2, AlertTriangle, Clock } from 'lucide-react';

export type ScreeningStatus = 'CLEAR' | 'FLAGGED' | 'PENDING';

interface ScreeningStatusBadgeProps {
  status: ScreeningStatus;
  className?: string;
  showIcon?: boolean;
}

export function ScreeningStatusBadge({
  status,
  className,
  showIcon = true,
}: ScreeningStatusBadgeProps) {
  const getStatusConfig = (status: ScreeningStatus) => {
    const configs = {
      CLEAR: {
        variant: 'success' as const,
        label: 'Clear',
        icon: CheckCircle2,
        className: 'bg-green-100 text-green-800 border-green-200',
      },
      FLAGGED: {
        variant: 'destructive' as const,
        label: 'Flagged',
        icon: AlertTriangle,
        className: 'bg-red-100 text-red-800 border-red-200',
      },
      PENDING: {
        variant: 'warning' as const,
        label: 'Pending',
        icon: Clock,
        className: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      },
    };
    return configs[status];
  };

  const config = getStatusConfig(status);
  const Icon = config.icon;

  return (
    <Badge
      variant={config.variant}
      className={cn(config.className, className)}
    >
      {showIcon && <Icon className="h-3 w-3" />}
      {config.label}
    </Badge>
  );
}
