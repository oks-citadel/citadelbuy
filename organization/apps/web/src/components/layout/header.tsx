'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Search,
  ShoppingCart,
  User,
  Heart,
  Menu,
  X,
  ChevronDown,
  Mic,
  Camera,
  Bell,
  Package,
  LogOut,
  Settings,
  CreditCard,
  MapPin,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useAuthStore } from '@/stores/auth-store';
import { useCartStore, selectCartItemCount } from '@/stores/cart-store';
import { useSearchStore } from '@/stores/search-store';
import { cn } from '@/lib/utils';

const categories = [
  { name: 'Electronics', href: '/categories/electronics' },
  { name: 'Fashion', href: '/categories/fashion' },
  { name: 'Home & Garden', href: '/categories/home-garden' },
  { name: 'Beauty', href: '/categories/beauty' },
  { name: 'Sports', href: '/categories/sports' },
  { name: 'Toys', href: '/categories/toys' },
  { name: 'Books', href: '/categories/books' },
  { name: 'Deals', href: '/deals', highlight: true },
];

export function Header() {
  const pathname = usePathname();
  const [isMenuOpen, setIsMenuOpen] = React.useState(false);
  const [isSearchOpen, setIsSearchOpen] = React.useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState('');

  const { user, isAuthenticated, logout } = useAuthStore();
  const cartItemCount = useCartStore(selectCartItemCount);
  const setCartOpen = useCartStore((state) => state.setIsOpen);
  const { search, startVoiceSearch, isListening } = useSearchStore();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      search(searchQuery);
      setIsSearchOpen(false);
    }
  };

  const handleVoiceSearch = async () => {
    await startVoiceSearch();
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      {/* Top bar */}
      <div className="hidden md:block border-b">
        <div className="container flex h-9 items-center justify-between text-xs text-muted-foreground">
          <div className="flex items-center gap-4">
            <span>Free shipping on orders over $50</span>
            <span>•</span>
            <span>30-day returns</span>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/help" className="hover:text-foreground transition-colors">
              Help Center
            </Link>
            <Link href="/track-order" className="hover:text-foreground transition-colors">
              Track Order
            </Link>
            <Link href="/sell" className="hover:text-foreground transition-colors">
              Sell on Broxiva
            </Link>
          </div>
        </div>
      </div>

      {/* Main header */}
      <div className="container">
        <div className="flex h-16 items-center gap-4">
          {/* Mobile menu button */}
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            {isMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>

          {/* Logo */}
          <Link href="/" className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #0E3A8A 0%, #3B82F6 100%)' }}>
              <span className="text-white font-bold text-lg">B</span>
            </div>
            <span className="hidden sm:inline-block font-bold text-xl text-white">Broxiva</span>
          </Link>

          {/* Search bar - Desktop */}
          <form
            onSubmit={handleSearch}
            className="hidden md:flex flex-1 max-w-2xl mx-4"
          >
            <div className="relative flex-1">
              <Input
                type="search"
                placeholder="Search for products, brands, and more..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pr-24"
              />
              <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  onClick={handleVoiceSearch}
                  className={cn(isListening && 'text-destructive')}
                >
                  <Mic className={cn('h-4 w-4', isListening && 'animate-pulse')} />
                </Button>
                <Link href="/visual-search">
                  <Button type="button" variant="ghost" size="icon-sm">
                    <Camera className="h-4 w-4" />
                  </Button>
                </Link>
                <Button type="submit" variant="ghost" size="icon-sm">
                  <Search className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </form>

          {/* Mobile search button */}
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden ml-auto"
            onClick={() => setIsSearchOpen(!isSearchOpen)}
          >
            <Search className="h-5 w-5" />
          </Button>

          {/* Right side actions */}
          <div className="flex items-center gap-2">
            {/* Notifications */}
            {isAuthenticated && (
              <Button variant="ghost" size="icon" className="hidden sm:flex relative">
                <Bell className="h-5 w-5" />
                <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground flex items-center justify-center">
                  3
                </span>
              </Button>
            )}

            {/* Wishlist */}
            <Link href="/wishlist">
              <Button variant="ghost" size="icon" className="hidden sm:flex">
                <Heart className="h-5 w-5" />
              </Button>
            </Link>

            {/* Cart */}
            <Button
              variant="ghost"
              size="icon"
              className="relative"
              onClick={() => setCartOpen(true)}
            >
              <ShoppingCart className="h-5 w-5" />
              {cartItemCount > 0 && (
                <Badge
                  variant="destructive"
                  className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-[10px]"
                >
                  {cartItemCount > 99 ? '99+' : cartItemCount}
                </Badge>
              )}
            </Button>

            {/* User menu */}
            <div className="relative">
              <Button
                variant="ghost"
                size="icon"
                className="hidden sm:flex"
                onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
              >
                <User className="h-5 w-5" />
              </Button>

              <AnimatePresence>
                {isUserMenuOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-40"
                      onClick={() => setIsUserMenuOpen(false)}
                    />
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                      className="absolute right-0 top-full mt-2 w-64 rounded-lg border bg-background shadow-lg z-50"
                    >
                      {isAuthenticated ? (
                        <>
                          <div className="p-4 border-b">
                            <p className="font-semibold">{user?.name}</p>
                            <p className="text-sm text-muted-foreground">{user?.email}</p>
                          </div>
                          <div className="p-2">
                            <Link
                              href="/account"
                              className="flex items-center gap-2 px-3 py-2 rounded-md hover:bg-accent transition-colors"
                              onClick={() => setIsUserMenuOpen(false)}
                            >
                              <User className="h-4 w-4" />
                              My Account
                            </Link>
                            <Link
                              href="/orders"
                              className="flex items-center gap-2 px-3 py-2 rounded-md hover:bg-accent transition-colors"
                              onClick={() => setIsUserMenuOpen(false)}
                            >
                              <Package className="h-4 w-4" />
                              Orders
                            </Link>
                            <Link
                              href="/wishlist"
                              className="flex items-center gap-2 px-3 py-2 rounded-md hover:bg-accent transition-colors"
                              onClick={() => setIsUserMenuOpen(false)}
                            >
                              <Heart className="h-4 w-4" />
                              Wishlist
                            </Link>
                            <Link
                              href="/account/addresses"
                              className="flex items-center gap-2 px-3 py-2 rounded-md hover:bg-accent transition-colors"
                              onClick={() => setIsUserMenuOpen(false)}
                            >
                              <MapPin className="h-4 w-4" />
                              Addresses
                            </Link>
                            <Link
                              href="/account/payment-methods"
                              className="flex items-center gap-2 px-3 py-2 rounded-md hover:bg-accent transition-colors"
                              onClick={() => setIsUserMenuOpen(false)}
                            >
                              <CreditCard className="h-4 w-4" />
                              Payment Methods
                            </Link>
                            <Link
                              href="/account/settings"
                              className="flex items-center gap-2 px-3 py-2 rounded-md hover:bg-accent transition-colors"
                              onClick={() => setIsUserMenuOpen(false)}
                            >
                              <Settings className="h-4 w-4" />
                              Settings
                            </Link>
                          </div>
                          <div className="p-2 border-t">
                            <button
                              onClick={() => {
                                logout();
                                setIsUserMenuOpen(false);
                              }}
                              className="flex items-center gap-2 px-3 py-2 rounded-md hover:bg-accent transition-colors w-full text-destructive"
                            >
                              <LogOut className="h-4 w-4" />
                              Sign Out
                            </button>
                          </div>
                        </>
                      ) : (
                        <div className="p-4">
                          <p className="text-sm text-muted-foreground mb-4">
                            Sign in to access your account, orders, and personalized recommendations.
                          </p>
                          <div className="flex flex-col gap-2">
                            <Link href="/auth/login" onClick={() => setIsUserMenuOpen(false)}>
                              <Button className="w-full">Sign In</Button>
                            </Link>
                            <Link href="/auth/register" onClick={() => setIsUserMenuOpen(false)}>
                              <Button variant="outline" className="w-full">
                                Create Account
                              </Button>
                            </Link>
                          </div>
                        </div>
                      )}
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>

        {/* Category navigation - Desktop */}
        <nav className="hidden md:flex h-10 items-center gap-6 text-sm">
          {categories.map((category) => (
            <Link
              key={category.name}
              href={category.href}
              className={cn(
                'transition-colors hover:text-foreground',
                category.highlight
                  ? 'text-destructive font-semibold'
                  : pathname === category.href
                    ? 'text-foreground font-medium'
                    : 'text-muted-foreground'
              )}
            >
              {category.name}
            </Link>
          ))}
        </nav>
      </div>

      {/* Mobile search bar */}
      <AnimatePresence>
        {isSearchOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="md:hidden border-t overflow-hidden"
          >
            <form onSubmit={handleSearch} className="container py-3">
              <div className="relative">
                <Input
                  type="search"
                  placeholder="Search products..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  autoFocus
                />
                <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                  <Button type="button" variant="ghost" size="icon-sm" onClick={handleVoiceSearch}>
                    <Mic className="h-4 w-4" />
                  </Button>
                  <Button type="submit" variant="ghost" size="icon-sm">
                    <Search className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mobile menu */}
      <AnimatePresence>
        {isMenuOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="md:hidden border-t overflow-hidden"
          >
            <nav className="container py-4">
              <div className="flex flex-col gap-2">
                {categories.map((category) => (
                  <Link
                    key={category.name}
                    href={category.href}
                    className={cn(
                      'px-3 py-2 rounded-md transition-colors',
                      category.highlight
                        ? 'text-destructive font-semibold'
                        : pathname === category.href
                          ? 'bg-accent text-foreground'
                          : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                    )}
                    onClick={() => setIsMenuOpen(false)}
                  >
                    {category.name}
                  </Link>
                ))}
              </div>
              <div className="mt-4 pt-4 border-t">
                {isAuthenticated ? (
                  <div className="flex flex-col gap-2">
                    <Link
                      href="/account"
                      className="px-3 py-2 rounded-md hover:bg-accent transition-colors flex items-center gap-2"
                      onClick={() => setIsMenuOpen(false)}
                    >
                      <User className="h-4 w-4" />
                      My Account
                    </Link>
                    <Link
                      href="/orders"
                      className="px-3 py-2 rounded-md hover:bg-accent transition-colors flex items-center gap-2"
                      onClick={() => setIsMenuOpen(false)}
                    >
                      <Package className="h-4 w-4" />
                      Orders
                    </Link>
                    <button
                      onClick={() => {
                        logout();
                        setIsMenuOpen(false);
                      }}
                      className="px-3 py-2 rounded-md hover:bg-accent transition-colors flex items-center gap-2 text-destructive w-full text-left"
                    >
                      <LogOut className="h-4 w-4" />
                      Sign Out
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-col gap-2">
                    <Link href="/auth/login" onClick={() => setIsMenuOpen(false)}>
                      <Button className="w-full">Sign In</Button>
                    </Link>
                    <Link href="/auth/register" onClick={() => setIsMenuOpen(false)}>
                      <Button variant="outline" className="w-full">
                        Create Account
                      </Button>
                    </Link>
                  </div>
                )}
              </div>
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
