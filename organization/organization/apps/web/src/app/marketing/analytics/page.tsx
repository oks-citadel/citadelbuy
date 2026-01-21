'use client';

import * as React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { BarChart3 } from 'lucide-react';

export default function MarketingAnalyticsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Marketing Analytics</h1>
        <p className="text-muted-foreground mt-2">Track campaign performance and ROI</p>
      </div>
      <Card><CardContent className="pt-6 text-center"><BarChart3 className="h-12 w-12 mx-auto mb-4 text-muted-foreground" /><p>Marketing analytics dashboard</p></CardContent></Card>
    </div>
  );
}
