'use client';

import React from 'react';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, XCircle, Clock, Phone, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

export type PhoneVerificationStatus = 'verified' | 'unverified' | 'pending' | 'failed';

interface PhoneVerificationStatusProps {
  status: PhoneVerificationStatus;
  phoneNumber?: string;
  className?: string;
  showIcon?: boolean;
  size?: 'sm' | 'default' | 'lg';
}

const statusConfig: Record<
  PhoneVerificationStatus,
  {
    label: string;
    variant: 'default' | 'secondary' | 'success' | 'destructive' | 'warning';
    icon: React.ReactNode;
    description: string;
  }
> = {
  verified: {
    label: 'Verified',
    variant: 'success',
    icon: <CheckCircle className="h-3 w-3" />,
    description: 'Phone number verified',
  },
  unverified: {
    label: 'Not Verified',
    variant: 'secondary',
    icon: <XCircle className="h-3 w-3" />,
    description: 'Phone number not verified',
  },
  pending: {
    label: 'Pending',
    variant: 'warning',
    icon: <Clock className="h-3 w-3" />,
    description: 'Verification pending',
  },
  failed: {
    label: 'Verification Failed',
    variant: 'destructive',
    icon: <AlertCircle className="h-3 w-3" />,
    description: 'Verification failed',
  },
};

export function PhoneVerificationStatus({
  status,
  phoneNumber,
  className,
  showIcon = true,
  size = 'default',
}: PhoneVerificationStatusProps) {
  const config = statusConfig[status];

  return (
    <div className={cn('inline-flex items-center gap-2', className)}>
      <Badge variant={config.variant} size={size} className="gap-1">
        {showIcon && config.icon}
        <span>{config.label}</span>
      </Badge>
      {phoneNumber && (
        <span className="text-sm text-muted-foreground flex items-center gap-1">
          <Phone className="h-3 w-3" />
          {phoneNumber}
        </span>
      )}
    </div>
  );
}

interface PhoneVerificationCardStatusProps {
  status: PhoneVerificationStatus;
  phoneNumber?: string;
  className?: string;
}

export function PhoneVerificationCardStatus({
  status,
  phoneNumber,
  className,
}: PhoneVerificationCardStatusProps) {
  const config = statusConfig[status];

  const bgColor = {
    verified: 'bg-green-50 border-green-200',
    unverified: 'bg-gray-50 border-gray-200',
    pending: 'bg-amber-50 border-amber-200',
    failed: 'bg-red-50 border-red-200',
  }[status];

  const iconColor = {
    verified: 'text-green-600',
    unverified: 'text-gray-600',
    pending: 'text-amber-600',
    failed: 'text-red-600',
  }[status];

  return (
    <div
      className={cn(
        'flex items-start gap-3 p-4 rounded-lg border',
        bgColor,
        className
      )}
    >
      <div className={cn('mt-0.5', iconColor)}>
        {React.cloneElement(config.icon as React.ReactElement, {
          className: 'h-5 w-5',
        })}
      </div>
      <div className="flex-1 space-y-1">
        <div className="flex items-center gap-2">
          <p className="font-medium text-sm">{config.label}</p>
          {phoneNumber && (
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Phone className="h-3 w-3" />
              {phoneNumber}
            </span>
          )}
        </div>
        <p className="text-xs text-muted-foreground">{config.description}</p>
      </div>
    </div>
  );
}
