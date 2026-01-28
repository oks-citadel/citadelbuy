'use client';

import * as React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  FileText,
  Plus,
  Search,
  Filter,
  Download,
  Eye,
  Edit,
  Trash2,
  Clock,
  CheckCircle,
  XCircle,
} from 'lucide-react';

type RFQStatus = 'draft' | 'open' | 'reviewing' | 'awarded' | 'closed';

interface RFQ {
  id: string;
  title: string;
  category: string;
  region: string;
  status: RFQStatus;
  bidCount: number;
  deadline: string;
  estimatedValue: string;
  createdAt: string;
}

export default function RFQManagementPage() {
  const [searchQuery, setSearchQuery] = React.useState('');
  const [selectedStatus, setSelectedStatus] = React.useState<RFQStatus | 'all'>('all');

  const rfqs: RFQ[] = [
    {
      id: 'RFQ-2024-001',
      title: 'Office Supplies - Q1 2025',
      category: 'Office Equipment',
      region: 'North America',
      status: 'open',
      bidCount: 12,
      deadline: '2025-01-15',
      estimatedValue: '$45,000',
      createdAt: '2024-12-01',
    },
    {
      id: 'RFQ-2024-002',
      title: 'IT Infrastructure Upgrade',
      category: 'Technology',
      region: 'Europe',
      status: 'reviewing',
      bidCount: 8,
      deadline: '2025-01-10',
      estimatedValue: '$250,000',
      createdAt: '2024-11-28',
    },
    {
      id: 'RFQ-2024-003',
      title: 'Manufacturing Equipment',
      category: 'Industrial',
      region: 'APAC',
      status: 'awarded',
      bidCount: 15,
      deadline: '2024-12-20',
      estimatedValue: '$1,200,000',
      createdAt: '2024-11-15',
    },
    {
      id: 'RFQ-2024-004',
      title: 'Corporate Fleet Vehicles',
      category: 'Automotive',
      region: 'North America',
      status: 'draft',
      bidCount: 0,
      deadline: '2025-02-01',
      estimatedValue: '$850,000',
      createdAt: '2024-12-05',
    },
  ];

  const getStatusIcon = (status: RFQStatus) => {
    switch (status) {
      case 'open':
        return <Clock className="h-4 w-4 text-blue-500" />;
      case 'reviewing':
        return <Eye className="h-4 w-4 text-yellow-500" />;
      case 'awarded':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'closed':
        return <XCircle className="h-4 w-4 text-gray-500" />;
      default:
        return <FileText className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: RFQStatus) => {
    switch (status) {
      case 'open':
        return 'bg-blue-100 text-blue-700';
      case 'reviewing':
        return 'bg-yellow-100 text-yellow-700';
      case 'awarded':
        return 'bg-green-100 text-green-700';
      case 'closed':
        return 'bg-gray-100 text-gray-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const filteredRFQs = rfqs.filter((rfq) => {
    const matchesSearch =
      rfq.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      rfq.id.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = selectedStatus === 'all' || rfq.status === selectedStatus;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">RFQ Management</h1>
          <p className="text-muted-foreground mt-2">
            Create and manage Request for Quotations globally
          </p>
        </div>
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          Create RFQ
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total RFQs
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{rfqs.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Open RFQs
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {rfqs.filter((r) => r.status === 'open').length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Under Review
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {rfqs.filter((r) => r.status === 'reviewing').length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Bids
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {rfqs.reduce((acc, r) => acc + r.bidCount, 0)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search RFQs..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex gap-2">
              <Button
                variant={selectedStatus === 'all' ? 'default' : 'outline'}
                onClick={() => setSelectedStatus('all')}
                size="sm"
              >
                All
              </Button>
              <Button
                variant={selectedStatus === 'open' ? 'default' : 'outline'}
                onClick={() => setSelectedStatus('open')}
                size="sm"
              >
                Open
              </Button>
              <Button
                variant={selectedStatus === 'reviewing' ? 'default' : 'outline'}
                onClick={() => setSelectedStatus('reviewing')}
                size="sm"
              >
                Reviewing
              </Button>
              <Button
                variant={selectedStatus === 'awarded' ? 'default' : 'outline'}
                onClick={() => setSelectedStatus('awarded')}
                size="sm"
              >
                Awarded
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* RFQ List */}
      <div className="space-y-4">
        {filteredRFQs.map((rfq) => (
          <Card key={rfq.id} hover>
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1 space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                      {getStatusIcon(rfq.status)}
                      <h3 className="text-lg font-semibold">{rfq.title}</h3>
                    </div>
                    <span
                      className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(
                        rfq.status
                      )}`}
                    >
                      {rfq.status.charAt(0).toUpperCase() + rfq.status.slice(1)}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">RFQ ID</p>
                      <p className="font-medium">{rfq.id}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Category</p>
                      <p className="font-medium">{rfq.category}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Region</p>
                      <p className="font-medium">{rfq.region}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Estimated Value</p>
                      <p className="font-medium">{rfq.estimatedValue}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Bids Received</p>
                      <p className="font-medium">{rfq.bidCount} bids</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Deadline</p>
                      <p className="font-medium">{rfq.deadline}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Created</p>
                      <p className="font-medium">{rfq.createdAt}</p>
                    </div>
                  </div>
                </div>
                <div className="flex gap-2 ml-4">
                  <Button variant="ghost" size="icon" title="View">
                    <Eye className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" title="Edit">
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" title="Download">
                    <Download className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" title="Delete">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredRFQs.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FileText className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No RFQs found</h3>
            <p className="text-muted-foreground text-center mb-4">
              No RFQs match your current filters. Try adjusting your search.
            </p>
            <Button>Create New RFQ</Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
