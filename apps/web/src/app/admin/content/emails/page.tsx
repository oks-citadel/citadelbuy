'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  Mail,
  Search,
  Plus,
  Eye,
  Edit,
  Copy,
  Send,
  Download,
  MoreVertical,
  CheckCircle,
  AlertCircle,
  Clock,
  FileText,
  Code,
  TestTube,
  Languages,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  category: 'TRANSACTIONAL' | 'MARKETING' | 'NOTIFICATION' | 'SYSTEM';
  status: 'ACTIVE' | 'DRAFT' | 'ARCHIVED';
  language: string;
  lastModified: string;
  lastSent?: string;
  sentCount: number;
  openRate: number;
  clickRate: number;
  description: string;
}

const demoTemplates: EmailTemplate[] = [
  {
    id: '1',
    name: 'Order Confirmation',
    subject: 'Order Confirmed - {{order_number}}',
    category: 'TRANSACTIONAL',
    status: 'ACTIVE',
    language: 'en',
    lastModified: '2024-03-15T10:30:00Z',
    lastSent: '2024-03-15T18:45:00Z',
    sentCount: 15420,
    openRate: 78.5,
    clickRate: 42.3,
    description: 'Sent when customer places an order',
  },
  {
    id: '2',
    name: 'Shipping Notification',
    subject: 'Your Order Has Shipped - {{order_number}}',
    category: 'TRANSACTIONAL',
    status: 'ACTIVE',
    language: 'en',
    lastModified: '2024-03-14T14:20:00Z',
    lastSent: '2024-03-15T16:30:00Z',
    sentCount: 13890,
    openRate: 85.2,
    clickRate: 56.8,
    description: 'Sent when order is shipped to customer',
  },
  {
    id: '3',
    name: 'Welcome Email',
    subject: 'Welcome to {{store_name}}!',
    category: 'MARKETING',
    status: 'ACTIVE',
    language: 'en',
    lastModified: '2024-03-10T09:15:00Z',
    lastSent: '2024-03-15T12:20:00Z',
    sentCount: 2450,
    openRate: 62.4,
    clickRate: 28.9,
    description: 'Sent to new customers after registration',
  },
  {
    id: '4',
    name: 'Password Reset',
    subject: 'Reset Your Password',
    category: 'SYSTEM',
    status: 'ACTIVE',
    language: 'en',
    lastModified: '2024-03-08T16:45:00Z',
    lastSent: '2024-03-15T14:10:00Z',
    sentCount: 890,
    openRate: 92.1,
    clickRate: 78.5,
    description: 'Sent when user requests password reset',
  },
  {
    id: '5',
    name: 'Abandoned Cart Recovery',
    subject: 'You Left Something Behind...',
    category: 'MARKETING',
    status: 'ACTIVE',
    language: 'en',
    lastModified: '2024-03-12T13:20:00Z',
    lastSent: '2024-03-15T17:00:00Z',
    sentCount: 5670,
    openRate: 45.8,
    clickRate: 18.2,
    description: 'Sent to users who abandon their shopping cart',
  },
  {
    id: '6',
    name: 'Order Delivered',
    subject: 'Your Order Has Been Delivered',
    category: 'TRANSACTIONAL',
    status: 'ACTIVE',
    language: 'en',
    lastModified: '2024-03-11T11:30:00Z',
    lastSent: '2024-03-15T15:45:00Z',
    sentCount: 12340,
    openRate: 68.9,
    clickRate: 34.5,
    description: 'Sent when order is successfully delivered',
  },
  {
    id: '7',
    name: 'Review Request',
    subject: 'How Was Your Recent Purchase?',
    category: 'NOTIFICATION',
    status: 'ACTIVE',
    language: 'en',
    lastModified: '2024-03-09T10:00:00Z',
    lastSent: '2024-03-14T13:30:00Z',
    sentCount: 8920,
    openRate: 38.7,
    clickRate: 15.3,
    description: 'Request customer review after order delivery',
  },
  {
    id: '8',
    name: 'Refund Processed',
    subject: 'Your Refund Has Been Processed',
    category: 'TRANSACTIONAL',
    status: 'ACTIVE',
    language: 'en',
    lastModified: '2024-03-07T15:20:00Z',
    lastSent: '2024-03-13T09:15:00Z',
    sentCount: 234,
    openRate: 94.3,
    clickRate: 12.8,
    description: 'Sent when refund is processed for customer',
  },
  {
    id: '9',
    name: 'Weekly Newsletter',
    subject: 'This Week\'s Best Deals',
    category: 'MARKETING',
    status: 'DRAFT',
    language: 'en',
    lastModified: '2024-03-14T16:00:00Z',
    sentCount: 0,
    openRate: 0,
    clickRate: 0,
    description: 'Weekly promotional newsletter',
  },
  {
    id: '10',
    name: 'Account Verification',
    subject: 'Verify Your Email Address',
    category: 'SYSTEM',
    status: 'ACTIVE',
    language: 'en',
    lastModified: '2024-03-05T12:00:00Z',
    lastSent: '2024-03-15T11:25:00Z',
    sentCount: 3450,
    openRate: 88.5,
    clickRate: 76.2,
    description: 'Email verification for new accounts',
  },
];

