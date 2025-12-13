'use client';

import * as React from 'react';
import Link from 'next/link';
import {
  Shield,
  AlertTriangle,
  CheckCircle,
  Clock,
  Users,
  FileSearch,
  TrendingUp,
  TrendingDown,
  ArrowRight,
  Activity,
  Database,
  AlertCircle,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface ComplianceMetric {
  label: string;
  value: number | string;
  change?: number;
  trend?: 'up' | 'down';
  icon: React.ReactNode;
  color: string;
}

interface RecentActivity {
  id: string;
  type: 'screening' | 'review' | 'alert';
  title: string;
  description: string;
  timestamp: string;
  status: 'success' | 'warning' | 'error';
}

export default function CompliancePage() {
  // Mock data - replace with actual API calls
  const metrics: ComplianceMetric[] = [
    {
      label: 'Total Screenings',
      value: '12,543',
      change: 12.5,
      trend: 'up',
      icon: <FileSearch className="h-5 w-5" />,
      color: 'blue',
    },
    {
      label: 'Flagged Entities',
      value: '127',
      change: -8.2,
      trend: 'down',
      icon: <AlertTriangle className="h-5 w-5" />,
      color: 'red',
    },
    {
      label: 'Clear Results',
      value: '12,234',
      change: 15.3,
      trend: 'up',
      icon: <CheckCircle className="h-5 w-5" />,
      color: 'green',
    },
    {
      label: 'Pending Reviews',
      value: '182',
      change: 5.1,
      trend: 'up',
      icon: <Clock className="h-5 w-5" />,
      color: 'yellow',
    },
  ];

  const recentActivity: RecentActivity[] = [
    {
      id: '1',
      type: 'screening',
      title: 'New Screening Completed',
      description: 'John Doe - Clear result',
      timestamp: '5 minutes ago',
      status: 'success',
    },
    {
      id: '2',
      type: 'alert',
      title: 'High-Risk Match Detected',
      description: 'ABC Corporation - 95% match with OFAC list',
      timestamp: '12 minutes ago',
      status: 'error',
    },
    {
      id: '3',
      type: 'review',
      title: 'Manual Review Completed',
      description: 'Jane Smith - Approved after review',
      timestamp: '1 hour ago',
      status: 'success',
    },
    {
      id: '4',
      type: 'screening',
      title: 'Batch Screening Initiated',
      description: '250 entities queued for screening',
      timestamp: '2 hours ago',
      status: 'warning',
    },
    {
      id: '5',
      type: 'alert',
      title: 'Watchlist Updated',
      description: 'EU Sanctions list updated with 15 new entries',
      timestamp: '3 hours ago',
      status: 'warning',
    },
  ];

  const getMetricColor = (color: string) => {
    const colors: Record<string, string> = {
      blue: 'bg-blue-100 text-blue-600',
      red: 'bg-red-100 text-red-600',
      green: 'bg-green-100 text-green-600',
      yellow: 'bg-yellow-100 text-yellow-600',
    };
    return colors[color] || 'bg-gray-100 text-gray-600';
  };

  const getActivityIcon = (type: RecentActivity['type']) => {
    const icons = {
      screening: <FileSearch className="h-4 w-4" />,
      review: <Users className="h-4 w-4" />,
      alert: <AlertCircle className="h-4 w-4" />,
    };
    return icons[type];
  };

  const getActivityColor = (status: RecentActivity['status']) => {
    const colors = {
      success: 'text-green-600 bg-green-100',
      warning: 'text-yellow-600 bg-yellow-100',
      error: 'text-red-600 bg-red-100',
    };
    return colors[status];
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Shield className="h-6 w-6 text-primary" />
            Compliance Dashboard
          </h1>
          <p className="text-muted-foreground">
            Monitor sanctions screening and compliance activities
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/admin/compliance/sanctions">
            <Button>
              <FileSearch className="h-4 w-4 mr-2" />
              Sanctions Screening
            </Button>
          </Link>
        </div>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {metrics.map((metric, index) => (
          <Card key={index}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <p className="text-sm text-muted-foreground mb-1">{metric.label}</p>
                  <p className="text-2xl font-bold">{metric.value}</p>
                  {metric.change !== undefined && (
                    <div className="flex items-center gap-1 mt-2">
                      {metric.trend === 'up' ? (
                        <TrendingUp className="h-3 w-3 text-green-600" />
                      ) : (
                        <TrendingDown className="h-3 w-3 text-red-600" />
                      )}
                      <span
                        className={`text-xs font-medium ${
                          metric.trend === 'up' ? 'text-green-600' : 'text-red-600'
                        }`}
                      >
                        {Math.abs(metric.change)}%
                      </span>
                      <span className="text-xs text-muted-foreground">vs last month</span>
                    </div>
                  )}
                </div>
                <div className={`h-12 w-12 rounded-full ${getMetricColor(metric.color)} flex items-center justify-center`}>
                  {metric.icon}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Link href="/admin/compliance/sanctions">
          <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <FileSearch className="h-5 w-5 text-primary" />
                Sanctions Screening
              </CardTitle>
              <CardDescription>
                Screen entities against global sanctions lists
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-2xl font-bold">127</p>
                  <p className="text-xs text-muted-foreground">Pending Reviews</p>
                </div>
                <ArrowRight className="h-5 w-5 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
        </Link>

        <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Activity className="h-5 w-5 text-primary" />
              Transaction Monitoring
            </CardTitle>
            <CardDescription>
              Monitor suspicious transaction patterns
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold">23</p>
                <p className="text-xs text-muted-foreground">Active Alerts</p>
              </div>
              <ArrowRight className="h-5 w-5 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Database className="h-5 w-5 text-primary" />
              Watchlist Management
            </CardTitle>
            <CardDescription>
              Manage and update compliance watchlists
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold">15,432</p>
                <p className="text-xs text-muted-foreground">Watchlist Entries</p>
              </div>
              <ArrowRight className="h-5 w-5 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Recent Activity
              </CardTitle>
              <CardDescription>Latest compliance events and screenings</CardDescription>
            </div>
            <Button variant="outline" size="sm">
              View All
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {recentActivity.map((activity) => (
              <div
                key={activity.id}
                className="flex items-start gap-4 p-4 rounded-lg border bg-muted/50 hover:bg-muted transition-colors"
              >
                <div className={`h-10 w-10 rounded-full ${getActivityColor(activity.status)} flex items-center justify-center flex-shrink-0`}>
                  {getActivityIcon(activity.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <h4 className="font-medium text-sm">{activity.title}</h4>
                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                      {activity.timestamp}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    {activity.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Compliance Status Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Screening Status
            </CardTitle>
            <CardDescription>Overview of screening results</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span className="text-sm font-medium">Clear</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold">12,234</span>
                  <Badge variant="success" className="bg-green-100 text-green-800">
                    97.5%
                  </Badge>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-red-600" />
                  <span className="text-sm font-medium">Flagged</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold">127</span>
                  <Badge variant="destructive" className="bg-red-100 text-red-800">
                    1.0%
                  </Badge>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-yellow-600" />
                  <span className="text-sm font-medium">Pending</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold">182</span>
                  <Badge variant="warning" className="bg-yellow-100 text-yellow-800">
                    1.5%
                  </Badge>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              Active Watchlists
            </CardTitle>
            <CardDescription>Currently monitored sanctions lists</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-2 rounded-md bg-muted/50">
                <span className="text-sm font-medium">OFAC SDN List</span>
                <Badge variant="outline">6,543 entries</Badge>
              </div>
              <div className="flex items-center justify-between p-2 rounded-md bg-muted/50">
                <span className="text-sm font-medium">EU Sanctions</span>
                <Badge variant="outline">3,421 entries</Badge>
              </div>
              <div className="flex items-center justify-between p-2 rounded-md bg-muted/50">
                <span className="text-sm font-medium">UN Sanctions</span>
                <Badge variant="outline">2,876 entries</Badge>
              </div>
              <div className="flex items-center justify-between p-2 rounded-md bg-muted/50">
                <span className="text-sm font-medium">UK Sanctions</span>
                <Badge variant="outline">2,592 entries</Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
