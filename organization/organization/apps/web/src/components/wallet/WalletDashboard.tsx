'use client';

import React, { useState, useEffect } from 'react';
import {
  Wallet,
  ArrowUpRight,
  ArrowDownLeft,
  CreditCard,
  Gift,
  Loader2,
  Plus,
  History,
  TrendingUp,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface WalletTransaction {
  id: string;
  type: 'CREDIT' | 'DEBIT' | 'BONUS' | 'REFUND';
  amount: number;
  description: string;
  createdAt: string;
  reference?: string;
}

interface CreditPackage {
  id: string;
  name: string;
  credits: number;
  price: number;
  currency: string;
  bonus?: number;
  popular?: boolean;
}

interface WalletDashboardProps {
  onTopUp?: (packageId: string) => Promise<void>;
  onUseCredits?: (amount: number) => Promise<void>;
}

// API helper
const api = {
  get: async (url: string) => {
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || ''}${url}`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
      },
    });
    return res.json();
  },
  post: async (url: string, body: any) => {
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || ''}${url}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
      },
      body: JSON.stringify(body),
    });
    return res.json();
  },
};

const defaultPackages: CreditPackage[] = [
  { id: 'credits_100', name: 'Starter', credits: 100, price: 0.99, currency: 'USD' },
  { id: 'credits_500', name: 'Popular', credits: 500, price: 4.99, currency: 'USD', bonus: 50, popular: true },
  { id: 'credits_1200', name: 'Value', credits: 1200, price: 9.99, currency: 'USD', bonus: 200 },
  { id: 'credits_3000', name: 'Pro', credits: 3000, price: 19.99, currency: 'USD', bonus: 600 },
  { id: 'credits_6500', name: 'Enterprise', credits: 6500, price: 39.99, currency: 'USD', bonus: 1500 },
];

export function WalletDashboard({ onTopUp, onUseCredits }: WalletDashboardProps) {
  const [balance, setBalance] = useState<number>(0);
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [packages, setPackages] = useState<CreditPackage[]>(defaultPackages);
  const [isLoading, setIsLoading] = useState(true);
  const [isTopUpOpen, setIsTopUpOpen] = useState(false);
  const [loadingPackageId, setLoadingPackageId] = useState<string | null>(null);

  useEffect(() => {
    loadWalletData();
  }, []);

  const loadWalletData = async () => {
    setIsLoading(true);
    try {
      const [balanceRes, transactionsRes, packagesRes] = await Promise.all([
        api.get('/api/payments/wallet/balance'),
        api.get('/api/payments/wallet/transactions?limit=10'),
        api.get('/api/payments/wallet/packages'),
      ]);

      if (balanceRes.success) {
        setBalance(balanceRes.balance || 0);
      }

      if (transactionsRes.success && transactionsRes.transactions) {
        setTransactions(transactionsRes.transactions);
      }

      if (packagesRes.success && packagesRes.packages) {
        setPackages(packagesRes.packages);
      }
    } catch (error) {
      console.error('Failed to load wallet data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleTopUp = async (packageId: string) => {
    setLoadingPackageId(packageId);
    try {
      if (onTopUp) {
        await onTopUp(packageId);
      } else {
        const response = await api.post('/api/payments/wallet/purchase-package', {
          packageId,
          returnUrl: `${window.location.origin}/wallet?success=true`,
          cancelUrl: `${window.location.origin}/wallet?cancelled=true`,
        });

        if (response.success && response.checkoutUrl) {
          window.location.href = response.checkoutUrl;
        }
      }
    } catch (error) {
      console.error('Top up failed:', error);
    } finally {
      setLoadingPackageId(null);
    }
  };

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'CREDIT':
        return <ArrowDownLeft className="h-4 w-4 text-green-500" />;
      case 'DEBIT':
        return <ArrowUpRight className="h-4 w-4 text-red-500" />;
      case 'BONUS':
        return <Gift className="h-4 w-4 text-purple-500" />;
      case 'REFUND':
        return <TrendingUp className="h-4 w-4 text-blue-500" />;
      default:
        return <CreditCard className="h-4 w-4" />;
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Balance Card */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Wallet className="h-5 w-5 text-primary" />
              <CardTitle>Wallet Balance</CardTitle>
            </div>
            <Dialog open={isTopUpOpen} onOpenChange={setIsTopUpOpen}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <Plus className="h-4 w-4 mr-1" />
                  Add Credits
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Add Credits to Wallet</DialogTitle>
                  <DialogDescription>
                    Choose a credit package to add to your wallet
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4 md:grid-cols-2 lg:grid-cols-3">
                  {packages.map((pkg) => (
                    <Card
                      key={pkg.id}
                      className={`relative cursor-pointer transition-all hover:shadow-md ${
                        pkg.popular ? 'border-primary' : ''
                      }`}
                    >
                      {pkg.popular && (
                        <Badge className="absolute -top-2 right-2 bg-primary">
                          Best Value
                        </Badge>
                      )}
                      <CardContent className="pt-6">
                        <div className="text-center">
                          <p className="text-sm text-muted-foreground">{pkg.name}</p>
                          <p className="text-3xl font-bold my-2">
                            {pkg.credits.toLocaleString()}
                          </p>
                          <p className="text-sm text-muted-foreground mb-1">credits</p>
                          {pkg.bonus && (
                            <Badge variant="secondary" className="mb-2">
                              +{pkg.bonus} bonus
                            </Badge>
                          )}
                          <p className="text-lg font-semibold">
                            ${pkg.price.toFixed(2)}
                          </p>
                        </div>
                        <Button
                          className="w-full mt-4"
                          variant={pkg.popular ? 'default' : 'outline'}
                          disabled={loadingPackageId === pkg.id}
                          onClick={() => handleTopUp(pkg.id)}
                        >
                          {loadingPackageId === pkg.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            'Purchase'
                          )}
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-4xl font-bold">
            {balance.toLocaleString()}
            <span className="text-lg text-muted-foreground ml-2">credits</span>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            ≈ ${(balance * 0.01).toFixed(2)} USD value
          </p>
        </CardContent>
      </Card>

      {/* Transaction History */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <History className="h-5 w-5 text-primary" />
            <CardTitle>Transaction History</CardTitle>
          </div>
          <CardDescription>Your recent wallet activity</CardDescription>
        </CardHeader>
        <CardContent>
          {transactions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Wallet className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No transactions yet</p>
              <p className="text-sm">Add credits to your wallet to get started</p>
            </div>
          ) : (
            <div className="space-y-4">
              {transactions.map((transaction) => (
                <div
                  key={transaction.id}
                  className="flex items-center justify-between py-3 border-b last:border-0"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-full bg-muted">
                      {getTransactionIcon(transaction.type)}
                    </div>
                    <div>
                      <p className="font-medium">{transaction.description}</p>
                      <p className="text-sm text-muted-foreground">
                        {formatDate(transaction.createdAt)}
                      </p>
                    </div>
                  </div>
                  <div className={`text-right font-semibold ${
                    transaction.type === 'DEBIT' ? 'text-red-500' : 'text-green-500'
                  }`}>
                    {transaction.type === 'DEBIT' ? '-' : '+'}
                    {transaction.amount.toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default WalletDashboard;
