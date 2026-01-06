/**
 * Broxiva Design System - Badge Component
 * Premium badges for promotions, labels, and status indicators
 */

import React from 'react';
import { cn } from '../utils';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'primary' | 'accent' | 'success' | 'warning' | 'error' | 'info' | 'neutral';
  size?: 'sm' | 'md' | 'lg';
  dot?: boolean;
  removable?: boolean;
  onRemove?: () => void;
}

const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
  (
    {
      className,
      variant = 'primary',
      size = 'md',
      dot = false,
      removable = false,
      onRemove,
      children,
      ...props
    },
    ref
  ) => {
    // Base styles
    const baseStyles = `
      inline-flex items-center gap-1.5
      font-medium
      rounded-full
      transition-all duration-200
    `;

    // Variant styles
    const variantStyles = {
      primary: `
        bg-primary-100
        text-primary-800
        border border-primary-200
      `,
      accent: `
        bg-accent-100
        text-accent-900
        border border-accent-200
      `,
      success: `
        bg-success-100
        text-success-800
        border border-success-200
      `,
      warning: `
        bg-warning-100
        text-warning-800
        border border-warning-200
      `,
      error: `
        bg-error-100
        text-error-800
        border border-error-200
      `,
      info: `
        bg-info-100
        text-info-800
        border border-info-200
      `,
      neutral: `
        bg-neutral-100
        text-neutral-800
        border border-neutral-200
      `,
    };

    // Size styles
    const sizeStyles = {
      sm: 'px-2 py-0.5 text-xs',
      md: 'px-2.5 py-1 text-sm',
      lg: 'px-3 py-1.5 text-base',
    };

    // Dot color mapping
    const dotColors = {
      primary: 'bg-primary-500',
      accent: 'bg-accent-500',
      success: 'bg-success-500',
      warning: 'bg-warning-500',
      error: 'bg-error-500',
      info: 'bg-info-500',
      neutral: 'bg-neutral-500',
    };

    // Dot sizes
    const dotSizes = {
      sm: 'h-1.5 w-1.5',
      md: 'h-2 w-2',
      lg: 'h-2.5 w-2.5',
    };

    return (
      <span
        ref={ref}
        className={cn(
          baseStyles,
          variantStyles[variant],
          sizeStyles[size],
          className
        )}
        {...props}
      >
        {dot && (
          <span
            className={cn(
              'rounded-full',
              dotColors[variant],
              dotSizes[size]
            )}
          />
        )}
        {children}
        {removable && onRemove && (
          <button
            type="button"
            onClick={onRemove}
            className="ml-0.5 hover:opacity-70 transition-opacity focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-current rounded-sm"
            aria-label="Remove badge"
          >
            <svg
              className="h-3 w-3"
              fill="currentColor"
              viewBox="0 0 20 20"
              aria-hidden="true"
            >
              <path
                fillRule="evenodd"
                d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                clipRule="evenodd"
              />
            </svg>
          </button>
        )}
      </span>
    );
  }
);

Badge.displayName = 'Badge';

export default Badge;
