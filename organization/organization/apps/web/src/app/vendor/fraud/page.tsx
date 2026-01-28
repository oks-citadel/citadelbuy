'use client';

import * as React from 'react';
import { FraudAlerts } from '@/components/vendor/fraud-alerts';

export default function FraudPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Fraud Detection</h1>
        <p className="text-muted-foreground">
          AI-powered fraud detection and prevention
        </p>
      </div>
      <FraudAlerts />
    </div>
  );
}
