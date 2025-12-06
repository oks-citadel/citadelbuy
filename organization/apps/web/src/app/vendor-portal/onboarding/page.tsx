'use client';

import * as React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Globe, ArrowRight, CheckCircle, Clock } from 'lucide-react';
import Link from 'next/link';

export default function OnboardingOverviewPage() {
  const regions = [
    {
      name: 'North America',
      code: 'na',
      countries: ['USA', 'Canada', 'Mexico'],
      status: 'active',
      requirements: 5,
      completed: 5,
    },
    {
      name: 'Europe',
      code: 'eu',
      countries: ['UK', 'Germany', 'France', 'Spain', 'Italy'],
      status: 'active',
      requirements: 6,
      completed: 6,
    },
    {
      name: 'Asia Pacific',
      code: 'apac',
      countries: ['Japan', 'Australia', 'Singapore', 'South Korea'],
      status: 'in_progress',
      requirements: 7,
      completed: 4,
    },
    {
      name: 'Latin America',
      code: 'latam',
      countries: ['Brazil', 'Argentina', 'Chile', 'Colombia'],
      status: 'not_started',
      requirements: 6,
      completed: 0,
    },
    {
      name: 'Middle East & Africa',
      code: 'mea',
      countries: ['UAE', 'Saudi Arabia', 'South Africa'],
      status: 'not_started',
      requirements: 8,
      completed: 0,
    },
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-700';
      case 'in_progress':
        return 'bg-yellow-100 text-yellow-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'in_progress':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Regional Onboarding</h1>
        <p className="text-muted-foreground mt-2">
          Expand your business to new global markets
        </p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Active Regions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {regions.filter((r) => r.status === 'active').length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              In Progress
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {regions.filter((r) => r.status === 'in_progress').length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Countries
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {regions.reduce((acc, r) => acc + r.countries.length, 0)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Completion Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">67%</div>
          </CardContent>
        </Card>
      </div>

      {/* Regions List */}
      <div className="space-y-4">
        {regions.map((region) => (
          <Card key={region.code} hover>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-start gap-4 flex-1">
                  <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                    <Globe className="h-6 w-6 text-primary" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold">{region.name}</h3>
                      {getStatusIcon(region.status)}
                      <span
                        className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(
                          region.status
                        )}`}
                      >
                        {region.status === 'not_started'
                          ? 'Not Started'
                          : region.status === 'in_progress'
                          ? 'In Progress'
                          : 'Active'}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground mb-3">
                      {region.countries.join(', ')}
                    </p>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">
                          Requirements completed
                        </span>
                        <span className="font-medium">
                          {region.completed} / {region.requirements}
                        </span>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary rounded-full transition-all"
                          style={{
                            width: `${(region.completed / region.requirements) * 100}%`,
                          }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
                <Link href={`/vendor-portal/onboarding/${region.code}`}>
                  <Button variant={region.status === 'not_started' ? 'default' : 'outline'}>
                    {region.status === 'not_started'
                      ? 'Start Onboarding'
                      : region.status === 'in_progress'
                      ? 'Continue'
                      : 'View Details'}
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Info Card */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="pt-6">
          <h3 className="font-semibold text-blue-900 mb-2">
            Expand to New Markets
          </h3>
          <p className="text-sm text-blue-800">
            Each region has specific requirements including tax registrations, compliance
            certifications, and localized product information. Complete all requirements to
            start selling in new markets.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
