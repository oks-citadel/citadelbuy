'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  Shield,
  ChevronRight,
  Home,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Settings,
  Save,
  RefreshCw,
  BarChart3,
  Activity,
  TrendingUp,
  Clock,
  Ban,
  AlertOctagon,
  Eye,
  Database,
  Zap,
  Target,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';

export default function AIFraudDetectionPage() {
  const [enabled, setEnabled] = useState(true);
  const [riskThreshold, setRiskThreshold] = useState(0.75);
  const [autoBlock, setAutoBlock] = useState(false);
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [realTimeScanning, setRealTimeScanning] = useState(true);
  const [velocityChecking, setVelocityChecking] = useState(true);
  const [deviceFingerprinting, setDeviceFingerprinting] = useState(true);
  const [behavioralAnalysis, setBehavioralAnalysis] = useState(true);

  const stats = {
    transactionsScanned: 12450,
    fraudAttempts: 127,
    blockedTransactions: 89,
    falsePositives: 8,
    accuracy: 98.2,
  };

  const riskLevels = [
    { level: 'Critical', count: 12, color: 'bg-red-500', percentage: 9 },
    { level: 'High', count: 35, color: 'bg-orange-500', percentage: 28 },
    { level: 'Medium', count: 52, color: 'bg-yellow-500', percentage: 41 },
    { level: 'Low', count: 28, color: 'bg-green-500', percentage: 22 },
  ];

  const recentDetections = [
    {
      id: 'FRD-2451',
      type: 'Stolen Card',
      risk: 'critical',
      amount: 1899.99,
      status: 'blocked',
      time: '2 min ago',
    },
    {
      id: 'FRD-2450',
      type: 'Unusual Location',
      risk: 'high',
      amount: 245.0,
      status: 'review',
      time: '15 min ago',
    },
    {
      id: 'FRD-2449',
      type: 'Velocity Check Failed',
      risk: 'high',
      amount: 599.99,
      status: 'blocked',
      time: '45 min ago',
    },
    {
      id: 'FRD-2448',
      type: 'Suspicious Pattern',
      risk: 'medium',
      amount: 89.99,
      status: 'approved',
      time: '1 hour ago',
    },
  ];

  const fraudIndicators = [
    { name: 'IP Address Mismatch', weight: 35, enabled: true },
    { name: 'AVS Mismatch', weight: 40, enabled: true },
    { name: 'CVV Failure', weight: 45, enabled: true },
    { name: 'High Order Value', weight: 25, enabled: true },
    { name: 'Multiple Failed Attempts', weight: 50, enabled: true },
    { name: 'Blacklisted Email', weight: 60, enabled: true },
  ];

  const getRiskBadge = (risk: string) => {
    switch (risk) {
      case 'critical':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'high':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low':
        return 'bg-green-100 text-green-800 border-green-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'blocked':
        return 'bg-red-100 text-red-800';
      case 'review':
        return 'bg-yellow-100 text-yellow-800';
      case 'approved':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link href="/admin" className="hover:text-foreground transition-colors">
          <Home className="h-4 w-4" />
        </Link>
        <ChevronRight className="h-4 w-4" />
        <Link href="/admin/ai" className="hover:text-foreground transition-colors">
          AI Management
        </Link>
        <ChevronRight className="h-4 w-4" />
        <span className="text-foreground font-medium">Fraud Detection</span>
      </nav>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-lg bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center">
            <Shield className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Fraud Detection</h1>
            <p className="text-muted-foreground">
              Real-time transaction monitoring and fraud prevention
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            Update Rules
          </Button>
          <Button>
            <Save className="h-4 w-4 mr-2" />
            Save Changes
          </Button>
        </div>
      </div>

      {/* Status Banner */}
      <div className={`p-4 rounded-lg border ${enabled ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {enabled ? (
              <CheckCircle2 className="h-5 w-5 text-green-600" />
            ) : (
              <AlertTriangle className="h-5 w-5 text-gray-400" />
            )}
            <div>
              <p className="font-semibold">
                {enabled ? 'Fraud Detection Active' : 'Fraud Detection Inactive'}
              </p>
              <p className="text-sm text-muted-foreground">
                {enabled
                  ? 'Actively monitoring all transactions for fraudulent activity'
                  : 'Enable to start monitoring transactions'}
              </p>
            </div>
          </div>
          <Switch checked={enabled} onCheckedChange={setEnabled} />
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Scanned</p>
                <p className="text-2xl font-bold">{stats.transactionsScanned.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground mt-1">Transactions</p>
              </div>
              <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                <Database className="h-5 w-5 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Fraud Attempts</p>
                <p className="text-2xl font-bold">{stats.fraudAttempts}</p>
                <p className="text-xs text-red-600 mt-1">-12% from last week</p>
              </div>
              <div className="h-10 w-10 rounded-full bg-red-100 flex items-center justify-center">
                <AlertOctagon className="h-5 w-5 text-red-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Blocked</p>
                <p className="text-2xl font-bold">{stats.blockedTransactions}</p>
                <p className="text-xs text-muted-foreground mt-1">Auto-blocked</p>
              </div>
              <div className="h-10 w-10 rounded-full bg-orange-100 flex items-center justify-center">
                <Ban className="h-5 w-5 text-orange-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Accuracy</p>
                <p className="text-2xl font-bold">{stats.accuracy}%</p>
                <p className="text-xs text-green-600 mt-1">+0.5% improvement</p>
              </div>
              <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center">
                <Target className="h-5 w-5 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">False Positives</p>
                <p className="text-2xl font-bold">{stats.falsePositives}</p>
                <p className="text-xs text-green-600 mt-1">0.06% rate</p>
              </div>
              <div className="h-10 w-10 rounded-full bg-purple-100 flex items-center justify-center">
                <Eye className="h-5 w-5 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Configuration */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Detection Settings
            </CardTitle>
            <CardDescription>Configure fraud detection parameters</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="risk-threshold">
                Risk Score Threshold: {(riskThreshold * 100).toFixed(0)}%
              </Label>
              <input
                id="risk-threshold"
                type="range"
                min="0.5"
                max="0.95"
                step="0.05"
                value={riskThreshold}
                onChange={(e) => setRiskThreshold(parseFloat(e.target.value))}
                className="w-full"
              />
              <p className="text-xs text-muted-foreground">
                Transactions scoring above this threshold will be flagged
              </p>
            </div>

            <div className="pt-4 border-t space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="auto-block">Auto-block High Risk</Label>
                  <p className="text-xs text-muted-foreground">
                    Automatically block transactions above threshold
                  </p>
                </div>
                <Switch
                  id="auto-block"
                  checked={autoBlock}
                  onCheckedChange={setAutoBlock}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="email-notifications">Email Notifications</Label>
                  <p className="text-xs text-muted-foreground">
                    Receive alerts for high-risk transactions
                  </p>
                </div>
                <Switch
                  id="email-notifications"
                  checked={emailNotifications}
                  onCheckedChange={setEmailNotifications}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="real-time">Real-time Scanning</Label>
                  <p className="text-xs text-muted-foreground">Scan all transactions in real-time</p>
                </div>
                <Switch
                  id="real-time"
                  checked={realTimeScanning}
                  onCheckedChange={setRealTimeScanning}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="velocity">Velocity Checking</Label>
                  <p className="text-xs text-muted-foreground">Detect rapid transaction patterns</p>
                </div>
                <Switch
                  id="velocity"
                  checked={velocityChecking}
                  onCheckedChange={setVelocityChecking}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="device">Device Fingerprinting</Label>
                  <p className="text-xs text-muted-foreground">Track and analyze device signatures</p>
                </div>
                <Switch
                  id="device"
                  checked={deviceFingerprinting}
                  onCheckedChange={setDeviceFingerprinting}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="behavioral">Behavioral Analysis</Label>
                  <p className="text-xs text-muted-foreground">Detect unusual user behavior</p>
                </div>
                <Switch
                  id="behavioral"
                  checked={behavioralAnalysis}
                  onCheckedChange={setBehavioralAnalysis}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Risk Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Risk Distribution
            </CardTitle>
            <CardDescription>Flagged transactions by risk level (Last 24h)</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {riskLevels.map((risk) => (
                <div key={risk.level}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className={`h-3 w-3 rounded-full ${risk.color}`} />
                      <span className="font-medium">{risk.level}</span>
                    </div>
                    <span className="text-sm text-muted-foreground">
                      {risk.count} ({risk.percentage}%)
                    </span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className={`h-full ${risk.color} rounded-full transition-all`}
                      style={{ width: `${risk.percentage}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 pt-6 border-t">
              <h4 className="font-semibold mb-4">Fraud Indicators</h4>
              <div className="space-y-3">
                {fraudIndicators.map((indicator) => (
                  <div key={indicator.name} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <Switch checked={indicator.enabled} />
                      <span>{indicator.name}</span>
                    </div>
                    <Badge variant="outline">Weight: {indicator.weight}</Badge>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Detections */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            Recent Detections
          </CardTitle>
          <CardDescription>Latest fraud detection events</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {recentDetections.map((detection) => (
              <div
                key={detection.id}
                className="flex items-center justify-between p-4 border rounded-lg"
              >
                <div className="flex items-center gap-4">
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm font-medium">{detection.id}</span>
                      <Badge className={getRiskBadge(detection.risk)} variant="outline">
                        {detection.risk}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{detection.type}</p>
                  </div>
                </div>
                <div className="flex items-center gap-6">
                  <div className="text-right">
                    <p className="font-semibold">${detection.amount.toFixed(2)}</p>
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {detection.time}
                    </p>
                  </div>
                  <Badge className={getStatusBadge(detection.status)}>
                    {detection.status}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 flex justify-center">
            <Button variant="outline">View All Detections</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
