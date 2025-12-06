'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname, useParams, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  Users,
  Key,
  Settings,
  CreditCard,
  FileText,
  Shield,
  Menu,
  X,
  Building2,
  ChevronDown,
  LogOut,
  Bell,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Avatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface NavItem {
  href: string;
  label: string;
  icon: React.ReactNode;
  badge?: number;
}

export default function OrganizationLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;

  const [sidebarOpen, setSidebarOpen] = React.useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);

  const navItems: NavItem[] = [
    {
      href: `/org/${slug}`,
      label: 'Dashboard',
      icon: <LayoutDashboard className="h-5 w-5" />,
    },
    {
      href: `/org/${slug}/members`,
      label: 'Members',
      icon: <Users className="h-5 w-5" />,
    },
    {
      href: `/org/${slug}/teams`,
      label: 'Teams',
      icon: <Users className="h-5 w-5" />,
    },
    {
      href: `/org/${slug}/api-keys`,
      label: 'API Keys',
      icon: <Key className="h-5 w-5" />,
    },
    {
      href: `/org/${slug}/billing`,
      label: 'Billing',
      icon: <CreditCard className="h-5 w-5" />,
    },
    {
      href: `/org/${slug}/audit`,
      label: 'Audit Log',
      icon: <FileText className="h-5 w-5" />,
    },
    {
      href: `/org/${slug}/verification`,
      label: 'Verification',
      icon: <Shield className="h-5 w-5" />,
    },
    {
      href: `/org/${slug}/settings`,
      label: 'Settings',
      icon: <Settings className="h-5 w-5" />,
    },
  ];

  const isActive = (href: string) => {
    if (href === `/org/${slug}`) {
      return pathname === `/org/${slug}`;
    }
    return pathname.startsWith(href);
  };

  const handleLogout = () => {
    // Implement logout logic
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
            {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </Button>
          <Link href={`/org/${slug}`} className="flex items-center gap-2">
            <Building2 className="h-6 w-6 text-primary" />
            <span className="font-bold">Organization</span>
          </Link>
          <Button variant="ghost" size="icon">
            <Bell className="h-5 w-5" />
          </Button>
        </div>
      </header>

      {/* Mobile Sidebar */}
      {mobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 z-40 bg-background/80 backdrop-blur-sm">
          <aside className="fixed inset-y-0 left-0 w-72 bg-background border-r pt-16 overflow-y-auto">
            <nav className="p-4 space-y-1">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2 rounded-lg transition-colors',
                    isActive(item.href)
                      ? 'bg-primary text-primary-foreground'
                      : 'hover:bg-muted'
                  )}
                >
                  {item.icon}
                  <span>{item.label}</span>
                  {item.badge && (
                    <Badge variant="destructive" className="ml-auto">
                      {item.badge}
                    </Badge>
                  )}
                </Link>
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
              <Link href={`/org/${slug}`} className="flex items-center gap-2">
                <Building2 className="h-6 w-6 text-primary" />
                <span className="font-bold">Organization</span>
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
                  <Link
                    href={item.href}
                    className={cn(
                      'flex items-center gap-3 px-3 py-2 rounded-lg transition-colors',
                      isActive(item.href)
                        ? 'bg-primary text-primary-foreground'
                        : 'hover:bg-muted'
                    )}
                  >
                    {item.icon}
                    <span className="text-sm">{item.label}</span>
                    {item.badge && (
                      <Badge variant="destructive" className="ml-auto">
                        {item.badge}
                      </Badge>
                    )}
                  </Link>
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
                  <Avatar className="h-8 w-8">
                    <div className="flex h-full w-full items-center justify-center bg-primary text-primary-foreground text-sm">
                      O
                    </div>
                  </Avatar>
                  <div className="text-sm">
                    <p className="font-medium truncate max-w-[120px]">Organization</p>
                    <p className="text-muted-foreground text-xs capitalize">{slug}</p>
                  </div>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon">
                      <ChevronDown className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => router.push(`/org/${slug}/settings`)}>
                      <Settings className="mr-2 h-4 w-4" />
                      Settings
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleLogout}>
                      <LogOut className="mr-2 h-4 w-4" />
                      Sign Out
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            ) : (
              <Button
                variant="ghost"
                size="icon"
                className="w-full"
                onClick={handleLogout}
                title="Sign Out"
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
              <div className="flex items-center gap-4">
                <h2 className="text-lg font-semibold capitalize">
                  {slug.replace(/-/g, ' ')}
                </h2>
              </div>
              <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" className="relative">
                  <Bell className="h-5 w-5" />
                </Button>
                <Link href="/">
                  <Button variant="outline" size="sm">
                    Back to Store
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
