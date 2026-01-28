'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  Brain,
  Sparkles,
  Shield,
  MessageCircle,
  TrendingUp,
  Search,
  Users,
  BarChart3,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Settings,
  Play,
  Pause,
  RefreshCw,
  Activity,
  Zap,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';

interface AIModule {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  status: 'active' | 'inactive' | 'error';
  enabled: boolean;
  metrics: {
    requests: number;
    accuracy?: number;
    latency: string;
  };
  lastUpdated: string;
  href: string;
}

const aiModules: AIModule[] = [
  {
    id: 'recommendations',
    name: 'Product Recommendations',
    description: 'AI-powered personalized product suggestions based on user behavior',
    icon: <Sparkles className="h-5 w-5" />,
    status: 'active',
    enabled: true,
    metrics: {
      requests: 45230,
      accuracy: 87,
      latency: '45ms',
    },
    lastUpdated: '2 min ago',
    href: '/admin/ai/recommendations',
  },
  {
    id: 'fraud',
    name: 'Fraud Detection',
    description: 'Real-time transaction monitoring and fraud prevention',
    icon: <Shield className="h-5 w-5" />,
    status: 'active',
    enabled: true,
    metrics: {
      requests: 12450,
      accuracy: 98,
      latency: '120ms',
    },
    lastUpdated: '5 min ago',
    href: '/admin/ai/fraud',
  },
  {
    id: 'chatbot',
    name: 'AI Chatbot',
    description: 'Intelligent customer support assistant powered by LLM',
    icon: <MessageCircle className="h-5 w-5" />,
    status: 'active',
    enabled: true,
    metrics: {
      requests: 8920,
      accuracy: 92,
      latency: '850ms',
    },
    lastUpdated: '1 min ago',
    href: '/admin/ai/chatbot',
  },
  {
    id: 'pricing',
    name: 'Dynamic Pricing',
    description: 'AI-driven price optimization based on demand and competition',
    icon: <TrendingUp className="h-5 w-5" />,
    status: 'inactive',
    enabled: false,
    metrics: {
      requests: 0,
      latency: 'N/A',
    },
    lastUpdated: 'Never',
    href: '/admin/ai/pricing',
  },
  {
    id: 'search',
    name: 'Smart Search',
    description: 'NLP-powered search with semantic understanding',
    icon: <Search className="h-5 w-5" />,
    status: 'active',
    enabled: true,
    metrics: {
      requests: 67800,
      accuracy: 94,
      latency: '65ms',
    },
    lastUpdated: '30 sec ago',
    href: '/admin/ai/search',
  },
  {
    id: 'personalization',
    name: 'User Personalization',
    description: 'Personalized homepage and content based on user preferences',
    icon: <Users className="h-5 w-5" />,
    status: 'error',
    enabled: true,
    metrics: {
      requests: 23100,
      latency: 'Error',
    },
    lastUpdated: '15 min ago',
    href: '/admin/ai/personalization',
  },
];

