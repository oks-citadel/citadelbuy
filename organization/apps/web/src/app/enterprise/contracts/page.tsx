'use client';

import * as React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  ClipboardCheck,
  Plus,
  Search,
  Download,
  Eye,
  Edit,
  FileSignature,
  Calendar,
  DollarSign,
  Building2,
  AlertCircle,
} from 'lucide-react';

type ContractStatus = 'draft' | 'pending_approval' | 'active' | 'expiring_soon' | 'expired' | 'terminated';

interface Contract {
  id: string;
  title: string;
  vendor: string;
  region: string;
  status: ContractStatus;
  value: string;
  startDate: string;
  endDate: string;
  autoRenew: boolean;
  category: string;
}

export default function ContractsPage() {
  const [searchQuery, setSearchQuery] = React.useState('');
  const [selectedStatus, setSelectedStatus] = React.useState<ContractStatus | 'all'>('all');

  const contracts: Contract[] = [
    {
      id: 'CON-2024-0156',
      title: 'Global IT Services Agreement',
      vendor: 'TechGlobal Solutions Inc.',
      region: 'Global',
      status: 'active',
      value: '$2,400,000',
      startDate: '2024-01-01',
      endDate: '2025-12-31',
      autoRenew: true,
      category: 'Technology',
    },
    {
      id: 'CON-2024-0157',
      title: 'Office Supplies - North America',
      vendor: 'OfficeMax Enterprise',
      region: 'North America',
      status: 'expiring_soon',
      value: '$450,000',
      startDate: '2024-02-01',
      endDate: '2025-01-31',
      autoRenew: false,
      category: 'Office Equipment',
    },
    {
      id: 'CON-2024-0158',
      title: 'Manufacturing Equipment Lease',
      vendor: 'Industrial Solutions APAC',
      region: 'APAC',
      status: 'active',
      value: '$1,200,000',
      startDate: '2024-06-01',
      endDate: '2027-05-31',
      autoRenew: true,
      category: 'Industrial',
    },
    {
      id: 'CON-2024-0159',
      title: 'Cloud Infrastructure Services',
      vendor: 'CloudProvider EU',
      region: 'Europe',
      status: 'pending_approval',
      value: '$850,000',
      startDate: '2025-01-01',
      endDate: '2026-12-31',
      autoRenew: true,
      category: 'Technology',
    },
  ];

  const getStatusColor = (status: ContractStatus) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-700';
      case 'pending_approval':
        return 'bg-yellow-100 text-yellow-700';
      case 'expiring_soon':
        return 'bg-orange-100 text-orange-700';
      case 'expired':
        return 'bg-red-100 text-red-700';
      case 'terminated':
        return 'bg-gray-100 text-gray-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const filteredContracts = contracts.filter((contract) => {
    const matchesSearch =
      contract.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      contract.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      contract.vendor.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = selectedStatus === 'all' || contract.status === selectedStatus;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Contract Management</h1>
          <p className="text-muted-foreground mt-2">
            Manage global contracts and vendor agreements
          </p>
        </div>
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          New Contract
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Active Contracts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {contracts.filter((c) => c.status === 'active').length}
            </div>
            <p className="text-xs text-muted-foreground mt-1">156 total contracts</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Expiring Soon
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {contracts.filter((c) => c.status === 'expiring_soon').length}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Next 90 days</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Pending Approval
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {contracts.filter((c) => c.status === 'pending_approval').length}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Requires action</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Contract Value
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">$4.9M</div>
            <p className="text-xs text-muted-foreground mt-1">Annual value</p>
          </CardContent>
        </Card>
      </div>

      {/* Alerts */}
      <Card className="border-orange-200 bg-orange-50">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-orange-600 mt-0.5" />
            <div className="flex-1">
              <h3 className="font-semibold text-orange-900">Action Required</h3>
              <p className="text-sm text-orange-800 mt-1">
                1 contract expiring in 30 days requires renewal decision. Review expiring contracts.
              </p>
            </div>
            <Button variant="outline" size="sm">
              Review Now
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search contracts..."
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
                variant={selectedStatus === 'active' ? 'default' : 'outline'}
                onClick={() => setSelectedStatus('active')}
                size="sm"
              >
                Active
              </Button>
              <Button
                variant={selectedStatus === 'pending_approval' ? 'default' : 'outline'}
                onClick={() => setSelectedStatus('pending_approval')}
                size="sm"
              >
                Pending
              </Button>
              <Button
                variant={selectedStatus === 'expiring_soon' ? 'default' : 'outline'}
                onClick={() => setSelectedStatus('expiring_soon')}
                size="sm"
              >
                Expiring
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Contract List */}
      <div className="space-y-4">
        {filteredContracts.map((contract) => (
          <Card key={contract.id} hover>
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1 space-y-3">
                  <div className="flex items-center gap-3">
                    <ClipboardCheck className="h-5 w-5 text-primary" />
                    <h3 className="text-lg font-semibold">{contract.title}</h3>
                    <span
                      className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(
                        contract.status
                      )}`}
                    >
                      {contract.status.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div className="flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-muted-foreground text-xs">Vendor</p>
                        <p className="font-medium">{contract.vendor}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <DollarSign className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-muted-foreground text-xs">Contract Value</p>
                        <p className="font-medium">{contract.value}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-muted-foreground text-xs">Period</p>
                        <p className="font-medium">{contract.startDate} - {contract.endDate}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <FileSignature className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-muted-foreground text-xs">Auto-Renew</p>
                        <p className="font-medium">{contract.autoRenew ? 'Yes' : 'No'}</p>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 text-sm">
                    <span className="text-muted-foreground">
                      Contract ID: <span className="font-medium text-foreground">{contract.id}</span>
                    </span>
                    <span className="text-muted-foreground">
                      Region: <span className="font-medium text-foreground">{contract.region}</span>
                    </span>
                    <span className="text-muted-foreground">
                      Category: <span className="font-medium text-foreground">{contract.category}</span>
                    </span>
                  </div>
                </div>
                <div className="flex gap-2 ml-4">
                  <Button variant="ghost" size="icon" title="View Contract">
                    <Eye className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" title="Edit Contract">
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" title="Download PDF">
                    <Download className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredContracts.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <ClipboardCheck className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No contracts found</h3>
            <p className="text-muted-foreground text-center mb-4">
              No contracts match your current filters. Try adjusting your search.
            </p>
            <Button>Create New Contract</Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
