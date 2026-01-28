'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  Users,
  Plus,
  Search,
  Filter,
  Edit,
  Trash2,
  Copy,
  Target,
  TrendingUp,
  Mail,
  ShoppingCart,
  Calendar,
  MapPin,
  Tag,
  MoreVertical,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

interface Audience {
  id: string;
  name: string;
  description: string;
  type: 'CUSTOM' | 'SMART' | 'LOOKALIKE';
  size: number;
  growth: number;
  criteria: string[];
  campaigns: number;
  lastUpdated: string;
  status: 'ACTIVE' | 'BUILDING' | 'PAUSED';
}

const demoAudiences: Audience[] = [
  {
    id: '1',
    name: 'High-Value Customers',
    description: 'Customers who spent $500+ in the last 6 months',
    type: 'SMART',
    size: 2450,
    growth: 12,
    criteria: ['Total spent > $500', 'Orders > 3', 'Last 6 months'],
    campaigns: 5,
    lastUpdated: '2024-03-15',
    status: 'ACTIVE',
  },
  {
    id: '2',
    name: 'Cart Abandoners',
    description: 'Users who abandoned cart in the last 7 days',
    type: 'SMART',
    size: 890,
    growth: -5,
    criteria: ['Abandoned cart', 'Last 7 days', 'Cart value > $50'],
    campaigns: 2,
    lastUpdated: '2024-03-14',
    status: 'ACTIVE',
  },
  {
    id: '3',
    name: 'Newsletter Subscribers',
    description: 'Email subscribers who opted in for promotions',
    type: 'CUSTOM',
    size: 15680,
    growth: 8,
    criteria: ['Email subscribed', 'Promotions opted-in'],
    campaigns: 12,
    lastUpdated: '2024-03-10',
    status: 'ACTIVE',
  },
  {
    id: '4',
    name: 'Electronics Buyers',
    description: 'Customers interested in electronics category',
    type: 'SMART',
    size: 4320,
    growth: 15,
    criteria: ['Category: Electronics', 'Viewed 3+ products', 'Last 30 days'],
    campaigns: 3,
    lastUpdated: '2024-03-12',
    status: 'ACTIVE',
  },
  {
    id: '5',
    name: 'Lookalike - Top Customers',
    description: 'Similar to your top 10% customers',
    type: 'LOOKALIKE',
    size: 8900,
    growth: 0,
    criteria: ['Based on: High-Value Customers', 'Similarity: 90%'],
    campaigns: 1,
    lastUpdated: '2024-03-08',
    status: 'BUILDING',
  },
  {
    id: '6',
    name: 'Dormant Customers',
    description: 'Customers inactive for 90+ days',
    type: 'SMART',
    size: 3200,
    growth: -2,
    criteria: ['No orders 90+ days', 'Previous customer', 'Engaged with email'],
    campaigns: 1,
    lastUpdated: '2024-03-05',
    status: 'ACTIVE',
  },
];

