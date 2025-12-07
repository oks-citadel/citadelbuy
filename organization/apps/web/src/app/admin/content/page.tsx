'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  FileText,
  Image as ImageIcon,
  Mail,
  Layout,
  Plus,
  BarChart3,
  Clock,
  Eye,
  Edit,
  CheckCircle,
  AlertCircle,
  ArrowRight,
  Globe,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export default function ContentManagementPage() {
  const stats = {
    totalPages: 24,
    publishedPages: 18,
    draftPages: 6,
    activeBanners: 8,
    emailTemplates: 15,
    totalViews: 45230,
  };

  const recentActivities = [
    {
      type: 'page',
      action: 'Updated',
      title: 'Privacy Policy',
      user: 'Admin User',
      time: '2 hours ago',
      status: 'published',
    },
    {
      type: 'banner',
      action: 'Created',
      title: 'Summer Sale Hero Banner',
      user: 'Marketing Team',
      time: '5 hours ago',
      status: 'active',
    },
    {
      type: 'email',
      action: 'Updated',
      title: 'Order Confirmation Template',
      user: 'Admin User',
      time: '1 day ago',
      status: 'active',
    },
    {
      type: 'page',
      action: 'Created',
      title: 'Shipping & Returns',
      user: 'Content Team',
      time: '2 days ago',
      status: 'draft',
    },
  ];

  const quickLinks = [
    {
      title: 'Pages',
      description: 'Manage static pages and content',
      icon: FileText,
      href: '/admin/content/pages',
      color: 'bg-blue-100 text-blue-600',
      stats: `${stats.publishedPages} published`,
    },
    {
      title: 'Banners',
      description: 'Manage hero images and promotional banners',
      icon: ImageIcon,
      href: '/admin/content/banners',
      color: 'bg-purple-100 text-purple-600',
      stats: `${stats.activeBanners} active`,
    },
    {
      title: 'Email Templates',
      description: 'Manage transactional email templates',
      icon: Mail,
      href: '/admin/content/emails',
      color: 'bg-green-100 text-green-600',
      stats: `${stats.emailTemplates} templates`,
    },
  ];

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'page':
        return <FileText className="h-5 w-5" />;
      case 'banner':
        return <ImageIcon className="h-5 w-5" />;
      case 'email':
        return <Mail className="h-5 w-5" />;
      default:
        return <Layout className="h-5 w-5" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      published: 'bg-green-100 text-green-800',
      active: 'bg-green-100 text-green-800',
      draft: 'bg-yellow-100 text-yellow-800',
      inactive: 'bg-gray-100 text-gray-800',
    };
    return styles[status] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Content Management</h1>
          <p className="text-muted-foreground">
            Manage pages, banners, and email templates
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <BarChart3 className="h-4 w-4 mr-2" />
            Analytics
          </Button>
          <Link href="/" target="_blank">
            <Button variant="outline">
              <Globe className="h-4 w-4 mr-2" />
              Preview Site
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Pages</p>
                <p className="text-2xl font-bold">{stats.totalPages}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {stats.publishedPages} published, {stats.draftPages} draft
                </p>
              </div>
              <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                <FileText className="h-5 w-5 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Active Banners</p>
                <p className="text-2xl font-bold">{stats.activeBanners}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Across homepage and categories
                </p>
              </div>
              <div className="h-10 w-10 rounded-full bg-purple-100 flex items-center justify-center">
                <ImageIcon className="h-5 w-5 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Email Templates</p>
                <p className="text-2xl font-bold">{stats.emailTemplates}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Transactional and marketing
                </p>
              </div>
              <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center">
                <Mail className="h-5 w-5 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Links */}
      <div className="grid md:grid-cols-3 gap-6">
        {quickLinks.map((link, i) => (
          <Link key={i} href={link.href}>
            <Card className="hover:border-primary/50 transition-all cursor-pointer h-full">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className={`h-12 w-12 rounded-lg ${link.color} flex items-center justify-center`}>
                    <link.icon className="h-6 w-6" />
                  </div>
                  <ArrowRight className="h-5 w-5 text-muted-foreground" />
                </div>
                <CardTitle className="mt-4">{link.title}</CardTitle>
                <CardDescription>{link.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-muted-foreground">{link.stats}</span>
                  <Button variant="ghost" size="sm">
                    Manage
                  </Button>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Recent Activity
            </CardTitle>
            <Button variant="ghost" size="sm">
              View All
              <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {recentActivities.map((activity, i) => (
              <div
                key={i}
                className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                    {getActivityIcon(activity.type)}
                  </div>
                  <div>
                    <p className="font-medium">
                      {activity.action} {activity.title}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      by {activity.user} • {activity.time}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className={getStatusBadge(activity.status)}>
                    {activity.status}
                  </Badge>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <Eye className="h-4 w-4" />
                  </Button>
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
          <CardDescription>Common content management tasks</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { icon: Plus, label: 'New Page', href: '/admin/content/pages?action=new', color: 'bg-blue-100 text-blue-600' },
              { icon: ImageIcon, label: 'Upload Banner', href: '/admin/content/banners?action=new', color: 'bg-purple-100 text-purple-600' },
              { icon: Mail, label: 'Edit Email', href: '/admin/content/emails', color: 'bg-green-100 text-green-600' },
              { icon: Eye, label: 'Preview Site', href: '/', color: 'bg-orange-100 text-orange-600' },
            ].map((action, i) => (
              <Link key={i} href={action.href} target={action.label === 'Preview Site' ? '_blank' : undefined}>
                <div className="p-4 border rounded-lg text-center hover:border-primary/50 transition-colors cursor-pointer">
                  <div className={`h-12 w-12 rounded-full ${action.color} flex items-center justify-center mx-auto mb-3`}>
                    <action.icon className="h-6 w-6" />
                  </div>
                  <p className="font-medium text-sm">{action.label}</p>
                </div>
              </Link>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
