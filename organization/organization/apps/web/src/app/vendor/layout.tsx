'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  Megaphone,
  DollarSign,
  BarChart3,
  Shield,
  Mail,
  Wallet,
  Package,
  Settings,
  ChevronDown,
  Store,
  Bell,
  Search,
  Menu,
  X,
  LogOut,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuthStore } from '@/stores/auth-store';

interface NavItem {
  href: string;
  label: string;
  icon: React.ReactNode;
  badge?: number;
  children?: { href: string; label: string }[];
}

const navItems: NavItem[] = [
  {
    href: '/vendor',
    label: 'Dashboard',
    icon: <LayoutDashboard className="h-5 w-5" />,
  },
  {
    href: '/vendor/campaigns',
    label: 'Ad Campaigns',
    icon: <Megaphone className="h-5 w-5" />,
    children: [
      { href: '/vendor/campaigns', label: 'All Campaigns' },
      { href: '/vendor/campaigns/create', label: 'Create Campaign' },
      { href: '/vendor/campaigns/audiences', label: 'Audiences' },
    ],
  },
  {
    href: '/vendor/pricing',
    label: 'Dynamic Pricing',
    icon: <DollarSign className="h-5 w-5" />,
    children: [
      { href: '/vendor/pricing', label: 'Pricing Rules' },
      { href: '/vendor/pricing/insights', label: 'AI Insights' },
      { href: '/vendor/pricing/competitors', label: 'Competitor Analysis' },
    ],
  },
  {
    href: '/vendor/analytics',
    label: 'Sales Analytics',
    icon: <BarChart3 className="h-5 w-5" />,
  },
  {
    href: '/vendor/fraud',
    label: 'Fraud Alerts',
    icon: <Shield className="h-5 w-5" />,
    badge: 3,
  },
  {
    href: '/vendor/email',
    label: 'Email Automation',
    icon: <Mail className="h-5 w-5" />,
    children: [
      { href: '/vendor/email', label: 'All Campaigns' },
      { href: '/vendor/email/create', label: 'Create Campaign' },
      { href: '/vendor/email/templates', label: 'Templates' },
    ],
  },
  {
    href: '/vendor/payouts',
    label: 'Payouts',
    icon: <Wallet className="h-5 w-5" />,
  },
  {
    href: '/vendor/products',
    label: 'Products',
    icon: <Package className="h-5 w-5" />,
  },
  {
    href: '/vendor/settings',
    label: 'Settings',
    icon: <Settings className="h-5 w-5" />,
  },
];

