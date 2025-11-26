'use client';

import * as React from 'react';
import { motion } from 'framer-motion';
import {
  DollarSign,
  Wallet,
  Clock,
  CheckCircle2,
  AlertCircle,
  Calendar,
  Download,
  Settings,
  CreditCard,
  Building2,
  Plus,
  Loader2,
  TrendingUp,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn, formatCurrency } from '@/lib/utils';
import { usePayouts, usePayoutBalance, usePayoutSchedule, usePayoutMethods, useRequestPayout } from '@/hooks/use-vendor';
import { VendorPayout, PayoutMethod, PayoutSchedule } from '@/types/vendor';

// Mock data
const mockPayouts: VendorPayout[] = [
  {
    id: '1',
    amount: 4523.50,
    currency: 'USD',
    status: 'COMPLETED',
    method: 'BANK_TRANSFER',
    periodStart: '2024-01-01',
    periodEnd: '2024-01-15',
    orderCount: 156,
    fees: 45.24,
    netAmount: 4478.26,
    processedAt: '2024-01-17',
    reference: 'PAY-2024-001234',
  },
  {
    id: '2',
    amount: 3892.00,
    currency: 'USD',
    status: 'PROCESSING',
    method: 'BANK_TRANSFER',
    periodStart: '2024-01-16',
    periodEnd: '2024-01-20',
    orderCount: 134,
    fees: 38.92,
    netAmount: 3853.08,
  },
  {
    id: '3',
    amount: 2156.75,
    currency: 'USD',
    status: 'PENDING',
    method: 'BANK_TRANSFER',
    periodStart: '2024-01-21',
    periodEnd: '2024-01-25',
    orderCount: 89,
    fees: 21.57,
    netAmount: 2135.18,
  },
];

const mockSchedule: PayoutSchedule = {
  frequency: 'WEEKLY',
  minimumAmount: 100,
  nextPayoutDate: '2024-01-26',
  holdPeriod: 3,
};

const mockMethods: PayoutMethod[] = [
  {
    id: '1',
    type: 'BANK_TRANSFER',
    isDefault: true,
    details: {
      bankName: 'Chase Bank',
      accountEnding: '4532',
      routingEnding: '1234',
    },
    verified: true,
  },
  {
    id: '2',
    type: 'PAYPAL',
    isDefault: false,
    details: {
      email: 'vendor@example.com',
    },
    verified: true,
  },
];

const mockBalance = {
  available: 2156.75,
  pending: 3892.00,
  currency: 'USD',
};

const statusConfig: Record<string, { color: string; label: string; icon: React.ReactNode }> = {
  PENDING: { color: 'bg-yellow-100 text-yellow-700', label: 'Pending', icon: <Clock className="h-3 w-3" /> },
  PROCESSING: { color: 'bg-blue-100 text-blue-700', label: 'Processing', icon: <Loader2 className="h-3 w-3 animate-spin" /> },
  COMPLETED: { color: 'bg-green-100 text-green-700', label: 'Completed', icon: <CheckCircle2 className="h-3 w-3" /> },
  FAILED: { color: 'bg-red-100 text-red-700', label: 'Failed', icon: <AlertCircle className="h-3 w-3" /> },
};

function PayoutCard({ payout }: { payout: VendorPayout }) {
  const status = statusConfig[payout.status];

  return (
    <div className="flex items-center justify-between p-4 rounded-lg border">
      <div className="flex items-center gap-4">
        <div className={cn('p-2 rounded-lg',
          payout.status === 'COMPLETED' ? 'bg-green-100' :
          payout.status === 'PROCESSING' ? 'bg-blue-100' : 'bg-yellow-100'
        )}>
          <DollarSign className={cn('h-5 w-5',
            payout.status === 'COMPLETED' ? 'text-green-600' :
            payout.status === 'PROCESSING' ? 'text-blue-600' : 'text-yellow-600'
          )} />
        </div>
        <div>
          <p className="font-semibold">{formatCurrency(payout.netAmount)}</p>
          <p className="text-sm text-muted-foreground">
            {new Date(payout.periodStart).toLocaleDateString()} - {new Date(payout.periodEnd).toLocaleDateString()}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-4">
        <div className="text-right">
          <p className="text-sm text-muted-foreground">{payout.orderCount} orders</p>
          <p className="text-sm text-muted-foreground">Fee: {formatCurrency(payout.fees)}</p>
        </div>
        <Badge className={cn('gap-1', status.color)}>
          {status.icon}
          {status.label}
        </Badge>
      </div>
    </div>
  );
}

