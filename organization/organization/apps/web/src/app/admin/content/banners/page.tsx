'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  Image as ImageIcon,
  Search,
  Plus,
  Eye,
  Edit,
  Trash2,
  Download,
  Upload,
  MoreVertical,
  CheckCircle,
  XCircle,
  Clock,
  Monitor,
  Smartphone,
  Tablet,
  Calendar,
  MapPin,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

interface Banner {
  id: string;
  title: string;
  location: 'HOMEPAGE_HERO' | 'HOMEPAGE_SECONDARY' | 'CATEGORY_HERO' | 'PRODUCT_PAGE';
  status: 'ACTIVE' | 'INACTIVE' | 'SCHEDULED';
  imageUrl?: string;
  linkUrl: string;
  priority: number;
  startDate?: string;
  endDate?: string;
  devices: ('DESKTOP' | 'TABLET' | 'MOBILE')[];
  clicks: number;
  impressions: number;
  ctr: number;
  createdAt: string;
  lastModified: string;
}

const demoBanners: Banner[] = [
  {
    id: '1',
    title: 'Summer Sale 2024 - Hero Banner',
    location: 'HOMEPAGE_HERO',
    status: 'ACTIVE',
    linkUrl: '/sales/summer-2024',
    priority: 1,
    startDate: '2024-06-01T00:00:00Z',
    endDate: '2024-08-31T23:59:59Z',
    devices: ['DESKTOP', 'TABLET', 'MOBILE'],
    clicks: 5420,
    impressions: 125340,
    ctr: 4.32,
    createdAt: '2024-05-15T10:00:00Z',
    lastModified: '2024-06-01T08:00:00Z',
  },
  {
    id: '2',
    title: 'New Electronics Collection',
    location: 'CATEGORY_HERO',
    status: 'ACTIVE',
    linkUrl: '/categories/electronics',
    priority: 2,
    devices: ['DESKTOP', 'TABLET'],
    clicks: 3210,
    impressions: 89450,
    ctr: 3.59,
    createdAt: '2024-03-20T14:30:00Z',
    lastModified: '2024-05-10T11:20:00Z',
  },
  {
    id: '3',
    title: 'Free Shipping Promotion',
    location: 'HOMEPAGE_SECONDARY',
    status: 'ACTIVE',
    linkUrl: '/shipping-info',
    priority: 3,
    devices: ['DESKTOP', 'TABLET', 'MOBILE'],
    clicks: 1890,
    impressions: 67230,
    ctr: 2.81,
    createdAt: '2024-02-10T09:00:00Z',
    lastModified: '2024-03-15T16:45:00Z',
  },
  {
    id: '4',
    title: 'Mobile App Download Banner',
    location: 'HOMEPAGE_SECONDARY',
    status: 'ACTIVE',
    linkUrl: '/mobile-app',
    priority: 4,
    devices: ['MOBILE'],
    clicks: 890,
    impressions: 45670,
    ctr: 1.95,
    createdAt: '2024-01-15T12:00:00Z',
    lastModified: '2024-02-20T10:30:00Z',
  },
  {
    id: '5',
    title: 'Back to School Campaign',
    location: 'HOMEPAGE_HERO',
    status: 'SCHEDULED',
    linkUrl: '/sales/back-to-school',
    priority: 1,
    startDate: '2024-08-01T00:00:00Z',
    endDate: '2024-09-15T23:59:59Z',
    devices: ['DESKTOP', 'TABLET', 'MOBILE'],
    clicks: 0,
    impressions: 0,
    ctr: 0,
    createdAt: '2024-07-01T15:00:00Z',
    lastModified: '2024-07-10T09:20:00Z',
  },
  {
    id: '6',
    title: 'Spring Collection Archive',
    location: 'CATEGORY_HERO',
    status: 'INACTIVE',
    linkUrl: '/sales/spring-2024',
    priority: 5,
    startDate: '2024-03-01T00:00:00Z',
    endDate: '2024-05-31T23:59:59Z',
    devices: ['DESKTOP', 'TABLET', 'MOBILE'],
    clicks: 8920,
    impressions: 234560,
    ctr: 3.8,
    createdAt: '2024-02-15T10:00:00Z',
    lastModified: '2024-06-01T00:00:00Z',
  },
];

