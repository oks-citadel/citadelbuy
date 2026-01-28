'use client';

import * as React from 'react';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  AlertTriangle,
  Check,
  X,
  Sparkles,
  ArrowRight,
  ExternalLink,
  RefreshCw,
  Loader2,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn, formatCurrency } from '@/lib/utils';
import {
  useDynamicPricingInsights,
  useApplyDynamicPrice,
  useCompetitorPrices,
} from '@/hooks/use-vendor';
import { DynamicPricingInsight, CompetitorPrice } from '@/types/vendor';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from 'recharts';

// Mock data
const mockInsights: DynamicPricingInsight[] = [
  {
    productId: 'prod-1',
    currentPrice: 99.99,
    suggestedPrice: 89.99,
    priceFloor: 75.00,
    priceCeiling: 120.00,
    demandScore: 8.5,
    competitorAvgPrice: 94.50,
    inventoryLevel: 45,
    confidence: 0.87,
    reason: 'High demand detected with competitor pricing lower. Reducing price could increase conversion by 23%',
    estimatedImpact: {
      revenueChange: 15.2,
      unitsSoldChange: 35.8,
      marginChange: -2.1,
    },
  },
  {
    productId: 'prod-2',
    currentPrice: 149.99,
    suggestedPrice: 159.99,
    priceFloor: 130.00,
    priceCeiling: 180.00,
    demandScore: 9.2,
    competitorAvgPrice: 165.00,
    inventoryLevel: 12,
    confidence: 0.92,
    reason: 'Low inventory with high demand. Increasing price will maximize margin without significantly impacting sales.',
    estimatedImpact: {
      revenueChange: 8.4,
      unitsSoldChange: -5.2,
      marginChange: 12.8,
    },
  },
  {
    productId: 'prod-3',
    currentPrice: 49.99,
    suggestedPrice: 44.99,
    priceFloor: 35.00,
    priceCeiling: 60.00,
    demandScore: 5.8,
    competitorAvgPrice: 42.50,
    inventoryLevel: 156,
    confidence: 0.78,
    reason: 'Excess inventory with moderate demand. Price reduction recommended to increase turnover.',
    estimatedImpact: {
      revenueChange: -4.2,
      unitsSoldChange: 28.5,
      marginChange: -8.5,
    },
  },
];

const mockCompetitorPrices: CompetitorPrice[] = [
  {
    competitorId: 'comp-1',
    competitorName: 'TechStore Pro',
    productId: 'prod-1',
    price: 92.99,
    currency: 'USD',
    inStock: true,
    lastChecked: new Date().toISOString(),
    priceHistory: [
      { date: '2024-01-15', price: 99.99 },
      { date: '2024-01-16', price: 94.99 },
      { date: '2024-01-17', price: 92.99 },
    ],
  },
  {
    competitorId: 'comp-2',
    competitorName: 'ElectroMart',
    productId: 'prod-1',
    price: 95.50,
    currency: 'USD',
    inStock: true,
    lastChecked: new Date().toISOString(),
    priceHistory: [
      { date: '2024-01-15', price: 98.00 },
      { date: '2024-01-16', price: 96.00 },
      { date: '2024-01-17', price: 95.50 },
    ],
  },
  {
    competitorId: 'comp-3',
    competitorName: 'GadgetWorld',
    productId: 'prod-1',
    price: 94.99,
    currency: 'USD',
    inStock: false,
    lastChecked: new Date().toISOString(),
    priceHistory: [
      { date: '2024-01-15', price: 94.99 },
      { date: '2024-01-16', price: 94.99 },
      { date: '2024-01-17', price: 94.99 },
    ],
  },
];

