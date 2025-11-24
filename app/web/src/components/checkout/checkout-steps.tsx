'use client';

import { cn } from '@/lib/utils';
import { Check } from 'lucide-react';

export type CheckoutStep = 'shipping' | 'payment' | 'review';

interface CheckoutStepsProps {
  currentStep: CheckoutStep;
}

const steps = [
  { id: 'shipping' as CheckoutStep, name: 'Shipping', number: 1 },
  { id: 'payment' as CheckoutStep, name: 'Payment', number: 2 },
  { id: 'review' as CheckoutStep, name: 'Review', number: 3 },
];

export function CheckoutSteps({ currentStep }: CheckoutStepsProps) {
  const currentStepIndex = steps.findIndex((step) => step.id === currentStep);

  return (
    <div className="mb-8">
      <nav aria-label="Progress">
        <ol className="flex items-center justify-center gap-4">
          {steps.map((step, index) => {
            const isCompleted = index < currentStepIndex;
            const isCurrent = step.id === currentStep;

            return (
              <li key={step.id} className="flex items-center gap-4">
                <div className="flex items-center gap-3">
                  <div
                    className={cn(
                      'flex h-10 w-10 items-center justify-center rounded-full border-2 font-semibold transition-colors',
                      isCompleted && 'border-primary bg-primary text-primary-foreground',
                      isCurrent && 'border-primary text-primary',
                      !isCompleted && !isCurrent && 'border-muted-foreground/25 text-muted-foreground',
                    )}
                  >
                    {isCompleted ? (
                      <Check className="h-5 w-5" />
                    ) : (
                      <span>{step.number}</span>
                    )}
                  </div>
                  <div>
                    <p
                      className={cn(
                        'text-sm font-medium',
                        (isCurrent || isCompleted) && 'text-foreground',
                        !isCurrent && !isCompleted && 'text-muted-foreground',
                      )}
                    >
                      {step.name}
                    </p>
                  </div>
                </div>
                {index < steps.length - 1 && (
                  <div
                    className={cn(
                      'hidden h-0.5 w-16 md:block',
                      isCompleted ? 'bg-primary' : 'bg-muted-foreground/25',
                    )}
                  />
                )}
              </li>
            );
          })}
        </ol>
      </nav>
    </div>
  );
}
