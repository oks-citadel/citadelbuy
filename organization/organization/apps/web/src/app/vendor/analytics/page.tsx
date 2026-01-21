'use client';

import * as React from 'react';
import { SalesInsights } from '@/components/vendor/sales-insights';

export default function AnalyticsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Sales Analytics</h1>
        <p className="text-muted-foreground">
          Track your sales performance and discover insights
        </p>
      </div>
      <SalesInsights />
    </div>
  );
}