function InsightCard({
  insight,
  onApply,
  isApplying,
}: {
  insight: DynamicPricingInsight;
  onApply: () => void;
  isApplying: boolean;
}) {
  const priceDiff = insight.suggestedPrice - insight.currentPrice;
  const isIncrease = priceDiff > 0;
  const percentChange = ((priceDiff / insight.currentPrice) * 100).toFixed(1);

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div className="w-12 h-12 bg-muted rounded-lg" />
              <div>
                <p className="font-semibold">Product {insight.productId}</p>
                <p className="text-sm text-muted-foreground">
                  {insight.inventoryLevel} units in stock
                </p>
              </div>
            </div>
          </div>
          <Badge
            variant={insight.confidence > 0.85 ? 'default' : 'secondary'}
            className="gap-1"
          >
            <Sparkles className="h-3 w-3" />
            {Math.round(insight.confidence * 100)}% confidence
          </Badge>
        </div>

        {/* Price Comparison */}
        <div className="grid grid-cols-3 gap-4 mb-4">
          <div className="text-center p-3 rounded-lg bg-muted/50">
            <p className="text-sm text-muted-foreground">Current</p>
            <p className="text-xl font-bold">{formatCurrency(insight.currentPrice)}</p>
          </div>
          <div className="text-center p-3 rounded-lg bg-primary/10 border border-primary/20">
            <p className="text-sm text-muted-foreground">Suggested</p>
            <p className="text-xl font-bold text-primary">
              {formatCurrency(insight.suggestedPrice)}
            </p>
            <p
              className={cn(
                'text-xs font-medium',
                isIncrease ? 'text-success' : 'text-destructive'
              )}
            >
              {isIncrease ? '+' : ''}{percentChange}%
            </p>
          </div>
          <div className="text-center p-3 rounded-lg bg-muted/50">
            <p className="text-sm text-muted-foreground">Competitor Avg</p>
            <p className="text-xl font-bold">
              {formatCurrency(insight.competitorAvgPrice)}
            </p>
          </div>
        </div>

        {/* Price Range */}
        <div className="mb-4">
          <div className="flex justify-between text-xs text-muted-foreground mb-1">
            <span>Floor: {formatCurrency(insight.priceFloor)}</span>
            <span>Ceiling: {formatCurrency(insight.priceCeiling)}</span>
          </div>
          <div className="relative h-2 bg-muted rounded-full">
            <div
              className="absolute h-full bg-gradient-to-r from-green-500 via-yellow-500 to-red-500 rounded-full"
              style={{ width: '100%' }}
            />
            <div
              className="absolute h-4 w-1 bg-foreground rounded-full -top-1"
              style={{
                left: `${
                  ((insight.currentPrice - insight.priceFloor) /
                    (insight.priceCeiling - insight.priceFloor)) *
                  100
                }%`,
              }}
              title={`Current: ${formatCurrency(insight.currentPrice)}`}
            />
            <div
              className="absolute h-4 w-1 bg-primary rounded-full -top-1"
              style={{
                left: `${
                  ((insight.suggestedPrice - insight.priceFloor) /
                    (insight.priceCeiling - insight.priceFloor)) *
                  100
                }%`,
              }}
              title={`Suggested: ${formatCurrency(insight.suggestedPrice)}`}
            />
          </div>
        </div>

        {/* Demand Score */}
        <div className="flex items-center gap-2 mb-4">
          <span className="text-sm text-muted-foreground">Demand Score:</span>
          <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
            <div
              className={cn(
                'h-full rounded-full',
                insight.demandScore > 7
                  ? 'bg-green-500'
                  : insight.demandScore > 4
                  ? 'bg-yellow-500'
                  : 'bg-red-500'
              )}
              style={{ width: `${insight.demandScore * 10}%` }}
            />
          </div>
          <span className="text-sm font-medium">{insight.demandScore}/10</span>
        </div>

        {/* AI Reasoning */}
        <div className="p-3 rounded-lg bg-primary/5 border border-primary/10 mb-4">
          <p className="text-sm text-muted-foreground">{insight.reason}</p>
        </div>

        {/* Estimated Impact */}
        <div className="grid grid-cols-3 gap-2 mb-4">
          <div className="text-center p-2 rounded-lg bg-muted/50">
            <p className="text-xs text-muted-foreground">Revenue</p>
            <p
              className={cn(
                'text-sm font-semibold',
                insight.estimatedImpact.revenueChange > 0
                  ? 'text-success'
                  : 'text-destructive'
              )}
            >
              {insight.estimatedImpact.revenueChange > 0 ? '+' : ''}
              {insight.estimatedImpact.revenueChange}%
            </p>
          </div>
          <div className="text-center p-2 rounded-lg bg-muted/50">
            <p className="text-xs text-muted-foreground">Units Sold</p>
            <p
              className={cn(
                'text-sm font-semibold',
                insight.estimatedImpact.unitsSoldChange > 0
                  ? 'text-success'
                  : 'text-destructive'
              )}
            >
              {insight.estimatedImpact.unitsSoldChange > 0 ? '+' : ''}
              {insight.estimatedImpact.unitsSoldChange}%
            </p>
          </div>
          <div className="text-center p-2 rounded-lg bg-muted/50">
            <p className="text-xs text-muted-foreground">Margin</p>
            <p
              className={cn(
                'text-sm font-semibold',
                insight.estimatedImpact.marginChange > 0
                  ? 'text-success'
                  : 'text-destructive'
              )}
            >
              {insight.estimatedImpact.marginChange > 0 ? '+' : ''}
              {insight.estimatedImpact.marginChange}%
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <Button
            onClick={onApply}
            disabled={isApplying}
            className="flex-1"
          >
            {isApplying ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Applying...
              </>
            ) : (
              <>
                <Check className="mr-2 h-4 w-4" />
                Apply Price
              </>
            )}
          </Button>
          <Button variant="outline">
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function CompetitorPriceCard({ competitor }: { competitor: CompetitorPrice }) {
  return (
    <div className="flex items-center justify-between p-4 rounded-lg border">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
          <span className="text-sm font-medium">
            {competitor.competitorName.charAt(0)}
          </span>
        </div>
        <div>
          <p className="font-medium">{competitor.competitorName}</p>
          <Badge
            variant={competitor.inStock ? 'default' : 'secondary'}
            className="text-xs"
          >
            {competitor.inStock ? 'In Stock' : 'Out of Stock'}
          </Badge>
        </div>
      </div>
      <div className="text-right">
        <p className="text-lg font-bold">{formatCurrency(competitor.price)}</p>
        <p className="text-xs text-muted-foreground">
          Updated {new Date(competitor.lastChecked).toLocaleDateString()}
        </p>
      </div>
    </div>
  );
}