export default function VendorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const [sidebarOpen, setSidebarOpen] = React.useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);
  const [expandedItems, setExpandedItems] = React.useState<string[]>([]);

  // Redirect if not vendor
  React.useEffect(() => {
    if (user && user.role !== 'VENDOR' && user.role !== 'ADMIN') {
      router.push('/');
    }
  }, [user, router]);

  const toggleExpanded = (href: string) => {
    setExpandedItems((prev) =>
      prev.includes(href)
        ? prev.filter((h) => h !== href)
        : [...prev, href]
    );
  };

  const isActive = (href: string) => {
    if (href === '/vendor') {
      return pathname === '/vendor';
    }
    return pathname.startsWith(href);
  };

  const handleLogout = () => {
    logout();
    router.push('/');
  };

  return (
    <div className="min-h-screen bg-muted/30">
      {/* Mobile Header */}
      <header className="lg:hidden sticky top-0 z-50 bg-background border-b">
        <div className="flex items-center justify-between px-4 h-16">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? (
              <X className="h-6 w-6" />
            ) : (
              <Menu className="h-6 w-6" />
            )}
          </Button>
          <Link href="/vendor" className="flex items-center gap-2">
            <Store className="h-6 w-6 text-primary" />
            <span className="font-bold">Vendor Portal</span>
          </Link>
          <Button variant="ghost" size="icon">
            <Bell className="h-5 w-5" />
          </Button>
        </div>
      </header>

      {/* Mobile Sidebar */}
      {mobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 z-40 bg-background/80 backdrop-blur-sm">
          <aside className="fixed inset-y-0 left-0 w-72 bg-background border-r pt-16">
            <nav className="p-4 space-y-1">
              {navItems.map((item) => (
                <div key={item.href}>
                  <Link
                    href={item.href}
                    onClick={() => {
                      if (item.children) {
                        toggleExpanded(item.href);
                      } else {
                        setMobileMenuOpen(false);
                      }
                    }}
                    className={cn(
                      'flex items-center justify-between px-3 py-2 rounded-lg transition-colors',
                      isActive(item.href)
                        ? 'bg-primary text-primary-foreground'
                        : 'hover:bg-muted'
                    )}
                  >
                    <div className="flex items-center gap-3">
                      {item.icon}
                      <span>{item.label}</span>
                    </div>
                    {item.badge && (
                      <span className="px-2 py-0.5 text-xs bg-destructive text-destructive-foreground rounded-full">
                        {item.badge}
                      </span>
                    )}
                    {item.children && (
                      <ChevronDown
                        className={cn(
                          'h-4 w-4 transition-transform',
                          expandedItems.includes(item.href) && 'rotate-180'
                        )}
                      />
                    )}
                  </Link>
                  {item.children && expandedItems.includes(item.href) && (
                    <div className="ml-8 mt-1 space-y-1">
                      {item.children.map((child) => (
                        <Link
                          key={child.href}
                          href={child.href}
                          onClick={() => setMobileMenuOpen(false)}
                          className={cn(
                            'block px-3 py-2 rounded-lg text-sm transition-colors',
                            pathname === child.href
                              ? 'bg-muted font-medium'
                              : 'hover:bg-muted/50'
                          )}
                        >
                          {child.label}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </nav>
          </aside>
        </div>
      )}

      {/* Desktop Layout */}
      <div className="hidden lg:flex">
        {/* Desktop Sidebar */}
        <aside
          className={cn(
            'fixed inset-y-0 left-0 z-30 bg-background border-r transition-all duration-300',
            sidebarOpen ? 'w-64' : 'w-16'
          )}
        >
          {/* Logo */}
          <div className="flex items-center justify-between h-16 px-4 border-b">
            {sidebarOpen && (
              <Link href="/vendor" className="flex items-center gap-2">
                <Store className="h-6 w-6 text-primary" />
                <span className="font-bold">Vendor Portal</span>
              </Link>
            )}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className={cn(!sidebarOpen && 'mx-auto')}
            >
              <Menu className="h-5 w-5" />
            </Button>
          </div>

          {/* Navigation */}
          <nav className="p-2 space-y-1 overflow-y-auto h-[calc(100vh-8rem)]">
            {navItems.map((item) => (
              <div key={item.href}>
                {sidebarOpen ? (
                  <div>
                    <button
                      onClick={() => {
                        if (item.children) {
                          toggleExpanded(item.href);
                        } else {
                          router.push(item.href);
                        }
                      }}
                      className={cn(
                        'w-full flex items-center justify-between px-3 py-2 rounded-lg transition-colors',
                        isActive(item.href)
                          ? 'bg-primary text-primary-foreground'
                          : 'hover:bg-muted'
                      )}
                    >
                      <div className="flex items-center gap-3">
                        {item.icon}
                        <span>{item.label}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {item.badge && (
                          <span className="px-2 py-0.5 text-xs bg-destructive text-destructive-foreground rounded-full">
                            {item.badge}
                          </span>
                        )}
                        {item.children && (
                          <ChevronDown
                            className={cn(
                              'h-4 w-4 transition-transform',
                              expandedItems.includes(item.href) && 'rotate-180'
                            )}
                          />
                        )}
                      </div>
                    </button>
                    {item.children && expandedItems.includes(item.href) && (
                      <div className="ml-8 mt-1 space-y-1">
                        {item.children.map((child) => (
                          <Link
                            key={child.href}
                            href={child.href}
                            className={cn(
                              'block px-3 py-2 rounded-lg text-sm transition-colors',
                              pathname === child.href
                                ? 'bg-muted font-medium'
                                : 'hover:bg-muted/50'
                            )}
                          >
                            {child.label}
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <Link
                    href={item.href}
                    className={cn(
                      'flex items-center justify-center p-3 rounded-lg transition-colors relative',
                      isActive(item.href)
                        ? 'bg-primary text-primary-foreground'
                        : 'hover:bg-muted'
                    )}
                    title={item.label}
                  >
                    {item.icon}
                    {item.badge && (
                      <span className="absolute top-1 right-1 w-2 h-2 bg-destructive rounded-full" />
                    )}
                  </Link>
                )}
              </div>
            ))}
          </nav>

          {/* User Section */}
          <div className="absolute bottom-0 left-0 right-0 p-4 border-t bg-background">
            {sidebarOpen ? (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                    <span className="text-sm font-medium text-primary">
                      {user?.name?.charAt(0) || 'V'}
                    </span>
                  </div>
                  <div className="text-sm">
                    <p className="font-medium truncate max-w-[120px]">
                      {user?.name || 'Vendor'}
                    </p>
                    <p className="text-muted-foreground text-xs">Vendor Account</p>
                  </div>
                </div>
                <Button variant="ghost" size="icon" onClick={handleLogout}>
                  <LogOut className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <Button
                variant="ghost"
                size="icon"
                className="w-full"
                onClick={handleLogout}
                title="Logout"
              >
                <LogOut className="h-4 w-4" />
              </Button>
            )}
          </div>
        </aside>

        {/* Main Content */}
        <div
          className={cn(
            'flex-1 transition-all duration-300',
            sidebarOpen ? 'ml-64' : 'ml-16'
          )}
        >
          {/* Top Bar */}
          <header className="sticky top-0 z-20 bg-background border-b">
            <div className="flex items-center justify-between h-16 px-6">
              <div className="flex-1 max-w-md">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search..."
                    className="pl-10 bg-muted/50 border-0"
                  />
                </div>
              </div>
              <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" className="relative">
                  <Bell className="h-5 w-5" />
                  <span className="absolute top-1 right-1 w-2 h-2 bg-destructive rounded-full" />
                </Button>
                <Link href="/" target="_blank">
                  <Button variant="outline" size="sm">
                    View Store
                  </Button>
                </Link>
              </div>
            </div>
          </header>

          {/* Page Content */}
          <main className="p-6">{children}</main>
        </div>
      </div>

      {/* Mobile Main Content */}
      <main className="lg:hidden p-4">{children}</main>
    </div>
  );
}
