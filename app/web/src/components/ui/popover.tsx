'use client';

import * as React from 'react';
import { createPortal } from 'react-dom';

export interface PopoverProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  children: React.ReactNode;
}

const PopoverContext = React.createContext<{
  open: boolean;
  onOpenChange?: (open: boolean) => void;
}>({ open: false });

export const Popover: React.FC<PopoverProps> = ({ open, onOpenChange, children }) => {
  return (
    <PopoverContext.Provider value={{ open: open || false, onOpenChange }}>
      {children}
    </PopoverContext.Provider>
  );
};

export interface PopoverTriggerProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  asChild?: boolean;
}

export const PopoverTrigger = React.forwardRef<HTMLButtonElement, PopoverTriggerProps>(
  ({ children, onClick, asChild, ...props }, ref) => {
    const { onOpenChange, open } = React.useContext(PopoverContext);

    const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
      onClick?.(e);
      onOpenChange?.(!open);
    };

    if (asChild && React.isValidElement(children)) {
      return React.cloneElement(children, {
        ...props,
        onClick: (e: React.MouseEvent<HTMLButtonElement>) => {
          handleClick(e);
          (children.props as any).onClick?.(e);
        },
        ref,
      } as any);
    }

    return (
      <button ref={ref} onClick={handleClick} {...props}>
        {children}
      </button>
    );
  }
);

PopoverTrigger.displayName = 'PopoverTrigger';

export const PopoverContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & { align?: 'start' | 'center' | 'end' }
>(({ className = '', children, align = 'center', ...props }, ref) => {
  const { open, onOpenChange } = React.useContext(PopoverContext);
  const [mounted, setMounted] = React.useState(false);
  const triggerRef = React.useRef<HTMLElement | null>(null);
  const [position, setPosition] = React.useState({ top: 0, left: 0 });

  React.useEffect(() => {
    setMounted(true);
  }, []);

  React.useEffect(() => {
    if (open && mounted) {
      // Simple positioning logic
      const trigger = triggerRef.current;
      if (trigger) {
        const rect = trigger.getBoundingClientRect();
        setPosition({
          top: rect.bottom + 8,
          left: align === 'start' ? rect.left : rect.left + rect.width / 2,
        });
      }
    }
  }, [open, mounted, align]);

  if (!mounted || !open) return null;

  return createPortal(
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40"
        onClick={() => onOpenChange?.(false)}
      />

      {/* Popover */}
      <div
        ref={ref}
        className={`absolute z-50 w-auto rounded-md border bg-white p-4 shadow-md outline-none ${className}`}
        style={{
          top: `${position.top}px`,
          left: `${position.left}px`,
          transform: align === 'center' ? 'translateX(-50%)' : undefined,
        }}
        {...props}
      >
        {children}
      </div>
    </>,
    document.body
  );
});

PopoverContent.displayName = 'PopoverContent';
