'use client';

import * as React from 'react';
import { CreditCard, Wallet, Building2, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { cn } from '@/lib/utils';

export type PaymentType = 'card' | 'paypal' | 'applepay' | 'googlepay' | 'klarna' | 'bank';

export interface PaymentMethodOption {
  id: PaymentType;
  name: string;
  description?: string;
  icon: React.ReactNode;
  disabled?: boolean;
}

export interface PaymentMethodProps {
  selectedMethod: PaymentType;
  onMethodChange: (method: PaymentType) => void;
  availableMethods?: PaymentType[];
  className?: string;
  showDescriptions?: boolean;
  disabled?: boolean;
}

const DEFAULT_PAYMENT_METHODS: PaymentMethodOption[] = [
  {
    id: 'card',
    name: 'Credit/Debit Card',
    description: 'Pay with Visa, Mastercard, or American Express',
    icon: <CreditCard className="h-5 w-5" />,
  },
  {
    id: 'paypal',
    name: 'PayPal',
    description: 'Fast and secure payment with PayPal',
    icon: <Wallet className="h-5 w-5" />,
  },
  {
    id: 'applepay',
    name: 'Apple Pay',
    description: 'Quick checkout with Apple Pay',
    icon: (
      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12.152 6.896c-.948 0-2.415-1.078-3.96-1.04-2.04.027-3.91 1.183-4.961 3.014-2.117 3.675-.546 9.103 1.519 12.09 1.013 1.454 2.208 3.09 3.792 3.039 1.52-.065 2.09-.987 3.935-.987 1.831 0 2.35.987 3.96.948 1.637-.026 2.676-1.48 3.676-2.948 1.156-1.688 1.636-3.325 1.662-3.415-.039-.013-3.182-1.221-3.22-4.857-.026-3.04 2.48-4.494 2.597-4.559-1.429-2.09-3.623-2.324-4.39-2.376-2-.156-3.675 1.09-4.61 1.09zM15.53 3.83c.843-1.012 1.4-2.427 1.245-3.83-1.207.052-2.662.805-3.532 1.818-.78.896-1.454 2.338-1.273 3.714 1.338.104 2.715-.688 3.559-1.701"/>
      </svg>
    ),
  },
  {
    id: 'googlepay',
    name: 'Google Pay',
    description: 'Quick checkout with Google Pay',
    icon: (
      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 24c6.628 0 12-5.372 12-12S18.628 0 12 0 0 5.372 0 12s5.372 12 12 12z" fill="#fff"/>
        <path d="M12 9.878v4.478h6.174c-.257 1.6-1.028 2.963-2.178 3.867l3.506 2.718c2.044-1.885 3.224-4.66 3.224-7.963 0-.765-.07-1.502-.197-2.211H12z" fill="#4285F4"/>
        <path d="M5.266 14.29l-.797.612-2.826 2.202c1.798 3.567 5.49 6.02 9.743 6.02 2.942 0 5.413-.968 7.218-2.626l-3.506-2.718c-.968.65-2.207 1.033-3.712 1.033-2.86 0-5.29-1.932-6.158-4.532l-.962.009z" fill="#34A853"/>
        <path d="M2.643 6.896A11.89 11.89 0 0 0 1.387 12c0 1.846.448 3.588 1.237 5.143 0-.01 2.623-2.012 2.623-2.012-.157-.472-.246-.972-.246-1.493 0-.52.089-1.02.246-1.492L2.643 6.896z" fill="#FBBC05"/>
        <path d="M12.386 5.216c1.643 0 3.108.564 4.266 1.674l3.197-3.197C17.799 1.714 15.328.756 12.386.756c-4.252 0-7.944 2.453-9.743 6.02l3.623 2.813c.868-2.6 3.298-4.373 6.12-4.373z" fill="#EA4335"/>
      </svg>
    ),
  },
  {
    id: 'klarna',
    name: 'Klarna',
    description: 'Buy now, pay later',
    icon: (
      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
        <path d="M4.333 2h15.334C21.508 2 23 3.492 23 5.333v13.334C23 20.508 21.508 22 19.667 22H4.333C2.492 22 1 20.508 1 18.667V5.333C1 3.492 2.492 2 4.333 2z"/>
      </svg>
    ),
  },
  {
    id: 'bank',
    name: 'Bank Transfer',
    description: 'Direct bank transfer',
    icon: <Building2 className="h-5 w-5" />,
  },
];

/**
 * PaymentMethod Component
 *
 * Allows users to select from available payment methods during checkout.
 * Supports multiple payment providers including credit cards, PayPal,
 * Apple Pay, Google Pay, Klarna, and bank transfers.
 */
export function PaymentMethod({
  selectedMethod,
  onMethodChange,
  availableMethods = ['card', 'paypal', 'applepay', 'googlepay'],
  className,
  showDescriptions = true,
  disabled = false,
}: PaymentMethodProps) {
  const filteredMethods = DEFAULT_PAYMENT_METHODS.filter(
    (method) => availableMethods.includes(method.id)
  );

  return (
    <Card className={cn('w-full', className)}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CreditCard className="h-5 w-5" />
          Payment Method
        </CardTitle>
        <CardDescription>
          Choose how you would like to pay
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3" role="radiogroup" aria-label="Payment method selection">
          {filteredMethods.map((method) => (
            <button
              key={method.id}
              type="button"
              role="radio"
              aria-checked={selectedMethod === method.id}
              disabled={disabled || method.disabled}
              onClick={() => onMethodChange(method.id)}
              className={cn(
                'w-full flex items-center justify-between p-4 rounded-lg border transition-colors text-left',
                selectedMethod === method.id
                  ? 'border-primary bg-primary/5'
                  : 'hover:border-muted-foreground/50',
                (disabled || method.disabled) && 'opacity-50 cursor-not-allowed'
              )}
            >
              <div className="flex items-center gap-3">
                <div
                  className={cn(
                    'h-10 w-10 rounded-full flex items-center justify-center',
                    selectedMethod === method.id
                      ? 'bg-primary/10 text-primary'
                      : 'bg-muted text-muted-foreground'
                  )}
                >
                  {method.icon}
                </div>
                <div>
                  <p className="font-medium">{method.name}</p>
                  {showDescriptions && method.description && (
                    <p className="text-sm text-muted-foreground">{method.description}</p>
                  )}
                </div>
              </div>
              {selectedMethod === method.id && (
                <div className="h-6 w-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center">
                  <Check className="h-4 w-4" />
                </div>
              )}
            </button>
          ))}
        </div>

        {filteredMethods.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-4">
            No payment methods available
          </p>
        )}
      </CardContent>
    </Card>
  );
}

export default PaymentMethod;