export default function AIManagementPage() {
  const [modules, setModules] = useState(aiModules);

  const toggleModule = (id: string) => {
    setModules((prev) =>
      prev.map((m) =>
        m.id === id
          ? { ...m, enabled: !m.enabled, status: !m.enabled ? 'active' : 'inactive' }
          : m
      )
    );
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'inactive':
        return <Pause className="h-4 w-4 text-gray-400" />;
      case 'error':
        return <AlertTriangle className="h-4 w-4 text-red-500" />;
      default:
        return null;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'inactive':
        return 'bg-gray-100 text-gray-800';
      case 'error':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const activeModules = modules.filter((m) => m.status === 'active').length;
  const totalRequests = modules.reduce((acc, m) => acc + m.metrics.requests, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">AI Management</h1>
          <p className="text-muted-foreground">
            Monitor and configure AI-powered features
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh Status
          </Button>
          <Button>
            <Settings className="h-4 w-4 mr-2" />
            Global Settings
          </Button>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Active Modules</p>
                <p className="text-2xl font-bold">{activeModules}/{modules.length}</p>
              </div>
              <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center">
                <Brain className="h-5 w-5 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Requests</p>
                <p className="text-2xl font-bold">{(totalRequests / 1000).toFixed(1)}K</p>
              </div>
              <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                <Activity className="h-5 w-5 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Avg Accuracy</p>
                <p className="text-2xl font-bold">92.8%</p>
              </div>
              <div className="h-10 w-10 rounded-full bg-purple-100 flex items-center justify-center">
                <BarChart3 className="h-5 w-5 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Errors Today</p>
                <p className="text-2xl font-bold">3</p>
              </div>
              <div className="h-10 w-10 rounded-full bg-red-100 flex items-center justify-center">
                <AlertTriangle className="h-5 w-5 text-red-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* AI Modules Grid */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {modules.map((module) => (
          <Card key={module.id} className="overflow-hidden">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${
                    module.status === 'active'
                      ? 'bg-primary/10 text-primary'
                      : module.status === 'error'
                      ? 'bg-red-100 text-red-600'
                      : 'bg-muted text-muted-foreground'
                  }`}>
                    {module.icon}
                  </div>
                  <div>
                    <CardTitle className="text-base">{module.name}</CardTitle>
                    <div className="flex items-center gap-2 mt-1">
                      {getStatusIcon(module.status)}
                      <Badge className={getStatusBadge(module.status)} variant="outline">
                        {module.status}
                      </Badge>
                    </div>
                  </div>
                </div>
                <Switch
                  checked={module.enabled}
                  onCheckedChange={() => toggleModule(module.id)}
                />
              </div>
              <CardDescription className="mt-2">
                {module.description}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4 text-center border-t pt-4">
                <div>
                  <p className="text-sm text-muted-foreground">Requests</p>
                  <p className="font-semibold">
                    {module.metrics.requests > 1000
                      ? `${(module.metrics.requests / 1000).toFixed(1)}K`
                      : module.metrics.requests}
                  </p>
                </div>
                {module.metrics.accuracy !== undefined && (
                  <div>
                    <p className="text-sm text-muted-foreground">Accuracy</p>
                    <p className="font-semibold">{module.metrics.accuracy}%</p>
                  </div>
                )}
                <div>
                  <p className="text-sm text-muted-foreground">Latency</p>
                  <p className="font-semibold">{module.metrics.latency}</p>
                </div>
              </div>
              <div className="flex items-center justify-between mt-4 pt-4 border-t">
                <span className="text-xs text-muted-foreground">
                  Updated {module.lastUpdated}
                </span>
                <Link href={module.href}>
                  <Button variant="ghost" size="sm">
                    Configure
                    <Settings className="h-4 w-4 ml-1" />
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            AI Activity Log
          </CardTitle>
          <CardDescription>Recent AI module events and actions</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[
              {
                module: 'Fraud Detection',
                event: 'Blocked suspicious transaction',
                time: '2 min ago',
                type: 'alert',
              },
              {
                module: 'Product Recommendations',
                event: 'Model retrained with new data',
                time: '15 min ago',
                type: 'success',
              },
              {
                module: 'User Personalization',
                event: 'API connection timeout',
                time: '15 min ago',
                type: 'error',
              },
              {
                module: 'AI Chatbot',
                event: 'Handled 45 customer queries',
                time: '1 hour ago',
                type: 'info',
              },
              {
                module: 'Smart Search',
                event: 'Index updated successfully',
                time: '2 hours ago',
                type: 'success',
              },
            ].map((activity, i) => (
              <div
                key={i}
                className="flex items-center justify-between p-3 rounded-lg bg-muted/30"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`h-2 w-2 rounded-full ${
                      activity.type === 'error'
                        ? 'bg-red-500'
                        : activity.type === 'alert'
                        ? 'bg-yellow-500'
                        : activity.type === 'success'
                        ? 'bg-green-500'
                        : 'bg-blue-500'
                    }`}
                  />
                  <div>
                    <p className="font-medium text-sm">{activity.module}</p>
                    <p className="text-sm text-muted-foreground">{activity.event}</p>
                  </div>
                </div>
                <span className="text-xs text-muted-foreground">{activity.time}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
