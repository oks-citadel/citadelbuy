'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  FileText,
  Search,
  Plus,
  Eye,
  Edit,
  Trash2,
  Globe,
  Clock,
  User,
  Download,
  MoreVertical,
  CheckCircle,
  AlertCircle,
  Copy,
  FileEdit,
  Filter,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

interface ContentPage {
  id: string;
  title: string;
  slug: string;
  status: 'PUBLISHED' | 'DRAFT' | 'SCHEDULED';
  author: string;
  views: number;
  lastModified: string;
  publishedAt?: string;
  category: string;
  featured: boolean;
}

const demoPages: ContentPage[] = [
  {
    id: '1',
    title: 'About Us',
    slug: '/about',
    status: 'PUBLISHED',
    author: 'Admin User',
    views: 12450,
    lastModified: '2024-03-15T10:30:00Z',
    publishedAt: '2024-01-10T08:00:00Z',
    category: 'Company',
    featured: true,
  },
  {
    id: '2',
    title: 'Privacy Policy',
    slug: '/privacy',
    status: 'PUBLISHED',
    author: 'Legal Team',
    views: 8920,
    lastModified: '2024-03-14T14:20:00Z',
    publishedAt: '2024-01-10T08:00:00Z',
    category: 'Legal',
    featured: false,
  },
  {
    id: '3',
    title: 'Terms of Service',
    slug: '/terms',
    status: 'PUBLISHED',
    author: 'Legal Team',
    views: 7654,
    lastModified: '2024-03-10T09:15:00Z',
    publishedAt: '2024-01-10T08:00:00Z',
    category: 'Legal',
    featured: false,
  },
  {
    id: '4',
    title: 'Shipping & Returns',
    slug: '/shipping-returns',
    status: 'PUBLISHED',
    author: 'Support Team',
    views: 15230,
    lastModified: '2024-03-08T16:45:00Z',
    publishedAt: '2024-01-15T10:00:00Z',
    category: 'Support',
    featured: true,
  },
  {
    id: '5',
    title: 'Contact Us',
    slug: '/contact',
    status: 'PUBLISHED',
    author: 'Admin User',
    views: 9870,
    lastModified: '2024-03-05T11:30:00Z',
    publishedAt: '2024-01-10T08:00:00Z',
    category: 'Company',
    featured: false,
  },
  {
    id: '6',
    title: 'FAQ - Frequently Asked Questions',
    slug: '/faq',
    status: 'PUBLISHED',
    author: 'Support Team',
    views: 23450,
    lastModified: '2024-03-12T13:20:00Z',
    publishedAt: '2024-01-20T09:00:00Z',
    category: 'Support',
    featured: true,
  },
  {
    id: '7',
    title: 'Careers',
    slug: '/careers',
    status: 'DRAFT',
    author: 'HR Team',
    views: 0,
    lastModified: '2024-03-14T15:00:00Z',
    category: 'Company',
    featured: false,
  },
  {
    id: '8',
    title: 'Sustainability Commitment',
    slug: '/sustainability',
    status: 'SCHEDULED',
    author: 'Marketing Team',
    views: 0,
    lastModified: '2024-03-15T12:00:00Z',
    publishedAt: '2024-04-01T08:00:00Z',
    category: 'Company',
    featured: true,
  },
];

