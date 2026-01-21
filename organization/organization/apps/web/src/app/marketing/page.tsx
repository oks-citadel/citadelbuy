'use client';

import * as React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Megaphone, Mail, FileText, Users, TrendingUp, ArrowUpRight } from 'lucide-react';
import Link from 'next/link';

export default function MarketingDashboard() {
  const stats = [
    { title: 'Active Campaigns', value: '12', change: '+3', icon: Megaphone, href: '/marketing/campaigns' },
    { title: 'Email Subscribers', value: '24.5K', change: '+1.2K', icon: Users, href: '/marketing/email' },
    { title: 'Landing Pages', value: '8', change: '+2', icon: FileText, href: '/marketing/landing-pages' },
    { title: 'Conversion Rate', value: '3.8%', change: '+0.5%', icon: TrendingUp, href: '/marketing/analytics' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Marketing Dashboard</h1>
        <p className="text-muted-foreground mt-2">Manage global marketing campaigns and growth initiatives</p>
      </div>
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
                  <p className="text-xs text-green-500 flex items-center gap-1 mt-1">
                    <ArrowUpRight className="h-3 w-3" />
                    <span>{stat.change} this month</span>
                  </p>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
