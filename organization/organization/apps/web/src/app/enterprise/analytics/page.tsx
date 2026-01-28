'use client';

import * as React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  DollarSign,
  ShoppingCart,
  Users,
  Globe,
  Download,
  Calendar,
} from 'lucide-react';

export default function EnterpriseAnalyticsPage() {
  const kpis = [
    {
      title: 'Total Spend',
      value: '$2.4M',
      change: '-5%',
      trend: 'down',
      icon: DollarSign,
      period: 'This Month',
    },
    {
      title: 'Active Vendors',
      value: '247',
      change: '+12%',
      trend: 'up',
      icon: Users,
      period: 'This Quarter',
    },
    {
      title: 'Purchase Orders',
      value: '1,842',
      change: '+8%',
      trend: 'up',
      icon: ShoppingCart,
      period: 'This Month',
    },
    {
      title: 'Global Regions',
      value: '15',
      change: '+2',
      trend: 'up',
      icon: Globe,
      period: 'Active Regions',
    },
  ];

  const regionalSpend = [
    { region: 'North America', spend: '$890,000', percentage: 37, trend: '+15%' },
    { region: 'Europe', spend: '$1,200,000', percentage: 50, trend: '+22%' },
    { region: 'APAC', spend: '$310,000', percentage: 13, trend: '+8%' },
  ];

  const categorySpend = [
    { category: 'Technology', spend: '$1,200,000', percentage: 50 },
    { category: 'Office Supplies', spend: '$480,000', percentage: 20 },
    { category: 'Industrial Equipment', spend: '$384,000', percentage: 16 },
    { category: 'Professional Services', spend: '$336,000', percentage: 14 },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Enterprise Analytics</h1>
          <p className="text-muted-foreground mt-2">
            Insights into your global procurement operations
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="gap-2">
            <Calendar className="h-4 w-4" />
            Last 30 Days
          </Button>
          <Button variant="outline" className="gap-2">
            <Download className="h-4 w-4" />
            Export Report
          </Button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {kpis.map((kpi) => {
          const Icon = kpi.icon;
          return (
            <Card key={kpi.title}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{kpi.title}</CardTitle>
                <Icon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{kpi.value}</div>
                <div className="flex items-center gap-2 mt-1">
                  {kpi.trend === 'up' ? (
                    <TrendingUp className="h-3 w-3 text-green-500" />
                  ) : (
                    <TrendingDown className="h-3 w-3 text-red-500" />
                  )}
                  <span
                    className={`text-xs ${
                      kpi.trend === 'up' ? 'text-green-500' : 'text-red-500'
                    }`}
                  >
                    {kpi.change}
                  </span>
                  <span className="text-xs text-muted-foreground">{kpi.period}</span>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Regional Spend */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="h-5 w-5" />
              Spend by Region
            </CardTitle>
            <CardDescription>Geographic distribution of procurement</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {regionalSpend.map((region, idx) => (
                <div key={idx} className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">{region.region}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground">{region.spend}</span>
                      <span className="text-green-500">{region.trend}</span>
                    </div>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-full transition-all"
                      style={{ width: `${region.percentage}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Category Spend */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Spend by Category
            </CardTitle>
            <CardDescription>Procurement breakdown by category</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {categorySpend.map((category, idx) => (
                <div key={idx} className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">{category.category}</span>
                    <span className="text-muted-foreground">{category.spend}</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-violet-600 to-purple-600 rounded-full transition-all"
                      style={{ width: `${category.percentage}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Savings Opportunities */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Cost Savings Opportunities
          </CardTitle>
          <CardDescription>AI-identified opportunities to reduce costs</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-start gap-4 p-4 border rounded-lg">
              <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center">
                <DollarSign className="h-5 w-5 text-green-600" />
              </div>
              <div className="flex-1">
                <h4 className="font-semibold">Contract Consolidation</h4>
                <p className="text-sm text-muted-foreground mt-1">
                  Consolidate 5 office supply contracts into 1 master agreement
                </p>
                <p className="text-sm font-medium text-green-600 mt-2">
                  Potential savings: $45,000/year
                </p>
              </div>
              <Button size="sm">Review</Button>
            </div>
            <div className="flex items-start gap-4 p-4 border rounded-lg">
              <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center">
                <DollarSign className="h-5 w-5 text-green-600" />
              </div>
              <div className="flex-1">
                <h4 className="font-semibold">Volume Discount Opportunity</h4>
                <p className="text-sm text-muted-foreground mt-1">
                  Increase order volume with TechGlobal to qualify for Tier 3 pricing
                </p>
                <p className="text-sm font-medium text-green-600 mt-2">
                  Potential savings: $120,000/year
                </p>
              </div>
              <Button size="sm">Review</Button>
            </div>
            <div className="flex items-start gap-4 p-4 border rounded-lg">
              <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center">
                <DollarSign className="h-5 w-5 text-green-600" />
              </div>
              <div className="flex-1">
                <h4 className="font-semibold">Alternative Vendor Analysis</h4>
                <p className="text-sm text-muted-foreground mt-1">
                  3 alternative vendors offer 15-20% lower pricing for similar products
                </p>
                <p className="text-sm font-medium text-green-600 mt-2">
                  Potential savings: $85,000/year
                </p>
              </div>
              <Button size="sm">Review</Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