export default function EmailTemplatesPage() {
  const [templates] = useState<EmailTemplate[]>(demoTemplates);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedTemplates, setSelectedTemplates] = useState<string[]>([]);

  const filteredTemplates = templates.filter((template) => {
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      if (
        !template.name.toLowerCase().includes(query) &&
        !template.subject.toLowerCase().includes(query) &&
        !template.description.toLowerCase().includes(query)
      ) {
        return false;
      }
    }
    if (categoryFilter !== 'all' && template.category !== categoryFilter) {
      return false;
    }
    if (statusFilter !== 'all' && template.status !== statusFilter) {
      return false;
    }
    return true;
  });

  const getStatusBadge = (status: EmailTemplate['status']) => {
    const styles: Record<EmailTemplate['status'], string> = {
      ACTIVE: 'bg-green-100 text-green-800',
      DRAFT: 'bg-yellow-100 text-yellow-800',
      ARCHIVED: 'bg-gray-100 text-gray-800',
    };
    return styles[status];
  };

  const getCategoryBadge = (category: EmailTemplate['category']) => {
    const styles: Record<EmailTemplate['category'], string> = {
      TRANSACTIONAL: 'bg-blue-100 text-blue-800',
      MARKETING: 'bg-purple-100 text-purple-800',
      NOTIFICATION: 'bg-orange-100 text-orange-800',
      SYSTEM: 'bg-gray-100 text-gray-800',
    };
    return styles[category];
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const categories = Array.from(new Set(templates.map((t) => t.category)));
  const totalTemplates = templates.length;
  const activeTemplates = templates.filter((t) => t.status === 'ACTIVE').length;
  const totalSent = templates.reduce((acc, t) => acc + t.sentCount, 0);
  const avgOpenRate =
    templates.filter((t) => t.sentCount > 0).reduce((acc, t) => acc + t.openRate, 0) /
    templates.filter((t) => t.sentCount > 0).length;

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link href="/admin" className="hover:text-foreground">
          Admin
        </Link>
        <span>/</span>
        <Link href="/admin/content" className="hover:text-foreground">
          Content
        </Link>
        <span>/</span>
        <span className="text-foreground">Email Templates</span>
      </div>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Email Templates</h1>
          <p className="text-muted-foreground">
            Manage transactional and marketing email templates
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            New Template
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Templates</p>
                <p className="text-2xl font-bold">{totalTemplates}</p>
              </div>
              <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                <Mail className="h-5 w-5 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Active</p>
                <p className="text-2xl font-bold text-green-600">{activeTemplates}</p>
              </div>
              <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center">
                <CheckCircle className="h-5 w-5 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Emails Sent</p>
                <p className="text-2xl font-bold">{totalSent.toLocaleString()}</p>
              </div>
              <div className="h-10 w-10 rounded-full bg-purple-100 flex items-center justify-center">
                <Send className="h-5 w-5 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Avg. Open Rate</p>
                <p className="text-2xl font-bold">{avgOpenRate.toFixed(1)}%</p>
              </div>
              <div className="h-10 w-10 rounded-full bg-orange-100 flex items-center justify-center">
                <Eye className="h-5 w-5 text-orange-600" />
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
                placeholder="Search by name, subject or description..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <select
              className="rounded-md border px-3 py-2 text-sm"
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
            >
              <option value="all">All Categories</option>
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
            <select
              className="rounded-md border px-3 py-2 text-sm"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="all">All Status</option>
              <option value="ACTIVE">Active</option>
              <option value="DRAFT">Draft</option>
              <option value="ARCHIVED">Archived</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Bulk Actions */}
      {selectedTemplates.length > 0 && (
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">
                {selectedTemplates.length} template(s) selected
              </span>
              <div className="flex gap-2">
                <Button variant="outline" size="sm">
                  Activate
                </Button>
                <Button variant="outline" size="sm">
                  Archive
                </Button>
                <Button variant="outline" size="sm">
                  Duplicate
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Templates Grid */}
      <div className="grid md:grid-cols-2 gap-4">
        {filteredTemplates.map((template) => (
          <Card key={template.id} className="hover:border-primary/50 transition-all">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3 flex-1">
                  <input
                    type="checkbox"
                    checked={selectedTemplates.includes(template.id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedTemplates([...selectedTemplates, template.id]);
                      } else {
                        setSelectedTemplates(selectedTemplates.filter((id) => id !== template.id));
                      }
                    }}
                    className="rounded border-gray-300 mt-1"
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold">{template.name}</h3>
                      <Badge className={getStatusBadge(template.status)} variant="outline">
                        {template.status}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mb-2">{template.description}</p>
                    <div className="flex items-center gap-2">
                      <Badge className={getCategoryBadge(template.category)}>
                        {template.category}
                      </Badge>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Languages className="h-3 w-3" />
                        <span>{template.language.toUpperCase()}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="p-3 bg-muted/50 rounded-lg">
                <div className="flex items-start gap-2">
                  <Mail className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <div className="flex-1">
                    <p className="text-xs text-muted-foreground mb-1">Subject Line</p>
                    <p className="text-sm font-medium">{template.subject}</p>
                  </div>
                </div>
              </div>

              {template.sentCount > 0 && (
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <p className="text-xs text-muted-foreground">Sent</p>
                    <p className="text-sm font-semibold">{template.sentCount.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Open Rate</p>
                    <p className="text-sm font-semibold text-green-600">{template.openRate}%</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Click Rate</p>
                    <p className="text-sm font-semibold text-blue-600">{template.clickRate}%</p>
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between pt-3 border-t text-xs text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  <span>Modified {formatDate(template.lastModified)}</span>
                </div>
                {template.lastSent && (
                  <div className="flex items-center gap-1">
                    <Send className="h-3 w-3" />
                    <span>Sent {formatDate(template.lastSent)}</span>
                  </div>
                )}
              </div>

              <div className="flex gap-1 pt-2">
                <Button variant="outline" size="sm" className="flex-1">
                  <Eye className="h-4 w-4 mr-1" />
                  Preview
                </Button>
                <Button variant="outline" size="sm" className="flex-1">
                  <Edit className="h-4 w-4 mr-1" />
                  Edit
                </Button>
                <Button variant="outline" size="sm" className="flex-1">
                  <TestTube className="h-4 w-4 mr-1" />
                  Test
                </Button>
                <Button variant="ghost" size="icon" className="h-9 w-9">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredTemplates.length === 0 && (
        <Card>
          <CardContent className="p-12 text-center">
            <Mail className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="font-medium text-gray-900 mb-2">No templates found</h3>
            <p className="text-muted-foreground mb-4">
              Try adjusting your search or filters, or create a new template
            </p>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Create Template
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Quick Actions Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Code className="h-5 w-5" />
            Template Variables
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-3">
            Use these variables in your email templates for dynamic content:
          </p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              '{{customer_name}}',
              '{{order_number}}',
              '{{order_total}}',
              '{{store_name}}',
              '{{tracking_number}}',
              '{{product_name}}',
              '{{reset_link}}',
              '{{verification_link}}',
            ].map((variable) => (
              <div
                key={variable}
                className="p-2 bg-muted/50 rounded font-mono text-xs flex items-center justify-between"
              >
                <span>{variable}</span>
                <Button variant="ghost" size="icon" className="h-6 w-6">
                  <Copy className="h-3 w-3" />
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
