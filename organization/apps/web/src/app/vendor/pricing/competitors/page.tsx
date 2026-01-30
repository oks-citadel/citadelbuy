'use client';

import { useState } from 'react';
import {
  Store,
  Search,
  TrendingUp,
  TrendingDown,
  Minus,
  ExternalLink,
  AlertTriangle,
  RefreshCw,
  Plus,
  Eye,
  Bell,
  BarChart2,
  Target,
  ArrowUpDown,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

interface Competitor {
  id: string;
  name: string;
  url: string;
  logo?: string;
  productsTracked: number;
  avgPriceDiff: number;
  lastUpdated: string;
  status: 'TRACKING' | 'PAUSED';
}

interface CompetitorPrice {
  id: string;
  productName: string;
  yourPrice: number;
  competitorPrices: {
    competitor: string;
    price: number;
    inStock: boolean;
    lastUpdated: string;
  }[];
  recommendation: string;
  priceDiff: number;
}

const demoCompetitors: Competitor[] = [
  {
    id: '1',
    name: 'TechMart',
    url: 'techmart.com',
    productsTracked: 45,
    avgPriceDiff: -5.2,
    lastUpdated: '2024-03-15T10:30:00Z',
    status: 'TRACKING',
  },
  {
    id: '2',
    name: 'GadgetWorld',
    url: 'gadgetworld.com',
    productsTracked: 32,
    avgPriceDiff: 3.8,
    lastUpdated: '2024-03-15T10:30:00Z',
    status: 'TRACKING',
  },
  {
    id: '3',
    name: 'ElectroDeals',
    url: 'electrodeals.com',
    productsTracked: 28,
    avgPriceDiff: -12.5,
    lastUpdated: '2024-03-15T09:15:00Z',
    status: 'TRACKING',
  },
  {
    id: '4',
    name: 'PrimeShop',
    url: 'primeshop.com',
    productsTracked: 50,
    avgPriceDiff: 1.2,
    lastUpdated: '2024-03-15T10:00:00Z',
    status: 'TRACKING',
  },
];

const demoCompetitorPrices: CompetitorPrice[] = [
  {
    id: '1',
    productName: 'Wireless Bluetooth Headphones',
    yourPrice: 79.99,
    competitorPrices: [
      { competitor: 'TechMart', price: 74.99, inStock: true, lastUpdated: '2024-03-15T10:30:00Z' },
      { competitor: 'GadgetWorld', price: 84.99, inStock: true, lastUpdated: '2024-03-15T10:30:00Z' },
      { competitor: 'ElectroDeals', price: 69.99, inStock: false, lastUpdated: '2024-03-15T09:15:00Z' },
      { competitor: 'PrimeShop', price: 79.99, inStock: true, lastUpdated: '2024-03-15T10:00:00Z' },
    ],
    recommendation: 'Price is competitive. Monitor ElectroDeals stock.',
    priceDiff: -2.5,
  },
  {
    id: '2',
    productName: 'Smart Fitness Tracker Pro',
    yourPrice: 149.99,
    competitorPrices: [
      { competitor: 'TechMart', price: 139.99, inStock: true, lastUpdated: '2024-03-15T10:30:00Z' },
      { competitor: 'GadgetWorld', price: 149.99, inStock: true, lastUpdated: '2024-03-15T10:30:00Z' },
      { competitor: 'ElectroDeals', price: 129.99, inStock: true, lastUpdated: '2024-03-15T09:15:00Z' },
      { competitor: 'PrimeShop', price: 144.99, inStock: true, lastUpdated: '2024-03-15T10:00:00Z' },
    ],
    recommendation: 'Consider price reduction. Competitors are 7-13% lower.',
    priceDiff: -8.3,
  },
  {
    id: '3',
    productName: 'Premium Cotton T-Shirt',
    yourPrice: 29.99,
    competitorPrices: [
      { competitor: 'TechMart', price: 34.99, inStock: true, lastUpdated: '2024-03-15T10:30:00Z' },
      { competitor: 'GadgetWorld', price: 32.99, inStock: false, lastUpdated: '2024-03-15T10:30:00Z' },
      { competitor: 'PrimeShop', price: 31.99, inStock: true, lastUpdated: '2024-03-15T10:00:00Z' },
    ],
    recommendation: 'You have the best price. Consider increasing for better margins.',
    priceDiff: 10.1,
  },
  {
    id: '4',
    productName: 'Leather Messenger Bag',
    yourPrice: 189.99,
    competitorPrices: [
      { competitor: 'TechMart', price: 199.99, inStock: true, lastUpdated: '2024-03-15T10:30:00Z' },
      { competitor: 'GadgetWorld', price: 179.99, inStock: true, lastUpdated: '2024-03-15T10:30:00Z' },
      { competitor: 'PrimeShop', price: 195.99, inStock: false, lastUpdated: '2024-03-15T10:00:00Z' },
    ],
    recommendation: 'Price is in competitive range. No action needed.',
    priceDiff: 1.1,
  },
];

export default function CompetitorAnalysisPage() {
  const [competitors] = useState<Competitor[]>(demoCompetitors);
  const [prices] = useState<CompetitorPrice[]>(demoCompetitorPrices);
  const [searchQuery, setSearchQuery] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedCompetitor, setSelectedCompetitor] = useState<string>('all');

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await new Promise((resolve) => setTimeout(resolve, 2000));
    setIsRefreshing(false);
  };

  const filteredPrices = prices.filter((p) => {
    if (searchQuery && !p.productName.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }
    return true;
  });

  const pricesBelow = prices.filter((p) => p.priceDiff < -5).length;
  const pricesAbove = prices.filter((p) => p.priceDiff > 5).length;
  const pricesCompetitive = prices.filter((p) => p.priceDiff >= -5 && p.priceDiff <= 5).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Competitor Analysis</h1>
          <p className="text-muted-foreground">
            Monitor competitor prices and stay competitive
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleRefresh} disabled={isRefreshing}>
            <RefreshCw className={`w-4 h-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
            {isRefreshing ? 'Updating...' : 'Refresh Prices'}
          </Button>
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            Add Competitor
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Competitors Tracked</p>
                <p className="text-2xl font-bold">{competitors.length}</p>
              </div>
              <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                <Store className="h-5 w-5 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Priced Below</p>
                <p className="text-2xl font-bold text-red-600">{pricesBelow}</p>
              </div>
              <div className="h-10 w-10 rounded-full bg-red-100 flex items-center justify-center">
                <TrendingDown className="h-5 w-5 text-red-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Competitive</p>
                <p className="text-2xl font-bold text-green-600">{pricesCompetitive}</p>
              </div>
              <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center">
                <Target className="h-5 w-5 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Priced Above</p>
                <p className="text-2xl font-bold text-blue-600">{pricesAbove}</p>
              </div>
              <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                <TrendingUp className="h-5 w-5 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Competitors List */}
      <Card>
        <CardHeader>
          <CardTitle>Tracked Competitors</CardTitle>
          <CardDescription>
            Competitors you&apos;re monitoring for price changes
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {competitors.map((competitor) => (
              <div
                key={competitor.id}
                className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                  selectedCompetitor === competitor.id
                    ? 'border-primary bg-primary/5'
                    : 'hover:border-primary/50'
                }`}
                onClick={() =>
                  setSelectedCompetitor(
                    selectedCompetitor === competitor.id ? 'all' : competitor.id
                  )
                }
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                    <Store className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="font-medium">{competitor.name}</p>
                    <p className="text-xs text-muted-foreground">{competitor.url}</p>
                  </div>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Products Tracked</span>
                    <span className="font-medium">{competitor.productsTracked}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Avg. Price Diff</span>
                    <span
                      className={`font-medium ${
                        competitor.avgPriceDiff > 0
                          ? 'text-green-600'
                          : competitor.avgPriceDiff < 0
                          ? 'text-red-600'
                          : ''
                      }`}
                    >
                      {competitor.avgPriceDiff > 0 ? '+' : ''}
                      {competitor.avgPriceDiff}%
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Price Comparison Table */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <CardTitle>Price Comparison</CardTitle>
              <CardDescription>
                Compare your prices with competitors
              </CardDescription>
            </div>
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search products..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted/50">
                <tr>
                  <th className="p-4 text-left text-sm font-medium text-muted-foreground">
                    Product
                  </th>
                  <th className="p-4 text-left text-sm font-medium text-muted-foreground">
                    Your Price
                  </th>
                  {competitors.map((c) => (
                    <th
                      key={c.id}
                      className="p-4 text-left text-sm font-medium text-muted-foreground"
                    >
                      {c.name}
                    </th>
                  ))}
                  <th className="p-4 text-left text-sm font-medium text-muted-foreground">
                    Position
                  </th>
                  <th className="p-4 text-right text-sm font-medium text-muted-foreground">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filteredPrices.map((item) => (
                  <tr key={item.id} className="hover:bg-muted/50">
                    <td className="p-4">
                      <p className="font-medium text-gray-900">{item.productName}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {item.recommendation}
                      </p>
                    </td>
                    <td className="p-4">
                      <span className="font-medium">${item.yourPrice.toFixed(2)}</span>
                    </td>
                    {competitors.map((c) => {
                      const competitorPrice = item.competitorPrices.find(
                        (cp) => cp.competitor === c.name
                      );
                      return (
                        <td key={c.id} className="p-4">
                          {competitorPrice ? (
                            <div>
                              <span
                                className={`font-medium ${
                                  competitorPrice.price < item.yourPrice
                                    ? 'text-red-600'
                                    : competitorPrice.price > item.yourPrice
                                    ? 'text-green-600'
                                    : ''
                                }`}
                              >
                                ${competitorPrice.price.toFixed(2)}
                              </span>
                              {!competitorPrice.inStock && (
                                <Badge
                                  variant="outline"
                                  className="ml-2 text-xs text-orange-600"
                                >
                                  OOS
                                </Badge>
                              )}
                            </div>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </td>
                      );
                    })}
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        {item.priceDiff < -5 ? (
                          <>
                            <TrendingDown className="h-4 w-4 text-red-600" />
                            <span className="text-red-600 text-sm font-medium">
                              {item.priceDiff.toFixed(1)}%
                            </span>
                          </>
                        ) : item.priceDiff > 5 ? (
                          <>
                            <TrendingUp className="h-4 w-4 text-green-600" />
                            <span className="text-green-600 text-sm font-medium">
                              +{item.priceDiff.toFixed(1)}%
                            </span>
                          </>
                        ) : (
                          <>
                            <Minus className="h-4 w-4 text-gray-400" />
                            <span className="text-gray-600 text-sm font-medium">
                              Competitive
                            </span>
                          </>
                        )}
                      </div>
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <Bell className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <BarChart2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Price Alerts */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Price Alerts</CardTitle>
          <CardDescription>
            Significant price changes from competitors
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[
              {
                competitor: 'ElectroDeals',
                product: 'Smart Fitness Tracker Pro',
                change: -13,
                newPrice: 129.99,
                time: '2 hours ago',
              },
              {
                competitor: 'TechMart',
                product: 'Wireless Bluetooth Headphones',
                change: -6,
                newPrice: 74.99,
                time: '5 hours ago',
              },
              {
                competitor: 'GadgetWorld',
                product: 'Leather Messenger Bag',
                change: -5,
                newPrice: 179.99,
                time: '1 day ago',
              },
            ].map((alert, i) => (
              <div
                key={i}
                className="flex items-center justify-between p-4 border rounded-lg"
              >
                <div className="flex items-center gap-4">
                  <div className="h-10 w-10 rounded-full bg-red-100 flex items-center justify-center">
                    <AlertTriangle className="h-5 w-5 text-red-600" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">
                      {alert.competitor} dropped price
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {alert.product} now ${alert.newPrice} ({alert.change}%)
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-sm text-muted-foreground">{alert.time}</span>
                  <Button size="sm">Match Price</Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
