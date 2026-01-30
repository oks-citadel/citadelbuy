'use client';

import React, { useState, useEffect } from 'react';
import {
  CreditCard,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Loader2,
  RefreshCcw,
  Crown,
  Clock,
  Settings,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Progress } from '@/components/ui/progress';

interface Subscription {
  id: string;
  status: 'active' | 'trialing' | 'past_due' | 'canceled' | 'incomplete';
  planId: string;
  planName: string;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  cancelAtPeriodEnd: boolean;
  trialEnd?: string;
  provider: 'STRIPE' | 'PAYPAL' | 'APPLE_IAP' | 'GOOGLE_IAP';
  amount: number;
  currency: string;
  interval: 'month' | 'year';
}

interface PaymentMethod {
  id: string;
  brand: string;
  last4: string;
  expMonth: number;
  expYear: number;
  isDefault: boolean;
}

interface SubscriptionManagerProps {
  onUpgrade?: () => void;
  onManagePayment?: () => void;
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
  post: async (url: string, body?: any) => {
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || ''}${url}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    return res.json();
  },
};

export function SubscriptionManager({ onUpgrade, onManagePayment }: SubscriptionManagerProps) {
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCanceling, setIsCanceling] = useState(false);
  const [isReactivating, setIsReactivating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadSubscriptionData();
  }, []);

  const loadSubscriptionData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      // Get current subscription
      const subRes = await api.get('/api/user/subscription');
      if (subRes.success && subRes.subscription) {
        setSubscription(subRes.subscription);

        // Get subscription status from provider
        if (subRes.subscription.id) {
          const statusRes = await api.get(
            `/api/payments/subscriptions/${subRes.subscription.id}/status?provider=${subRes.subscription.provider}`
          );
          if (statusRes.success) {
            setSubscription(prev => prev ? { ...prev, ...statusRes } : null);
          }
        }
      }

      // Get default payment method
      const pmRes = await api.get('/api/user/payment-methods');
      if (pmRes.success && pmRes.paymentMethods?.length > 0) {
        const defaultPm = pmRes.paymentMethods.find((pm: PaymentMethod) => pm.isDefault) || pmRes.paymentMethods[0];
        setPaymentMethod(defaultPm);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load subscription data');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancelSubscription = async (immediately: boolean = false) => {
    if (!subscription) return;

    setIsCanceling(true);
    try {
      const response = await api.post(
        `/api/payments/subscriptions/${subscription.id}/cancel?immediately=${immediately}&provider=${subscription.provider}`
      );

      if (response.success) {
        await loadSubscriptionData();
      } else {
        setError(response.error?.message || 'Failed to cancel subscription');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to cancel subscription');
    } finally {
      setIsCanceling(false);
    }
  };

  const handleReactivateSubscription = async () => {
    if (!subscription) return;

    setIsReactivating(true);
    try {
      const response = await api.post(
        `/api/payments/subscriptions/${subscription.id}/reactivate?provider=${subscription.provider}`
      );

      if (response.success) {
        await loadSubscriptionData();
      } else {
        setError(response.error?.message || 'Failed to reactivate subscription');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to reactivate subscription');
    } finally {
      setIsReactivating(false);
    }
  };

  const getStatusBadge = (status: string, cancelAtPeriodEnd: boolean) => {
    if (cancelAtPeriodEnd) {
      return <Badge variant="destructive">Cancels at period end</Badge>;
    }

    switch (status) {
      case 'active':
        return <Badge className="bg-green-500">Active</Badge>;
      case 'trialing':
        return <Badge className="bg-blue-500">Trial</Badge>;
      case 'past_due':
        return <Badge variant="destructive">Past Due</Badge>;
      case 'canceled':
        return <Badge variant="secondary">Canceled</Badge>;
      case 'incomplete':
        return <Badge variant="outline">Incomplete</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const getDaysRemaining = () => {
    if (!subscription) return 0;
    const end = new Date(subscription.currentPeriodEnd);
    const now = new Date();
    const diff = end.getTime() - now.getTime();
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  };

  const getPeriodProgress = () => {
    if (!subscription) return 0;
    const start = new Date(subscription.currentPeriodStart).getTime();
    const end = new Date(subscription.currentPeriodEnd).getTime();
    const now = Date.now();
    const total = end - start;
    const elapsed = now - start;
    return Math.min(100, Math.max(0, (elapsed / total) * 100));
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!subscription) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Crown className="h-5 w-5" />
            No Active Subscription
          </CardTitle>
          <CardDescription>
            Subscribe to unlock premium features
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <Crown className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
            <p className="text-muted-foreground mb-4">
              You don&apos;t have an active subscription yet.
            </p>
            <Button onClick={onUpgrade}>
              View Plans
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            {error}
          </div>
        </div>
      )}

      {/* Subscription Overview */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Crown className="h-5 w-5 text-primary" />
              <CardTitle>{subscription.planName}</CardTitle>
            </div>
            {getStatusBadge(subscription.status, subscription.cancelAtPeriodEnd)}
          </div>
          <CardDescription>
            ${subscription.amount.toFixed(2)} / {subscription.interval}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Billing Period Progress */}
          <div>
            <div className="flex justify-between text-sm mb-2">
              <span className="text-muted-foreground">Billing Period</span>
              <span className="font-medium">{getDaysRemaining()} days remaining</span>
            </div>
            <Progress value={getPeriodProgress()} className="h-2" />
            <div className="flex justify-between text-xs text-muted-foreground mt-1">
              <span>{formatDate(subscription.currentPeriodStart)}</span>
              <span>{formatDate(subscription.currentPeriodEnd)}</span>
            </div>
          </div>

          {/* Trial Info */}
          {subscription.status === 'trialing' && subscription.trialEnd && (
            <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-lg">
              <Clock className="h-5 w-5 text-blue-500" />
              <div>
                <p className="font-medium text-blue-900">Trial Period</p>
                <p className="text-sm text-blue-700">
                  Your trial ends on {formatDate(subscription.trialEnd)}
                </p>
              </div>
            </div>
          )}

          {/* Cancellation Warning */}
          {subscription.cancelAtPeriodEnd && (
            <div className="flex items-center gap-2 p-3 bg-yellow-50 rounded-lg">
              <AlertTriangle className="h-5 w-5 text-yellow-500" />
              <div>
                <p className="font-medium text-yellow-900">Subscription Ending</p>
                <p className="text-sm text-yellow-700">
                  Your subscription will end on {formatDate(subscription.currentPeriodEnd)}
                </p>
              </div>
            </div>
          )}

          {/* Past Due Warning */}
          {subscription.status === 'past_due' && (
            <div className="flex items-center gap-2 p-3 bg-red-50 rounded-lg">
              <XCircle className="h-5 w-5 text-red-500" />
              <div>
                <p className="font-medium text-red-900">Payment Failed</p>
                <p className="text-sm text-red-700">
                  Please update your payment method to continue your subscription
                </p>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-wrap gap-3 pt-4">
            {subscription.cancelAtPeriodEnd ? (
              <Button
                onClick={handleReactivateSubscription}
                disabled={isReactivating}
              >
                {isReactivating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Reactivating...
                  </>
                ) : (
                  <>
                    <RefreshCcw className="mr-2 h-4 w-4" />
                    Reactivate Subscription
                  </>
                )}
              </Button>
            ) : subscription.status !== 'canceled' ? (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive">
                    Cancel Subscription
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Cancel Subscription?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Choose how you want to cancel your subscription:
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <div className="space-y-3 py-4">
                    <Button
                      variant="outline"
                      className="w-full justify-start"
                      onClick={() => handleCancelSubscription(false)}
                      disabled={isCanceling}
                    >
                      <Calendar className="mr-2 h-4 w-4" />
                      Cancel at end of billing period
                      <span className="ml-auto text-xs text-muted-foreground">
                        ({formatDate(subscription.currentPeriodEnd)})
                      </span>
                    </Button>
                    <Button
                      variant="destructive"
                      className="w-full justify-start"
                      onClick={() => handleCancelSubscription(true)}
                      disabled={isCanceling}
                    >
                      <XCircle className="mr-2 h-4 w-4" />
                      Cancel immediately
                    </Button>
                  </div>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Keep Subscription</AlertDialogCancel>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            ) : null}

            <Button variant="outline" onClick={onUpgrade}>
              Change Plan
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Payment Method */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-primary" />
              <CardTitle>Payment Method</CardTitle>
            </div>
            <Button variant="ghost" size="sm" onClick={onManagePayment}>
              <Settings className="h-4 w-4 mr-1" />
              Manage
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {paymentMethod ? (
            <div className="flex items-center gap-4">
              <div className="p-3 bg-muted rounded-lg">
                <CreditCard className="h-6 w-6" />
              </div>
              <div>
                <p className="font-medium capitalize">
                  {paymentMethod.brand} •••• {paymentMethod.last4}
                </p>
                <p className="text-sm text-muted-foreground">
                  Expires {paymentMethod.expMonth}/{paymentMethod.expYear}
                </p>
              </div>
              {paymentMethod.isDefault && (
                <Badge variant="secondary" className="ml-auto">
                  Default
                </Badge>
              )}
            </div>
          ) : (
            <div className="text-center py-4">
              <CreditCard className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
              <p className="text-muted-foreground">No payment method on file</p>
              <Button variant="link" onClick={onManagePayment}>
                Add payment method
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Provider Info */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Payment Provider</span>
            <Badge variant="outline">{subscription.provider}</Badge>
          </div>
          {subscription.provider === 'APPLE_IAP' && (
            <p className="text-xs text-muted-foreground mt-2">
              Manage this subscription through your Apple ID settings
            </p>
          )}
          {subscription.provider === 'GOOGLE_IAP' && (
            <p className="text-xs text-muted-foreground mt-2">
              Manage this subscription through Google Play Store
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default SubscriptionManager;