export default function ContentBannersPage() {
  const [banners] = useState<Banner[]>(demoBanners);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [locationFilter, setLocationFilter] = useState<string>('all');
  const [selectedBanners, setSelectedBanners] = useState<string[]>([]);

  const filteredBanners = banners.filter((banner) => {
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      if (
        !banner.title.toLowerCase().includes(query) &&
        !banner.location.toLowerCase().includes(query)
      ) {
        return false;
      }
    }
    if (statusFilter !== 'all' && banner.status !== statusFilter) {
      return false;
    }
    if (locationFilter !== 'all' && banner.location !== locationFilter) {
      return false;
    }
    return true;
  });

  const getStatusBadge = (status: Banner['status']) => {
    const styles: Record<Banner['status'], string> = {
      ACTIVE: 'bg-green-100 text-green-800',
      INACTIVE: 'bg-gray-100 text-gray-800',
      SCHEDULED: 'bg-blue-100 text-blue-800',
    };
    return styles[status];
  };

  const getLocationLabel = (location: string) => {
    return location.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (l) => l.toUpperCase());
  };

  const getDeviceIcon = (device: string) => {
    switch (device) {
      case 'DESKTOP':
        return <Monitor className="h-3 w-3" />;
      case 'TABLET':
        return <Tablet className="h-3 w-3" />;
      case 'MOBILE':
        return <Smartphone className="h-3 w-3" />;
      default:
        return null;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const locations = Array.from(new Set(banners.map((b) => b.location)));
  const totalBanners = banners.length;
  const activeBanners = banners.filter((b) => b.status === 'ACTIVE').length;
  const totalClicks = banners.reduce((acc, b) => acc + b.clicks, 0);
  const totalImpressions = banners.reduce((acc, b) => acc + b.impressions, 0);
  const avgCtr = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0;

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
        <span className="text-foreground">Banners</span>
      </div>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Banners & Hero Images</h1>
          <p className="text-muted-foreground">
            Manage promotional banners and hero images
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export Analytics
          </Button>
          <Button>
            <Upload className="h-4 w-4 mr-2" />
            Upload Banner
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Banners</p>
                <p className="text-2xl font-bold">{totalBanners}</p>
              </div>
              <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                <ImageIcon className="h-5 w-5 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Active</p>
                <p className="text-2xl font-bold text-green-600">{activeBanners}</p>
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
                <p className="text-sm text-muted-foreground">Total Clicks</p>
                <p className="text-2xl font-bold">{totalClicks.toLocaleString()}</p>
              </div>
              <div className="h-10 w-10 rounded-full bg-purple-100 flex items-center justify-center">
                <Eye className="h-5 w-5 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Avg. CTR</p>
                <p className="text-2xl font-bold">{avgCtr.toFixed(2)}%</p>
              </div>
              <div className="h-10 w-10 rounded-full bg-orange-100 flex items-center justify-center">
                <Clock className="h-5 w-5 text-orange-600" />
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
                placeholder="Search by title or location..."
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
              <option value="ACTIVE">Active</option>
              <option value="INACTIVE">Inactive</option>
              <option value="SCHEDULED">Scheduled</option>
            </select>
            <select
              className="rounded-md border px-3 py-2 text-sm"
              value={locationFilter}
              onChange={(e) => setLocationFilter(e.target.value)}
            >
              <option value="all">All Locations</option>
              {locations.map((loc) => (
                <option key={loc} value={loc}>
                  {getLocationLabel(loc)}
                </option>
              ))}
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Bulk Actions */}
      {selectedBanners.length > 0 && (
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">
                {selectedBanners.length} banner(s) selected
              </span>
              <div className="flex gap-2">
                <Button variant="outline" size="sm">
                  Activate
                </Button>
                <Button variant="outline" size="sm">
                  Deactivate
                </Button>
                <Button variant="outline" size="sm" className="text-red-600">
                  Delete
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Banners Grid/Table View */}
      <div className="grid gap-4">
        {filteredBanners.map((banner) => (
          <Card key={banner.id} className="overflow-hidden">
            <div className="flex flex-col md:flex-row">
              {/* Banner Preview */}
              <div className="md:w-64 h-40 md:h-auto bg-muted flex items-center justify-center border-r">
                <ImageIcon className="h-16 w-16 text-muted-foreground" />
              </div>

              {/* Banner Details */}
              <div className="flex-1 p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <input
                        type="checkbox"
                        checked={selectedBanners.includes(banner.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedBanners([...selectedBanners, banner.id]);
                          } else {
                            setSelectedBanners(selectedBanners.filter((id) => id !== banner.id));
                          }
                        }}
                        className="rounded border-gray-300"
                      />
                      <h3 className="font-semibold text-lg">{banner.title}</h3>
                    </div>
                    <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        <span>{getLocationLabel(banner.location)}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        Priority: {banner.priority}
                      </div>
                      {banner.startDate && (
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          <span>
                            {formatDate(banner.startDate)}
                            {banner.endDate && ` - ${formatDate(banner.endDate)}`}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                  <Badge className={getStatusBadge(banner.status)}>
                    {banner.status}
                  </Badge>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-3">
                  <div>
                    <p className="text-xs text-muted-foreground">Impressions</p>
                    <p className="text-lg font-semibold">{banner.impressions.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Clicks</p>
                    <p className="text-lg font-semibold">{banner.clicks.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">CTR</p>
                    <p className="text-lg font-semibold">{banner.ctr.toFixed(2)}%</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Devices</p>
                    <div className="flex items-center gap-1 mt-1">
                      {banner.devices.map((device) => (
                        <div
                          key={device}
                          className="h-6 w-6 rounded bg-muted flex items-center justify-center"
                          title={device}
                        >
                          {getDeviceIcon(device)}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-3 border-t">
                  <div className="text-xs text-muted-foreground">
                    Last modified: {formatDate(banner.lastModified)}
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8" title="Preview">
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8" title="Edit">
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8" title="Download">
                      <Download className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-red-600" title="Delete">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {filteredBanners.length === 0 && (
        <Card>
          <CardContent className="p-12 text-center">
            <ImageIcon className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="font-medium text-gray-900 mb-2">No banners found</h3>
            <p className="text-muted-foreground mb-4">
              Try adjusting your search or filters, or upload a new banner
            </p>
            <Button>
              <Upload className="h-4 w-4 mr-2" />
              Upload Banner
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