export default function AudiencesPage() {
  const [audiences] = useState<Audience[]>(demoAudiences);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [showCreateModal, setShowCreateModal] = useState(false);

  const filteredAudiences = audiences.filter((a) => {
    if (searchQuery && !a.name.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }
    if (typeFilter !== 'all' && a.type !== typeFilter) {
      return false;
    }
    return true;
  });

  const totalSize = audiences.reduce((acc, a) => acc + a.size, 0);
  const avgGrowth = audiences.reduce((acc, a) => acc + a.growth, 0) / audiences.length;

  const getTypeBadge = (type: Audience['type']) => {
    const styles: Record<Audience['type'], string> = {
      CUSTOM: 'bg-blue-100 text-blue-800',
      SMART: 'bg-purple-100 text-purple-800',
      LOOKALIKE: 'bg-green-100 text-green-800',
    };
    return styles[type];
  };

  const getStatusBadge = (status: Audience['status']) => {
    const styles: Record<Audience['status'], string> = {
      ACTIVE: 'bg-green-100 text-green-800',
      BUILDING: 'bg-yellow-100 text-yellow-800',
      PAUSED: 'bg-gray-100 text-gray-800',
    };
    return styles[status];
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Audiences</h1>
          <p className="text-muted-foreground">
            Create and manage customer segments for targeted campaigns
          </p>
        </div>
        <Button onClick={() => setShowCreateModal(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Create Audience
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Audiences</p>
                <p className="text-2xl font-bold">{audiences.length}</p>
              </div>
              <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                <Target className="h-5 w-5 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Reach</p>
                <p className="text-2xl font-bold">{totalSize.toLocaleString()}</p>
              </div>
              <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center">
                <Users className="h-5 w-5 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Avg. Growth</p>
                <p className="text-2xl font-bold">{avgGrowth.toFixed(1)}%</p>
              </div>
              <div className="h-10 w-10 rounded-full bg-purple-100 flex items-center justify-center">
                <TrendingUp className="h-5 w-5 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Active Campaigns</p>
                <p className="text-2xl font-bold">
                  {audiences.reduce((acc, a) => acc + a.campaigns, 0)}
                </p>
              </div>
              <div className="h-10 w-10 rounded-full bg-orange-100 flex items-center justify-center">
                <Mail className="h-5 w-5 text-orange-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search audiences..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <select
              className="rounded-md border border-gray-300 px-3 py-2 text-sm"
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
            >
              <option value="all">All Types</option>
              <option value="CUSTOM">Custom</option>
              <option value="SMART">Smart</option>
              <option value="LOOKALIKE">Lookalike</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Audiences Grid */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredAudiences.map((audience) => (
          <Card key={audience.id} className="hover:border-primary/50 transition-colors">
            <CardContent className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <Users className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">{audience.name}</h3>
                    <div className="flex gap-2 mt-1">
                      <Badge className={getTypeBadge(audience.type)} variant="outline">
                        {audience.type}
                      </Badge>
                      <Badge className={getStatusBadge(audience.status)} variant="outline">
                        {audience.status}
                      </Badge>
                    </div>
                  </div>
                </div>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </div>

              <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                {audience.description}
              </p>

              <div className="space-y-3 mb-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Audience Size</span>
                  <span className="font-medium">{audience.size.toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Growth (7d)</span>
                  <span
                    className={`font-medium ${
                      audience.growth > 0
                        ? 'text-green-600'
                        : audience.growth < 0
                        ? 'text-red-600'
                        : 'text-gray-600'
                    }`}
                  >
                    {audience.growth > 0 ? '+' : ''}
                    {audience.growth}%
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Active Campaigns</span>
                  <span className="font-medium">{audience.campaigns}</span>
                </div>
              </div>

              <div className="flex flex-wrap gap-1 mb-4">
                {audience.criteria.slice(0, 3).map((criterion, i) => (
                  <span
                    key={i}
                    className="text-xs px-2 py-1 bg-muted rounded-full text-muted-foreground"
                  >
                    {criterion}
                  </span>
                ))}
                {audience.criteria.length > 3 && (
                  <span className="text-xs px-2 py-1 bg-muted rounded-full text-muted-foreground">
                    +{audience.criteria.length - 3} more
                  </span>
                )}
              </div>

              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="flex-1">
                  <Edit className="h-3 w-3 mr-1" />
                  Edit
                </Button>
                <Button variant="outline" size="sm" className="flex-1">
                  <Copy className="h-3 w-3 mr-1" />
                  Duplicate
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8 text-red-600"
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredAudiences.length === 0 && (
        <Card>
          <CardContent className="p-12 text-center">
            <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="font-medium text-gray-900 mb-2">No audiences found</h3>
            <p className="text-muted-foreground mb-4">
              {searchQuery || typeFilter !== 'all'
                ? 'Try adjusting your filters'
                : 'Create your first audience to start targeting customers'}
            </p>
            <Button onClick={() => setShowCreateModal(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Create Audience
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Quick Create Templates */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Create Templates</CardTitle>
          <CardDescription>
            Start with pre-configured audience templates
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              {
                icon: ShoppingCart,
                title: 'Cart Abandoners',
                desc: 'Users who left items in cart',
              },
              {
                icon: TrendingUp,
                title: 'High Spenders',
                desc: 'Top 20% by purchase value',
              },
              {
                icon: Calendar,
                title: 'New Customers',
                desc: 'Signed up in last 30 days',
              },
              {
                icon: Tag,
                title: 'Category Fans',
                desc: 'Interested in specific categories',
              },
            ].map((template, i) => (
              <button
                key={i}
                className="p-4 border rounded-lg text-left hover:border-primary/50 hover:bg-muted/50 transition-colors"
              >
                <template.icon className="h-8 w-8 text-primary mb-2" />
                <p className="font-medium text-gray-900">{template.title}</p>
                <p className="text-sm text-muted-foreground">{template.desc}</p>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
