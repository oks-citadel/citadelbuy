'use client';

import React, { useState } from 'react';
import { PlanCard, Plan } from './PlanCard';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

const AVAILABLE_PLANS: Plan[] = [
  {
    id: 'free',
    name: 'Free',
    description: 'Perfect for trying out CitadelBuy',
    price: {
      monthly: 0,
      yearly: 0,
    },
    features: [
      'Up to 5 team members',
      'Up to 100 products',
      'Basic analytics',
      'Email support',
      'Standard security',
    ],
    limits: {
      members: 5,
      products: 100,
      apiCalls: 1000,
    },
  },
  {
    id: 'pro',
    name: 'Pro',
    description: 'For growing businesses',
    price: {
      monthly: 49,
      yearly: 470,
    },
    features: [
      'Up to 50 team members',
      'Up to 5,000 products',
      'Advanced analytics',
      'Priority support',
      'Advanced security features',
      'Custom integrations',
      'API access',
      'Bulk operations',
    ],
    limits: {
      members: 50,
      products: 5000,
      apiCalls: 50000,
    },
    popular: true,
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    description: 'For large-scale operations',
    price: {
      monthly: 199,
      yearly: 1990,
    },
    features: [
      'Unlimited team members',
      'Unlimited products',
      'Custom analytics & reporting',
      'Dedicated account manager',
      'Enterprise-grade security',
      'Custom integrations',
      'Unlimited API access',
      'SLA guarantee',
      'White-label options',
      'Advanced automation',
      'Custom training',
    ],
    limits: {
      members: -1,
      products: -1,
      apiCalls: -1,
    },
  },
];

interface PlanSelectorProps {
  currentPlanId?: string;
  onPlanSelect: (planId: string, interval: 'monthly' | 'yearly') => void;
  isLoading?: boolean;
}

export function PlanSelector({ currentPlanId, onPlanSelect, isLoading }: PlanSelectorProps) {
  const [interval, setInterval] = useState<'monthly' | 'yearly'>('monthly');

  return (
    <div className="space-y-8">
      <div className="flex justify-center">
        <Tabs value={interval} onValueChange={(value) => setInterval(value as 'monthly' | 'yearly')}>
          <TabsList className="grid w-full grid-cols-2 max-w-md">
            <TabsTrigger value="monthly">Monthly</TabsTrigger>
            <TabsTrigger value="yearly">
              Yearly
              <span className="ml-2 text-xs text-green-600">(Save up to 20%)</span>
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <div className="grid gap-8 md:grid-cols-3 mt-8">
        {AVAILABLE_PLANS.map((plan) => (
          <PlanCard
            key={plan.id}
            plan={{
              ...plan,
              current: plan.id === currentPlanId,
            }}
            interval={interval}
            onSelect={() => onPlanSelect(plan.id, interval)}
            isLoading={isLoading}
          />
        ))}
      </div>

      <div className="mt-8 text-center text-sm text-muted-foreground">
        <p>All plans include a 14-day free trial. No credit card required.</p>
        <p className="mt-1">Cancel anytime with no questions asked.</p>
      </div>
    </div>
  );
}

export { AVAILABLE_PLANS };
