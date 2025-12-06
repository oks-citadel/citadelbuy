'use client';

import React, { useState } from 'react';
import { Check, Loader2, Sparkles, Crown, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

export interface PlanFeature {
  name: string;
  included: boolean;
  tooltip?: string;
}

export interface PricingPlan {
  id: string;
  name: string;
  description: string;
  monthlyPrice: number;
  yearlyPrice: number;
  currency: string;
  features: PlanFeature[];
  highlighted?: boolean;
  badge?: string;
  icon?: 'basic' | 'premium' | 'vip';
  stripePriceId?: {
    monthly: string;
    yearly: string;
  };
}

interface PricingPlansProps {
  plans?: PricingPlan[];
  currentPlanId?: string;
  onSelectPlan: (plan: PricingPlan, billingPeriod: 'monthly' | 'yearly') => void;
  isLoading?: boolean;
  showToggle?: boolean;
}

const defaultPlans: PricingPlan[] = [
  {
    id: 'basic',
    name: 'Basic',
    description: 'Perfect for getting started',
    monthlyPrice: 4.99,
    yearlyPrice: 49.99,
    currency: 'USD',
    icon: 'basic',
    features: [
      { name: 'Up to 100 products', included: true },
      { name: 'Basic analytics', included: true },
      { name: 'Email support', included: true },
      { name: 'Standard checkout', included: true },
      { name: 'Priority support', included: false },
      { name: 'Advanced analytics', included: false },
      { name: 'Custom domain', included: false },
      { name: 'API access', included: false },
    ],
    stripePriceId: {
      monthly: 'price_basic_monthly',
      yearly: 'price_basic_yearly',
    },
  },
  {
    id: 'premium',
    name: 'Premium',
    description: 'Best for growing businesses',
    monthlyPrice: 9.99,
    yearlyPrice: 99.99,
    currency: 'USD',
    icon: 'premium',
    highlighted: true,
    badge: 'Most Popular',
    features: [
      { name: 'Unlimited products', included: true },
      { name: 'Advanced analytics', included: true },
      { name: 'Priority support', included: true },
      { name: 'Enhanced checkout', included: true },
      { name: 'Custom domain', included: true },
      { name: 'API access', included: true },
      { name: 'Dedicated account manager', included: false },
      { name: 'Custom integrations', included: false },
    ],
    stripePriceId: {
      monthly: 'price_premium_monthly',
      yearly: 'price_premium_yearly',
    },
  },
  {
    id: 'vip',
    name: 'VIP',
    description: 'For enterprise-level needs',
    monthlyPrice: 19.99,
    yearlyPrice: 199.99,
    currency: 'USD',
    icon: 'vip',
    features: [
      { name: 'Everything in Premium', included: true },
      { name: 'Dedicated account manager', included: true },
      { name: 'Custom integrations', included: true },
      { name: 'White-label options', included: true },
      { name: 'SLA guarantee', included: true },
      { name: '24/7 phone support', included: true },
      { name: 'Custom reporting', included: true },
      { name: 'Onboarding assistance', included: true },
    ],
    stripePriceId: {
      monthly: 'price_vip_monthly',
      yearly: 'price_vip_yearly',
    },
  },
];

const PlanIcon = ({ icon }: { icon?: string }) => {
  switch (icon) {
    case 'premium':
      return <Sparkles className="h-6 w-6 text-purple-500" />;
    case 'vip':
      return <Crown className="h-6 w-6 text-yellow-500" />;
    default:
      return <Zap className="h-6 w-6 text-blue-500" />;
  }
};

export function PricingPlans({
  plans = defaultPlans,
  currentPlanId,
  onSelectPlan,
  isLoading = false,
  showToggle = true,
}: PricingPlansProps) {
  const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'yearly'>('monthly');
  const [loadingPlanId, setLoadingPlanId] = useState<string | null>(null);

  const handleSelectPlan = async (plan: PricingPlan) => {
    setLoadingPlanId(plan.id);
    try {
      await onSelectPlan(plan, billingPeriod);
    } finally {
      setLoadingPlanId(null);
    }
  };

  const getPrice = (plan: PricingPlan) => {
    return billingPeriod === 'monthly' ? plan.monthlyPrice : plan.yearlyPrice;
  };

  const getSavings = (plan: PricingPlan) => {
    const monthlyCost = plan.monthlyPrice * 12;
    const yearlyCost = plan.yearlyPrice;
    const savings = ((monthlyCost - yearlyCost) / monthlyCost) * 100;
    return Math.round(savings);
  };

  return (
    <div className="w-full">
      {/* Billing toggle */}
      {showToggle && (
        <div className="flex items-center justify-center gap-4 mb-8">
          <Label
            htmlFor="billing-toggle"
            className={billingPeriod === 'monthly' ? 'font-semibold' : 'text-muted-foreground'}
          >
            Monthly
          </Label>
          <Switch
            id="billing-toggle"
            checked={billingPeriod === 'yearly'}
            onCheckedChange={(checked: boolean) => setBillingPeriod(checked ? 'yearly' : 'monthly')}
          />
          <Label
            htmlFor="billing-toggle"
            className={billingPeriod === 'yearly' ? 'font-semibold' : 'text-muted-foreground'}
          >
            Yearly
            <Badge variant="secondary" className="ml-2 text-xs">
              Save up to {Math.max(...plans.map(getSavings))}%
            </Badge>
          </Label>
        </div>
      )}

      {/* Pricing cards */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {plans.map((plan) => {
          const isCurrentPlan = currentPlanId === plan.id;
          const isPlanLoading = loadingPlanId === plan.id;

          return (
            <Card
              key={plan.id}
              className={`relative flex flex-col ${
                plan.highlighted
                  ? 'border-primary shadow-lg scale-105'
                  : 'border-border'
              }`}
            >
              {plan.badge && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <Badge className="bg-primary text-primary-foreground">
                    {plan.badge}
                  </Badge>
                </div>
              )}

              <CardHeader className="text-center pb-2">
                <div className="flex justify-center mb-2">
                  <PlanIcon icon={plan.icon} />
                </div>
                <CardTitle className="text-2xl">{plan.name}</CardTitle>
                <CardDescription>{plan.description}</CardDescription>
              </CardHeader>

              <CardContent className="flex-grow">
                <div className="text-center mb-6">
                  <span className="text-4xl font-bold">
                    ${getPrice(plan).toFixed(2)}
                  </span>
                  <span className="text-muted-foreground">
                    /{billingPeriod === 'monthly' ? 'mo' : 'yr'}
                  </span>
                  {billingPeriod === 'yearly' && (
                    <p className="text-sm text-green-600 mt-1">
                      Save {getSavings(plan)}% vs monthly
                    </p>
                  )}
                </div>

                <ul className="space-y-3">
                  {plan.features.map((feature, index) => (
                    <li
                      key={index}
                      className={`flex items-center gap-2 text-sm ${
                        feature.included ? '' : 'text-muted-foreground'
                      }`}
                    >
                      <Check
                        className={`h-4 w-4 flex-shrink-0 ${
                          feature.included ? 'text-green-500' : 'text-gray-300'
                        }`}
                      />
                      <span>{feature.name}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>

              <CardFooter>
                <Button
                  className="w-full"
                  variant={plan.highlighted ? 'default' : 'outline'}
                  disabled={isCurrentPlan || isLoading || isPlanLoading}
                  onClick={() => handleSelectPlan(plan)}
                >
                  {isPlanLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Processing...
                    </>
                  ) : isCurrentPlan ? (
                    'Current Plan'
                  ) : (
                    'Get Started'
                  )}
                </Button>
              </CardFooter>
            </Card>
          );
        })}
      </div>

      {/* Money-back guarantee */}
      <p className="text-center text-sm text-muted-foreground mt-8">
        30-day money-back guarantee. No questions asked.
      </p>
    </div>
  );
}

export default PricingPlans;
