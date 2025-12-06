'use client';

import React from 'react';
import { Users, Package, Activity, TrendingUp, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export interface UsageData {
  members: {
    current: number;
    limit: number;
  };
  products: {
    current: number;
    limit: number;
  };
  apiCalls: {
    current: number;
    limit: number;
  };
}

interface UsageMetricsProps {
  usage: UsageData;
  className?: string;
}

interface MetricCardProps {
  title: string;
  icon: React.ElementType;
  current: number;
  limit: number;
  unit?: string;
}

function MetricCard({ title, icon: Icon, current, limit, unit = '' }: MetricCardProps) {
  const isUnlimited = limit === -1;
  const percentage = isUnlimited ? 0 : (current / limit) * 100;
  const isNearLimit = percentage >= 80 && percentage < 100;
  const isAtLimit = percentage >= 100;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="flex items-end justify-between">
            <div>
              <div className="text-2xl font-bold">
                {current.toLocaleString()}
                {unit}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {isUnlimited ? (
                  'Unlimited'
                ) : (
                  <>
                    of {limit.toLocaleString()}
                    {unit} used
                  </>
                )}
              </p>
            </div>
            {!isUnlimited && (
              <div>
                {isAtLimit ? (
                  <Badge variant="destructive" className="gap-1">
                    <AlertTriangle className="h-3 w-3" />
                    Limit Reached
                  </Badge>
                ) : isNearLimit ? (
                  <Badge variant="warning" className="gap-1">
                    <TrendingUp className="h-3 w-3" />
                    {Math.round(percentage)}%
                  </Badge>
                ) : (
                  <Badge variant="secondary">{Math.round(percentage)}%</Badge>
                )}
              </div>
            )}
          </div>

          {!isUnlimited && (
            <div className="space-y-1">
              <Progress
                value={percentage}
                className={cn(
                  'h-2',
                  isAtLimit && '[&>div]:bg-destructive',
                  isNearLimit && '[&>div]:bg-warning'
                )}
              />
              {isAtLimit && (
                <p className="text-xs text-destructive">
                  Upgrade your plan to increase this limit
                </p>
              )}
              {isNearLimit && !isAtLimit && (
                <p className="text-xs text-warning">
                  You're approaching your limit
                </p>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export function UsageMetrics({ usage, className }: UsageMetricsProps) {
  return (
    <div className={cn('grid gap-4 md:grid-cols-3', className)}>
      <MetricCard
        title="Team Members"
        icon={Users}
        current={usage.members.current}
        limit={usage.members.limit}
      />
      <MetricCard
        title="Products"
        icon={Package}
        current={usage.products.current}
        limit={usage.products.limit}
      />
      <MetricCard
        title="API Calls"
        icon={Activity}
        current={usage.apiCalls.current}
        limit={usage.apiCalls.limit}
        unit="/mo"
      />
    </div>
  );
}
