'use client';

import * as React from 'react';
import Link from 'next/link';
import { LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

export interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: {
    label: string;
    href?: string;
    onClick?: () => void;
  };
  secondaryAction?: {
    label: string;
    href?: string;
    onClick?: () => void;
  };
  className?: string;
  variant?: 'default' | 'card' | 'inline';
  size?: 'sm' | 'md' | 'lg';
}

/**
 * EmptyState Component
 *
 * A reusable component for displaying empty states throughout the application.
 * Use this when:
 * - A list or grid has no items
 * - A search returns no results
 * - A user hasn't created any content yet
 * - First-time user experience screens
 */
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  secondaryAction,
  className,
  variant = 'default',
  size = 'md',
}: EmptyStateProps) {
  const sizeClasses = {
    sm: {
      container: 'py-8',
      icon: 'h-10 w-10',
      iconWrapper: 'h-16 w-16',
      title: 'text-base',
      description: 'text-sm',
    },
    md: {
      container: 'py-12',
      icon: 'h-12 w-12',
      iconWrapper: 'h-20 w-20',
      title: 'text-lg',
      description: 'text-sm',
    },
    lg: {
      container: 'py-16',
      icon: 'h-16 w-16',
      iconWrapper: 'h-24 w-24',
      title: 'text-xl',
      description: 'text-base',
    },
  };

  const content = (
    <div className={cn('text-center', sizeClasses[size].container, className)}>
      <div
        className={cn(
          'mx-auto rounded-full bg-muted flex items-center justify-center mb-4',
          sizeClasses[size].iconWrapper
        )}
      >
        <Icon className={cn('text-muted-foreground', sizeClasses[size].icon)} />
      </div>

      <h3 className={cn('font-semibold text-foreground mb-2', sizeClasses[size].title)}>
        {title}
      </h3>

      <p className={cn('text-muted-foreground mb-6 max-w-sm mx-auto', sizeClasses[size].description)}>
        {description}
      </p>

      {(action || secondaryAction) && (
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          {action && (
            action.href ? (
              <Link href={action.href}>
                <Button size={size === 'sm' ? 'sm' : 'default'}>
                  {action.label}
                </Button>
              </Link>
            ) : (
              <Button size={size === 'sm' ? 'sm' : 'default'} onClick={action.onClick}>
                {action.label}
              </Button>
            )
          )}
          {secondaryAction && (
            secondaryAction.href ? (
              <Link href={secondaryAction.href}>
                <Button variant="outline" size={size === 'sm' ? 'sm' : 'default'}>
                  {secondaryAction.label}
                </Button>
              </Link>
            ) : (
              <Button variant="outline" size={size === 'sm' ? 'sm' : 'default'} onClick={secondaryAction.onClick}>
                {secondaryAction.label}
              </Button>
            )
          )}
        </div>
      )}
    </div>
  );

  if (variant === 'card') {
    return (
      <Card>
        <CardContent className="p-6">{content}</CardContent>
      </Card>
    );
  }

  if (variant === 'inline') {
    return (
      <div className={cn('border rounded-lg bg-muted/30', className)}>
        {content}
      </div>
    );
  }

  return content;
}

export default EmptyState;
