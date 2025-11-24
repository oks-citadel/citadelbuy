'use client';

import { useSubscriptionPlansByType, useSubscribe, useMySubscription } from '@/hooks/useSubscriptions';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Check, Crown, Zap, Rocket } from 'lucide-react';
import type { SubscriptionPlan } from '@/lib/api/subscriptions';

interface SubscriptionPlansProps {
  type: 'customer' | 'vendor';
}

export function SubscriptionPlans({ type }: SubscriptionPlansProps) {
  const { data: plans, isLoading } = useSubscriptionPlansByType(type);
  const { data: currentSubscription } = useMySubscription();
  const subscribe = useSubscribe();

  const getPlanIcon = (planType: string) => {
    if (planType.includes('PREMIUM') || planType.includes('PROFESSIONAL')) {
      return <Crown className="h-6 w-6 text-amber-500" />;
    }
    if (planType.includes('PRO') || planType.includes('ENTERPRISE')) {
      return <Rocket className="h-6 w-6 text-purple-500" />;
    }
    return <Zap className="h-6 w-6 text-blue-500" />;
  };

  const formatPrice = (price: number, interval: string) => {
    if (price === 0) return 'Free';
    const intervalLabel = interval === 'MONTHLY' ? '/mo' : interval === 'QUARTERLY' ? '/quarter' : '/year';
    return `$${price}${intervalLabel}`;
  };

  const handleSubscribe = (planId: string) => {
    subscribe.mutate({ planId });
  };

  const isCurrentPlan = (planId: string) => {
    return currentSubscription?.planId === planId;
  };

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader>
              <div className="h-6 bg-gray-200 rounded w-3/4 mb-2" />
              <div className="h-4 bg-gray-200 rounded w-full" />
            </CardHeader>
            <CardContent>
              <div className="h-12 bg-gray-200 rounded w-1/2 mb-4" />
              <div className="space-y-2">
                {[1, 2, 3].map((j) => (
                  <div key={j} className="h-4 bg-gray-200 rounded" />
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!plans || plans.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">No subscription plans available</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {plans.map((plan: SubscriptionPlan) => {
        const isPopular = plan.type.includes('PREMIUM') || plan.type.includes('PROFESSIONAL');
        const isCurrent = isCurrentPlan(plan.id);

        return (
          <Card
            key={plan.id}
            className={`relative ${isPopular ? 'border-2 border-primary shadow-lg scale-105' : ''}`}
          >
            {isPopular && (
              <Badge className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                Most Popular
              </Badge>
            )}

            <CardHeader>
              <div className="flex items-center justify-between mb-2">
                {getPlanIcon(plan.type)}
                {isCurrent && <Badge variant="secondary">Current Plan</Badge>}
              </div>
              <CardTitle>{plan.name}</CardTitle>
              <CardDescription>{plan.description}</CardDescription>
            </CardHeader>

            <CardContent className="space-y-4">
              <div className="text-4xl font-bold">
                {formatPrice(plan.price, plan.billingInterval)}
              </div>

              {plan.trialDays > 0 && (
                <Badge variant="outline">{plan.trialDays}-day free trial</Badge>
              )}

              <div className="space-y-2 pt-4">
                {plan.benefits.freeShipping && (
                  <div className="flex items-start gap-2">
                    <Check className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                    <span className="text-sm">Free shipping on all orders</span>
                  </div>
                )}

                {plan.benefits.discountPercent && (
                  <div className="flex items-start gap-2">
                    <Check className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                    <span className="text-sm">{plan.benefits.discountPercent}% discount on all purchases</span>
                  </div>
                )}

                {plan.benefits.earlyAccess && (
                  <div className="flex items-start gap-2">
                    <Check className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                    <span className="text-sm">Early access to sales and new products</span>
                  </div>
                )}

                {plan.prioritySupport && (
                  <div className="flex items-start gap-2">
                    <Check className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                    <span className="text-sm">24/7 priority customer support</span>
                  </div>
                )}

                {plan.maxProducts && (
                  <div className="flex items-start gap-2">
                    <Check className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                    <span className="text-sm">
                      List up to {plan.maxProducts === 999999 ? 'unlimited' : plan.maxProducts} products
                    </span>
                  </div>
                )}

                {plan.maxAds && (
                  <div className="flex items-start gap-2">
                    <Check className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                    <span className="text-sm">
                      {plan.maxAds === 999999 ? 'Unlimited' : `Up to ${plan.maxAds}`} active ad campaigns
                    </span>
                  </div>
                )}

                {plan.commissionRate !== undefined && (
                  <div className="flex items-start gap-2">
                    <Check className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                    <span className="text-sm">
                      {plan.commissionRate}% platform commission rate
                    </span>
                  </div>
                )}

                {plan.benefits.features?.map((feature, index) => (
                  <div key={index} className="flex items-start gap-2">
                    <Check className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                    <span className="text-sm">{feature}</span>
                  </div>
                ))}
              </div>
            </CardContent>

            <CardFooter>
              {isCurrent ? (
                <Button variant="outline" className="w-full" disabled>
                  Current Plan
                </Button>
              ) : (
                <Button
                  className="w-full"
                  variant={isPopular ? 'default' : 'outline'}
                  onClick={() => handleSubscribe(plan.id)}
                  disabled={subscribe.isPending || currentSubscription?.status === 'ACTIVE'}
                >
                  {subscribe.isPending ? 'Subscribing...' : 'Subscribe Now'}
                </Button>
              )}
            </CardFooter>
          </Card>
        );
      })}
    </div>
  );
}
