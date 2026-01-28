/**
 * Broxiva Design System - Navigation Bar Component
 * Premium navigation with smooth animations and luxury styling
 */

import React, { useState, useEffect } from 'react';
import { cn } from '../utils';
// Button import removed - was unused

export interface NavLink {
  label: string;
  href: string;
  badge?: string;
}

export interface NavBarProps extends React.HTMLAttributes<HTMLElement> {
  logo: React.ReactNode;
  links?: NavLink[];
  actions?: React.ReactNode;
  sticky?: boolean;
  transparent?: boolean;
  onLogoClick?: () => void;
}

const NavBar = React.forwardRef<HTMLElement, NavBarProps>(
  (
    {
      className,
      logo,
      links = [],
      actions,
      sticky = true,
      transparent = false,
      onLogoClick,
      ...props
    },
    ref
  ) => {
    const [isScrolled, setIsScrolled] = useState(false);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    // Handle scroll effect
    useEffect(() => {
      if (!transparent) return;

      const handleScroll = () => {
        setIsScrolled(window.scrollY > 10);
      };

      window.addEventListener('scroll', handleScroll);
      return () => window.removeEventListener('scroll', handleScroll);
    }, [transparent]);

    const isTransparent = transparent && !isScrolled && !mobileMenuOpen;

    return (
      <nav
        ref={ref}
        className={cn(
          'w-full z-50 transition-all duration-300',
          sticky && 'sticky top-0',
          isTransparent
            ? 'bg-transparent'
            : 'bg-white border-b border-neutral-200 shadow-sm',
          className
        )}
        {...props}
      >
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16 md:h-20">
            {/* Logo */}
            <button
              onClick={onLogoClick}
              className={cn(
                'flex items-center gap-2 font-display text-2xl font-bold transition-colors',
                'focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-primary-500',
                isTransparent
                  ? 'text-white'
                  : 'text-neutral-900'
              )}
              aria-label="Go to homepage"
            >
              {logo}
            </button>

            {/* Desktop navigation */}
            <div className="hidden md:flex items-center gap-8">
              {links.map((link, index) => (
                <a
                  key={index}
                  href={link.href}
                  className={cn(
                    'relative font-medium transition-colors',
                    'hover:text-accent-600',
                    'after:absolute after:left-0 after:bottom-0',
                    'after:h-0.5 after:w-0 after:bg-accent-500',
                    'after:transition-all after:duration-300',
                    'hover:after:w-full',
                    isTransparent
                      ? 'text-white'
                      : 'text-neutral-700'
                  )}
                >
                  {link.label}
                  {link.badge && (
                    <span className="ml-1.5 px-1.5 py-0.5 text-xs bg-accent-500 text-white rounded-full">
                      {link.badge}
                    </span>
                  )}
                </a>
              ))}
            </div>

            {/* Actions */}
            <div className="hidden md:flex items-center gap-4">
              {actions}
            </div>

            {/* Mobile menu button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className={cn(
                'md:hidden p-2 rounded-lg transition-colors',
                isTransparent
                  ? 'text-white hover:bg-white/10'
                  : 'text-neutral-700 hover:bg-neutral-100'
              )}
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? (
                <svg
                  className="h-6 w-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              ) : (
                <svg
                  className="h-6 w-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 6h16M4 12h16M4 18h16"
                  />
                </svg>
              )}
            </button>
          </div>

          {/* Mobile menu */}
          {mobileMenuOpen && (
            <nav
              className="md:hidden pb-6 animate-in slide-in-from-top-4 duration-300"
              aria-label="Mobile navigation"
              role="navigation"
            >
              <div className="flex flex-col gap-4">
                {links.map((link, index) => (
                  <a
                    key={index}
                    href={link.href}
                    className={cn(
                      'py-2 px-4 rounded-lg font-medium transition-colors',
                      isTransparent
                        ? 'text-white hover:bg-white/10'
                        : 'text-neutral-700 hover:bg-neutral-100'
                    )}
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    {link.label}
                    {link.badge && (
                      <span className="ml-2 px-1.5 py-0.5 text-xs bg-accent-500 text-white rounded-full">
                        {link.badge}
                      </span>
                    )}
                  </a>
                ))}
                <div className="mt-4 flex flex-col gap-3">
                  {actions}
                </div>
              </div>
            </nav>
          )}
        </div>
      </nav>
    );
  }
);

NavBar.displayName = 'NavBar';

export default NavBar;
