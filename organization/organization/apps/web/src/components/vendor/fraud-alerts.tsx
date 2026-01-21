'use client';

import * as React from 'react';
import {
  Shield,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Clock,
  Eye,
  ChevronRight,
  Filter,
  Search,
  TrendingDown,
  DollarSign,
  Loader2,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useFraudAlerts, useFraudStats, useResolveFraudAlert } from '@/hooks/use-vendor';
import { FraudAlert, FraudAlertType, FraudStats } from '@/types/vendor';

// Mock data
const mockAlerts: FraudAlert[] = [
  {
    id: '1',
    type: 'SUSPICIOUS_ORDER',
    severity: 'HIGH',
    status: 'NEW',
    orderId: 'ORD-123456',
    customerId: 'CUST-789',
    description: 'Multiple orders from same IP with different payment methods',
    riskScore: 85,
    indicators: [
      { name: 'IP Velocity', value: '5 orders in 1 hour', weight: 0.3, description: 'Multiple orders from same IP' },
      { name: 'Payment Mismatch', value: '3 different cards', weight: 0.4, description: 'Different payment methods used' },
      { name: 'New Account', value: 'Created today', weight: 0.2, description: 'Account created within 24 hours' },
    ],
    recommendedActions: ['Review order details', 'Verify customer identity', 'Check IP history'],
    createdAt: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
  },
  {
    id: '2',
    type: 'PAYMENT_FRAUD',
    severity: 'CRITICAL',
    status: 'INVESTIGATING',
    orderId: 'ORD-123457',
    customerId: 'CUST-456',
    description: 'Card declined after initial authorization - potential stolen card',
    riskScore: 92,
    indicators: [
      { name: 'Authorization Failure', value: 'Card declined', weight: 0.5, description: 'Card was declined after initial auth' },
      { name: 'Billing Mismatch', value: 'Different country', weight: 0.3, description: 'Billing and shipping countries differ' },
      { name: 'High Value', value: '$1,247.00', weight: 0.2, description: 'Order value above average' },
    ],
    recommendedActions: ['Cancel order immediately', 'Block payment method', 'Report to fraud team'],
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
  },
  {
    id: '3',
    type: 'PROMO_ABUSE',
    severity: 'MEDIUM',
    status: 'NEW',
    customerId: 'CUST-321',
    description: 'Multiple accounts using same promo code from same device',
    riskScore: 68,
    indicators: [
      { name: 'Device Fingerprint', value: 'Same device ID', weight: 0.4, description: 'Multiple accounts on same device' },
      { name: 'Promo Usage', value: '5 times', weight: 0.4, description: 'Promo code used multiple times' },
      { name: 'Email Pattern', value: 'Similar emails', weight: 0.2, description: 'Email addresses follow pattern' },
    ],
    recommendedActions: ['Disable promo code', 'Review related accounts', 'Consider account suspension'],
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(),
  },
  {
    id: '4',
    type: 'RETURN_FRAUD',
    severity: 'LOW',
    status: 'RESOLVED',
    customerId: 'CUST-654',
    description: 'High return rate detected - potential wardrobing',
    riskScore: 45,
    indicators: [
      { name: 'Return Rate', value: '78%', weight: 0.5, description: 'Returns most purchased items' },
      { name: 'Return Pattern', value: 'After events', weight: 0.3, description: 'Returns after weekends/events' },
    ],
    recommendedActions: ['Monitor future orders', 'Limit return policy', 'Flag account'],
    resolvedBy: 'admin@store.com',
    resolvedAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
    notes: 'Customer warned, account flagged for monitoring',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString(),
  },
];

const mockStats: FraudStats = {
  totalAlerts: 47,
  pendingReview: 12,
  resolvedThisMonth: 35,
  falsePositiveRate: 8.5,
  avgResolutionTime: 4.2,
  fraudPreventedValue: 15420,
  alertsByType: [
    { type: 'SUSPICIOUS_ORDER', count: 18 },
    { type: 'PAYMENT_FRAUD', count: 12 },
    { type: 'PROMO_ABUSE', count: 9 },
    { type: 'RETURN_FRAUD', count: 5 },
    { type: 'ACCOUNT_TAKEOVER', count: 3 },
  ],
  alertsBySeverity: [
    { severity: 'CRITICAL', count: 5 },
    { severity: 'HIGH', count: 12 },
    { severity: 'MEDIUM', count: 18 },
    { severity: 'LOW', count: 12 },
  ],
  recentTrend: [
    { date: '2024-01-14', alerts: 8 },
    { date: '2024-01-15', alerts: 5 },
    { date: '2024-01-16', alerts: 12 },
    { date: '2024-01-17', alerts: 7 },
    { date: '2024-01-18', alerts: 9 },
    { date: '2024-01-19', alerts: 4 },
    { date: '2024-01-20', alerts: 6 },
  ],
};

