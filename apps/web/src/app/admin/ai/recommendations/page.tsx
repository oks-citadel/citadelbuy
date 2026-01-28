'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  Sparkles,
  ChevronRight,
  Home,
  Brain,
  TrendingUp,
  Users,
  ShoppingBag,
  Settings,
  Save,
  RefreshCw,
  BarChart3,
  Target,
  Zap,
  AlertCircle,
  CheckCircle2,
  Clock,
  Eye,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';

export default function AIRecommendationsPage() {
  const [enabled, setEnabled] = useState(true);
  const [modelVersion, setModelVersion] = useState('v2.1');
  const [minConfidence, setMinConfidence] = useState(0.75);
  const [maxRecommendations, setMaxRecommendations] = useState(12);
  const [useCollaborativeFiltering, setUseCollaborativeFiltering] = useState(true);
  const [useContentBased, setUseContentBased] = useState(true);
  const [useDeepLearning, setUseDeepLearning] = useState(true);

  const stats = {
    totalRecommendations: 45230,
    clickThroughRate: 12.4,
    conversionRate: 3.8,
    revenueGenerated: 89420,
  };

  const performanceData = [
    { algorithm: 'Collaborative Filtering', accuracy: 87, usage: 45, avgLatency: '42ms' },
    { algorithm: 'Content-Based', accuracy: 82, usage: 30, avgLatency: '38ms' },
    { algorithm: 'Deep Learning', accuracy: 91, usage: 25, avgLatency: '95ms' },
  ];

  const recentActivity = [
    {
      type: 'success',
      message: 'Model v2.1 deployed successfully',
      time: '5 min ago',
    },
    {
      type: 'info',
      message: 'Generated 1,234 recommendations',
      time: '15 min ago',
    },
    {
      type: 'warning',
      message: 'Cache hit rate below threshold (65%)',
      time: '1 hour ago',
    },
    {
      type: 'success',
      message: 'Training data updated with 5K new interactions',
      time: '2 hours ago',
    },
  ];

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
        <span className="text-foreground font-medium">Product Recommendations</span>
      </nav>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
            <Sparkles className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Product Recommendations</h1>
            <p className="text-muted-foreground">
              AI-powered personalized product suggestions
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            Retrain Model
          </Button>
          <Button>
            <Save className="h-4 w-4 mr-2" />
            Save Changes
          </Button>
        </div>
      </div>

      {/* Status Banner */}
      <div className={`p-4 rounded-lg border ${enabled ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {enabled ? (
              <CheckCircle2 className="h-5 w-5 text-green-600" />
            ) : (
              <AlertCircle className="h-5 w-5 text-gray-400" />
            )}
            <div>
              <p className="font-semibold">
                {enabled ? 'Recommendation Engine Active' : 'Recommendation Engine Inactive'}
              </p>
              <p className="text-sm text-muted-foreground">
                {enabled
                  ? 'Generating personalized recommendations for users'
                  : 'Enable to start generating recommendations'}
              </p>
            </div>
          </div>
          <Switch checked={enabled} onCheckedChange={setEnabled} />
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Recommendations</p>
                <p className="text-2xl font-bold">{stats.totalRecommendations.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground mt-1">Last 30 days</p>
              </div>
              <div className="h-10 w-10 rounded-full bg-purple-100 flex items-center justify-center">
                <Sparkles className="h-5 w-5 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Click-Through Rate</p>
                <p className="text-2xl font-bold">{stats.clickThroughRate}%</p>
                <p className="text-xs text-green-600 mt-1">+2.3% from last month</p>
              </div>
              <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                <Eye className="h-5 w-5 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Conversion Rate</p>
                <p className="text-2xl font-bold">{stats.conversionRate}%</p>
                <p className="text-xs text-green-600 mt-1">+0.8% from last month</p>
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
                <p className="text-sm text-muted-foreground">Revenue Generated</p>
                <p className="text-2xl font-bold">${(stats.revenueGenerated / 1000).toFixed(0)}K</p>
                <p className="text-xs text-green-600 mt-1">+15.2% from last month</p>
              </div>
              <div className="h-10 w-10 rounded-full bg-orange-100 flex items-center justify-center">
                <TrendingUp className="h-5 w-5 text-orange-600" />
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
              Configuration
            </CardTitle>
            <CardDescription>Configure recommendation engine settings</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="model-version">Model Version</Label>
              <select
                id="model-version"
                className="w-full rounded-md border px-3 py-2 text-sm"
                value={modelVersion}
                onChange={(e) => setModelVersion(e.target.value)}
              >
                <option value="v1.0">v1.0 - Stable</option>
                <option value="v2.0">v2.0 - Enhanced</option>
                <option value="v2.1">v2.1 - Latest (Recommended)</option>
                <option value="v3.0-beta">v3.0 - Beta</option>
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="min-confidence">
                Minimum Confidence Threshold: {(minConfidence * 100).toFixed(0)}%
              </Label>
              <input
                id="min-confidence"
                type="range"
                min="0.5"
                max="0.95"
                step="0.05"
                value={minConfidence}
                onChange={(e) => setMinConfidence(parseFloat(e.target.value))}
                className="w-full"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="max-recommendations">
                Max Recommendations per User: {maxRecommendations}
              </Label>
              <input
                id="max-recommendations"
                type="range"
                min="4"
                max="20"
                step="1"
                value={maxRecommendations}
                onChange={(e) => setMaxRecommendations(parseInt(e.target.value))}
                className="w-full"
              />
            </div>

            <div className="pt-4 border-t space-y-4">
              <Label className="text-base font-semibold">Algorithm Selection</Label>

              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="collaborative">Collaborative Filtering</Label>
                  <p className="text-xs text-muted-foreground">
                    Based on similar user preferences
                  </p>
                </div>
                <Switch
                  id="collaborative"
                  checked={useCollaborativeFiltering}
                  onCheckedChange={setUseCollaborativeFiltering}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="content-based">Content-Based</Label>
                  <p className="text-xs text-muted-foreground">Based on product attributes</p>
                </div>
                <Switch
                  id="content-based"
                  checked={useContentBased}
                  onCheckedChange={setUseContentBased}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="deep-learning">Deep Learning Model</Label>
                  <p className="text-xs text-muted-foreground">Neural network predictions</p>
                </div>
                <Switch
                  id="deep-learning"
                  checked={useDeepLearning}
                  onCheckedChange={setUseDeepLearning}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Performance */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Algorithm Performance
            </CardTitle>
            <CardDescription>Real-time performance metrics by algorithm</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {performanceData.map((algo) => (
                <div key={algo.algorithm} className="p-4 border rounded-lg">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-semibold">{algo.algorithm}</h4>
                    <Badge variant="outline">{algo.avgLatency}</Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-muted-foreground">Accuracy</p>
                      <div className="flex items-center gap-2 mt-1">
                        <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full bg-green-500 rounded-full"
                            style={{ width: `${algo.accuracy}%` }}
                          />
                        </div>
                        <span className="text-sm font-medium">{algo.accuracy}%</span>
                      </div>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Usage</p>
                      <div className="flex items-center gap-2 mt-1">
                        <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full bg-blue-500 rounded-full"
                            style={{ width: `${algo.usage}%` }}
                          />
                        </div>
                        <span className="text-sm font-medium">{algo.usage}%</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            Recent Activity
          </CardTitle>
          <CardDescription>Latest events from the recommendation engine</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {recentActivity.map((activity, i) => (
              <div
                key={i}
                className="flex items-center justify-between p-3 rounded-lg bg-muted/30"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`h-2 w-2 rounded-full ${
                      activity.type === 'success'
                        ? 'bg-green-500'
                        : activity.type === 'warning'
                        ? 'bg-yellow-500'
                        : activity.type === 'error'
                        ? 'bg-red-500'
                        : 'bg-blue-500'
                    }`}
                  />
                  <p className="text-sm">{activity.message}</p>
                </div>
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  {activity.time}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
