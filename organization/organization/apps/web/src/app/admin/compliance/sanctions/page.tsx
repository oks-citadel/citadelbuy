'use client';

import * as React from 'react';
import { useState, useEffect } from 'react';
import {
  Shield,
  Download,
  Upload,
  Play,
  FileSearch,
  AlertTriangle,
  CheckCircle,
  Clock,
  RefreshCw,
  Plus,
  Filter,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import { ScreeningResultsTable, ScreeningResult } from '@/components/screening/ScreeningResultsTable';
import { ScreeningFilters } from '@/components/screening/ScreeningFilters';
import { ScreeningStatusBadge, ScreeningStatus } from '@/components/screening/ScreeningStatusBadge';

// Mock data - replace with actual API calls
const generateMockResults = (): ScreeningResult[] => {
  return [
    {
      id: '1',
      entityName: 'John Doe',
      entityType: 'INDIVIDUAL',
      email: 'john.doe@example.com',
      status: 'CLEAR',
      riskLevel: 'LOW',
      matchScore: 15,
      screenedAt: '2024-03-15T10:30:00Z',
      screenedBy: 'Admin User',
      country: 'United States',
    },
    {
      id: '2',
      entityName: 'ABC Corporation',
      entityType: 'BUSINESS',
      email: 'contact@abc-corp.com',
      status: 'FLAGGED',
      riskLevel: 'CRITICAL',
      matchScore: 95,
      matchedList: 'OFAC SDN List',
      screenedAt: '2024-03-15T09:45:00Z',
      screenedBy: 'System',
      country: 'Russia',
      flaggedReasons: ['High match score with OFAC list', 'Country risk'],
    },
    {
      id: '3',
      entityName: 'Jane Smith',
      entityType: 'INDIVIDUAL',
      email: 'jane.smith@example.com',
      status: 'PENDING',
      riskLevel: 'MEDIUM',
      matchScore: 65,
      matchedList: 'EU Sanctions',
      screenedAt: '2024-03-15T09:15:00Z',
      country: 'United Kingdom',
    },
    {
      id: '4',
      entityName: 'XYZ International',
      entityType: 'BUSINESS',
      status: 'CLEAR',
      riskLevel: 'LOW',
      matchScore: 8,
      screenedAt: '2024-03-15T08:30:00Z',
      screenedBy: 'Compliance Team',
      country: 'Germany',
    },
    {
      id: '5',
      entityName: 'Bob Johnson',
      entityType: 'INDIVIDUAL',
      email: 'bob.j@example.com',
      status: 'FLAGGED',
      riskLevel: 'HIGH',
      matchScore: 85,
      matchedList: 'UN Sanctions',
      screenedAt: '2024-03-14T16:20:00Z',
      screenedBy: 'Admin User',
      country: 'Iran',
      flaggedReasons: ['Name match', 'High-risk country'],
    },
    {
      id: '6',
      entityName: 'Global Trading LLC',
      entityType: 'BUSINESS',
      email: 'info@globaltrading.com',
      status: 'CLEAR',
      riskLevel: 'LOW',
      matchScore: 12,
      screenedAt: '2024-03-14T15:10:00Z',
      screenedBy: 'System',
      country: 'Canada',
    },
    {
      id: '7',
      entityName: 'Alice Brown',
      entityType: 'INDIVIDUAL',
      status: 'PENDING',
      riskLevel: 'MEDIUM',
      matchScore: 55,
      matchedList: 'UK Sanctions',
      screenedAt: '2024-03-14T14:45:00Z',
      country: 'China',
    },
    {
      id: '8',
      entityName: 'Tech Solutions Inc',
      entityType: 'BUSINESS',
      email: 'contact@techsolutions.com',
      status: 'CLEAR',
      riskLevel: 'LOW',
      matchScore: 5,
      screenedAt: '2024-03-14T13:30:00Z',
      screenedBy: 'Compliance Team',
      country: 'United States',
    },
  ];
};

export default function SanctionsScreeningPage() {
  const [allResults, setAllResults] = useState<ScreeningResult[]>(generateMockResults());
  const [filteredResults, setFilteredResults] = useState<ScreeningResult[]>(allResults);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [riskLevelFilter, setRiskLevelFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [showNewScreeningDialog, setShowNewScreeningDialog] = useState(false);
  const [newEntityName, setNewEntityName] = useState('');
  const [newEntityType, setNewEntityType] = useState<'INDIVIDUAL' | 'BUSINESS'>('INDIVIDUAL');

  // Apply filters
  useEffect(() => {
    let results = [...allResults];

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      results = results.filter(
        (r) =>
          r.entityName.toLowerCase().includes(query) ||
          r.email?.toLowerCase().includes(query) ||
          r.country?.toLowerCase().includes(query)
      );
    }

    // Status filter
    if (statusFilter !== 'all') {
      results = results.filter((r) => r.status === statusFilter);
    }

    // Risk level filter
    if (riskLevelFilter !== 'all') {
      results = results.filter((r) => r.riskLevel === riskLevelFilter);
    }

    setFilteredResults(results);
    setCurrentPage(1);
  }, [searchQuery, statusFilter, riskLevelFilter, allResults]);

  // Pagination
  const totalPages = Math.ceil(filteredResults.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentResults = filteredResults.slice(startIndex, endIndex);

  // Statistics
  const totalScreenings = allResults.length;
  const clearCount = allResults.filter((r) => r.status === 'CLEAR').length;
  const flaggedCount = allResults.filter((r) => r.status === 'FLAGGED').length;
  const pendingCount = allResults.filter((r) => r.status === 'PENDING').length;

  const handleRefresh = async () => {
    setIsLoading(true);
    // Simulate API call
    setTimeout(() => {
      setAllResults(generateMockResults());
      setIsLoading(false);
    }, 1000);
  };

  const handleNewScreening = async () => {
    if (!newEntityName.trim()) return;

    setIsLoading(true);
    // Simulate API call
    setTimeout(() => {
      const newResult: ScreeningResult = {
        id: String(Date.now()),
        entityName: newEntityName,
        entityType: newEntityType,
        status: 'PENDING',
        riskLevel: 'LOW',
        screenedAt: new Date().toISOString(),
        screenedBy: 'Admin User',
      };
      setAllResults([newResult, ...allResults]);
      setShowNewScreeningDialog(false);
      setNewEntityName('');
      setIsLoading(false);
    }, 1000);
  };

  const handleExport = () => {
    // Create CSV content
    const headers = ['Entity Name', 'Type', 'Status', 'Risk Level', 'Match Score', 'Matched List', 'Screened At', 'Country'];
    const rows = filteredResults.map((r) => [
      r.entityName,
      r.entityType,
      r.status,
      r.riskLevel,
      r.matchScore || '',
      r.matchedList || '',
      new Date(r.screenedAt).toLocaleString(),
      r.country || '',
    ]);

    const csvContent = [headers, ...rows].map((row) => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sanctions-screening-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  const handleExportSingle = (result: ScreeningResult) => {
    const content = JSON.stringify(result, null, 2);
    const blob = new Blob([content], { type: 'application/json' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `screening-${result.entityName.replace(/\s+/g, '-')}-${result.id}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  const handleViewDetails = (result: ScreeningResult) => {
    // In a real implementation, this would open a detailed view
    alert(`View details for ${result.entityName}`);
  };

  const handleClearFilters = () => {
    setSearchQuery('');
    setStatusFilter('all');
    setRiskLevelFilter('all');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Shield className="h-6 w-6 text-primary" />
            Sanctions Screening
          </h1>
          <p className="text-muted-foreground">
            Screen entities against global sanctions lists
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={handleRefresh} disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button variant="outline" onClick={handleExport}>
            <Download className="h-4 w-4 mr-2" />
            Export All
          </Button>
          <Dialog open={showNewScreeningDialog} onOpenChange={setShowNewScreeningDialog}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                New Screening
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>New Sanctions Screening</DialogTitle>
                <DialogDescription>
                  Screen a new entity against global sanctions lists
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Entity Name</label>
                  <Input
                    placeholder="Enter entity name..."
                    value={newEntityName}
                    onChange={(e) => setNewEntityName(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Entity Type</label>
                  <select
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    value={newEntityType}
                    onChange={(e) => setNewEntityType(e.target.value as 'INDIVIDUAL' | 'BUSINESS')}
                  >
                    <option value="INDIVIDUAL">Individual</option>
                    <option value="BUSINESS">Business</option>
                  </select>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowNewScreeningDialog(false)}>
                  Cancel
                </Button>
                <Button onClick={handleNewScreening} disabled={isLoading || !newEntityName.trim()}>
                  {isLoading ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Screening...
                    </>
                  ) : (
                    <>
                      <Play className="h-4 w-4 mr-2" />
                      Run Screening
                    </>
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Screenings</p>
                <p className="text-2xl font-bold">{totalScreenings}</p>
              </div>
              <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                <FileSearch className="h-5 w-5 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Clear Results</p>
                <p className="text-2xl font-bold">{clearCount}</p>
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
                <p className="text-sm text-muted-foreground">Flagged</p>
                <p className="text-2xl font-bold">{flaggedCount}</p>
              </div>
              <div className="h-10 w-10 rounded-full bg-red-100 flex items-center justify-center">
                <AlertTriangle className="h-5 w-5 text-red-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Pending Reviews</p>
                <p className="text-2xl font-bold">{pendingCount}</p>
              </div>
              <div className="h-10 w-10 rounded-full bg-yellow-100 flex items-center justify-center">
                <Clock className="h-5 w-5 text-yellow-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <ScreeningFilters
        searchValue={searchQuery}
        statusValue={statusFilter}
        riskLevelValue={riskLevelFilter}
        onSearchChange={setSearchQuery}
        onStatusChange={setStatusFilter}
        onRiskLevelChange={setRiskLevelFilter}
        onClear={handleClearFilters}
      />

      {/* Results Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Screening Results</CardTitle>
              <CardDescription>
                Showing {startIndex + 1}-{Math.min(endIndex, filteredResults.length)} of {filteredResults.length} results
              </CardDescription>
            </div>
            {filteredResults.length > 0 && (
              <Badge variant="outline" className="text-sm">
                {filteredResults.length} {filteredResults.length === 1 ? 'result' : 'results'}
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <ScreeningResultsTable
            results={currentResults}
            onViewDetails={handleViewDetails}
            onExport={handleExportSingle}
            emptyMessage={
              searchQuery || statusFilter !== 'all' || riskLevelFilter !== 'all'
                ? 'No results match your filters'
                : 'No screening results found'
            }
          />
        </CardContent>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="text-sm text-muted-foreground">
                Page {currentPage} of {totalPages}
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                >
                  Next
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
