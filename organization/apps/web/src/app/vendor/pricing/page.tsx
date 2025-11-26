'use client';

import * as React from 'react';
import { PricingDashboard } from '@/components/vendor/pricing-dashboard';

export default function PricingPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Dynamic Pricing</h1>
        <p className="text-muted-foreground">
          AI-powered pricing recommendations to optimize your revenue
        </p>
      </div>
      <PricingDashboard />
    </div>
  );
}
