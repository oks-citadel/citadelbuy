'use client';

import * as React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DollarSign, Globe, TrendingUp, Download, Upload } from 'lucide-react';

export default function MultiCurrencyPricingPage() {
  const currencies = [
    { code: 'USD', symbol: '$', name: 'US Dollar', region: 'North America' },
    { code: 'EUR', symbol: '€', name: 'Euro', region: 'Europe' },
    { code: 'GBP', symbol: '£', name: 'British Pound', region: 'UK' },
    { code: 'JPY', symbol: '¥', name: 'Japanese Yen', region: 'Japan' },
    { code: 'AUD', symbol: 'A$', name: 'Australian Dollar', region: 'Australia' },
    { code: 'CAD', symbol: 'C$', name: 'Canadian Dollar', region: 'Canada' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Multi-Currency Pricing</h1>
          <p className="text-muted-foreground mt-2">
            Manage pricing across global markets
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="gap-2">
            <Download className="h-4 w-4" />
            Export
          </Button>
          <Button variant="outline" className="gap-2">
            <Upload className="h-4 w-4" />
            Bulk Import
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Active Currencies
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{currencies.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Products with Multi-Currency
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">342</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Auto-Conversion Enabled
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">Yes</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Last Sync
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm font-medium">2 hours ago</div>
          </CardContent>
        </Card>
      </div>

      {/* Pricing Strategy */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Pricing Strategy
          </CardTitle>
          <CardDescription>Configure how prices are converted</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div>
              <p className="font-medium">Auto-conversion with markup</p>
              <p className="text-sm text-muted-foreground">
                Automatically convert from base currency (USD) with regional markup
              </p>
            </div>
            <Button size="sm" variant="outline">
              Configure
            </Button>
          </div>
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div>
              <p className="font-medium">Manual pricing per region</p>
              <p className="text-sm text-muted-foreground">
                Set custom prices for each currency
              </p>
            </div>
            <Button size="sm" variant="outline">
              Configure
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Currency Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5" />
            Currency Settings
          </CardTitle>
          <CardDescription>Manage supported currencies and conversion rates</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {currencies.map((currency) => (
              <div
                key={currency.code}
                className="flex items-center justify-between p-4 border rounded-lg"
              >
                <div className="flex items-center gap-4 flex-1">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <span className="font-bold text-primary">{currency.symbol}</span>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold">{currency.code}</p>
                      <span className="text-sm text-muted-foreground">-</span>
                      <p className="text-sm text-muted-foreground">{currency.name}</p>
                    </div>
                    <p className="text-xs text-muted-foreground">{currency.region}</p>
                  </div>
                  <div className="flex items-center gap-4">
                    <div>
                      <p className="text-xs text-muted-foreground">Markup</p>
                      <Input
                        type="number"
                        className="w-20 h-8 text-sm"
                        defaultValue="5"
                        min="0"
                        max="100"
                      />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Exchange Rate</p>
                      <Input
                        type="number"
                        className="w-24 h-8 text-sm"
                        defaultValue="1.00"
                        step="0.01"
                      />
                    </div>
                  </div>
                </div>
                <Button variant="ghost" size="sm">
                  Edit
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Regional Pricing Rules */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Regional Pricing Rules
          </CardTitle>
          <CardDescription>Special pricing for specific regions</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div>
                <p className="font-medium">Volume Discount - Europe</p>
                <p className="text-sm text-muted-foreground">
                  10% discount for orders over €10,000
                </p>
              </div>
              <Button size="sm" variant="ghost">
                Edit
              </Button>
            </div>
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div>
                <p className="font-medium">Enterprise Pricing - APAC</p>
                <p className="text-sm text-muted-foreground">
                  Special rates for enterprise buyers in Asia Pacific
                </p>
              </div>
              <Button size="sm" variant="ghost">
                Edit
              </Button>
            </div>
            <Button variant="outline" className="w-full">
              Add Pricing Rule
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
