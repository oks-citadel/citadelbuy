'use client';

import * as React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Shield,
  CheckCircle,
  AlertTriangle,
  XCircle,
  Globe,
  FileCheck,
  Clock,
  Award,
} from 'lucide-react';

export default function CompliancePage() {
  const complianceScore = 98;

  const regulations = [
    {
      name: 'GDPR',
      region: 'Europe',
      status: 'compliant',
      lastAudit: '2024-11-15',
      nextAudit: '2025-05-15',
      score: 100,
    },
    {
      name: 'SOC 2 Type II',
      region: 'Global',
      status: 'compliant',
      lastAudit: '2024-10-01',
      nextAudit: '2025-04-01',
      score: 98,
    },
    {
      name: 'ISO 27001',
      region: 'Global',
      status: 'compliant',
      lastAudit: '2024-09-20',
      nextAudit: '2025-03-20',
      score: 97,
    },
    {
      name: 'CCPA',
      region: 'North America',
      status: 'review_needed',
      lastAudit: '2024-08-10',
      nextAudit: '2025-02-10',
      score: 92,
    },
  ];

  const certifications = [
    {
      name: 'ISO 9001:2015',
      issuer: 'ISO',
      validUntil: '2025-12-31',
      status: 'valid',
    },
    {
      name: 'ISO 27001:2013',
      issuer: 'ISO',
      validUntil: '2025-09-30',
      status: 'valid',
    },
    {
      name: 'SOC 2 Type II',
      issuer: 'AICPA',
      validUntil: '2025-04-15',
      status: 'expiring_soon',
    },
  ];

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'compliant':
      case 'valid':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'review_needed':
      case 'expiring_soon':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case 'non_compliant':
      case 'expired':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'compliant':
      case 'valid':
        return 'bg-green-100 text-green-700';
      case 'review_needed':
      case 'expiring_soon':
        return 'bg-yellow-100 text-yellow-700';
      case 'non_compliant':
      case 'expired':
        return 'bg-red-100 text-red-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Compliance Dashboard</h1>
        <p className="text-muted-foreground mt-2">
          Monitor global compliance and certifications
        </p>
      </div>

      {/* Overall Score */}
      <Card className="border-primary">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center">
                <Shield className="h-10 w-10 text-primary" />
              </div>
              <div>
                <h2 className="text-3xl font-bold">{complianceScore}%</h2>
                <p className="text-muted-foreground">Overall Compliance Score</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm text-muted-foreground">Last Updated</p>
              <p className="font-medium">December 6, 2024</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Active Regulations
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{regulations.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Fully Compliant
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {regulations.filter((r) => r.status === 'compliant').length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Review Needed
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">
              {regulations.filter((r) => r.status === 'review_needed').length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Active Certifications
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{certifications.length}</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Regulations */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="h-5 w-5" />
              Regulatory Compliance
            </CardTitle>
            <CardDescription>Track compliance across regions</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {regulations.map((reg, idx) => (
                <div key={idx} className="flex items-center justify-between pb-4 border-b last:border-0">
                  <div className="flex items-start gap-3">
                    {getStatusIcon(reg.status)}
                    <div>
                      <h4 className="font-semibold">{reg.name}</h4>
                      <p className="text-sm text-muted-foreground">{reg.region}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Next audit: {reg.nextAudit}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold">{reg.score}%</div>
                    <span
                      className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(
                        reg.status
                      )}`}
                    >
                      {reg.status.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Certifications */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Award className="h-5 w-5" />
              Certifications
            </CardTitle>
            <CardDescription>Active industry certifications</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {certifications.map((cert, idx) => (
                <div key={idx} className="flex items-center justify-between pb-4 border-b last:border-0">
                  <div className="flex items-start gap-3">
                    {getStatusIcon(cert.status)}
                    <div>
                      <h4 className="font-semibold">{cert.name}</h4>
                      <p className="text-sm text-muted-foreground">Issued by {cert.issuer}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Valid until: {cert.validUntil}
                      </p>
                    </div>
                  </div>
                  <span
                    className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(
                      cert.status
                    )}`}
                  >
                    {cert.status.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Document Repository */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileCheck className="h-5 w-5" />
            Compliance Documents
          </CardTitle>
          <CardDescription>Access compliance documentation and reports</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Button variant="outline" className="h-auto flex-col gap-2 py-4">
              <FileCheck className="h-8 w-8" />
              <span className="text-sm">GDPR Reports</span>
            </Button>
            <Button variant="outline" className="h-auto flex-col gap-2 py-4">
              <FileCheck className="h-8 w-8" />
              <span className="text-sm">SOC 2 Audit</span>
            </Button>
            <Button variant="outline" className="h-auto flex-col gap-2 py-4">
              <FileCheck className="h-8 w-8" />
              <span className="text-sm">ISO Certificates</span>
            </Button>
            <Button variant="outline" className="h-auto flex-col gap-2 py-4">
              <FileCheck className="h-8 w-8" />
              <span className="text-sm">All Documents</span>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
