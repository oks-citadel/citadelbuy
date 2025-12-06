'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Home,
  Search,
  Grid3X3,
  ShoppingCart,
  User,
  Heart,
  Sparkles,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useCartStore, selectCartItemCount } from '@/stores/cart-store';
import { useAuthStore } from '@/stores/auth-store';

interface NavItem {
  href: string;
  icon: React.ElementType;
  label: string;
  badge?: number;
  isSpecial?: boolean;
}

export function MobileBottomNav() {
  const pathname = usePathname();
  const cartItemCount = useCartStore(selectCartItemCount);
  const { isAuthenticated } = useAuthStore();

  const navItems: NavItem[] = [
    { href: '/', icon: Home, label: 'Home' },
    { href: '/search', icon: Search, label: 'Search' },
    { href: '/categories', icon: Grid3X3, label: 'Categories' },
    { href: '/cart', icon: ShoppingCart, label: 'Cart', badge: cartItemCount },
    { href: isAuthenticated ? '/account' : '/auth/login', icon: User, label: 'Account' },
  ];

  const isActive = (href: string) => {
    if (href === '/') return pathname === '/';
    return pathname.startsWith(href);
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden">
      {/* Glass background */}
      <div className="absolute inset-0 bg-background/80 backdrop-blur-xl border-t border-border/50" />

      {/* Safe area padding for iOS */}
      <div className="relative pb-safe">
        <div className="flex items-center justify-around h-16 px-2">
          {navItems.map((item) => {
            const active = isActive(item.href);
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'relative flex flex-col items-center justify-center flex-1 h-full',
                  'transition-colors duration-200',
                  active ? 'text-primary' : 'text-muted-foreground'
                )}
              >
                {/* Active indicator */}
                {active && (
                  <motion.div
                    layoutId="bottomNavIndicator"
                    className="absolute -top-0.5 w-12 h-1 bg-primary rounded-full"
                    transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                  />
                )}

                {/* Icon container */}
                <div className="relative">
                  <motion.div
                    animate={{ scale: active ? 1.1 : 1 }}
                    transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                  >
                    <Icon className={cn('h-5 w-5', active && 'stroke-[2.5]')} />
                  </motion.div>

                  {/* Badge */}
                  <AnimatePresence>
                    {item.badge && item.badge > 0 && (
                      <motion.span
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        exit={{ scale: 0 }}
                        className={cn(
                          'absolute -top-1.5 -right-2 min-w-[18px] h-[18px] px-1',
                          'flex items-center justify-center',
                          'text-[10px] font-bold text-white',
                          'bg-destructive rounded-full',
                          'shadow-sm'
                        )}
                      >
                        {item.badge > 99 ? '99+' : item.badge}
                      </motion.span>
                    )}
                  </AnimatePresence>
                </div>

                {/* Label */}
                <span className={cn(
                  'text-[10px] mt-1 font-medium transition-colors',
                  active ? 'text-primary' : 'text-muted-foreground'
                )}>
                  {item.label}
                </span>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}

// Spacer component to prevent content from being hidden behind the nav
export function MobileBottomNavSpacer() {
  return <div className="h-20 md:hidden" />;
}