interface PricingDashboardProps {
  productIds?: string[];
}

export function PricingDashboard({ productIds }: PricingDashboardProps) {
  const { data: insights, isLoading, refetch } = useDynamicPricingInsights(productIds);
  const applyPrice = useApplyDynamicPrice();
  const [selectedProductId, setSelectedProductId] = React.useState<string | null>(null);

  const pricingInsights = insights || mockInsights;

  const handleApplyPrice = (productId: string, price: number) => {
    applyPrice.mutate({ productId, price });
  };

  const totalPotentialRevenue = pricingInsights.reduce(
    (sum, insight) =>
      sum + (insight.estimatedImpact.revenueChange > 0 ? insight.estimatedImpact.revenueChange : 0),
    0
  );

  return (
    <div className="space-y-6">
      {/* Header Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Price Insights</p>
                <p className="text-2xl font-bold">{pricingInsights.length}</p>
              </div>
              <Sparkles className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Potential Revenue</p>
                <p className="text-2xl font-bold text-success">+{totalPotentialRevenue.toFixed(1)}%</p>
              </div>
              <TrendingUp className="h-8 w-8 text-success" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Avg Confidence</p>
                <p className="text-2xl font-bold">
                  {Math.round(
                    (pricingInsights.reduce((sum, i) => sum + i.confidence, 0) /
                      pricingInsights.length) *
                      100
                  )}%
                </p>
              </div>
              <Check className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center justify-center">
            <Button
              variant="outline"
              onClick={() => refetch()}
              disabled={isLoading}
            >
              {isLoading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="mr-2 h-4 w-4" />
              )}
              Refresh Insights
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Insights Grid */}
      <div>
        <h2 className="text-xl font-bold mb-4">AI Price Recommendations</h2>
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            {pricingInsights.map((insight) => (
              <InsightCard
                key={insight.productId}
                insight={insight}
                onApply={() => handleApplyPrice(insight.productId, insight.suggestedPrice)}
                isApplying={applyPrice.isPending}
              />
            ))}
          </div>
        )}
      </div>

      {/* Competitor Prices */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Competitor Pricing</CardTitle>
              <CardDescription>
                Track competitor prices for your products
              </CardDescription>
            </div>
            <Button variant="outline" size="sm">
              <ExternalLink className="mr-2 h-4 w-4" />
              Full Analysis
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {mockCompetitorPrices.map((competitor) => (
              <CompetitorPriceCard key={competitor.competitorId} competitor={competitor} />
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
