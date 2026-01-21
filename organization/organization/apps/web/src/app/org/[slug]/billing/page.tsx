'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { CreditCard, FileText, Loader2, ArrowRight } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { BillingOverview, BillingData } from '@/components/billing/BillingOverview';
import { UsageMetrics, UsageData } from '@/components/billing/UsageMetrics';
import { organizationsApi } from '@/lib/organizations-api';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';

export default function BillingPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;

  const [billingData, setBillingData] = useState<BillingData | null>(null);
  const [usageData, setUsageData] = useState<UsageData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [isCanceling, setIsCanceling] = useState(false);

  useEffect(() => {
    loadBillingData();
  }, [slug]);

  const loadBillingData = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const data = await organizationsApi.getBilling(slug);
      setBillingData({
        plan: data.plan,
        subscription: data.subscription,
        paymentMethod: data.paymentMethod
      });
      setUsageData(data.usage);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load billing data');
      toast.error('Failed to load billing information');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpgrade = () => {
    router.push(`/org/${slug}/billing/plans`);
  };

  const handleManagePayment = () => {
    toast.info('Payment management coming soon');
  };

  const handleCancelSubscription = async () => {
    try {
      setIsCanceling(true);

      await organizationsApi.cancelSubscription(slug, true);
      toast.success('Subscription will be canceled at the end of the billing period');
      setShowCancelDialog(false);
      loadBillingData();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to cancel subscription');
    } finally {
      setIsCanceling(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Billing & Subscription</h1>
          <p className="text-muted-foreground mt-2">
            Manage your subscription, payment methods, and view invoices
          </p>
        </div>
        <Alert variant="destructive">
          <AlertDescription>
            <div className="space-y-2">
              <p className="font-medium">Unable to Load Billing Data</p>
              <p>{error}</p>
              <Button
                variant="outline"
                size="sm"
                onClick={loadBillingData}
                className="mt-2"
              >
                Retry
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (!billingData || !usageData) {
    return null;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Billing & Subscription</h1>
        <p className="text-muted-foreground mt-2">
          Manage your subscription, payment methods, and view invoices
        </p>
      </div>

      {/* Current Usage */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Current Usage</h2>
        <UsageMetrics usage={usageData} />
      </div>

      {/* Billing Overview */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Subscription Details</h2>
        <BillingOverview
          billing={billingData}
          onUpgrade={handleUpgrade}
          onManagePayment={handleManagePayment}
          onCancelSubscription={() => setShowCancelDialog(true)}
        />
      </div>

      {/* Quick Actions */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => router.push(`/org/${slug}/billing/plans`)}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              View All Plans
            </CardTitle>
            <CardDescription>
              Compare plans and upgrade your subscription
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="ghost" className="w-full justify-between">
              Browse Plans
              <ArrowRight className="h-4 w-4" />
            </Button>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => router.push(`/org/${slug}/billing/invoices`)}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Invoice History
            </CardTitle>
            <CardDescription>
              View and download past invoices
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="ghost" className="w-full justify-between">
              View Invoices
              <ArrowRight className="h-4 w-4" />
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Cancel Subscription Dialog */}
      <Dialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancel Subscription</DialogTitle>
            <DialogDescription>
              Are you sure you want to cancel your subscription? You'll continue to have access
              until the end of your billing period on{' '}
              {new Date(billingData.subscription.currentPeriodEnd).toLocaleDateString()}.
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-3 mt-4">
            <Button
              variant="destructive"
              onClick={handleCancelSubscription}
              isLoading={isCanceling}
              className="flex-1"
            >
              Yes, Cancel Subscription
            </Button>
            <Button
              variant="outline"
              onClick={() => setShowCancelDialog(false)}
              disabled={isCanceling}
            >
              Keep Subscription
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