export default function ContentPagesPage() {
  const [pages] = useState<ContentPage[]>(demoPages);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [selectedPages, setSelectedPages] = useState<string[]>([]);

  const filteredPages = pages.filter((page) => {
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      if (
        !page.title.toLowerCase().includes(query) &&
        !page.slug.toLowerCase().includes(query)
      ) {
        return false;
      }
    }
    if (statusFilter !== 'all' && page.status !== statusFilter) {
      return false;
    }
    if (categoryFilter !== 'all' && page.category !== categoryFilter) {
      return false;
    }
    return true;
  });

  const getStatusBadge = (status: ContentPage['status']) => {
    const styles: Record<ContentPage['status'], string> = {
      PUBLISHED: 'bg-green-100 text-green-800',
      DRAFT: 'bg-yellow-100 text-yellow-800',
      SCHEDULED: 'bg-blue-100 text-blue-800',
    };
    return styles[status];
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const categories = Array.from(new Set(pages.map((p) => p.category)));
  const totalPages = pages.length;
  const publishedPages = pages.filter((p) => p.status === 'PUBLISHED').length;
  const draftPages = pages.filter((p) => p.status === 'DRAFT').length;
  const totalViews = pages.reduce((acc, p) => acc + p.views, 0);

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
        <span className="text-foreground">Pages</span>
      </div>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Content Pages</h1>
          <p className="text-muted-foreground">
            Manage static pages and content
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            New Page
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Pages</p>
                <p className="text-2xl font-bold">{totalPages}</p>
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
                <p className="text-sm text-muted-foreground">Published</p>
                <p className="text-2xl font-bold text-green-600">{publishedPages}</p>
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
                <p className="text-sm text-muted-foreground">Drafts</p>
                <p className="text-2xl font-bold text-yellow-600">{draftPages}</p>
              </div>
              <div className="h-10 w-10 rounded-full bg-yellow-100 flex items-center justify-center">
                <FileEdit className="h-5 w-5 text-yellow-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Views</p>
                <p className="text-2xl font-bold">{totalViews.toLocaleString()}</p>
              </div>
              <div className="h-10 w-10 rounded-full bg-purple-100 flex items-center justify-center">
                <Eye className="h-5 w-5 text-purple-600" />
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
                placeholder="Search by title or slug..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <select
              className="rounded-md border px-3 py-2 text-sm"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="all">All Status</option>
              <option value="PUBLISHED">Published</option>
              <option value="DRAFT">Draft</option>
              <option value="SCHEDULED">Scheduled</option>
            </select>
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
          </div>
        </CardContent>
      </Card>

      {/* Bulk Actions */}
      {selectedPages.length > 0 && (
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">
                {selectedPages.length} page(s) selected
              </span>
              <div className="flex gap-2">
                <Button variant="outline" size="sm">
                  Publish
                </Button>
                <Button variant="outline" size="sm">
                  Unpublish
                </Button>
                <Button variant="outline" size="sm" className="text-red-600">
                  Delete
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Pages Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted/50">
                <tr>
                  <th className="p-4 text-left">
                    <input
                      type="checkbox"
                      className="rounded border-gray-300"
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedPages(filteredPages.map((p) => p.id));
                        } else {
                          setSelectedPages([]);
                        }
                      }}
                    />
                  </th>
                  <th className="p-4 text-left text-sm font-medium text-muted-foreground">Title</th>
                  <th className="p-4 text-left text-sm font-medium text-muted-foreground">Status</th>
                  <th className="p-4 text-left text-sm font-medium text-muted-foreground">Category</th>
                  <th className="p-4 text-left text-sm font-medium text-muted-foreground">Author</th>
                  <th className="p-4 text-left text-sm font-medium text-muted-foreground">Views</th>
                  <th className="p-4 text-left text-sm font-medium text-muted-foreground">Last Modified</th>
                  <th className="p-4 text-right text-sm font-medium text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filteredPages.map((page) => (
                  <tr key={page.id} className="hover:bg-muted/50">
                    <td className="p-4">
                      <input
                        type="checkbox"
                        checked={selectedPages.includes(page.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedPages([...selectedPages, page.id]);
                          } else {
                            setSelectedPages(selectedPages.filter((id) => id !== page.id));
                          }
                        }}
                        className="rounded border-gray-300"
                      />
                    </td>
                    <td className="p-4">
                      <div className="flex items-start gap-3">
                        <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                          <FileText className="h-5 w-5 text-muted-foreground" />
                        </div>
                        <div>
                          <p className="font-medium">{page.title}</p>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Globe className="h-3 w-3" />
                            <span>{page.slug}</span>
                          </div>
                          {page.featured && (
                            <Badge variant="outline" className="mt-1 text-xs">
                              Featured
                            </Badge>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <Badge className={getStatusBadge(page.status)}>
                        {page.status}
                      </Badge>
                    </td>
                    <td className="p-4">
                      <span className="text-sm">{page.category}</span>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">{page.author}</span>
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-1">
                        <Eye className="h-4 w-4 text-muted-foreground" />
                        <span>{page.views.toLocaleString()}</span>
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        <span>{formatDate(page.lastModified)}</span>
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8" title="View">
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8" title="Edit">
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8" title="Duplicate">
                          <Copy className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-red-600" title="Delete">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {filteredPages.length === 0 && (
            <div className="p-12 text-center">
              <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="font-medium text-gray-900 mb-2">No pages found</h3>
              <p className="text-muted-foreground mb-4">
                Try adjusting your search or filters
              </p>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Create New Page
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
