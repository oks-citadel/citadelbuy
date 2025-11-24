'use client';

import Link from 'next/link';
import { useAuthStore } from '@/store/auth-store';
import { useCartStore } from '@/store/cart-store';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ShoppingCart } from 'lucide-react';
import { LanguageSwitcher } from '@/components/i18n/language-switcher';
import { MobileMenuButton } from '@/components/layout/mobile-menu';

export function Navbar() {
  const { user, isAuthenticated } = useAuthStore();
  const { itemCount } = useCartStore();
  const cartCount = itemCount();

  const initials = user?.name
    ? user.name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .substring(0, 2)
    : 'U';

  return (
    <nav className="border-b bg-background">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <div className="flex items-center space-x-8">
          <Link href="/" className="text-2xl font-bold">
            CitadelBuy
          </Link>
          <div className="hidden space-x-6 md:flex">
            <Link href="/products" className="text-sm font-medium hover:text-primary">
              Products
            </Link>
            {isAuthenticated && (
              <Link href="/orders" className="text-sm font-medium hover:text-primary">
                Orders
              </Link>
            )}
            <Link href="/categories" className="text-sm font-medium hover:text-primary">
              Categories
            </Link>
            <Link href="/deals" className="text-sm font-medium hover:text-primary">
              Deals
            </Link>
          </div>
        </div>

        <div className="flex items-center space-x-4">
          {/* Language Switcher */}
          <div className="hidden md:block">
            <LanguageSwitcher />
          </div>

          {/* Cart Icon with Badge */}
          <Link href="/cart" className="relative">
            <Button variant="ghost" size="sm" className="relative">
              <ShoppingCart className="h-5 w-5" />
              {cartCount > 0 && (
                <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                  {cartCount > 9 ? '9+' : cartCount}
                </span>
              )}
            </Button>
          </Link>

          {/* Desktop Auth Buttons */}
          {isAuthenticated ? (
            <Link href="/profile" className="hidden md:block">
              <Avatar className="h-8 w-8 cursor-pointer">
                <AvatarFallback className="text-xs">{initials}</AvatarFallback>
              </Avatar>
            </Link>
          ) : (
            <div className="hidden md:flex md:space-x-2">
              <Button variant="ghost" size="sm" asChild>
                <Link href="/auth/login">Sign In</Link>
              </Button>
              <Button size="sm" asChild>
                <Link href="/auth/register">Sign Up</Link>
              </Button>
            </div>
          )}

          {/* Mobile Menu Button */}
          <MobileMenuButton />
        </div>
      </div>
    </nav>
  );
}
