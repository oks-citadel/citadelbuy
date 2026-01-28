'use client';

import * as React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Store,
  Globe,
  DollarSign,
  Package,
  TrendingUp,
  Users,
  ShoppingCart,
  ArrowUpRight,
} from 'lucide-react';
import Link from 'next/link';

export default function VendorPortalDashboard() {
  const stats = [
    {
      title: 'Active Regions',
      value: '8',
      change: '+2 this quarter',
      icon: Globe,
      href: '/vendor-portal/onboarding',
    },
    {
      title: 'Listed Products',
      value: '342',
      change: '+45 this month',
      icon: Package,
      href: '/vendor-portal/products',
    },
    {
      title: 'Total Sales',
      value: '$2.8M',
      change: '+18% vs last quarter',
      icon: DollarSign,
      href: '/vendor/analytics',
    },
    {
      title: 'Active Orders',
      value: '156',
      change: '23 pending',
      icon: ShoppingCart,
      href: '/vendor/page',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Global Vendor Hub</h1>
        <p className="text-muted-foreground mt-2">
          Manage your global presence and expand to new markets
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
                  <p className="text-xs text-muted-foreground mt-1">{stat.change}</p>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Regional Performance */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="h-5 w-5" />
              Regional Performance
            </CardTitle>
            <CardDescription>Sales performance across regions</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">North America</p>
                  <p className="text-sm text-muted-foreground">$1.2M total sales</p>
                </div>
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-green-500" />
                  <span className="text-sm font-medium text-green-500">+22%</span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Europe</p>
                  <p className="text-sm text-muted-foreground">$980K total sales</p>
                </div>
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-green-500" />
                  <span className="text-sm font-medium text-green-500">+15%</span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">APAC</p>
                  <p className="text-sm text-muted-foreground">$620K total sales</p>
                </div>
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-green-500" />
                  <span className="text-sm font-medium text-green-500">+28%</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Common vendor operations</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <Link href="/vendor-portal/onboarding">
              <Button variant="outline" className="w-full justify-start">
                <Globe className="h-4 w-4 mr-2" />
                Expand to New Region
              </Button>
            </Link>
            <Link href="/vendor-portal/storefront">
              <Button variant="outline" className="w-full justify-start">
                <Store className="h-4 w-4 mr-2" />
                Customize Storefront
              </Button>
            </Link>
            <Link href="/vendor-portal/pricing">
              <Button variant="outline" className="w-full justify-start">
                <DollarSign className="h-4 w-4 mr-2" />
                Update Pricing
              </Button>
            </Link>
            <Link href="/vendor-portal/compliance">
              <Button variant="outline" className="w-full justify-start">
                <Globe className="h-4 w-4 mr-2" />
                Upload Certifications
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>

      {/* Expansion Opportunities */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Market Expansion Opportunities
          </CardTitle>
          <CardDescription>AI-identified opportunities to grow your business</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-start gap-4 p-4 border rounded-lg">
              <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                <Globe className="h-5 w-5 text-blue-600" />
              </div>
              <div className="flex-1">
                <h4 className="font-semibold">Expand to Latin America</h4>
                <p className="text-sm text-muted-foreground mt-1">
                  High demand for your products in Brazil and Mexico. Estimated market size: $450K/year
                </p>
              </div>
              <Button size="sm" className="gap-2">
                Start Onboarding
                <ArrowUpRight className="h-3 w-3" />
              </Button>
            </div>
            <div className="flex items-start gap-4 p-4 border rounded-lg">
              <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                <Users className="h-5 w-5 text-blue-600" />
              </div>
              <div className="flex-1">
                <h4 className="font-semibold">B2B Enterprise Program</h4>
                <p className="text-sm text-muted-foreground mt-1">
                  15 enterprise buyers are looking for vendors in your category
                </p>
              </div>
              <Button size="sm" className="gap-2">
                Learn More
                <ArrowUpRight className="h-3 w-3" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
