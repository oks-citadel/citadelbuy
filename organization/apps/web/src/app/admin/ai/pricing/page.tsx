'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  TrendingUp,
  ChevronRight,
  Home,
  DollarSign,
  Settings,
  Save,
  RefreshCw,
  BarChart3,
  Target,
  Activity,
  AlertCircle,
  CheckCircle2,
  Zap,
  TrendingDown,
  Package,
  Users,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  Calendar,
  Brain,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';

export default function AIDynamicPricingPage() {
  const [enabled, setEnabled] = useState(false);
  const [autoAdjust, setAutoAdjust] = useState(false);
  const [competitorTracking, setCompetitorTracking] = useState(true);
  const [demandForecasting, setDemandForecasting] = useState(true);
  const [seasonalPricing, setSeasonalPricing] = useState(true);
  const [inventoryBased, setInventoryBased] = useState(true);
  const [minMargin, setMinMargin] = useState(15);
  const [maxAdjustment, setMaxAdjustment] = useState(20);
  const [updateFrequency, setUpdateFrequency] = useState(60);

  const stats = {
    productsMonitored: 1847,
    activeAdjustments: 0,
    avgPriceChange: 0,
    revenueImpact: 0,
    competitorsTracked: 12,
  };

  const pricingFactors = [
    { factor: 'Demand Level', weight: 35, enabled: true, impact: 'High' },
    { factor: 'Competitor Prices', weight: 30, enabled: true, impact: 'High' },
    { factor: 'Inventory Level', weight: 20, enabled: true, impact: 'Medium' },
    { factor: 'Time of Day', weight: 10, enabled: true, impact: 'Low' },
    { factor: 'Seasonality', weight: 15, enabled: true, impact: 'Medium' },
    { factor: 'Customer Segment', weight: 10, enabled: false, impact: 'Low' },
  ];

  const recentPriceChanges = [
    {
      product: 'Wireless Headphones Pro',
      oldPrice: 149.99,
      newPrice: 144.99,
      change: -3.3,
      reason: 'Competitor undercut',
      status: 'pending',
      time: '5 min ago',
    },
    {
      product: 'Smart Watch Elite',
      oldPrice: 299.99,
      newPrice: 319.99,
      change: 6.7,
      reason: 'High demand detected',
      status: 'pending',
      time: '12 min ago',
    },
    {
      product: 'Premium Laptop Stand',
      oldPrice: 79.99,
      newPrice: 74.99,
      change: -6.3,
      reason: 'Low inventory movement',
      status: 'pending',
      time: '28 min ago',
    },
    {
      product: 'USB-C Cable 6ft',
      oldPrice: 12.99,
      newPrice: 12.99,
      change: 0,
      reason: 'Price optimal',
      status: 'approved',
      time: '45 min ago',
    },
  ];

  const categoryPerformance = [
    { category: 'Electronics', avgChange: 2.3, revenue: '+$12.4K', products: 342 },
    { category: 'Clothing', avgChange: -1.2, revenue: '+$8.9K', products: 524 },
    { category: 'Home & Garden', avgChange: 0.8, revenue: '+$5.2K', products: 289 },
    { category: 'Sports', avgChange: 1.9, revenue: '+$3.8K', products: 196 },
  ];

  const getChangeIcon = (change: number) => {
    if (change > 0) return <ArrowUpRight className="h-4 w-4 text-green-600" />;
    if (change < 0) return <ArrowDownRight className="h-4 w-4 text-red-600" />;
    return <Minus className="h-4 w-4 text-gray-400" />;
  };

  const getChangeBadge = (change: number) => {
    if (change > 0) return 'bg-green-100 text-green-800 border-green-200';
    if (change < 0) return 'bg-red-100 text-red-800 border-red-200';
    return 'bg-gray-100 text-gray-800 border-gray-200';
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link href="/admin" className="hover:text-foreground transition-colors">
          <Home className="h-4 w-4" />
        </Link>
        <ChevronRight className="h-4 w-4" />
        <Link href="/admin/ai" className="hover:text-foreground transition-colors">
          AI Management
        </Link>
        <ChevronRight className="h-4 w-4" />
        <span className="text-foreground font-medium">Dynamic Pricing</span>
      </nav>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-lg bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center">
            <TrendingUp className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Dynamic Pricing</h1>
            <p className="text-muted-foreground">
              AI-driven price optimization based on demand and competition
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            Analyze Market
          </Button>
          <Button>
            <Save className="h-4 w-4 mr-2" />
            Save Changes
          </Button>
        </div>
      </div>

      {/* Status Banner */}
      <div className={`p-4 rounded-lg border ${enabled ? 'bg-green-50 border-green-200' : 'bg-yellow-50 border-yellow-200'}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {enabled ? (
              <CheckCircle2 className="h-5 w-5 text-green-600" />
            ) : (
              <AlertCircle className="h-5 w-5 text-yellow-600" />
            )}
            <div>
              <p className="font-semibold">
                {enabled ? 'Dynamic Pricing Active' : 'Dynamic Pricing Inactive - Testing Mode'}
              </p>
              <p className="text-sm text-muted-foreground">
                {enabled
                  ? 'Automatically adjusting prices based on market conditions'
                  : 'Enable to activate automatic price adjustments. Currently monitoring only.'}
              </p>
            </div>
          </div>
          <Switch checked={enabled} onCheckedChange={setEnabled} />
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Products</p>
                <p className="text-2xl font-bold">{stats.productsMonitored.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground mt-1">Being monitored</p>
              </div>
              <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                <Package className="h-5 w-5 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Adjustments</p>
                <p className="text-2xl font-bold">{stats.activeAdjustments}</p>
                <p className="text-xs text-muted-foreground mt-1">Pending approval</p>
              </div>
              <div className="h-10 w-10 rounded-full bg-purple-100 flex items-center justify-center">
                <Activity className="h-5 w-5 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Avg Change</p>
                <p className="text-2xl font-bold">
                  {stats.avgPriceChange > 0 && '+'}
                  {stats.avgPriceChange.toFixed(1)}%
                </p>
                <p className="text-xs text-muted-foreground mt-1">Last 30 days</p>
              </div>
              <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center">
                <TrendingUp className="h-5 w-5 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Revenue Impact</p>
                <p className="text-2xl font-bold">
                  {stats.revenueImpact > 0 && '+'}${stats.revenueImpact.toLocaleString()}
                </p>
                <p className="text-xs text-muted-foreground mt-1">This month</p>
              </div>
              <div className="h-10 w-10 rounded-full bg-orange-100 flex items-center justify-center">
                <DollarSign className="h-5 w-5 text-orange-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Competitors</p>
                <p className="text-2xl font-bold">{stats.competitorsTracked}</p>
                <p className="text-xs text-muted-foreground mt-1">Being tracked</p>
              </div>
              <div className="h-10 w-10 rounded-full bg-cyan-100 flex items-center justify-center">
                <Users className="h-5 w-5 text-cyan-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Configuration */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Pricing Configuration
            </CardTitle>
            <CardDescription>Configure dynamic pricing rules and constraints</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4 pb-4 border-b">
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="auto-adjust">Auto-adjust Prices</Label>
                  <p className="text-xs text-muted-foreground">
                    Automatically apply price changes
                  </p>
                </div>
                <Switch
                  id="auto-adjust"
                  checked={autoAdjust}
                  onCheckedChange={setAutoAdjust}
                  disabled={!enabled}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="competitor">Competitor Price Tracking</Label>
                  <p className="text-xs text-muted-foreground">Monitor competitor pricing</p>
                </div>
                <Switch
                  id="competitor"
                  checked={competitorTracking}
                  onCheckedChange={setCompetitorTracking}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="demand">Demand Forecasting</Label>
                  <p className="text-xs text-muted-foreground">Predict future demand patterns</p>
                </div>
                <Switch
                  id="demand"
                  checked={demandForecasting}
                  onCheckedChange={setDemandForecasting}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="seasonal">Seasonal Adjustments</Label>
                  <p className="text-xs text-muted-foreground">Account for seasonal trends</p>
                </div>
                <Switch
                  id="seasonal"
                  checked={seasonalPricing}
                  onCheckedChange={setSeasonalPricing}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="inventory">Inventory-based Pricing</Label>
                  <p className="text-xs text-muted-foreground">Adjust based on stock levels</p>
                </div>
                <Switch
                  id="inventory"
                  checked={inventoryBased}
                  onCheckedChange={setInventoryBased}
                />
              </div>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="min-margin">Minimum Profit Margin: {minMargin}%</Label>
                <input
                  id="min-margin"
                  type="range"
                  min="5"
                  max="50"
                  step="5"
                  value={minMargin}
                  onChange={(e) => setMinMargin(parseInt(e.target.value))}
                  className="w-full"
                />
                <p className="text-xs text-muted-foreground">
                  Never reduce prices below this margin
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="max-adjustment">
                  Max Price Adjustment: ±{maxAdjustment}%
                </Label>
                <input
                  id="max-adjustment"
                  type="range"
                  min="5"
                  max="50"
                  step="5"
                  value={maxAdjustment}
                  onChange={(e) => setMaxAdjustment(parseInt(e.target.value))}
                  className="w-full"
                />
                <p className="text-xs text-muted-foreground">
                  Maximum allowed price change from base price
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="frequency">Update Frequency: {updateFrequency} minutes</Label>
                <select
                  id="frequency"
                  className="w-full rounded-md border px-3 py-2 text-sm"
                  value={updateFrequency}
                  onChange={(e) => setUpdateFrequency(parseInt(e.target.value))}
                >
                  <option value="15">Every 15 minutes</option>
                  <option value="30">Every 30 minutes</option>
                  <option value="60">Every hour</option>
                  <option value="120">Every 2 hours</option>
                  <option value="240">Every 4 hours</option>
                  <option value="1440">Daily</option>
                </select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Pricing Factors */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Brain className="h-5 w-5" />
              Pricing Factors
            </CardTitle>
            <CardDescription>Configure factors that influence price decisions</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {pricingFactors.map((factor) => (
                <div key={factor.factor} className="p-3 border rounded-lg">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <Switch checked={factor.enabled} />
                      <div>
                        <p className="font-medium text-sm">{factor.factor}</p>
                        <p className="text-xs text-muted-foreground">
                          Impact: {factor.impact}
                        </p>
                      </div>
                    </div>
                    <Badge variant="outline">Weight: {factor.weight}%</Badge>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-500 rounded-full transition-all"
                      style={{ width: `${factor.weight}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5" />
                <div>
                  <p className="font-semibold text-sm text-blue-900">
                    Total Weight: {pricingFactors.reduce((acc, f) => acc + f.weight, 0)}%
                  </p>
                  <p className="text-xs text-blue-700 mt-1">
                    Adjust individual weights to fine-tune pricing decisions
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Category Performance */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Category Performance
          </CardTitle>
          <CardDescription>Impact of dynamic pricing by category</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {categoryPerformance.map((cat) => (
              <div
                key={cat.category}
                className="flex items-center justify-between p-4 border rounded-lg"
              >
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-semibold">{cat.category}</h4>
                    <Badge variant="outline">{cat.products} products</Badge>
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">Avg Change:</span>
                      <Badge className={getChangeBadge(cat.avgChange)} variant="outline">
                        {getChangeIcon(cat.avgChange)}
                        {cat.avgChange > 0 && '+'}
                        {cat.avgChange}%
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">Revenue Impact:</span>
                      <span className="font-semibold text-green-600">{cat.revenue}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Recent Price Changes */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            Pending Price Adjustments
          </CardTitle>
          <CardDescription>AI-suggested price changes awaiting approval</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {recentPriceChanges.map((change, i) => (
              <div
                key={i}
                className="flex items-center justify-between p-4 border rounded-lg"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-medium">{change.product}</h4>
                    <Badge className={getChangeBadge(change.change)} variant="outline">
                      {getChangeIcon(change.change)}
                      {change.change > 0 && '+'}
                      {change.change}%
                    </Badge>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span>
                      ${change.oldPrice.toFixed(2)} → ${change.newPrice.toFixed(2)}
                    </span>
                    <span>•</span>
                    <span>{change.reason}</span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {change.time}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className={getStatusBadge(change.status)}>
                    {change.status}
                  </Badge>
                  {change.status === 'pending' && (
                    <>
                      <Button size="sm" variant="outline">Reject</Button>
                      <Button size="sm">Approve</Button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
