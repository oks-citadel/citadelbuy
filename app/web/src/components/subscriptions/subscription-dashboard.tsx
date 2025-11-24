'use client';

import {
  useMySubscription,
  useMyBenefits,
  useMyInvoices,
  useCancelSubscription,
  useReactivateSubscription,
} from '@/hooks/useSubscriptions';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { format } from 'date-fns';
import { Check, X, AlertCircle, Calendar, CreditCard } from 'lucide-react';
import Link from 'next/link';
import type { SubscriptionInvoice } from '@/lib/api/subscriptions';

export function SubscriptionDashboard() {
  const { data: subscription, isLoading: subLoading } = useMySubscription();
  const { data: benefits } = useMyBenefits();
  const { data: invoices } = useMyInvoices();
  const cancelSubscription = useCancelSubscription();
  const reactivateSubscription = useReactivateSubscription();

  const handleCancel = () => {
    if (subscription && confirm('Are you sure you want to cancel your subscription?')) {
      cancelSubscription.mutate(subscription.id);
    }
  };

  const handleReactivate = () => {
    if (subscription) {
      reactivateSubscription.mutate(subscription.id);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { variant: any; label: string }> = {
      ACTIVE: { variant: 'default', label: 'Active' },
      TRIAL: { variant: 'secondary', label: 'Trial' },
      CANCELLED: { variant: 'destructive', label: 'Cancelled' },
      EXPIRED: { variant: 'outline', label: 'Expired' },
      PAST_DUE: { variant: 'destructive', label: 'Past Due' },
    };

    const config = statusConfig[status] || statusConfig.ACTIVE;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  if (subLoading) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <div className="h-6 bg-gray-200 rounded w-1/3 animate-pulse" />
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-4 bg-gray-200 rounded animate-pulse" />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!subscription) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>No Active Subscription</CardTitle>
          <CardDescription>You don't have an active subscription yet</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-gray-600 mb-4">
            Subscribe to unlock premium features and benefits!
          </p>
          <Button asChild>
            <Link href="/subscriptions/plans">View Plans</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Current Subscription Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>{subscription.plan.name}</CardTitle>
              <CardDescription>{subscription.plan.description}</CardDescription>
            </div>
            {getStatusBadge(subscription.status)}
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Subscription Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <div className="flex items-center gap-2 text-sm text-gray-600 mb-1">
                <Calendar className="h-4 w-4" />
                <span>Current Period</span>
              </div>
              <p className="font-medium">
                {format(new Date(subscription.currentPeriodStart), 'MMM dd, yyyy')} -{' '}
                {format(new Date(subscription.currentPeriodEnd), 'MMM dd, yyyy')}
              </p>
            </div>

            <div>
              <div className="flex items-center gap-2 text-sm text-gray-600 mb-1">
                <CreditCard className="h-4 w-4" />
                <span>Price</span>
              </div>
              <p className="font-medium">
                ${subscription.plan.price}/{subscription.plan.billingInterval.toLowerCase()}
              </p>
            </div>
          </div>

          {/* Trial Info */}
          {subscription.status === 'TRIAL' && subscription.trialEnd && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-blue-900">Trial Period</p>
                <p className="text-sm text-blue-700">
                  Your trial ends on {format(new Date(subscription.trialEnd), 'MMM dd, yyyy')}
                </p>
              </div>
            </div>
          )}

          {/* Cancellation Warning */}
          {subscription.cancelAtPeriodEnd && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-medium text-amber-900">Subscription Cancelled</p>
                <p className="text-sm text-amber-700">
                  Your subscription will end on{' '}
                  {format(new Date(subscription.currentPeriodEnd), 'MMM dd, yyyy')}
                </p>
              </div>
              <Button variant="outline" size="sm" onClick={handleReactivate}>
                Reactivate
              </Button>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2 pt-4 border-t">
            <Button variant="outline" asChild>
              <Link href="/subscriptions/plans">Change Plan</Link>
            </Button>
            {!subscription.cancelAtPeriodEnd && (
              <Button variant="destructive" onClick={handleCancel}>
                Cancel Subscription
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Benefits Card */}
      {benefits?.hasSubscription && (
        <Card>
          <CardHeader>
            <CardTitle>Your Benefits</CardTitle>
            <CardDescription>Features and perks included in your plan</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {benefits.benefits?.freeShipping && (
                <div className="flex items-center gap-2">
                  <Check className="h-5 w-5 text-green-500" />
                  <span>Free shipping on all orders</span>
                </div>
              )}

              {benefits.benefits?.discountPercent && (
                <div className="flex items-center gap-2">
                  <Check className="h-5 w-5 text-green-500" />
                  <span>{benefits.benefits.discountPercent}% discount</span>
                </div>
              )}

              {benefits.benefits?.earlyAccess && (
                <div className="flex items-center gap-2">
                  <Check className="h-5 w-5 text-green-500" />
                  <span>Early access to sales</span>
                </div>
              )}

              {benefits.prioritySupport && (
                <div className="flex items-center gap-2">
                  <Check className="h-5 w-5 text-green-500" />
                  <span>24/7 priority support</span>
                </div>
              )}

              {benefits.maxProducts && (
                <div className="flex items-center gap-2">
                  <Check className="h-5 w-5 text-green-500" />
                  <span>
                    {benefits.maxProducts === 999999 ? 'Unlimited' : `Up to ${benefits.maxProducts}`} products
                  </span>
                </div>
              )}

              {benefits.maxAds && (
                <div className="flex items-center gap-2">
                  <Check className="h-5 w-5 text-green-500" />
                  <span>
                    {benefits.maxAds === 999999 ? 'Unlimited' : `Up to ${benefits.maxAds}`} active ads
                  </span>
                </div>
              )}

              {benefits.commissionRate !== undefined && (
                <div className="flex items-center gap-2">
                  <Check className="h-5 w-5 text-green-500" />
                  <span>{benefits.commissionRate}% commission rate</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Billing History */}
      {invoices && invoices.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Billing History</CardTitle>
            <CardDescription>Your past invoices and payments</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Period</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoices.map((invoice: SubscriptionInvoice) => (
                  <TableRow key={invoice.id}>
                    <TableCell>{format(new Date(invoice.createdAt), 'MMM dd, yyyy')}</TableCell>
                    <TableCell>
                      {format(new Date(invoice.periodStart), 'MMM dd')} -{' '}
                      {format(new Date(invoice.periodEnd), 'MMM dd, yyyy')}
                    </TableCell>
                    <TableCell>
                      ${invoice.amount.toFixed(2)} {invoice.currency}
                    </TableCell>
                    <TableCell>
                      <Badge variant={invoice.status === 'paid' ? 'default' : 'destructive'}>
                        {invoice.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
