'use client';

import { useState } from 'react';
import {
  Brain,
  TrendingUp,
  TrendingDown,
  DollarSign,
  AlertTriangle,
  CheckCircle,
  Lightbulb,
  ArrowRight,
  RefreshCw,
  Target,
  BarChart2,
  Zap,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface PricingInsight {
  id: string;
  type: 'opportunity' | 'warning' | 'success' | 'recommendation';
  title: string;
  description: string;
  impact: string;
  product?: string;
  currentPrice?: number;
  suggestedPrice?: number;
  confidence: number;
  potentialRevenue?: number;
  createdAt: string;
}

const demoInsights: PricingInsight[] = [
  {
    id: '1',
    type: 'opportunity',
    title: 'Price increase opportunity',
    description: 'Wireless Bluetooth Headphones has strong demand and low competitor stock. Consider increasing price.',
    impact: '+15% margin',
    product: 'Wireless Bluetooth Headphones',
    currentPrice: 79.99,
    suggestedPrice: 89.99,
    confidence: 92,
    potentialRevenue: 12500,
    createdAt: '2024-03-15T10:30:00Z',
  },
  {
    id: '2',
    type: 'warning',
    title: 'Competitor price drop detected',
    description: 'A major competitor reduced prices on Smart Fitness Tracker by 20%. Review your pricing strategy.',
    impact: '-8% sales risk',
    product: 'Smart Fitness Tracker Pro',
    currentPrice: 149.99,
    suggestedPrice: 134.99,
    confidence: 85,
    createdAt: '2024-03-15T09:15:00Z',
  },
  {
    id: '3',
    type: 'success',
    title: 'Dynamic pricing working',
    description: 'Your time-based pricing rule increased weekend sales by 23% for Premium Cotton T-Shirt.',
    impact: '+$4,500 revenue',
    product: 'Premium Cotton T-Shirt',
    confidence: 100,
    createdAt: '2024-03-14T18:00:00Z',
  },
  {
    id: '4',
    type: 'recommendation',
    title: 'Bundle pricing suggestion',
    description: 'Customers often buy Headphones + Fitness Tracker together. Create a bundle with 10% discount.',
    impact: '+12% AOV',
    confidence: 78,
    potentialRevenue: 8900,
    createdAt: '2024-03-14T14:30:00Z',
  },
  {
    id: '5',
    type: 'opportunity',
    title: 'Seasonal demand increase',
    description: 'Organic Green Tea Set searches up 150% ahead of spring. Consider inventory restock and price optimization.',
    impact: '+25% potential',
    product: 'Organic Green Tea Set',
    currentPrice: 24.99,
    suggestedPrice: 29.99,
    confidence: 88,
    potentialRevenue: 5600,
    createdAt: '2024-03-14T11:00:00Z',
  },
  {
    id: '6',
    type: 'warning',
    title: 'Margin erosion detected',
    description: 'Leather Messenger Bag margin has dropped 8% this month due to shipping cost increases.',
    impact: '-8% margin',
    product: 'Leather Messenger Bag',
    confidence: 95,
    createdAt: '2024-03-13T16:45:00Z',
  },
];

export default function PricingInsightsPage() {
  const [insights] = useState<PricingInsight[]>(demoInsights);
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [isRefreshing, setIsRefreshing] = useState(false);

  const filteredInsights = insights.filter((i) => {
    if (typeFilter !== 'all' && i.type !== typeFilter) return false;
    return true;
  });

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await new Promise((resolve) => setTimeout(resolve, 2000));
    setIsRefreshing(false);
  };

  const getTypeIcon = (type: PricingInsight['type']) => {
    switch (type) {
      case 'opportunity':
        return <Lightbulb className="h-5 w-5 text-green-600" />;
      case 'warning':
        return <AlertTriangle className="h-5 w-5 text-orange-600" />;
      case 'success':
        return <CheckCircle className="h-5 w-5 text-blue-600" />;
      case 'recommendation':
        return <Brain className="h-5 w-5 text-purple-600" />;
    }
  };

  const getTypeBadge = (type: PricingInsight['type']) => {
    const styles: Record<PricingInsight['type'], string> = {
      opportunity: 'bg-green-100 text-green-800',
      warning: 'bg-orange-100 text-orange-800',
      success: 'bg-blue-100 text-blue-800',
      recommendation: 'bg-purple-100 text-purple-800',
    };
    return styles[type];
  };

  const opportunities = insights.filter((i) => i.type === 'opportunity').length;
  const warnings = insights.filter((i) => i.type === 'warning').length;
  const totalPotential = insights
    .filter((i) => i.potentialRevenue)
    .reduce((acc, i) => acc + (i.potentialRevenue || 0), 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">AI Pricing Insights</h1>
          <p className="text-muted-foreground">
            AI-powered recommendations to optimize your pricing strategy
          </p>
        </div>
        <Button onClick={handleRefresh} disabled={isRefreshing}>
          <RefreshCw className={`w-4 h-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
          {isRefreshing ? 'Analyzing...' : 'Refresh Insights'}
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Insights</p>
                <p className="text-2xl font-bold">{insights.length}</p>
              </div>
              <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                <Brain className="h-5 w-5 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Opportunities</p>
                <p className="text-2xl font-bold">{opportunities}</p>
              </div>
              <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center">
                <Lightbulb className="h-5 w-5 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Warnings</p>
                <p className="text-2xl font-bold">{warnings}</p>
              </div>
              <div className="h-10 w-10 rounded-full bg-orange-100 flex items-center justify-center">
                <AlertTriangle className="h-5 w-5 text-orange-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Revenue Potential</p>
                <p className="text-2xl font-bold">${(totalPotential / 1000).toFixed(1)}k</p>
              </div>
              <div className="h-10 w-10 rounded-full bg-purple-100 flex items-center justify-center">
                <TrendingUp className="h-5 w-5 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* AI Summary Card */}
      <Card className="bg-gradient-to-r from-primary/10 to-purple-500/10 border-primary/20">
        <CardContent className="p-6">
          <div className="flex items-start gap-4">
            <div className="h-12 w-12 rounded-full bg-primary/20 flex items-center justify-center">
              <Zap className="h-6 w-6 text-primary" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-gray-900 mb-2">AI Summary</h3>
              <p className="text-muted-foreground mb-4">
                Based on market analysis, competitor monitoring, and your sales data, we've identified
                <span className="font-medium text-primary"> {opportunities} pricing opportunities </span>
                that could increase your revenue by up to
                <span className="font-medium text-green-600"> ${totalPotential.toLocaleString()}</span>.
                There are also <span className="font-medium text-orange-600">{warnings} warnings</span> that
                require your attention.
              </p>
              <div className="flex gap-2">
                <Button size="sm">
                  Apply All Recommendations
                </Button>
                <Button variant="outline" size="sm">
                  View Detailed Report
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Filter */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {[
          { id: 'all', label: 'All Insights' },
          { id: 'opportunity', label: 'Opportunities' },
          { id: 'warning', label: 'Warnings' },
          { id: 'success', label: 'Successes' },
          { id: 'recommendation', label: 'Recommendations' },
        ].map((filter) => (
          <Button
            key={filter.id}
            variant={typeFilter === filter.id ? 'default' : 'outline'}
            size="sm"
            onClick={() => setTypeFilter(filter.id)}
          >
            {filter.label}
          </Button>
        ))}
      </div>

      {/* Insights List */}
      <div className="space-y-4">
        {filteredInsights.map((insight) => (
          <Card key={insight.id} className="hover:border-primary/50 transition-colors">
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0">
                  {getTypeIcon(insight.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="font-semibold text-gray-900">{insight.title}</h3>
                    <Badge className={getTypeBadge(insight.type)}>
                      {insight.type}
                    </Badge>
                    <Badge variant="outline">
                      {insight.confidence}% confidence
                    </Badge>
                  </div>
                  <p className="text-muted-foreground mb-3">{insight.description}</p>

                  {insight.product && (
                    <div className="flex items-center gap-4 mb-3">
                      <span className="text-sm font-medium">{insight.product}</span>
                      {insight.currentPrice && insight.suggestedPrice && (
                        <div className="flex items-center gap-2 text-sm">
                          <span className="text-muted-foreground">
                            ${insight.currentPrice.toFixed(2)}
                          </span>
                          <ArrowRight className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium text-primary">
                            ${insight.suggestedPrice.toFixed(2)}
                          </span>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1 text-sm">
                      <Target className="h-4 w-4 text-muted-foreground" />
                      <span className="text-muted-foreground">Impact:</span>
                      <span
                        className={`font-medium ${
                          insight.impact.startsWith('+')
                            ? 'text-green-600'
                            : insight.impact.startsWith('-')
                            ? 'text-red-600'
                            : ''
                        }`}
                      >
                        {insight.impact}
                      </span>
                    </div>
                    {insight.potentialRevenue && (
                      <div className="flex items-center gap-1 text-sm">
                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                        <span className="text-muted-foreground">Potential:</span>
                        <span className="font-medium text-green-600">
                          ${insight.potentialRevenue.toLocaleString()}
                        </span>
                      </div>
                    )}
                    <span className="text-xs text-muted-foreground">
                      {new Date(insight.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
                <div className="flex flex-col gap-2">
                  {(insight.type === 'opportunity' || insight.type === 'recommendation') && (
                    <Button size="sm">Apply</Button>
                  )}
                  <Button variant="outline" size="sm">
                    Details
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredInsights.length === 0 && (
        <Card>
          <CardContent className="p-12 text-center">
            <Brain className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="font-medium text-gray-900 mb-2">No insights found</h3>
            <p className="text-muted-foreground mb-4">
              Try adjusting your filters or refresh to get new insights
            </p>
            <Button onClick={handleRefresh}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh Insights
            </Button>
          </CardContent>
        </Card>
      )}

      {/* How It Works */}
      <Card>
        <CardHeader>
          <CardTitle>How AI Insights Work</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid sm:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center mx-auto mb-3">
                <BarChart2 className="h-6 w-6 text-blue-600" />
              </div>
              <h4 className="font-medium mb-1">Data Analysis</h4>
              <p className="text-sm text-muted-foreground">
                We analyze your sales, competitor prices, and market trends in real-time
              </p>
            </div>
            <div className="text-center">
              <div className="h-12 w-12 rounded-full bg-purple-100 flex items-center justify-center mx-auto mb-3">
                <Brain className="h-6 w-6 text-purple-600" />
              </div>
              <h4 className="font-medium mb-1">AI Processing</h4>
              <p className="text-sm text-muted-foreground">
                Our AI models identify patterns and predict optimal pricing strategies
              </p>
            </div>
            <div className="text-center">
              <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-3">
                <Lightbulb className="h-6 w-6 text-green-600" />
              </div>
              <h4 className="font-medium mb-1">Actionable Insights</h4>
              <p className="text-sm text-muted-foreground">
                Get specific recommendations with confidence scores and revenue impact
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
