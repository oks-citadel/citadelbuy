'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  useMyStoreCredit,
  useStoreCreditHistory,
  StoreCreditType,
  TransactionType,
} from '@/lib/api/gift-cards';
import { Wallet, TrendingUp, TrendingDown, Clock, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';
import { Alert, AlertDescription } from '@/components/ui/alert';

export function StoreCreditDisplay() {
  const { data: storeCredit, isLoading, isError } = useMyStoreCredit();
  const { data: history } = useStoreCreditHistory({ limit: 10 });

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-muted rounded w-1/2" />
            <div className="h-4 bg-muted rounded w-3/4" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (isError || !storeCredit) {
    return (
      <Card>
        <CardContent className="p-6">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Failed to load store credit. Please try again later.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  const typeConfig = {
    [StoreCreditType.REFUND]: { label: 'Refund', color: 'bg-blue-100 text-blue-800' },
    [StoreCreditType.COMPENSATION]: { label: 'Compensation', color: 'bg-green-100 text-green-800' },
    [StoreCreditType.PROMOTIONAL]: { label: 'Promotional', color: 'bg-purple-100 text-purple-800' },
    [StoreCreditType.GIFT]: { label: 'Gift', color: 'bg-pink-100 text-pink-800' },
    [StoreCreditType.LOYALTY]: { label: 'Loyalty', color: 'bg-yellow-100 text-yellow-800' },
  };

  return (
    <div className="space-y-4">
      {/* Balance Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wallet className="h-5 w-5" />
            Store Credit Balance
          </CardTitle>
          <CardDescription>
            Your available credit for future purchases
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Main Balance */}
            <div className="text-center p-6 bg-gradient-to-br from-green-500 to-emerald-600 rounded-lg text-white">
              <p className="text-sm opacity-90 mb-1">Available Balance</p>
              <p className="text-4xl font-bold">
                ${storeCredit.currentBalance.toFixed(2)}
              </p>
              <p className="text-xs opacity-80 mt-2">
                {storeCredit.currency}
              </p>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                <div className="flex items-center gap-2 text-green-700 mb-1">
                  <TrendingUp className="h-4 w-4" />
                  <span className="text-xs font-medium">Total Earned</span>
                </div>
                <p className="text-xl font-bold text-green-900">
                  ${storeCredit.totalEarned.toFixed(2)}
                </p>
              </div>

              <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                <div className="flex items-center gap-2 text-gray-700 mb-1">
                  <TrendingDown className="h-4 w-4" />
                  <span className="text-xs font-medium">Total Spent</span>
                </div>
                <p className="text-xl font-bold text-gray-900">
                  ${storeCredit.totalSpent.toFixed(2)}
                </p>
              </div>
            </div>

            {/* Expiration Notice */}
            {storeCredit.expirationDate && (
              <Alert>
                <Clock className="h-4 w-4" />
                <AlertDescription>
                  Store credit expires on{' '}
                  {format(new Date(storeCredit.expirationDate), 'MMMM d, yyyy')}
                </AlertDescription>
              </Alert>
            )}

            {/* Minimum Purchase */}
            {storeCredit.minimumPurchase && storeCredit.minimumPurchase > 0 && (
              <p className="text-xs text-muted-foreground text-center">
                Minimum purchase of ${storeCredit.minimumPurchase.toFixed(2)} required to use store credit
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Transaction History */}
      {history && history.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Recent Transactions</CardTitle>
            <CardDescription>
              Your store credit transaction history
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {history.map((transaction) => (
                <div
                  key={transaction.id}
                  className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                >
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      {transaction.transactionType === TransactionType.PURCHASE ||
                      transaction.transactionType === TransactionType.REDEMPTION ? (
                        <TrendingDown className="h-4 w-4 text-red-500" />
                      ) : (
                        <TrendingUp className="h-4 w-4 text-green-500" />
                      )}
                      <p className="text-sm font-medium">{transaction.description}</p>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Badge variant="outline" className={typeConfig[transaction.type].color}>
                        {typeConfig[transaction.type].label}
                      </Badge>
                      <span>{format(new Date(transaction.createdAt), 'MMM d, yyyy')}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p
                      className={`text-lg font-bold ${
                        transaction.transactionType === TransactionType.PURCHASE ||
                        transaction.transactionType === TransactionType.REDEMPTION
                          ? 'text-red-600'
                          : 'text-green-600'
                      }`}
                    >
                      {transaction.transactionType === TransactionType.PURCHASE ||
                      transaction.transactionType === TransactionType.REDEMPTION
                        ? '-'
                        : '+'}
                      ${transaction.amount.toFixed(2)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Balance: ${transaction.balanceAfter.toFixed(2)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
