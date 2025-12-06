'use client';

import * as React from 'react';
import {
  CheckCircle,
  Circle,
  Clock,
  XCircle,
  AlertTriangle,
  ArrowRight,
  Package,
  Truck,
  FileCheck,
  DollarSign,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export type WorkflowStepStatus = 'completed' | 'active' | 'pending' | 'failed' | 'warning';

export interface WorkflowStep {
  id: string;
  title: string;
  description?: string;
  status: WorkflowStepStatus;
  icon?: React.ReactNode;
  date?: string;
  notes?: string;
  actions?: {
    label: string;
    onClick: () => void;
  }[];
}

export interface TradeWorkflowProps {
  steps: WorkflowStep[];
  orientation?: 'vertical' | 'horizontal';
  variant?: 'default' | 'compact' | 'detailed';
  className?: string;
}

const defaultIcons: Record<number, React.ReactNode> = {
  0: <Package className="h-5 w-5" />,
  1: <FileCheck className="h-5 w-5" />,
  2: <DollarSign className="h-5 w-5" />,
  3: <Truck className="h-5 w-5" />,
  4: <CheckCircle className="h-5 w-5" />,
};

const statusConfig = {
  completed: {
    icon: CheckCircle,
    color: 'text-green-600',
    bgColor: 'bg-green-100',
    borderColor: 'border-green-600',
  },
  active: {
    icon: Clock,
    color: 'text-blue-600',
    bgColor: 'bg-blue-100',
    borderColor: 'border-blue-600',
  },
  pending: {
    icon: Circle,
    color: 'text-gray-400',
    bgColor: 'bg-gray-100',
    borderColor: 'border-gray-300',
  },
  failed: {
    icon: XCircle,
    color: 'text-red-600',
    bgColor: 'bg-red-100',
    borderColor: 'border-red-600',
  },
  warning: {
    icon: AlertTriangle,
    color: 'text-yellow-600',
    bgColor: 'bg-yellow-100',
    borderColor: 'border-yellow-600',
  },
};

export function TradeWorkflow({
  steps,
  orientation = 'vertical',
  variant = 'default',
  className,
}: TradeWorkflowProps) {
  if (variant === 'compact') {
    return (
      <div className={cn('flex items-center gap-2', className)}>
        {steps.map((step, index) => {
          const config = statusConfig[step.status];
          const StatusIcon = config.icon;

          return (
            <React.Fragment key={step.id}>
              <div className="flex items-center gap-2">
                <div
                  className={cn(
                    'h-8 w-8 rounded-full flex items-center justify-center',
                    config.bgColor
                  )}
                >
                  <StatusIcon className={cn('h-4 w-4', config.color)} />
                </div>
                <span className="text-sm font-medium">{step.title}</span>
              </div>
              {index < steps.length - 1 && (
                <ArrowRight className="h-4 w-4 text-muted-foreground" />
              )}
            </React.Fragment>
          );
        })}
      </div>
    );
  }

  if (orientation === 'horizontal') {
    return (
      <div className={cn('relative', className)}>
        <div className="flex items-start justify-between">
          {steps.map((step, index) => {
            const config = statusConfig[step.status];
            const StatusIcon = config.icon;

            return (
              <div key={step.id} className="flex flex-col items-center flex-1">
                <div className="relative flex flex-col items-center">
                  <div
                    className={cn(
                      'h-12 w-12 rounded-full flex items-center justify-center border-2',
                      config.bgColor,
                      config.borderColor
                    )}
                  >
                    {step.icon || defaultIcons[index] || <StatusIcon className={cn('h-6 w-6', config.color)} />}
                  </div>
                  {index < steps.length - 1 && (
                    <div className="absolute left-full top-6 w-full h-0.5 bg-border" />
                  )}
                </div>
                <div className="mt-3 text-center">
                  <p className="font-semibold text-sm">{step.title}</p>
                  {step.description && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {step.description}
                    </p>
                  )}
                  {step.date && (
                    <p className="text-xs text-muted-foreground mt-1">{step.date}</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // Vertical orientation (default)
  return (
    <div className={cn('space-y-4', className)}>
      {steps.map((step, index) => {
        const config = statusConfig[step.status];
        const StatusIcon = config.icon;

        return (
          <div key={step.id} className="relative">
            {index < steps.length - 1 && (
              <div className="absolute left-6 top-12 bottom-0 w-0.5 bg-border" />
            )}
            <Card className={variant === 'detailed' ? 'border-l-4 ' + config.borderColor : ''}>
              <CardContent className="pt-6">
                <div className="flex items-start gap-4">
                  <div
                    className={cn(
                      'h-12 w-12 rounded-full flex items-center justify-center border-2 flex-shrink-0',
                      config.bgColor,
                      config.borderColor
                    )}
                  >
                    {step.icon || defaultIcons[index] || <StatusIcon className={cn('h-6 w-6', config.color)} />}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-semibold">{step.title}</h3>
                        {step.description && (
                          <p className="text-sm text-muted-foreground mt-1">
                            {step.description}
                          </p>
                        )}
                        {step.date && (
                          <p className="text-xs text-muted-foreground mt-2">
                            {step.date}
                          </p>
                        )}
                        {step.notes && variant === 'detailed' && (
                          <p className="text-sm text-muted-foreground mt-2 p-2 bg-muted rounded">
                            {step.notes}
                          </p>
                        )}
                      </div>
                      <span
                        className={cn(
                          'px-2 py-1 rounded-full text-xs font-medium',
                          config.bgColor,
                          config.color
                        )}
                      >
                        {step.status.charAt(0).toUpperCase() + step.status.slice(1)}
                      </span>
                    </div>
                    {step.actions && step.actions.length > 0 && (
                      <div className="flex gap-2 mt-3">
                        {step.actions.map((action, actionIndex) => (
                          <Button
                            key={actionIndex}
                            size="sm"
                            variant="outline"
                            onClick={action.onClick}
                          >
                            {action.label}
                          </Button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        );
      })}
    </div>
  );
}

// Example usage component
export function CrossBorderTradeWorkflow() {
  const steps: WorkflowStep[] = [
    {
      id: '1',
      title: 'Order Placed',
      description: 'Purchase order created and submitted',
      status: 'completed',
      date: 'Dec 1, 2024 10:30 AM',
    },
    {
      id: '2',
      title: 'Customs Documentation',
      description: 'Preparing export/import documentation',
      status: 'completed',
      date: 'Dec 2, 2024 2:15 PM',
    },
    {
      id: '3',
      title: 'Payment Processing',
      description: 'International payment clearance',
      status: 'active',
      date: 'In progress',
      notes: 'Awaiting payment confirmation from bank',
    },
    {
      id: '4',
      title: 'Customs Clearance',
      description: 'Clearing customs at destination',
      status: 'pending',
    },
    {
      id: '5',
      title: 'Final Delivery',
      description: 'Delivery to destination address',
      status: 'pending',
    },
  ];

  return <TradeWorkflow steps={steps} variant="detailed" />;
}
