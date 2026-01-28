'use client';

import React, { useState } from 'react';
import { Phone, Loader2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { apiClient } from '@/lib/api-client';
import { validatePhone } from '@/lib/utils';
import { toast } from 'sonner';

interface PhoneVerificationFormProps {
  initialPhone?: string;
  onCodeSent?: (phoneNumber: string) => void;
  onVerified?: () => void;
  className?: string;
}

export function PhoneVerificationForm({
  initialPhone = '',
  onCodeSent,
  onVerified,
  className,
}: PhoneVerificationFormProps) {
  const [phoneNumber, setPhoneNumber] = useState(initialPhone);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSendCode = async () => {
    setError('');

    // Validate phone number
    if (!phoneNumber) {
      setError('Please enter a phone number');
      return;
    }

    if (!validatePhone(phoneNumber)) {
      setError('Please enter a valid phone number');
      return;
    }

    setIsLoading(true);

    try {
      await apiClient.post('/api/v1/users/phone/send-code', {
        phoneNumber: phoneNumber.trim(),
      });

      toast.success('Verification code sent!', {
        description: `We've sent a 6-digit code to ${phoneNumber}`,
      });

      onCodeSent?.(phoneNumber);
    } catch (err: any) {
      const errorMessage = err?.response?.data?.message || err.message || 'Failed to send verification code';
      setError(errorMessage);
      toast.error('Failed to send code', {
        description: errorMessage,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSendCode();
    }
  };

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Phone className="h-5 w-5" />
          Phone Verification
        </CardTitle>
        <CardDescription>
          Verify your phone number to enhance account security and enable SMS notifications
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="phoneNumber">Phone Number</Label>
          <Input
            id="phoneNumber"
            type="tel"
            placeholder="+1 (555) 000-0000"
            value={phoneNumber}
            onChange={(e) => {
              setPhoneNumber(e.target.value);
              setError('');
            }}
            onKeyPress={handleKeyPress}
            disabled={isLoading}
            error={error}
            leftIcon={<Phone className="h-4 w-4" />}
          />
          <p className="text-xs text-muted-foreground">
            Include country code (e.g., +1 for US, +44 for UK)
          </p>
        </div>

        <Button
          onClick={handleSendCode}
          disabled={isLoading || !phoneNumber}
          className="w-full"
          isLoading={isLoading}
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Sending Code...
            </>
          ) : (
            'Send Verification Code'
          )}
        </Button>

        <div className="text-xs text-muted-foreground bg-muted p-3 rounded-lg">
          <strong>Note:</strong> Standard messaging rates may apply. You'll receive a 6-digit verification code via SMS.
        </div>
      </CardContent>
    </Card>
  );
}
