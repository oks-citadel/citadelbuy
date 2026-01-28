'use client';

import * as React from 'react';
import { Shield, CheckCircle, AlertTriangle, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

export type ComplianceStatus = 'compliant' | 'pending' | 'non_compliant' | 'expiring_soon';

export interface ComplianceCertification {
  id: string;
  name: string;
  status: ComplianceStatus;
  issuer?: string;
  validUntil?: string;
  region?: string;
  description?: string;
}

export interface ComplianceBadgeProps {
  certification: ComplianceCertification;
  variant?: 'default' | 'compact' | 'detailed';
  showDetails?: boolean;
  className?: string;
  onClick?: () => void;
}

const statusConfig = {
  compliant: {
    icon: CheckCircle,
    label: 'Compliant',
    color: 'text-green-600',
    bgColor: 'bg-green-100',
  },
  pending: {
    icon: AlertTriangle,
    label: 'Pending',
    color: 'text-yellow-600',
    bgColor: 'bg-yellow-100',
  },
  non_compliant: {
    icon: XCircle,
    label: 'Non-Compliant',
    color: 'text-red-600',
    bgColor: 'bg-red-100',
  },
  expiring_soon: {
    icon: AlertTriangle,
    label: 'Expiring Soon',
    color: 'text-orange-600',
    bgColor: 'bg-orange-100',
  },
};

export function ComplianceBadge({
  certification,
  variant = 'default',
  showDetails = false,
  className,
  onClick,
}: ComplianceBadgeProps) {
  const config = statusConfig[certification.status];
  const Icon = config.icon;

  if (variant === 'compact') {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={onClick}
              className={cn(
                'inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium',
                config.bgColor,
                config.color,
                onClick && 'cursor-pointer hover:opacity-80',
                className
              )}
            >
              <Icon className="h-3 w-3" />
              <span>{certification.name}</span>
            </button>
          </TooltipTrigger>
          <TooltipContent>
            <p className="font-medium">{certification.name}</p>
            <p className="text-xs text-muted-foreground mt-1">
              Status: {config.label}
            </p>
            {certification.validUntil && (
              <p className="text-xs text-muted-foreground">
                Valid until: {certification.validUntil}
              </p>
            )}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  if (variant === 'detailed') {
    return (
      <div
        onClick={onClick}
        className={cn(
          'p-4 border rounded-lg',
          onClick && 'cursor-pointer hover:bg-muted/50',
          className
        )}
      >
        <div className="flex items-start gap-3">
          <div className={cn('h-10 w-10 rounded-full flex items-center justify-center', config.bgColor)}>
            <Icon className={cn('h-5 w-5', config.color)} />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h4 className="font-semibold">{certification.name}</h4>
              <span className={cn('px-2 py-0.5 rounded-full text-xs font-medium', config.bgColor, config.color)}>
                {config.label}
              </span>
            </div>
            {certification.description && (
              <p className="text-sm text-muted-foreground mb-2">
                {certification.description}
              </p>
            )}
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              {certification.issuer && (
                <span>Issued by: {certification.issuer}</span>
              )}
              {certification.region && (
                <span>Region: {certification.region}</span>
              )}
              {certification.validUntil && (
                <span>Valid until: {certification.validUntil}</span>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Default variant
  return (
    <div
      onClick={onClick}
      className={cn(
        'inline-flex items-center gap-2 px-3 py-2 border rounded-lg',
        onClick && 'cursor-pointer hover:bg-muted/50',
        className
      )}
    >
      <Icon className={cn('h-4 w-4', config.color)} />
      <div className="flex items-center gap-2">
        <span className="font-medium">{certification.name}</span>
        <span className={cn('px-2 py-0.5 rounded-full text-xs font-medium', config.bgColor, config.color)}>
          {config.label}
        </span>
      </div>
    </div>
  );
}

export interface ComplianceBadgeGroupProps {
  certifications: ComplianceCertification[];
  max?: number;
  variant?: 'default' | 'compact' | 'detailed';
  className?: string;
}

export function ComplianceBadgeGroup({
  certifications,
  max = 3,
  variant = 'compact',
  className,
}: ComplianceBadgeGroupProps) {
  const displayCerts = certifications.slice(0, max);
  const remaining = certifications.length - max;

  return (
    <div className={cn('flex flex-wrap gap-2', className)}>
      {displayCerts.map((cert) => (
        <ComplianceBadge key={cert.id} certification={cert} variant={variant} />
      ))}
      {remaining > 0 && (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <button className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-muted text-muted-foreground hover:bg-muted/80">
                <Shield className="h-3 w-3" />
                +{remaining} more
              </button>
            </TooltipTrigger>
            <TooltipContent>
              <div className="space-y-1">
                {certifications.slice(max).map((cert) => (
                  <p key={cert.id} className="text-xs">{cert.name}</p>
                ))}
              </div>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}
    </div>
  );
}
