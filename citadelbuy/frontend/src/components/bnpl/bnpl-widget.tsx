'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Check, CreditCard } from 'lucide-react';

interface BnplWidgetProps {
  orderTotal: number;
  onSelectBnpl: (provider: string, installments: number) => void;
}

export function BnplWidget({ orderTotal, onSelectBnpl }: BnplWidgetProps) {
  const providers = [
    {
      name: 'Klarna',
      provider: 'KLARNA',
      installments: 4,
      apr: 0,
      installmentAmount: orderTotal / 4,
      logo: '🟣',
    },
    {
      name: 'Affirm',
      provider: 'AFFIRM',
      installments: 6,
      apr: 10,
      installmentAmount: (orderTotal * 1.05) / 6, // Simplified calculation
      logo: '🔵',
    },
    {
      name: 'Afterpay',
      provider: 'AFTERPAY',
      installments: 4,
      apr: 0,
      installmentAmount: orderTotal / 4,
      logo: '🟢',
    },
  ];

  if (orderTotal < 50 || orderTotal > 10000) {
    return null;
  }

  return (
    <Card className="border-2 border-primary/20">
      <CardHeader>
        <div className="flex items-center gap-2">
          <CreditCard className="h-5 w-5" />
          <CardTitle>Pay in Installments</CardTitle>
        </div>
        <CardDescription>
          Split your purchase into interest-free payments
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {providers.map((p) => (
          <div
            key={p.provider}
            className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 cursor-pointer"
            onClick={() => onSelectBnpl(p.provider, p.installments)}
          >
            <div className="flex items-center gap-3">
              <span className="text-2xl">{p.logo}</span>
              <div>
                <div className="font-medium">{p.name}</div>
                <div className="text-sm text-gray-600">
                  {p.installments} payments of ${p.installmentAmount.toFixed(2)}
                </div>
              </div>
            </div>
            <div className="text-right">
              {p.apr === 0 ? (
                <Badge variant="secondary">0% APR</Badge>
              ) : (
                <span className="text-sm text-gray-500">{p.apr}% APR</span>
              )}
            </div>
          </div>
        ))}
        <div className="flex items-start gap-2 text-sm text-gray-600 pt-2">
          <Check className="h-4 w-4 text-green-500 flex-shrink-0 mt-0.5" />
          <span>No hidden fees. Pay over time with automatic payments.</span>
        </div>
      </CardContent>
    </Card>
  );
}
