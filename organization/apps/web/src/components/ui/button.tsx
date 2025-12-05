'use client';

import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg font-semibold transition-all duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-violet-500 disabled:pointer-events-none disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98] [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        default:
          'bg-gradient-to-br from-violet-600 to-violet-700 text-white shadow-md hover:shadow-violet-400/40 hover:shadow-lg hover:-translate-y-0.5 hover:brightness-110',
        secondary:
          'bg-slate-800 text-white shadow-md hover:bg-slate-700 hover:shadow-lg hover:-translate-y-0.5',
        outline:
          'bg-transparent border-2 border-violet-600 text-violet-600 hover:bg-violet-50 hover:shadow-md hover:-translate-y-0.5',
        ghost:
          'bg-transparent text-slate-700 hover:text-violet-600 hover:bg-violet-50',
        destructive:
          'bg-rose-500 text-white shadow-md hover:bg-rose-600 hover:shadow-lg hover:shadow-rose-400/30 hover:-translate-y-0.5',
        success:
          'bg-emerald-500 text-white shadow-md hover:bg-emerald-600 hover:shadow-lg hover:shadow-emerald-400/30 hover:-translate-y-0.5',
        link:
          'text-violet-600 underline-offset-4 hover:underline hover:text-violet-700',
        gradient:
          'bg-gradient-to-r from-violet-600 via-purple-600 to-fuchsia-600 text-white shadow-lg hover:shadow-xl hover:shadow-violet-400/50 hover:-translate-y-0.5 hover:brightness-110 animate-gradient bg-[length:200%_auto]',
      },
      size: {
        xs: 'h-7 px-2.5 text-xs rounded-md',
        sm: 'h-9 px-3 text-sm',
        default: 'h-11 px-5 text-base',
        lg: 'h-[52px] px-7 text-lg',
        xl: 'h-14 px-8 text-xl',
        icon: 'h-10 w-10',
        'icon-sm': 'h-8 w-8',
        'icon-lg': 'h-12 w-12',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  loading?: boolean;
  isLoading?: boolean;
  loadingText?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant,
      size,
      asChild = false,
      loading = false,
      isLoading = false,
      loadingText,
      leftIcon,
      rightIcon,
      children,
      disabled,
      ...props
    },
    ref
  ) => {
    const Comp = asChild ? Slot : 'button';
    const showLoading = loading || isLoading;

    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        disabled={disabled || showLoading}
        {...props}
      >
        {showLoading ? (
          <>
            <Loader2 className="animate-spin" />
            {loadingText || children}
          </>
        ) : (
          <>
            {leftIcon && <span className="inline-flex shrink-0">{leftIcon}</span>}
            {children}
            {rightIcon && <span className="inline-flex shrink-0">{rightIcon}</span>}
          </>
        )}
      </Comp>
    );
  }
);
Button.displayName = 'Button';

export { Button, buttonVariants };
