'use client';

import React, { useState, useEffect } from 'react';
import {
  Building2,
  Users,
  Package,
  Activity,
  Settings,
  UserPlus,
  TrendingUp,
  Clock,
  CheckCircle2,
  AlertCircle,
  Loader2,
  MoreVertical,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { formatRelativeTime, getInitials } from '@/lib/utils';

interface Organization {
  id: string;
  name: string;
  slug: string;
  logo?: string;
  status: 'active' | 'suspended' | 'trial';
  memberCount: number;
  teamCount: number;
  productCount: number;
  createdAt: string;
}

interface QuickStat {
  label: string;
  value: number;
  change?: number;
  icon: React.ElementType;
  trend?: 'up' | 'down';
}

interface Activity {
  id: string;
  type: 'member_joined' | 'team_created' | 'role_updated' | 'product_added' | 'settings_changed';
  user: {
    name: string;
    email: string;
    avatar?: string;
  };
  description: string;
  timestamp: string;
}

const mockOrganization: Organization = {
  id: 'org_1',
  name: 'Acme Corporation',
  slug: 'acme-corp',
  logo: undefined,
  status: 'active',
  memberCount: 42,
  teamCount: 8,
  productCount: 156,
  createdAt: '2024-01-15T00:00:00Z',
};

const mockActivities: Activity[] = [
  {
    id: '1',
    type: 'member_joined',
    user: { name: 'Sarah Johnson', email: 'sarah@example.com' },
    description: 'joined the organization',
    timestamp: '2024-01-20T10:30:00Z',
  },
  {
    id: '2',
    type: 'team_created',
    user: { name: 'Mike Chen', email: 'mike@example.com' },
    description: 'created team "Engineering"',
    timestamp: '2024-01-20T09:15:00Z',
  },
  {
    id: '3',
    type: 'role_updated',
    user: { name: 'Emily Davis', email: 'emily@example.com' },
    description: 'was promoted to Team Lead',
    timestamp: '2024-01-19T16:45:00Z',
  },
  {
    id: '4',
    type: 'product_added',
    user: { name: 'John Smith', email: 'john@example.com' },
    description: 'added 5 new products',
    timestamp: '2024-01-19T14:20:00Z',
  },
  {
    id: '5',
    type: 'settings_changed',
    user: { name: 'Admin User', email: 'admin@example.com' },
    description: 'updated organization settings',
    timestamp: '2024-01-18T11:00:00Z',
  },
];

const getActivityIcon = (type: Activity['type']) => {
  switch (type) {
    case 'member_joined':
      return <UserPlus className="h-4 w-4 text-green-600" />;
    case 'team_created':
      return <Users className="h-4 w-4 text-blue-600" />;
    case 'role_updated':
      return <TrendingUp className="h-4 w-4 text-purple-600" />;
    case 'product_added':
      return <Package className="h-4 w-4 text-orange-600" />;
    case 'settings_changed':
      return <Settings className="h-4 w-4 text-gray-600" />;
    default:
      return <Activity className="h-4 w-4" />;
  }
};

const getStatusBadge = (status: Organization['status']) => {
  switch (status) {
    case 'active':
      return <Badge variant="success">Active</Badge>;
    case 'suspended':
      return <Badge variant="destructive">Suspended</Badge>;
    case 'trial':
      return <Badge variant="warning">Trial</Badge>;
    default:
      return <Badge variant="secondary">{status}</Badge>;
  }
};

export function OrganizationDashboard() {
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    setIsLoading(true);
    try {
      // In production, fetch from API
      // const response = await api.get('/organizations/current');
      await new Promise(resolve => setTimeout(resolve, 500));
      setOrganization(mockOrganization);
      setActivities(mockActivities);
    } catch (error) {
      console.error('Failed to load organization dashboard:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading || !organization) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const quickStats: QuickStat[] = [
    {
      label: 'Team Members',
      value: organization.memberCount,
      change: 12,
      icon: Users,
      trend: 'up',
    },
    {
      label: 'Teams',
      value: organization.teamCount,
      change: 2,
      icon: Users,
      trend: 'up',
    },
    {
      label: 'Products',
      value: organization.productCount,
      change: 8,
      icon: Package,
      trend: 'up',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Organization Header */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <Avatar className="h-16 w-16">
                {organization.logo ? (
                  <AvatarImage src={organization.logo} alt={organization.name} />
                ) : (
                  <AvatarFallback className="bg-primary text-primary-foreground text-xl">
                    {getInitials(organization.name)}
                  </AvatarFallback>
                )}
              </Avatar>
              <div>
                <div className="flex items-center gap-3">
                  <h1 className="text-2xl font-bold">{organization.name}</h1>
                  {getStatusBadge(organization.status)}
                </div>
                <p className="text-sm text-muted-foreground">@{organization.slug}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Created {formatRelativeTime(organization.createdAt)}
                </p>
              </div>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem>
                  <Settings className="h-4 w-4 mr-2" />
                  Organization Settings
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Building2 className="h-4 w-4 mr-2" />
                  Update Profile
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardContent>
      </Card>

      {/* Quick Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        {quickStats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <Card key={index}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {stat.label}
                </CardTitle>
                <Icon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stat.value}</div>
                {stat.change && (
                  <p className="text-xs text-muted-foreground mt-1">
                    <span className={stat.trend === 'up' ? 'text-green-600' : 'text-red-600'}>
                      +{stat.change}
                    </span>{' '}
                    from last month
                  </p>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Recent Activity
            </CardTitle>
            <CardDescription>Latest updates from your organization</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {activities.map((activity) => (
                <div key={activity.id} className="flex items-start gap-3">
                  <div className="mt-1">{getActivityIcon(activity.type)}</div>
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <Avatar className="h-6 w-6">
                        {activity.user.avatar ? (
                          <AvatarImage src={activity.user.avatar} alt={activity.user.name} />
                        ) : (
                          <AvatarFallback className="text-xs">
                            {getInitials(activity.user.name)}
                          </AvatarFallback>
                        )}
                      </Avatar>
                      <p className="text-sm">
                        <span className="font-medium">{activity.user.name}</span>{' '}
                        <span className="text-muted-foreground">{activity.description}</span>
                      </p>
                    </div>
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {formatRelativeTime(activity.timestamp)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Common tasks and shortcuts</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button className="w-full justify-start" variant="outline">
              <UserPlus className="h-4 w-4 mr-2" />
              Invite Team Members
            </Button>
            <Button className="w-full justify-start" variant="outline">
              <Users className="h-4 w-4 mr-2" />
              Create New Team
            </Button>
            <Button className="w-full justify-start" variant="outline">
              <Package className="h-4 w-4 mr-2" />
              Add Products
            </Button>
            <Button className="w-full justify-start" variant="outline">
              <Settings className="h-4 w-4 mr-2" />
              Manage Roles & Permissions
            </Button>
            <Button className="w-full justify-start" variant="outline">
              <Activity className="h-4 w-4 mr-2" />
              View Analytics
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default OrganizationDashboard;