const severityConfig: Record<string, { color: string; bgColor: string; icon: React.ReactNode }> = {
  CRITICAL: {
    color: 'text-red-700',
    bgColor: 'bg-red-100',
    icon: <XCircle className="h-4 w-4" />,
  },
  HIGH: {
    color: 'text-orange-700',
    bgColor: 'bg-orange-100',
    icon: <AlertTriangle className="h-4 w-4" />,
  },
  MEDIUM: {
    color: 'text-yellow-700',
    bgColor: 'bg-yellow-100',
    icon: <AlertTriangle className="h-4 w-4" />,
  },
  LOW: {
    color: 'text-blue-700',
    bgColor: 'bg-blue-100',
    icon: <Eye className="h-4 w-4" />,
  },
};

const statusConfig: Record<string, { color: string; label: string }> = {
  NEW: { color: 'bg-blue-100 text-blue-700', label: 'New' },
  INVESTIGATING: { color: 'bg-yellow-100 text-yellow-700', label: 'Investigating' },
  RESOLVED: { color: 'bg-green-100 text-green-700', label: 'Resolved' },
  FALSE_POSITIVE: { color: 'bg-gray-100 text-gray-700', label: 'False Positive' },
};

function AlertCard({
  alert,
  onResolve,
}: {
  alert: FraudAlert;
  onResolve: (status: 'RESOLVED' | 'FALSE_POSITIVE', notes?: string) => void;
}) {
  const [showDetails, setShowDetails] = React.useState(false);
  const [notes, setNotes] = React.useState('');
  const severity = severityConfig[alert.severity];
  const status = statusConfig[alert.status];

  return (
    <Card className={cn('transition-all', showDetails && 'ring-2 ring-primary/20')}>
      <CardContent className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-start gap-3">
            <div className={cn('p-2 rounded-lg', severity.bgColor, severity.color)}>
              {severity.icon}
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Badge className={status.color}>{status.label}</Badge>
                <Badge variant="outline">{alert.type.replace(/_/g, ' ')}</Badge>
              </div>
              <p className="font-medium">{alert.description}</p>
              <p className="text-sm text-muted-foreground">
                {alert.orderId && `Order: ${alert.orderId} • `}
                {new Date(alert.createdAt).toLocaleString()}
              </p>
            </div>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold">{alert.riskScore}</div>
            <p className="text-xs text-muted-foreground">Risk Score</p>
          </div>
        </div>

        {/* Risk Score Bar */}
        <div className="mb-4">
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div
              className={cn(
                'h-full rounded-full transition-all',
                alert.riskScore >= 80
                  ? 'bg-red-500'
                  : alert.riskScore >= 60
                  ? 'bg-orange-500'
                  : alert.riskScore >= 40
                  ? 'bg-yellow-500'
                  : 'bg-green-500'
              )}
              style={{ width: `${alert.riskScore}%` }}
            />
          </div>
        </div>

        {/* Indicators */}
        <div className="flex flex-wrap gap-2 mb-4">
          {alert.indicators.slice(0, 3).map((indicator) => (
            <Badge key={indicator.name} variant="secondary" className="text-xs">
              {indicator.name}: {indicator.value}
            </Badge>
          ))}
          {alert.indicators.length > 3 && (
            <Badge variant="secondary" className="text-xs">
              +{alert.indicators.length - 3} more
            </Badge>
          )}
        </div>

        {/* Expanded Details */}
        {showDetails && (
          <div className="border-t pt-4 mt-4 space-y-4">
            <div>
              <h4 className="font-medium mb-2">Risk Indicators</h4>
              <div className="space-y-2">
                {alert.indicators.map((indicator) => (
                  <div key={indicator.name} className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
                    <div>
                      <p className="text-sm font-medium">{indicator.name}</p>
                      <p className="text-xs text-muted-foreground">{indicator.description}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm">{indicator.value}</p>
                      <p className="text-xs text-muted-foreground">
                        Weight: {(indicator.weight * 100).toFixed(0)}%
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h4 className="font-medium mb-2">Recommended Actions</h4>
              <ul className="space-y-1">
                {alert.recommendedActions.map((action, index) => (
                  <li key={index} className="flex items-center gap-2 text-sm">
                    <ChevronRight className="h-3 w-3 text-muted-foreground" />
                    {action}
                  </li>
                ))}
              </ul>
            </div>

            {alert.status !== 'RESOLVED' && alert.status !== 'FALSE_POSITIVE' && (
              <div>
                <h4 className="font-medium mb-2">Resolution</h4>
                <Input
                  placeholder="Add notes..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="mb-2"
                />
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={() => onResolve('RESOLVED', notes)}
                  >
                    <CheckCircle2 className="mr-2 h-4 w-4" />
                    Mark Resolved
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onResolve('FALSE_POSITIVE', notes)}
                  >
                    False Positive
                  </Button>
                </div>
              </div>
            )}

            {alert.resolvedAt && (
              <div className="p-3 rounded-lg bg-green-50 text-sm">
                <p className="text-green-700">
                  Resolved by {alert.resolvedBy} on{' '}
                  {new Date(alert.resolvedAt).toLocaleString()}
                </p>
                {alert.notes && <p className="text-green-600 mt-1">{alert.notes}</p>}
              </div>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-between items-center mt-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowDetails(!showDetails)}
          >
            {showDetails ? 'Hide Details' : 'View Details'}
            <ChevronRight
              className={cn('ml-2 h-4 w-4 transition-transform', showDetails && 'rotate-90')}
            />
          </Button>
          {alert.orderId && (
            <Button variant="outline" size="sm">
              View Order
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export function FraudAlerts() {
  const [filter, setFilter] = React.useState<'ALL' | 'NEW' | 'INVESTIGATING' | 'RESOLVED'>('ALL');
  const [search, setSearch] = React.useState('');

  const { data: alertsData, isLoading } = useFraudAlerts(
    filter !== 'ALL' ? { status: filter } : undefined
  );
  const { data: stats } = useFraudStats();
  const resolveAlert = useResolveFraudAlert();

  const alerts = alertsData?.alerts || mockAlerts;
  const fraudStats = stats || mockStats;

  const filteredAlerts = alerts.filter((alert) => {
    const matchesFilter = filter === 'ALL' || alert.status === filter;
    const matchesSearch =
      alert.description.toLowerCase().includes(search.toLowerCase()) ||
      alert.orderId?.toLowerCase().includes(search.toLowerCase()) ||
      alert.type.toLowerCase().includes(search.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const handleResolve = (
    alertId: string,
    status: 'RESOLVED' | 'FALSE_POSITIVE',
    notes?: string
  ) => {
    resolveAlert.mutate({ id: alertId, resolution: { status, notes } });
  };

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Pending Review</p>
                <p className="text-2xl font-bold text-orange-600">{fraudStats.pendingReview}</p>
              </div>
              <Clock className="h-8 w-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Resolved This Month</p>
                <p className="text-2xl font-bold text-green-600">{fraudStats.resolvedThisMonth}</p>
              </div>
              <CheckCircle2 className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Fraud Prevented</p>
                <p className="text-2xl font-bold text-primary">
                  ${fraudStats.fraudPreventedValue.toLocaleString()}
                </p>
              </div>
              <DollarSign className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Avg. Resolution Time</p>
                <p className="text-2xl font-bold">{fraudStats.avgResolutionTime}h</p>
              </div>
              <TrendingDown className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search alerts..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex gap-2">
          {(['ALL', 'NEW', 'INVESTIGATING', 'RESOLVED'] as const).map((status) => (
            <Button
              key={status}
              variant={filter === status ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter(status)}
            >
              {status}
            </Button>
          ))}
        </div>
      </div>

      {/* Alerts List */}
      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      ) : filteredAlerts.length === 0 ? (
        <Card className="p-12 text-center">
          <Shield className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <h2 className="text-xl font-bold mb-2">No alerts found</h2>
          <p className="text-muted-foreground">
            {search ? 'Try adjusting your search terms' : 'All clear! No fraud alerts at the moment.'}
          </p>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredAlerts.map((alert) => (
            <AlertCard
              key={alert.id}
              alert={alert}
              onResolve={(status, notes) => handleResolve(alert.id, status, notes)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