function PayoutMethodCard({ method, isDefault }: { method: PayoutMethod; isDefault?: boolean }) {
  const icons: Record<string, React.ReactNode> = {
    BANK_TRANSFER: <Building2 className="h-5 w-5" />,
    PAYPAL: <Wallet className="h-5 w-5" />,
    STRIPE: <CreditCard className="h-5 w-5" />,
  };

  return (
    <div className={cn(
      'p-4 rounded-lg border transition-colors',
      isDefault ? 'border-primary bg-primary/5' : 'border-border'
    )}>
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-muted">
            {icons[method.type]}
          </div>
          <div>
            <p className="font-medium">{method.type.replace(/_/g, ' ')}</p>
            {method.verified && (
              <Badge variant="secondary" className="text-xs gap-1">
                <CheckCircle2 className="h-3 w-3" />
                Verified
              </Badge>
            )}
          </div>
        </div>
        {isDefault && (
          <Badge>Default</Badge>
        )}
      </div>
      <div className="text-sm text-muted-foreground">
        {method.type === 'BANK_TRANSFER' && (
          <>
            <p>{method.details.bankName}</p>
            <p>Account ending in {method.details.accountEnding}</p>
          </>
        )}
        {method.type === 'PAYPAL' && (
          <p>{method.details.email}</p>
        )}
      </div>
    </div>
  );
}

export default function PayoutsPage() {
  const { data: payoutsData, isLoading: payoutsLoading } = usePayouts();
  const { data: balance } = usePayoutBalance();
  const { data: schedule } = usePayoutSchedule();
  const { data: methods } = usePayoutMethods();
  const requestPayout = useRequestPayout();

  const payouts = payoutsData?.payouts || mockPayouts;
  const balanceData = balance || mockBalance;
  const scheduleData = schedule || mockSchedule;
  const methodsData = methods || mockMethods;

  const totalEarnings = payouts
    .filter((p) => p.status === 'COMPLETED')
    .reduce((sum, p) => sum + p.netAmount, 0);

  const handleRequestPayout = () => {
    if (balanceData.available < scheduleData.minimumAmount) {
      alert(`Minimum payout amount is ${formatCurrency(scheduleData.minimumAmount)}`);
      return;
    }
    requestPayout.mutate();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Payouts</h1>
          <p className="text-muted-foreground">
            Manage your earnings and payout settings
          </p>
        </div>
        <Button
          onClick={handleRequestPayout}
          disabled={requestPayout.isPending || balanceData.available < scheduleData.minimumAmount}
        >
          {requestPayout.isPending ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <DollarSign className="mr-2 h-4 w-4" />
          )}
          Request Payout
        </Button>
      </div>

      {/* Balance Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card className="bg-gradient-to-br from-primary to-primary/80 text-primary-foreground">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <Wallet className="h-8 w-8 opacity-80" />
                <Badge variant="secondary" className="bg-white/20 text-white border-0">
                  Available
                </Badge>
              </div>
              <p className="text-3xl font-bold">{formatCurrency(balanceData.available)}</p>
              <p className="text-sm opacity-80 mt-1">Ready for payout</p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <Clock className="h-8 w-8 text-muted-foreground" />
                <Badge variant="secondary">Pending</Badge>
              </div>
              <p className="text-3xl font-bold">{formatCurrency(balanceData.pending)}</p>
              <p className="text-sm text-muted-foreground mt-1">Being processed</p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <TrendingUp className="h-8 w-8 text-success" />
                <Badge variant="secondary">Total</Badge>
              </div>
              <p className="text-3xl font-bold text-success">{formatCurrency(totalEarnings)}</p>
              <p className="text-sm text-muted-foreground mt-1">Total earnings</p>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Payout History */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Payout History</CardTitle>
                <CardDescription>Your recent payouts and their status</CardDescription>
              </div>
              <Button variant="outline" size="sm">
                <Download className="mr-2 h-4 w-4" />
                Export
              </Button>
            </CardHeader>
            <CardContent>
              {payoutsLoading ? (
                <div className="flex items-center justify-center h-48">
                  <Loader2 className="h-8 w-8 animate-spin" />
                </div>
              ) : payouts.length === 0 ? (
                <div className="text-center py-12">
                  <Wallet className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground">No payouts yet</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {payouts.map((payout) => (
                    <PayoutCard key={payout.id} payout={payout} />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Payout Schedule */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Payout Schedule</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">Frequency</span>
                </div>
                <span className="font-medium">{scheduleData.frequency}</span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                <div className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">Minimum</span>
                </div>
                <span className="font-medium">{formatCurrency(scheduleData.minimumAmount)}</span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">Hold Period</span>
                </div>
                <span className="font-medium">{scheduleData.holdPeriod} days</span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-primary/10 border border-primary/20">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium">Next Payout</span>
                </div>
                <span className="font-bold text-primary">
                  {new Date(scheduleData.nextPayoutDate).toLocaleDateString()}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Payout Methods */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg">Payout Methods</CardTitle>
              <Button variant="ghost" size="sm">
                <Plus className="mr-2 h-4 w-4" />
                Add
              </Button>
            </CardHeader>
            <CardContent className="space-y-3">
              {methodsData.map((method) => (
                <PayoutMethodCard
                  key={method.id}
                  method={method}
                  isDefault={method.isDefault}
                />
              ))}
            </CardContent>
          </Card>

          {/* Settings Link */}
          <Card>
            <CardContent className="p-4">
              <Button variant="outline" className="w-full">
                <Settings className="mr-2 h-4 w-4" />
                Payout Settings
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
