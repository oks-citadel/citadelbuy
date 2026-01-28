'use client';

import React from 'react';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, Clock, XCircle, AlertCircle } from 'lucide-react';

export type KycStatus = 'pending' | 'in_review' | 'approved' | 'rejected' | 'incomplete';

interface KycStatusBadgeProps {
  status: KycStatus;
  className?: string;
}

const statusConfig: Record<
  KycStatus,
  {
    label: string;
    variant: 'default' | 'secondary' | 'success' | 'destructive' | 'warning';
    icon: React.ReactNode;
  }
> = {
  pending: {
    label: 'Pending',
    variant: 'secondary',
    icon: <Clock className="h-3 w-3" />,
  },
  in_review: {
    label: 'In Review',
    variant: 'default',
    icon: <Clock className="h-3 w-3" />,
  },
  approved: {
    label: 'Approved',
    variant: 'success',
    icon: <CheckCircle className="h-3 w-3" />,
  },
  rejected: {
    label: 'Rejected',
    variant: 'destructive',
    icon: <XCircle className="h-3 w-3" />,
  },
  incomplete: {
    label: 'Incomplete',
    variant: 'warning',
    icon: <AlertCircle className="h-3 w-3" />,
  },
};

export function KycStatusBadge({ status, className }: KycStatusBadgeProps) {
  const config = statusConfig[status];

  return (
    <Badge variant={config.variant} className={className}>
      {config.icon}
      <span className="ml-1">{config.label}</span>
    </Badge>
  );
}
