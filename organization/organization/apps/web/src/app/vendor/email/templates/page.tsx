'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  Mail,
  Plus,
  Search,
  Edit,
  Trash2,
  Copy,
  Eye,
  Star,
  ShoppingCart,
  Gift,
  Bell,
  Heart,
  UserPlus,
  Package,
  Clock,
  MoreVertical,
  Code,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

interface EmailTemplate {
  id: string;
  name: string;
  category: 'transactional' | 'marketing' | 'automation' | 'custom';
  subject: string;
  description: string;
  icon: keyof typeof iconMap;
  lastEdited: string;
  timesUsed: number;
  isDefault: boolean;
}

const iconMap = {
  ShoppingCart,
  Gift,
  Bell,
  Heart,
  UserPlus,
  Package,
  Clock,
  Star,
  Mail,
};

const demoTemplates: EmailTemplate[] = [
  {
    id: '1',
    name: 'Order Confirmation',
    category: 'transactional',
    subject: 'Your order #{{order_id}} has been confirmed!',
    description: 'Sent when a customer places an order',
    icon: 'ShoppingCart',
    lastEdited: '2024-03-10',
    timesUsed: 1250,
    isDefault: true,
  },
  {
    id: '2',
    name: 'Shipping Notification',
    category: 'transactional',
    subject: 'Your order is on the way!',
    description: 'Sent when order ships with tracking info',
    icon: 'Package',
    lastEdited: '2024-03-08',
    timesUsed: 980,
    isDefault: true,
  },
  {
    id: '3',
    name: 'Welcome Email',
    category: 'automation',
    subject: 'Welcome to {{store_name}}!',
    description: 'Sent to new customers after signup',
    icon: 'UserPlus',
    lastEdited: '2024-03-05',
    timesUsed: 2100,
    isDefault: true,
  },
  {
    id: '4',
    name: 'Cart Abandonment',
    category: 'automation',
    subject: 'You left something behind...',
    description: 'Reminder email for abandoned carts',
    icon: 'ShoppingCart',
    lastEdited: '2024-03-12',
    timesUsed: 560,
    isDefault: false,
  },
  {
    id: '5',
    name: 'Review Request',
    category: 'automation',
    subject: 'How was your purchase?',
    description: 'Request reviews after delivery',
    icon: 'Star',
    lastEdited: '2024-03-01',
    timesUsed: 890,
    isDefault: true,
  },
  {
    id: '6',
    name: 'Birthday Discount',
    category: 'marketing',
    subject: 'Happy Birthday! Here\'s a special gift',
    description: 'Birthday promotion with discount code',
    icon: 'Gift',
    lastEdited: '2024-02-28',
    timesUsed: 345,
    isDefault: false,
  },
  {
    id: '7',
    name: 'Back in Stock',
    category: 'automation',
    subject: '{{product_name}} is back in stock!',
    description: 'Notify customers when wishlist items return',
    icon: 'Bell',
    lastEdited: '2024-03-14',
    timesUsed: 234,
    isDefault: false,
  },
  {
    id: '8',
    name: 'Win-Back Campaign',
    category: 'marketing',
    subject: 'We miss you! Come back for 20% off',
    description: 'Re-engage dormant customers',
    icon: 'Heart',
    lastEdited: '2024-03-06',
    timesUsed: 420,
    isDefault: false,
  },
];

