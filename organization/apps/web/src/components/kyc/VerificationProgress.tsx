'use client';

import React from 'react';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

export type VerificationStep = 'info' | 'documents' | 'review' | 'complete';

interface VerificationProgressProps {
  currentStep: VerificationStep;
  className?: string;
}

interface Step {
  id: VerificationStep;
  label: string;
  description: string;
}

const steps: Step[] = [
  {
    id: 'info',
    label: 'Basic Information',
    description: 'Provide your details',
  },
  {
    id: 'documents',
    label: 'Upload Documents',
    description: 'Submit required documents',
  },
  {
    id: 'review',
    label: 'Under Review',
    description: 'We are reviewing your submission',
  },
  {
    id: 'complete',
    label: 'Verified',
    description: 'Your account is verified',
  },
];

const stepOrder: VerificationStep[] = ['info', 'documents', 'review', 'complete'];

export function VerificationProgress({
  currentStep,
  className,
}: VerificationProgressProps) {
  const currentStepIndex = stepOrder.indexOf(currentStep);

  const getStepStatus = (stepIndex: number) => {
    if (stepIndex < currentStepIndex) return 'completed';
    if (stepIndex === currentStepIndex) return 'current';
    return 'upcoming';
  };

  return (
    <div className={cn('w-full', className)}>
      <nav aria-label="Progress">
        <ol className="flex items-center justify-between">
          {steps.map((step, index) => {
            const status = getStepStatus(index);
            const isCompleted = status === 'completed';
            const isCurrent = status === 'current';
            const isLast = index === steps.length - 1;

            return (
              <li
                key={step.id}
                className={cn('relative flex-1', !isLast && 'pr-8 sm:pr-20')}
              >
                {/* Connector Line */}
                {!isLast && (
                  <div
                    className="absolute left-0 top-4 -ml-px mt-0.5 h-0.5 w-full"
                    aria-hidden="true"
                  >
                    <div
                      className={cn(
                        'h-full transition-all duration-500',
                        isCompleted ? 'bg-primary' : 'bg-gray-200'
                      )}
                    />
                  </div>
                )}

                {/* Step Content */}
                <div className="group relative flex flex-col items-start">
                  <span className="flex h-9 items-center" aria-hidden="true">
                    <span
                      className={cn(
                        'relative z-10 flex h-8 w-8 items-center justify-center rounded-full transition-all duration-300',
                        isCompleted &&
                          'bg-primary text-primary-foreground',
                        isCurrent &&
                          'border-2 border-primary bg-background',
                        !isCompleted &&
                          !isCurrent &&
                          'border-2 border-gray-300 bg-background'
                      )}
                    >
                      {isCompleted ? (
                        <Check className="h-5 w-5" />
                      ) : (
                        <span
                          className={cn(
                            'text-sm font-semibold',
                            isCurrent && 'text-primary',
                            !isCurrent && 'text-muted-foreground'
                          )}
                        >
                          {index + 1}
                        </span>
                      )}
                    </span>
                  </span>
                  <span className="mt-2 flex min-w-0 flex-col">
                    <span
                      className={cn(
                        'text-sm font-medium transition-colors',
                        isCurrent && 'text-primary',
                        isCompleted && 'text-foreground',
                        !isCurrent && !isCompleted && 'text-muted-foreground'
                      )}
                    >
                      {step.label}
                    </span>
                    <span className="text-xs text-muted-foreground hidden sm:block">
                      {step.description}
                    </span>
                  </span>
                </div>
              </li>
            );
          })}
        </ol>
      </nav>
    </div>
  );
}
