'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  Megaphone,
  FileText,
  Mail,
  BarChart3,
  Settings,
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

const navItems = [
  { href: '/marketing', label: 'Dashboard', icon: <LayoutDashboard className="h-5 w-5" /> },
  { href: '/marketing/campaigns', label: 'Campaigns', icon: <Megaphone className="h-5 w-5" /> },
  { href: '/marketing/landing-pages', label: 'Landing Pages', icon: <FileText className="h-5 w-5" /> },
  { href: '/marketing/email', label: 'Email Automation', icon: <Mail className="h-5 w-5" /> },
  { href: '/marketing/analytics', label: 'Analytics', icon: <BarChart3 className="h-5 w-5" /> },
  { href: '/marketing/settings', label: 'Settings', icon: <Settings className="h-5 w-5" /> },
];

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const [sidebarOpen, setSidebarOpen] = React.useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);

  const isActive = (href: string) => href === '/marketing' ? pathname === '/marketing' : pathname.startsWith(href);

  return (
    <div className="min-h-screen bg-muted/30">
      <header className="lg:hidden sticky top-0 z-50 bg-background border-b">
        <div className="flex items-center justify-between px-4 h-16">
          <Button variant="ghost" size="icon" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
            {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </Button>
          <Link href="/marketing" className="flex items-center gap-2">
            <Megaphone className="h-6 w-6 text-primary" />
            <span className="font-bold">Marketing Hub</span>
          </Link>
          <Button variant="ghost" size="icon"><Bell className="h-5 w-5" /></Button>
        </div>
      </header>

      {mobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 z-40 bg-background/80 backdrop-blur-sm">
          <aside className="fixed inset-y-0 left-0 w-72 bg-background border-r pt-16">
            <nav className="p-4 space-y-1">
              {navItems.map((item) => (
                <Link key={item.href} href={item.href} onClick={() => setMobileMenuOpen(false)}
                  className={cn('flex items-center gap-3 px-3 py-2 rounded-lg transition-colors',
                    isActive(item.href) ? 'bg-primary text-primary-foreground' : 'hover:bg-muted')}>
                  {item.icon}
                  <span>{item.label}</span>
                </Link>
              ))}
            </nav>
          </aside>
        </div>
      )}

      <div className="hidden lg:flex">
        <aside className={cn('fixed inset-y-0 left-0 z-30 bg-background border-r transition-all duration-300',
          sidebarOpen ? 'w-64' : 'w-16')}>
          <div className="flex items-center justify-between h-16 px-4 border-b">
            {sidebarOpen && (
              <Link href="/marketing" className="flex items-center gap-2">
                <Megaphone className="h-6 w-6 text-primary" />
                <span className="font-bold">Marketing Hub</span>
              </Link>
            )}
            <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(!sidebarOpen)}
              className={cn(!sidebarOpen && 'mx-auto')}>
              <Menu className="h-5 w-5" />
            </Button>
          </div>
          <nav className="p-2 space-y-1 overflow-y-auto h-[calc(100vh-8rem)]">
            {navItems.map((item) => (
              <Link key={item.href} href={item.href}
                className={cn('flex items-center gap-3 px-3 py-2 rounded-lg transition-colors',
                  isActive(item.href) ? 'bg-primary text-primary-foreground' : 'hover:bg-muted',
                  !sidebarOpen && 'justify-center')}
                title={!sidebarOpen ? item.label : undefined}>
                {item.icon}
                {sidebarOpen && <span>{item.label}</span>}
              </Link>
            ))}
          </nav>
          <div className="absolute bottom-0 left-0 right-0 p-4 border-t bg-background">
            {sidebarOpen ? (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                    <span className="text-sm font-medium text-primary">{user?.name?.charAt(0) || 'M'}</span>
                  </div>
                  <div className="text-sm">
                    <p className="font-medium truncate max-w-[120px]">{user?.name || 'Marketing'}</p>
                    <p className="text-muted-foreground text-xs">Marketing Team</p>
                  </div>
                </div>
                <Button variant="ghost" size="icon" onClick={() => { logout(); router.push('/'); }}>
                  <LogOut className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <Button variant="ghost" size="icon" className="w-full"
                onClick={() => { logout(); router.push('/'); }} title="Logout">
                <LogOut className="h-4 w-4" />
              </Button>
            )}
          </div>
        </aside>

        <div className={cn('flex-1 transition-all duration-300', sidebarOpen ? 'ml-64' : 'ml-16')}>
          <header className="sticky top-0 z-20 bg-background border-b">
            <div className="flex items-center justify-between h-16 px-6">
              <div className="flex-1 max-w-md">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input placeholder="Search..." className="pl-10 bg-muted/50 border-0" />
                </div>
              </div>
              <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" className="relative">
                  <Bell className="h-5 w-5" />
                </Button>
              </div>
            </div>
          </header>
          <main className="p-6">{children}</main>
        </div>
      </div>

      <main className="lg:hidden p-4">{children}</main>
    </div>
  );
}
