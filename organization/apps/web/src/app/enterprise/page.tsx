'use client';

import * as React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  FileText,
  ClipboardCheck,
  Globe,
  TrendingUp,
  Users,
  DollarSign,
  ArrowUpRight,
  ArrowDownRight,
  Activity,
} from 'lucide-react';
import Link from 'next/link';

export default function EnterpriseDashboard() {
  const stats = [
    {
      title: 'Active RFQs',
      value: '24',
      change: '+12%',
      trend: 'up',
      icon: FileText,
      href: '/enterprise/rfq',
    },
    {
      title: 'Active Contracts',
      value: '156',
      change: '+8%',
      trend: 'up',
      icon: ClipboardCheck,
      href: '/enterprise/contracts',
    },
    {
      title: 'Compliance Score',
      value: '98%',
      change: '+2%',
      trend: 'up',
      icon: Globe,
      href: '/enterprise/compliance',
    },
    {
      title: 'Monthly Spend',
      value: '$2.4M',
      change: '-5%',
      trend: 'down',
      icon: DollarSign,
      href: '/enterprise/analytics',
    },
  ];

  const recentActivity = [
    {
      title: 'New RFQ submitted for Office Supplies',
      time: '5 minutes ago',
      type: 'rfq',
    },
    {
      title: 'Contract approved: Global IT Services',
      time: '1 hour ago',
      type: 'contract',
    },
    {
      title: 'Compliance review completed: EU GDPR',
      time: '2 hours ago',
      type: 'compliance',
    },
    {
      title: 'New vendor onboarded: APAC Electronics',
      time: '3 hours ago',
      type: 'vendor',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Enterprise Dashboard</h1>
        <p className="text-muted-foreground mt-2">
          Manage your global B2B operations, contracts, and compliance
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Link key={stat.title} href={stat.href}>
              <Card hover clickable>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
                  <Icon className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stat.value}</div>
                  <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                    {stat.trend === 'up' ? (
                      <ArrowUpRight className="h-3 w-3 text-green-500" />
                    ) : (
                      <ArrowDownRight className="h-3 w-3 text-red-500" />
                    )}
                    <span
                      className={stat.trend === 'up' ? 'text-green-500' : 'text-red-500'}
                    >
                      {stat.change}
                    </span>
                    <span className="text-muted-foreground">from last month</span>
                  </p>
                </CardContent>
              </Card>
            </Link>
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
            <CardDescription>Latest updates across your enterprise</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentActivity.map((activity, idx) => (
                <div key={idx} className="flex items-start gap-3 pb-4 border-b last:border-0 last:pb-0">
                  <div className="h-2 w-2 rounded-full bg-primary mt-2" />
                  <div className="flex-1">
                    <p className="text-sm font-medium">{activity.title}</p>
                    <p className="text-xs text-muted-foreground mt-1">{activity.time}</p>
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
            <CardDescription>Common enterprise operations</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <Link href="/enterprise/rfq">
              <Button variant="outline" className="w-full justify-start">
                <FileText className="h-4 w-4 mr-2" />
                Create New RFQ
              </Button>
            </Link>
            <Link href="/enterprise/contracts">
              <Button variant="outline" className="w-full justify-start">
                <ClipboardCheck className="h-4 w-4 mr-2" />
                Review Contracts
              </Button>
            </Link>
            <Link href="/enterprise/compliance">
              <Button variant="outline" className="w-full justify-start">
                <Globe className="h-4 w-4 mr-2" />
                Compliance Dashboard
              </Button>
            </Link>
            <Link href="/vendor-portal/onboarding">
              <Button variant="outline" className="w-full justify-start">
                <Users className="h-4 w-4 mr-2" />
                Onboard New Vendor
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>

      {/* Global Operations Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5" />
            Global Operations
          </CardTitle>
          <CardDescription>Active operations across regions</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <p className="text-sm font-medium">North America</p>
              <div className="flex items-baseline gap-2">
                <p className="text-2xl font-bold">$890K</p>
                <p className="text-xs text-green-500 flex items-center">
                  <TrendingUp className="h-3 w-3 mr-1" />
                  +15%
                </p>
              </div>
              <p className="text-xs text-muted-foreground">45 active contracts</p>
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium">Europe</p>
              <div className="flex items-baseline gap-2">
                <p className="text-2xl font-bold">$1.2M</p>
                <p className="text-xs text-green-500 flex items-center">
                  <TrendingUp className="h-3 w-3 mr-1" />
                  +22%
                </p>
              </div>
              <p className="text-xs text-muted-foreground">67 active contracts</p>
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium">APAC</p>
              <div className="flex items-baseline gap-2">
                <p className="text-2xl font-bold">$310K</p>
                <p className="text-xs text-green-500 flex items-center">
                  <TrendingUp className="h-3 w-3 mr-1" />
                  +8%
                </p>
              </div>
              <p className="text-xs text-muted-foreground">44 active contracts</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