export default function EmailTemplatesPage() {
  const [templates] = useState<EmailTemplate[]>(demoTemplates);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  const filteredTemplates = templates.filter((t) => {
    if (searchQuery && !t.name.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }
    if (categoryFilter !== 'all' && t.category !== categoryFilter) {
      return false;
    }
    return true;
  });

  const getCategoryBadge = (category: EmailTemplate['category']) => {
    const styles: Record<EmailTemplate['category'], string> = {
      transactional: 'bg-blue-100 text-blue-800',
      marketing: 'bg-purple-100 text-purple-800',
      automation: 'bg-green-100 text-green-800',
      custom: 'bg-orange-100 text-orange-800',
    };
    return styles[category];
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Email Templates</h1>
          <p className="text-muted-foreground">
            Create and manage email templates for your campaigns
          </p>
        </div>
        <Link href="/vendor/email/templates/new">
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            Create Template
          </Button>
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Total Templates</p>
            <p className="text-2xl font-bold">{templates.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Transactional</p>
            <p className="text-2xl font-bold">
              {templates.filter((t) => t.category === 'transactional').length}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Marketing</p>
            <p className="text-2xl font-bold">
              {templates.filter((t) => t.category === 'marketing').length}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Automation</p>
            <p className="text-2xl font-bold">
              {templates.filter((t) => t.category === 'automation').length}
            </p>
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
                placeholder="Search templates..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <select
              className="rounded-md border border-gray-300 px-3 py-2 text-sm"
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
            >
              <option value="all">All Categories</option>
              <option value="transactional">Transactional</option>
              <option value="marketing">Marketing</option>
              <option value="automation">Automation</option>
              <option value="custom">Custom</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Templates Grid */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredTemplates.map((template) => {
          const IconComponent = iconMap[template.icon];
          return (
            <Card key={template.id} className="hover:border-primary/50 transition-colors">
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <IconComponent className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">{template.name}</h3>
                      <div className="flex gap-2 mt-1">
                        <Badge className={getCategoryBadge(template.category)}>
                          {template.category}
                        </Badge>
                        {template.isDefault && (
                          <Badge variant="outline">Default</Badge>
                        )}
                      </div>
                    </div>
                  </div>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </div>

                <p className="text-sm text-muted-foreground mb-3">
                  {template.description}
                </p>

                <div className="p-3 bg-muted/50 rounded-lg mb-4">
                  <p className="text-xs text-muted-foreground mb-1">Subject Line</p>
                  <p className="text-sm font-medium truncate">{template.subject}</p>
                </div>

                <div className="flex items-center justify-between text-sm text-muted-foreground mb-4">
                  <span>Used {template.timesUsed.toLocaleString()} times</span>
                  <span>Edited {template.lastEdited}</span>
                </div>

                <div className="flex gap-2">
                  <Button variant="outline" size="sm" className="flex-1">
                    <Eye className="h-3 w-3 mr-1" />
                    Preview
                  </Button>
                  <Button variant="outline" size="sm" className="flex-1">
                    <Edit className="h-3 w-3 mr-1" />
                    Edit
                  </Button>
                  <Button variant="outline" size="icon" className="h-8 w-8">
                    <Copy className="h-3 w-3" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}

        {/* Add New Template Card */}
        <Card className="border-dashed hover:border-primary/50 transition-colors cursor-pointer">
          <CardContent className="p-6 flex flex-col items-center justify-center h-full min-h-[280px]">
            <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-4">
              <Plus className="h-6 w-6 text-muted-foreground" />
            </div>
            <h3 className="font-medium text-gray-900 mb-1">Create New Template</h3>
            <p className="text-sm text-muted-foreground text-center">
              Build a custom email template from scratch
            </p>
          </CardContent>
        </Card>
      </div>

      {filteredTemplates.length === 0 && (
        <Card>
          <CardContent className="p-12 text-center">
            <Mail className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="font-medium text-gray-900 mb-2">No templates found</h3>
            <p className="text-muted-foreground mb-4">
              Try adjusting your search or create a new template
            </p>
            <Link href="/vendor/email/templates/new">
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Create Template
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}

      {/* Template Variables */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Code className="h-5 w-5" />
            Available Variables
          </CardTitle>
          <CardDescription>
            Use these variables in your templates for dynamic content
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { var: '{{customer_name}}', desc: 'Customer full name' },
              { var: '{{customer_email}}', desc: 'Customer email' },
              { var: '{{order_id}}', desc: 'Order number' },
              { var: '{{order_total}}', desc: 'Order total amount' },
              { var: '{{product_name}}', desc: 'Product name' },
              { var: '{{tracking_url}}', desc: 'Shipment tracking link' },
              { var: '{{store_name}}', desc: 'Your store name' },
              { var: '{{discount_code}}', desc: 'Discount code' },
            ].map((item, i) => (
              <div key={i} className="p-3 bg-muted/50 rounded-lg">
                <code className="text-sm font-mono text-primary">{item.var}</code>
                <p className="text-xs text-muted-foreground mt-1">{item.desc}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
