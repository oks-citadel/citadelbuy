/**
 * Broxiva Design System - Button Component
 * Premium luxury button with gold accents and smooth animations
 */

import React from 'react';
import { cn } from '../utils';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'accent' | 'secondary' | 'outline' | 'ghost' | 'link';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  fullWidth?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = 'primary',
      size = 'md',
      isLoading = false,
      leftIcon,
      rightIcon,
      fullWidth = false,
      disabled,
      children,
      ...props
    },
    ref
  ) => {
    // Base styles - Premium typography and transitions
    const baseStyles = `
      inline-flex items-center justify-center gap-2
      font-semibold tracking-wide
      rounded-lg
      transition-all duration-300 ease-out
      focus:outline-none focus:ring-4
      disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none
      active:scale-[0.98]
    `;

    // Variant styles
    const variantStyles = {
      primary: `
        bg-gradient-to-br from-primary-500 to-primary-700
        text-white
        shadow-lg shadow-primary-500/30
        hover:shadow-xl hover:shadow-primary-500/40
        hover:from-primary-600 hover:to-primary-800
        focus:ring-primary-500/20
        active:shadow-md
      `,
      accent: `
        bg-gradient-to-br from-accent-500 to-accent-700
        text-neutral-900
        shadow-lg shadow-accent-500/30
        hover:shadow-xl hover:shadow-accent-500/40
        hover:from-accent-600 hover:to-accent-800
        focus:ring-accent-500/20
        active:shadow-md
      `,
      secondary: `
        bg-neutral-100
        text-neutral-900
        border border-neutral-200
        shadow-sm
        hover:bg-neutral-200
        hover:border-neutral-300
        hover:shadow-md
        focus:ring-neutral-500/20
      `,
      outline: `
        bg-transparent
        text-primary-700
        border-2 border-primary-500
        hover:bg-primary-50
        hover:border-primary-700
        hover:shadow-md
        focus:ring-primary-500/20
      `,
      ghost: `
        bg-transparent
        text-neutral-700
        hover:bg-neutral-100
        hover:text-neutral-900
        focus:ring-neutral-500/20
      `,
      link: `
        bg-transparent
        text-primary-700
        underline-offset-4
        hover:underline
        hover:text-primary-900
        focus:ring-primary-500/20
        shadow-none
      `,
    };

    // Size styles
    const sizeStyles = {
      sm: 'h-8 px-3 text-sm',
      md: 'h-10 px-4 text-sm',
      lg: 'h-12 px-6 text-base',
      xl: 'h-14 px-8 text-lg',
    };

    // Loading spinner
    const LoadingSpinner = () => (
      <svg
        className="animate-spin h-4 w-4"
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
      >
        <circle
          className="opacity-25"
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          strokeWidth="4"
        />
        <path
          className="opacity-75"
          fill="currentColor"
          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
        />
      </svg>
    );

    return (
      <button
        ref={ref}
        className={cn(
          baseStyles,
          variantStyles[variant],
          sizeStyles[size],
          fullWidth && 'w-full',
          className
        )}
        disabled={disabled || isLoading}
        {...props}
      >
        {isLoading && <LoadingSpinner />}
        {!isLoading && leftIcon && <span className="flex-shrink-0">{leftIcon}</span>}
        <span>{children}</span>
        {!isLoading && rightIcon && <span className="flex-shrink-0">{rightIcon}</span>}
      </button>
    );
  }
);

Button.displayName = 'Button';

export default Button;
