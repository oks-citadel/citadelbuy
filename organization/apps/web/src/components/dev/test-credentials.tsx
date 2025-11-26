'use client';

import * as React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuthStore } from '@/stores/auth-store';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { User, ShieldCheck, Store, Copy, Check } from 'lucide-react';

interface TestAccount {
  email: string;
  password: string;
  role: 'ADMIN' | 'VENDOR' | 'CUSTOMER';
  name: string;
  description: string;
}

const TEST_ACCOUNTS: TestAccount[] = [
  {
    email: 'admin@citadelbuy.com',
    password: 'password123',
    role: 'ADMIN',
    name: 'Admin User',
    description: 'Full admin access to dashboard, users, orders, and settings',
  },
  {
    email: 'vendor1@citadelbuy.com',
    password: 'password123',
    role: 'VENDOR',
    name: 'Tech Store',
    description: 'Vendor account with products, inventory, and order management',
  },
  {
    email: 'vendor2@citadelbuy.com',
    password: 'password123',
    role: 'VENDOR',
    name: 'Fashion Hub',
    description: 'Secondary vendor account for testing multi-vendor features',
  },
  {
    email: 'customer@citadelbuy.com',
    password: 'password123',
    role: 'CUSTOMER',
    name: 'John Doe',
    description: 'Customer with order history, wishlist, and reviews',
  },
  {
    email: 'jane@example.com',
    password: 'password123',
    role: 'CUSTOMER',
    name: 'Jane Smith',
    description: 'Fresh customer account for testing new user flows',
  },
];

const getRoleIcon = (role: TestAccount['role']) => {
  switch (role) {
    case 'ADMIN':
      return <ShieldCheck className="h-4 w-4" />;
    case 'VENDOR':
      return <Store className="h-4 w-4" />;
    case 'CUSTOMER':
      return <User className="h-4 w-4" />;
  }
};

const getRoleBadgeVariant = (role: TestAccount['role']) => {
  switch (role) {
    case 'ADMIN':
      return 'destructive';
    case 'VENDOR':
      return 'default';
    case 'CUSTOMER':
      return 'secondary';
  }
};

export function TestCredentials() {
  const router = useRouter();
  const { login, isLoading } = useAuthStore();
  const [copiedEmail, setCopiedEmail] = React.useState<string | null>(null);
  const [loggingIn, setLoggingIn] = React.useState<string | null>(null);

  // Only show in development mode
  if (process.env.NODE_ENV === 'production') {
    return null;
  }

  const handleQuickLogin = async (account: TestAccount) => {
    setLoggingIn(account.email);
    try {
      await login(account.email, account.password);
      toast.success(`Logged in as ${account.name}`);

      // Redirect based on role
      switch (account.role) {
        case 'ADMIN':
          router.push('/admin');
          break;
        case 'VENDOR':
          router.push('/vendor');
          break;
        default:
          router.push('/');
      }
    } catch (error) {
      toast.error('Failed to login. Make sure the database is seeded.');
    } finally {
      setLoggingIn(null);
    }
  };

  const handleCopyCredentials = (account: TestAccount) => {
    const text = `Email: ${account.email}\nPassword: ${account.password}`;
    navigator.clipboard.writeText(text);
    setCopiedEmail(account.email);
    toast.success('Credentials copied to clipboard');
    setTimeout(() => setCopiedEmail(null), 2000);
  };

  return (
    <Card className="border-dashed border-orange-300 bg-orange-50/50 dark:bg-orange-950/20">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="bg-orange-100 text-orange-700 border-orange-300">
            DEV MODE
          </Badge>
          <CardTitle className="text-lg">Test Credentials</CardTitle>
        </div>
        <CardDescription>
          Quick login with pre-seeded test accounts. Run `npx prisma db seed` to populate accounts.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {TEST_ACCOUNTS.map((account) => (
          <div
            key={account.email}
            className="flex items-center justify-between p-3 rounded-lg bg-white dark:bg-gray-900 border"
          >
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <div className="flex-shrink-0">
                {getRoleIcon(account.role)}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm truncate">{account.name}</span>
                  <Badge variant={getRoleBadgeVariant(account.role)} className="text-xs">
                    {account.role}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground truncate">{account.email}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 ml-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleCopyCredentials(account)}
                className="h-8 w-8 p-0"
              >
                {copiedEmail === account.email ? (
                  <Check className="h-4 w-4 text-green-500" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
              <Button
                variant="default"
                size="sm"
                onClick={() => handleQuickLogin(account)}
                disabled={isLoading || loggingIn !== null}
                className="h-8"
              >
                {loggingIn === account.email ? 'Logging in...' : 'Login'}
              </Button>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

export function TestCredentialsBanner() {
  const [isExpanded, setIsExpanded] = React.useState(false);

  // Only show in development mode
  if (process.env.NODE_ENV === 'production') {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-md">
      {isExpanded ? (
        <div className="relative">
          <Button
            variant="ghost"
            size="sm"
            className="absolute -top-2 -right-2 h-6 w-6 p-0 rounded-full bg-gray-200 hover:bg-gray-300"
            onClick={() => setIsExpanded(false)}
          >
            ×
          </Button>
          <TestCredentials />
        </div>
      ) : (
        <Button
          variant="outline"
          className="bg-orange-100 border-orange-300 hover:bg-orange-200"
          onClick={() => setIsExpanded(true)}
        >
          <User className="h-4 w-4 mr-2" />
          Test Accounts
        </Button>
      )}
    </div>
  );
}
