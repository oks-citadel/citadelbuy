'use client';

import React from 'react';
import { CreditCard, Calendar, AlertCircle, CheckCircle2, Crown } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatCurrency, formatDate } from '@/lib/utils';
import { Alert, AlertDescription } from '@/components/ui/alert';

export interface BillingData {
  plan: {
    name: string;
    price: number;
    interval: 'monthly' | 'yearly';
  };
  subscription: {
    status: 'active' | 'canceled' | 'past_due' | 'trialing';
    currentPeriodStart: string;
    currentPeriodEnd: string;
    cancelAtPeriodEnd: boolean;
  };
  paymentMethod?: {
    type: string;
    last4: string;
    brand: string;
    expiryMonth: number;
    expiryYear: number;
  };
}

interface BillingOverviewProps {
  billing: BillingData;
  onManagePayment?: () => void;
  onUpgrade?: () => void;
  onCancelSubscription?: () => void;
}

const getStatusBadge = (status: BillingData['subscription']['status']) => {
  switch (status) {
    case 'active':
      return (
        <Badge variant="success" className="gap-1">
          <CheckCircle2 className="h-3 w-3" />
          Active
        </Badge>
      );
    case 'trialing':
      return (
        <Badge variant="secondary" className="gap-1">
          <Crown className="h-3 w-3" />
          Trial
        </Badge>
      );
    case 'past_due':
      return (
        <Badge variant="destructive" className="gap-1">
          <AlertCircle className="h-3 w-3" />
          Past Due
        </Badge>
      );
    case 'canceled':
      return (
        <Badge variant="secondary" className="gap-1">
          Canceled
        </Badge>
      );
    default:
      return <Badge variant="secondary">{status}</Badge>;
  }
};

export function BillingOverview({
  billing,
  onManagePayment,
  onUpgrade,
  onCancelSubscription,
}: BillingOverviewProps) {
  const { plan, subscription, paymentMethod } = billing;

  return (
    <div className="space-y-6">
      {/* Current Plan Card */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle>Current Plan</CardTitle>
              <CardDescription>Your subscription details and status</CardDescription>
            </div>
            {getStatusBadge(subscription.status)}
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-2xl font-bold">{plan.name}</h3>
              <p className="text-muted-foreground mt-1">
                {plan.price === 0 ? (
                  'Free forever'
                ) : (
                  <>
                    {formatCurrency(plan.price)} / {plan.interval === 'monthly' ? 'month' : 'year'}
                  </>
                )}
              </p>
            </div>
            {plan.name !== 'Enterprise' && onUpgrade && (
              <Button onClick={onUpgrade} variant="default">
                <Crown className="h-4 w-4 mr-2" />
                Upgrade Plan
              </Button>
            )}
          </div>

          <div className="grid gap-4 md:grid-cols-2 pt-4 border-t">
            <div className="flex items-start gap-3">
              <Calendar className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="text-sm font-medium">Billing Period</p>
                <p className="text-sm text-muted-foreground mt-1">
                  {formatDate(subscription.currentPeriodStart)} -{' '}
                  {formatDate(subscription.currentPeriodEnd)}
                </p>
              </div>
            </div>

            {paymentMethod && (
              <div className="flex items-start gap-3">
                <CreditCard className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm font-medium">Payment Method</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {paymentMethod.brand} ending in {paymentMethod.last4}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Expires {paymentMethod.expiryMonth}/{paymentMethod.expiryYear}
                  </p>
                </div>
              </div>
            )}
          </div>

          {subscription.cancelAtPeriodEnd && (
            <Alert variant="warning">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Your subscription will be canceled on {formatDate(subscription.currentPeriodEnd)}.
                You'll continue to have access until then.
              </AlertDescription>
            </Alert>
          )}

          {subscription.status === 'past_due' && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Your payment is past due. Please update your payment method to avoid service
                interruption.
              </AlertDescription>
            </Alert>
          )}

          <div className="flex gap-3 pt-4 border-t">
            {onManagePayment && (
              <Button onClick={onManagePayment} variant="outline">
                Manage Payment Method
              </Button>
            )}
            {onCancelSubscription && !subscription.cancelAtPeriodEnd && plan.price > 0 && (
              <Button onClick={onCancelSubscription} variant="ghost">
                Cancel Subscription
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Next Billing Date */}
      {!subscription.cancelAtPeriodEnd && subscription.status === 'active' && plan.price > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Next Billing Date</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">
                  You'll be charged on {formatDate(subscription.currentPeriodEnd)}
                </p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold">{formatCurrency(plan.price)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
