'use client';

import React from 'react';
import { Check, Crown } from 'lucide-react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn, formatCurrency } from '@/lib/utils';

export interface Plan {
  id: string;
  name: string;
  description: string;
  price: {
    monthly: number;
    yearly: number;
  };
  features: string[];
  limits: {
    members: number;
    products: number;
    apiCalls: number;
  };
  popular?: boolean;
  current?: boolean;
}

interface PlanCardProps {
  plan: Plan;
  interval: 'monthly' | 'yearly';
  onSelect?: () => void;
  isLoading?: boolean;
  className?: string;
}

export function PlanCard({ plan, interval, onSelect, isLoading, className }: PlanCardProps) {
  const price = interval === 'monthly' ? plan.price.monthly : plan.price.yearly;
  const yearlyDiscount = plan.price.yearly > 0
    ? Math.round(((plan.price.monthly * 12 - plan.price.yearly) / (plan.price.monthly * 12)) * 100)
    : 0;

  return (
    <Card
      className={cn(
        'relative flex flex-col',
        plan.popular && 'border-primary shadow-lg',
        plan.current && 'border-green-500',
        className
      )}
    >
      {plan.popular && (
        <div className="absolute -top-4 left-1/2 -translate-x-1/2">
          <Badge className="bg-primary text-primary-foreground px-3 py-1">
            <Crown className="h-3 w-3 mr-1" />
            Most Popular
          </Badge>
        </div>
      )}

      {plan.current && (
        <div className="absolute -top-4 right-4">
          <Badge variant="success">Current Plan</Badge>
        </div>
      )}

      <CardHeader className="text-center pb-8 pt-6">
        <CardTitle className="text-2xl">{plan.name}</CardTitle>
        <CardDescription className="mt-2">{plan.description}</CardDescription>
        <div className="mt-4">
          <div className="flex items-baseline justify-center gap-2">
            <span className="text-4xl font-bold">
              {price === 0 ? 'Free' : formatCurrency(price)}
            </span>
            {price > 0 && (
              <span className="text-muted-foreground">
                / {interval === 'monthly' ? 'month' : 'year'}
              </span>
            )}
          </div>
          {interval === 'yearly' && yearlyDiscount > 0 && (
            <p className="text-sm text-green-600 mt-2">
              Save {yearlyDiscount}% with yearly billing
            </p>
          )}
        </div>
      </CardHeader>

      <CardContent className="flex-1">
        <ul className="space-y-3">
          {plan.features.map((feature, index) => (
            <li key={index} className="flex items-start gap-3">
              <Check className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
              <span className="text-sm">{feature}</span>
            </li>
          ))}
        </ul>

        <div className="mt-6 pt-6 border-t space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Team Members</span>
            <span className="font-medium">
              {plan.limits.members === -1 ? 'Unlimited' : plan.limits.members}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Products</span>
            <span className="font-medium">
              {plan.limits.products === -1 ? 'Unlimited' : plan.limits.products}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">API Calls/month</span>
            <span className="font-medium">
              {plan.limits.apiCalls === -1 ? 'Unlimited' : plan.limits.apiCalls.toLocaleString()}
            </span>
          </div>
        </div>
      </CardContent>

      <CardFooter>
        <Button
          onClick={onSelect}
          disabled={plan.current || isLoading}
          variant={plan.popular ? 'default' : 'outline'}
          className="w-full"
          isLoading={isLoading}
        >
          {plan.current ? 'Current Plan' : 'Select Plan'}
        </Button>
      </CardFooter>
    </Card>
  );
}
